"""
Load VIVID idioms into Postgres from the project copy of the dataset.

Source:
  datn/data/raw/vivid/VIVID_Dataset.csv

Usage (from backend/):
  python scripts/seed_idioms.py
  python scripts/seed_idioms.py --force   # wipe idioms + re-import
"""

from __future__ import annotations

import argparse
import csv
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # backend/
DATN = ROOT.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import SessionLocal
from app.lib.aspects import ASPECT_ID_BY_TOPIC, ASPECT_ID_BY_TRAIT
from app.models import Idiom, IdiomAspectMap, IdiomType

VIVID_CSV = DATN / "data" / "raw" / "vivid" / "VIVID_Dataset.csv"
EXPECTED_ROWS = 1636

# Matches VIVID CSV column order / theme IDs
TRAIT_COLUMNS = {
    1: "literal",
    2: "sino_vietnamese",
    3: "uncommon_vocab",
    4: "folk_knowledge",
    5: "pragmatic",
}
THEMES = {
    1: "love",
    2: "virtues",
    3: "criticism",
    4: "work_nature",
    5: "social",
    6: "life_lessons",
    7: "other",
}


def _clean(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = " ".join(text.split()).strip()
    return text


def load_records() -> list[dict]:
    if not VIVID_CSV.exists():
        raise SystemExit(
            f"Dataset not found: {VIVID_CSV}\n"
            "Copy the VIVID CSVs into datn/data/raw/vivid/ first."
        )

    with VIVID_CSV.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    if len(rows) != EXPECTED_ROWS:
        raise SystemExit(f"expected {EXPECTED_ROWS} rows, found {len(rows)} in {VIVID_CSV}")

    records: list[dict] = []
    for index, row in enumerate(rows, start=1):
        traits = [
            trait
            for col, trait in TRAIT_COLUMNS.items()
            if float(row.get(f"Linguistic_Complexity_Taxonomy_{col}") or 0) == 1
        ]
        records.append(
            {
                "id": index,
                "phrase": _clean(row["Idiom_Proverb"]),
                "meaning": _clean(row["Meaning"]),
                "topic": THEMES[int(float(row["Semantic_Theme"]))],
                "traits": traits,
            }
        )
    print(f"loaded {len(records)} idioms from {VIVID_CSV}")
    return records


def clear_idioms(db: Session) -> None:
    db.execute(text("DELETE FROM quiz_answers"))
    db.execute(text("DELETE FROM quiz_questions"))
    db.execute(text("DELETE FROM quiz_attempts"))
    db.execute(text("DELETE FROM quizzes"))
    db.execute(text("DELETE FROM flashcard_reviews"))
    db.execute(text("DELETE FROM flashcards"))
    db.execute(text("DELETE FROM submissions"))
    db.execute(text("DELETE FROM idiom_aspect_map"))
    db.execute(text("DELETE FROM idioms"))
    db.commit()
    print("cleared existing idioms and dependent rows")


def seed(db: Session, *, force: bool = False) -> None:
    existing = db.query(Idiom).count()
    if existing and not force:
        print(f"idioms already present ({existing}) — pass --force to re-import")
        return
    if existing and force:
        clear_idioms(db)

    records = load_records()
    maps: list[IdiomAspectMap] = []

    for rec in records:
        db.add(
            Idiom(
                id=int(rec["id"]),
                phrase=rec["phrase"],
                type=IdiomType.idiom,
                meaning=rec["meaning"],
            )
        )
        topic = rec.get("topic")
        if topic in ASPECT_ID_BY_TOPIC:
            maps.append(IdiomAspectMap(idiom_id=int(rec["id"]), aspect_id=ASPECT_ID_BY_TOPIC[topic]))
        for trait in rec.get("traits") or []:
            if trait in ASPECT_ID_BY_TRAIT:
                maps.append(
                    IdiomAspectMap(idiom_id=int(rec["id"]), aspect_id=ASPECT_ID_BY_TRAIT[trait])
                )

    db.flush()
    db.add_all(maps)
    db.commit()
    db.execute(
        text("SELECT setval(pg_get_serial_sequence('idioms', 'id'), (SELECT MAX(id) FROM idioms))")
    )
    db.commit()
    print(
        f"done — {db.query(Idiom).count()} idioms, "
        f"{db.query(IdiomAspectMap).count()} aspect links"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--force", action="store_true", help="Wipe and re-import idioms")
    args = parser.parse_args()

    get_settings.cache_clear()
    print("DB:", get_settings().database_url.split("@")[-1])
    with SessionLocal() as db:
        seed(db, force=args.force)


if __name__ == "__main__":
    main()
