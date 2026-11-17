"""Normalize and soften VIVID judge output for learners."""

from __future__ import annotations

from typing import Any

from ai.grading.rubric import (
    CRITERIA,
    ERROR_TYPES,
    OVERALL_WEIGHTS,
    SUMMARY_BY_OVERALL,
)


def clamp5(x: float | int | None) -> int:
    try:
        return max(0, min(5, round(float(x or 0))))
    except (TypeError, ValueError):
        return 0


def compute_overall(scores: dict[str, int]) -> int:
    """Weighted overall; accuracy 0 forces overall 0 (VIVID rule)."""
    if scores.get("accuracy", 0) == 0:
        return 0
    total = sum(OVERALL_WEIGHTS[k] * scores.get(k, 0) for k in CRITERIA)
    # Round up slightly for learners hovering between two scores
    overall = clamp5(total + 0.25)
    # Allow overall a bit above accuracy so nuance/fluency can lift the grade
    return min(overall, scores["accuracy"] + 2)


def soften_scores(scores: dict[str, int]) -> dict[str, int]:
    """Bump mid-range partial credit (+1 for scores 1-3); leave 0 / 4-5 alone."""
    out: dict[str, int] = {}
    for k in CRITERIA:
        v = scores.get(k, 0)
        out[k] = min(5, v + 1) if 1 <= v <= 3 else v
    return out


def _clean_issue(raw: Any) -> dict[str, str] | None:
    if not isinstance(raw, dict):
        return None
    criterion = str(raw.get("criterion") or "accuracy")
    if criterion not in CRITERIA:
        criterion = "accuracy"
    err = str(raw.get("type") or "missing_points")
    if err not in ERROR_TYPES:
        err = "missing_points"
    title = str(raw.get("title") or "Gợi ý cải thiện").strip()[:80]
    detail = str(raw.get("detail") or "").strip()
    if not detail:
        return None
    return {"criterion": criterion, "type": err, "title": title, "detail": detail}


def normalize_result(
    raw: dict[str, Any], *, prefer_weighted_overall: bool = True
) -> dict[str, Any]:
    """
    Coerce LLM/heuristic output into the API feedback shape.
    Softens missing fields and applies the VIVID accuracy→0 rule.
    """
    scores_in = raw.get("scores") if isinstance(raw.get("scores"), dict) else {}
    scores = {k: clamp5(scores_in.get(k)) for k in CRITERIA}
    # Learner-friendly bump for both LLM and heuristic paths
    scores = soften_scores(scores)

    if prefer_weighted_overall or "overall" not in raw:
        overall = compute_overall(scores)
    else:
        overall = clamp5(raw.get("overall"))
        # Keep LLM overall, but lift it one step when softened scores are higher
        overall = max(overall, compute_overall(scores) - 1)
        overall = 0 if scores["accuracy"] == 0 else max(overall, 1)

    fb_in = raw.get("feedback") if isinstance(raw.get("feedback"), dict) else {}
    comments_in = fb_in.get("comments") if isinstance(fb_in.get("comments"), dict) else {}
    comments = {
        k: str(comments_in.get(k) or "").strip()
        or ("Ổn." if scores[k] >= 4 else "Cần cải thiện thêm." if scores[k] >= 2 else "Chưa đạt.")
        for k in CRITERIA
    }

    issues: list[dict[str, str]] = []
    for item in fb_in.get("issues") or []:
        cleaned = _clean_issue(item)
        if cleaned:
            issues.append(cleaned)

    strengths = [str(s).strip() for s in (fb_in.get("strengths") or []) if str(s).strip()][:6]
    missing = [str(s).strip() for s in (fb_in.get("missingKeywords") or []) if str(s).strip()][:6]

    summary = str(fb_in.get("summary") or "").strip()
    if not summary:
        summary = SUMMARY_BY_OVERALL[overall]

    return {
        "scores": scores,
        "overall": overall,
        "feedback": {
            "summary": summary,
            "comments": comments,
            "issues": issues,
            "strengths": strengths,
            "missingKeywords": missing if overall < 5 else [],
        },
        "method": raw.get("method") or "unknown",
    }
