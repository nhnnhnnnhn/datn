"""Convert the released VIVID benchmark (github.com/ReML-AI/VIVID, MIT) into app idiom records.

The CSV stores glossaries, context notes and source verses inside the free-text meaning, e.g.
``( Cuống : phần thân dưới... ) Kinh nghiệm ăn uống ...`` or ``... “Ông cha ...” ( cd )``.
They are split out so the UI can show a word breakdown and the cited verse separately.

Usage: python scripts/import_vivid.py [--raw PATH] [--out PATH] [--frontend-out PATH]
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RAW = ROOT / "data/raw/vivid/VIVID_Dataset.csv"
DEFAULT_OUT = ROOT / "data/processed/vivid_idioms.json"
DEFAULT_FRONTEND_OUT = ROOT / "frontend/src/mocks/vivid-idioms.json"
EXPECTED_ROWS = 1636

# Column order confirmed against evaluation/discriminative/pattern.yaml in the VIVID repo
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
SOURCE_NAMES = {"cd": "Ca dao", "chưa rõ": "Chưa rõ nguồn"}

CITATION_RE = re.compile(r"“([^”]+)”\s*\(\s*([^()]{1,40}?)\s*\)\s*\.?\s*$")
GLOSS_ITEM_RE = re.compile(r"^\s*([^:;]{1,40}?)\s*:\s*(.+?)\s*$", re.S)

META = {
    "source": "VIVID: A Culturally Grounded Benchmark Exposing the Figurative Language Gap "
    "in Vietnamese NLP (LREC 2026)",
    "url": "https://github.com/ReML-AI/VIVID",
    "license": "MIT, Copyright (c) 2026 ReML-AI",
}


def log(msg: str) -> None:
    print(f"[IMPORT] {msg}")


def clean(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    text = re.sub(r"^[\s.,;:]+", "", text)
    return text[:1].upper() + text[1:]


def paren_spans(text: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    depth = 0
    start = 0
    for i, ch in enumerate(text):
        if ch == "(":
            if depth == 0:
                start = i
            depth += 1
        elif ch == ")" and depth:
            depth -= 1
            if depth == 0:
                spans.append((start, i + 1))
    return spans


def parse_glossary(inner: str) -> list[dict[str, str]] | None:
    items: list[dict[str, str]] = []
    for piece in inner.split(";"):
        match = GLOSS_ITEM_RE.match(piece)
        if match and len(match.group(1).split()) <= 5:
            items.append(
                {"term": clean(match.group(1)), "meaning": clean(match.group(2)).rstrip(".")}
            )
        elif items and piece.strip():
            items[-1]["meaning"] += f"; {clean(piece).rstrip('.')}"
        else:
            return None
    return items or None


def split_glossary(text: str) -> tuple[str, list[dict[str, str]]]:
    glossary: list[dict[str, str]] = []
    kept: list[str] = []
    cursor = 0
    for start, end in paren_spans(text):
        items = parse_glossary(text[start + 1 : end - 1])
        if items is None:
            continue
        kept.append(text[cursor:start])
        glossary.extend(items)
        cursor = end
    kept.append(text[cursor:])
    return "".join(kept), glossary


def split_citation(text: str) -> tuple[str, dict[str, str] | None]:
    match = CITATION_RE.search(text)
    if not match:
        return text, None
    marker = clean(match.group(2)).lower()
    source = SOURCE_NAMES.get(marker, marker.title())
    return text[: match.start()], {"text": clean(match.group(1)), "source": source}


def split_leading_note(text: str) -> tuple[str, str | None]:
    """A leading parenthesis without ``term : meaning`` pairs is background context, not meaning."""
    stripped = text.strip()
    spans = paren_spans(stripped)
    if not spans or spans[0][0] != 0:
        return text, None
    end = spans[0][1]
    return stripped[end:], clean(stripped[1 : end - 1])


def convert_row(index: int, row: dict[str, str]) -> dict[str, object]:
    raw_meaning = unicodedata.normalize("NFC", row["Meaning"])
    without_citation, citation = split_citation(raw_meaning.strip())
    without_glossary, glossary = split_glossary(without_citation)
    explanation, note = split_leading_note(without_glossary)
    explanation = clean(explanation) or clean(raw_meaning)
    if not re.search(r"[^\W\d_]", explanation):
        log(f"warning: row {index} has no meaning text: {explanation!r}")

    record: dict[str, object] = {
        "id": index,
        "phrase": clean(row["Idiom_Proverb"]),
        "explanation": explanation,
        "topic": THEMES[int(float(row["Semantic_Theme"]))],
        "traits": [
            trait
            for column, trait in TRAIT_COLUMNS.items()
            if float(row[f"Linguistic_Complexity_Taxonomy_{column}"] or 0) == 1
        ],
    }
    if glossary:
        record["glossary"] = glossary
    if note:
        record["note"] = note
    if citation:
        record["citation"] = citation
    return record


def convert(raw: Path) -> list[dict[str, object]]:
    with raw.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if len(rows) != EXPECTED_ROWS:
        raise SystemExit(f"[IMPORT] expected {EXPECTED_ROWS} rows, found {len(rows)} in {raw}")
    return [convert_row(i, row) for i, row in enumerate(rows, start=1)]


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    log(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--frontend-out", type=Path, default=DEFAULT_FRONTEND_OUT)
    args = parser.parse_args(argv)

    idioms = convert(args.raw)
    payload = {"meta": {**META, "count": len(idioms)}, "idioms": idioms}
    log(
        f"converted {len(idioms)} idioms; "
        f"{sum(1 for i in idioms if 'glossary' in i)} with glossary, "
        f"{sum(1 for i in idioms if 'note' in i)} with a context note, "
        f"{sum(1 for i in idioms if 'citation' in i)} with a cited verse"
    )
    write_json(args.out, payload)
    write_json(args.frontend_out, payload)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
