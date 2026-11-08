from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.lib.serializers import idiom_out, quiz_out, quiz_result_out
from app.models import Flashcard, Idiom, Quiz, QuizAnswer, QuizAttempt, QuizQuestion, User
from app.services.ai_path import ensure_ai_on_path


def generate(db: Session, user: User, config: dict) -> dict:
    ensure_ai_on_path()
    from ai.generation.quiz_generator import generate_questions

    count = int(config.get("count") or 10)
    types = config.get("types") or ["meaning", "reverse", "fill_blank"]
    topic = config.get("topic")
    trait = config.get("trait")
    deck_id = config.get("deckId")

    all_rows = db.query(Idiom).options(joinedload(Idiom.aspects)).all()
    if not all_rows:
        raise HTTPException(status_code=400, detail="Không có thành ngữ để tạo quiz")
    all_dicts = [idiom_out(i) for i in all_rows]

    if deck_id:
        idiom_ids = {
            r[0]
            for r in db.query(Flashcard.idiom_id)
            .filter(Flashcard.deck_id == deck_id, Flashcard.user_id == user.id)
            .all()
        }
        if not idiom_ids:
            raise HTTPException(status_code=400, detail="Bộ thẻ chưa có câu nào")
        pool_dicts = [d for d in all_dicts if d["id"] in idiom_ids]
    else:
        pool_dicts = all_dicts

    questions = generate_questions(
        pool_dicts,
        count=count,
        types=types,
        topic=topic,
        trait=trait,
        all_idioms=all_dicts,
    )
    if not questions:
        raise HTTPException(status_code=400, detail="Không tạo được câu hỏi")

    quiz = Quiz(user_id=user.id, generated_by="ai.quiz_generator", config=config)
    db.add(quiz)
    db.flush()

    for q in questions:
        db.add(
            QuizQuestion(
                quiz_id=quiz.id,
                idiom_id=q["idiomId"],
                question_type=q["type"],
                question_text=q["prompt"],
                highlight=q.get("highlight"),
                options=q.get("options") or [],
                correct_answer=json.dumps(q.get("answer") or []),
                explanation=q.get("explanation") or "",
                points=1,
            )
        )
    db.commit()
    quiz = db.query(Quiz).options(joinedload(Quiz.questions)).filter(Quiz.id == quiz.id).first()
    return quiz_out(quiz)


def submit(db: Session, user: User, quiz_id: str, answers: list[dict], duration_sec: int) -> dict:
    try:
        qid = int(quiz_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài quiz") from exc

    quiz = (
        db.query(Quiz)
        .options(joinedload(Quiz.questions))
        .filter(Quiz.id == qid, Quiz.user_id == user.id)
        .first()
    )
    if not quiz:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài quiz")

    by_q = {str(q.id): q for q in quiz.questions}
    correct = 0
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=user.id,
        total_points=len(quiz.questions),
        duration_sec=duration_sec,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.flush()

    for ans in answers:
        q = by_q.get(str(ans.get("questionId")))
        if not q:
            continue
        selected = list(ans.get("selected") or [])
        expected = json.loads(q.correct_answer)
        ok = sorted(selected) == sorted(expected)
        if ok:
            correct += 1
        db.add(
            QuizAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                answer_text=json.dumps(selected),
                is_correct=ok,
                awarded_points=1 if ok else 0,
            )
        )

    attempt.score = correct
    db.commit()
    db.refresh(attempt)
    return quiz_result_out(attempt)


def history(db: Session, user: User, limit: int = 20) -> list[dict]:
    limit = min(100, max(1, limit or 20))
    rows = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user.id, QuizAttempt.completed_at.isnot(None))
        .order_by(QuizAttempt.completed_at.desc())
        .limit(limit)
        .all()
    )
    return [quiz_result_out(r) for r in rows]
