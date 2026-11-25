"""Validate quiz questions before they reach the API."""

from __future__ import annotations

from typing import Any

ALLOWED_TYPES = frozenset({"meaning", "reverse", "fill_blank", "topic", "traits"})


def _norm(text: str) -> str:
    return " ".join(str(text).lower().split())


def validate_question(q: dict[str, Any]) -> dict[str, Any] | None:
    """Return a cleaned question dict, or None if invalid."""
    if not isinstance(q, dict):
        return None
    qtype = str(q.get("type") or "")
    if qtype not in ALLOWED_TYPES:
        return None
    try:
        idiom_id = int(q["idiomId"])
    except (KeyError, TypeError, ValueError):
        return None

    options = [str(o).strip() for o in (q.get("options") or []) if str(o).strip()]
    if len(options) < 2:
        return None

    # Deduplicate options while keeping order
    seen: set[str] = set()
    unique: list[str] = []
    for opt in options:
        key = _norm(opt)
        if key in seen:
            continue
        seen.add(key)
        unique.append(opt)
    options = unique
    if len(options) < 2:
        return None

    raw_answer = q.get("answer")
    if not isinstance(raw_answer, list) or not raw_answer:
        return None
    try:
        answer = sorted({int(i) for i in raw_answer})
    except (TypeError, ValueError):
        return None
    if any(i < 0 or i >= len(options) for i in answer):
        return None
    if qtype != "traits" and len(answer) != 1:
        return None

    prompt = str(q.get("prompt") or "").strip()
    if not prompt:
        return None

    return {
        "type": qtype,
        "idiomId": idiom_id,
        "prompt": prompt,
        "highlight": (str(q["highlight"]).strip() if q.get("highlight") is not None else None),
        "options": options,
        "answer": answer,
        "explanation": str(q.get("explanation") or "").strip(),
    }


def validate_questions(questions: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for q in questions:
        cleaned = validate_question(q)
        if cleaned:
            out.append(cleaned)
    return out
