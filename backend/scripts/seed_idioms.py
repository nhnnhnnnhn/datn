"""
Load VIVID idioms into Postgres from the processed dataset.

Source:
  datn/data/processed/vivid_idioms.json   (python scripts/import_vivid.py writes it)

Usage (from backend/):
  python scripts/seed_idioms.py
  python scripts/seed_idioms.py --refresh   # update texts in place, keep users' study data
  python scripts/seed_idioms.py --force     # wipe idioms and everything that references them
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # backend/
DATN = ROOT.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import SessionLocal
from app.lib.aspects import ASPECT_ID_BY_TOPIC, ASPECT_ID_BY_TRAIT
from app.models import (
    Flashcard,
    Idiom,
    IdiomAspectMap,
    IdiomType,
    QuizQuestion,
    Submission,
)

VIVID_JSON = DATN / "data" / "processed" / "vivid_idioms.json"
TEXT_FIELDS = ("glossary", "note", "citation")


def load_records(path: Path = VIVID_JSON) -> list[dict]:
    if not path.exists():
        raise SystemExit(f"Dataset not found: {path}\nRun scripts/import_vivid.py first.")
    records = json.loads(path.read_text(encoding="utf-8"))["idioms"]
    print(f"loaded {len(records)} idioms from {path}")
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


def _set_texts(idiom: Idiom, rec: dict) -> None:
    idiom.meaning = rec["explanation"]
    for field in TEXT_FIELDS:
        setattr(idiom, field, rec.get(field))


def _aspect_ids(rec: dict) -> list[int]:
    ids = [ASPECT_ID_BY_TOPIC[rec["topic"]]] if rec.get("topic") in ASPECT_ID_BY_TOPIC else []
    return ids + [ASPECT_ID_BY_TRAIT[t] for t in rec.get("traits") or [] if t in ASPECT_ID_BY_TRAIT]


def _add_idioms(db: Session, records: list[dict]) -> None:
    for rec in records:
        idiom = Idiom(id=int(rec["id"]), phrase=rec["phrase"], type=IdiomType.idiom)
        _set_texts(idiom, rec)
        db.add(idiom)

    db.flush()
    for rec in records:
        db.add_all(IdiomAspectMap(idiom_id=int(rec["id"]), aspect_id=a) for a in _aspect_ids(rec))


def _drop_unused(db: Session, idiom_ids: set[int]) -> None:
    if not idiom_ids:
        return
    used: set[int] = set()
    for column in (Submission.idiom_id, Flashcard.idiom_id, QuizQuestion.idiom_id):
        used |= set(db.scalars(select(column).where(column.in_(idiom_ids))))
    for idiom_id in sorted(idiom_ids):
        if idiom_id in used:
            print(f"kept idiom {idiom_id}: not in the dataset anymore but still referenced")
            continue
        db.query(IdiomAspectMap).filter(IdiomAspectMap.idiom_id == idiom_id).delete()
        db.query(Idiom).filter(Idiom.id == idiom_id).delete()
        print(f"removed idiom {idiom_id}: not in the dataset anymore")


def refresh(db: Session, records: list[dict]) -> None:
    existing = {i.id: i for i in db.query(Idiom)}
    for rec in records:
        if idiom := existing.get(rec["id"]):
            _set_texts(idiom, rec)
    _add_idioms(db, [r for r in records if r["id"] not in existing])
    _drop_unused(db, set(existing) - {r["id"] for r in records})
    db.execute(
        update(Flashcard).values(
            back=select(Idiom.meaning).where(Idiom.id == Flashcard.idiom_id).scalar_subquery()
        )
    )
    db.commit()
    print(f"refreshed — {db.query(Idiom).count()} idioms")


def seed(db: Session, records: list[dict], *, force: bool = False, refresh_texts: bool = False):
    existing = db.query(Idiom).count()
    if existing and refresh_texts:
        refresh(db, records)
        return
    if existing and not force:
        print(f"idioms already present ({existing}) — pass --refresh or --force to re-import")
        return
    if existing and force:
        clear_idioms(db)

    _add_idioms(db, records)
    db.commit()
    if db.bind.dialect.name == "postgresql":
        max_id = "(SELECT MAX(id) FROM idioms)"
        db.execute(text(f"SELECT setval(pg_get_serial_sequence('idioms', 'id'), {max_id})"))
        db.commit()
    print(
        f"done — {db.query(Idiom).count()} idioms, {db.query(IdiomAspectMap).count()} aspect links"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--source", type=Path, default=VIVID_JSON, help="Processed dataset JSON")
    parser.add_argument("--refresh", action="store_true", help="Update idiom texts in place")
    parser.add_argument("--force", action="store_true", help="Wipe and re-import idioms")
    args = parser.parse_args()

    get_settings.cache_clear()
    print("DB:", get_settings().database_url.split("@")[-1])
    records = load_records(args.source)
    with SessionLocal() as db:
        seed(db, records, force=args.force, refresh_texts=args.refresh)


if __name__ == "__main__":
    main()
