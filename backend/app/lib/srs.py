"""Simplified SM-2 scheduler (same rules as the frontend)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

QUALITY = {"again": 1, "hard": 3, "good": 4, "easy": 5}
RELEARN = timedelta(minutes=10)


def new_srs(now: datetime | None = None) -> dict:
    now = now or datetime.now(UTC)
    return {
        "ease": 2.5,
        "interval": 0,
        "repetitions": 0,
        "due": now.isoformat(),
        "lastReviewed": None,
    }


def schedule(srs: dict, rating: str, now: datetime | None = None) -> dict:
    now = now or datetime.now(UTC)
    q = QUALITY[rating]
    ease = float(srs.get("ease", 2.5))
    interval = int(srs.get("interval", 0))
    repetitions = int(srs.get("repetitions", 0))

    if q < 3:
        repetitions = 0
        interval = 0
        ease = max(1.3, ease - 0.2)
    else:
        repetitions += 1
        if repetitions == 1:
            interval = 3 if rating == "easy" else 1
        elif repetitions == 2:
            interval = 7 if rating == "easy" else 3 if rating == "hard" else 6
        else:
            factor = 0.8 if rating == "hard" else 1.3 if rating == "easy" else 1
            interval = max(1, round(interval * ease * factor))
        ease = max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

    due = now + (RELEARN if interval == 0 else timedelta(days=interval))
    return {
        "ease": ease,
        "interval": interval,
        "repetitions": repetitions,
        "due": due.isoformat(),
        "lastReviewed": now.isoformat(),
    }


def is_new(srs: dict) -> bool:
    return not srs.get("lastReviewed")


def is_due(srs: dict, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    due = srs.get("due")
    if not due:
        return True
    due_dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
    if due_dt.tzinfo is None:
        due_dt = due_dt.replace(tzinfo=UTC)
    return due_dt <= now


def is_learned(srs: dict) -> bool:
    return int(srs.get("repetitions", 0)) >= 2
