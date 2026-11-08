from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.lib.serializers import grading_out
from app.models import Idiom, Submission, User
from app.services.ai_path import ensure_ai_on_path


def grade(db: Session, user: User, idiom_id: int, answer: str) -> dict:
    answer = (answer or "").strip()
    if not answer:
        raise HTTPException(status_code=400, detail="Bài làm đang để trống")

    idiom = (
        db.query(Idiom)
        .options(joinedload(Idiom.aspects))
        .filter(Idiom.id == idiom_id)
        .first()
    )
    if not idiom:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành ngữ")

    ensure_ai_on_path()
    from ai.grading.evaluator import grade_explanation

    settings = get_settings()
    result = grade_explanation(
        idiom.phrase,
        idiom.meaning,
        answer,
        model=settings.llm_model or "gpt-4o-mini",
        api_key=settings.llm_api_key or None,
    )

    payload = {
        "phrase": idiom.phrase,
        "reference": idiom.meaning,
        "scores": result["scores"],
        "overall": result["overall"],
        "feedback": result["feedback"],
    }

    sub = Submission(
        user_id=user.id,
        idiom_id=idiom.id,
        answer_text=answer,
        accuracy_score=result["scores"]["accuracy"],
        completeness_score=result["scores"]["completeness"],
        cultural_alignment_score=result["scores"]["nuance"],
        fluency_score=result["scores"]["fluency"],
        overall_score=result["overall"],
        feedback=payload,
        ai_model=settings.llm_model or "heuristic",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    sub.idiom = idiom
    return grading_out(sub)


def history(db: Session, user: User, limit: int = 20) -> list[dict]:
    limit = min(100, max(1, limit or 20))
    rows = (
        db.query(Submission)
        .options(joinedload(Submission.idiom).joinedload(Idiom.aspects))
        .filter(Submission.user_id == user.id)
        .order_by(Submission.submitted_at.desc())
        .limit(limit)
        .all()
    )
    return [grading_out(r) for r in rows]
