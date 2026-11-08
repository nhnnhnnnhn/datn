from __future__ import annotations

from datetime import datetime

from app.lib.aspects import TOPIC_BY_ASPECT_ID, TRAIT_BY_ASPECT_ID
from app.models import Deck, Flashcard, Idiom, Quiz, QuizAttempt, Submission, User


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def user_out(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.full_name,
        "email": user.email,
        "role": user.role if user.role in ("student", "teacher") else "student",
        "dailyGoal": user.daily_goal or 10,
        "createdAt": iso(user.created_at) or "",
    }


def idiom_out(idiom: Idiom) -> dict:
    topic = "other"
    traits: list[str] = []
    for aspect in idiom.aspects or []:
        if aspect.id in TOPIC_BY_ASPECT_ID:
            topic = TOPIC_BY_ASPECT_ID[aspect.id]
        elif aspect.id in TRAIT_BY_ASPECT_ID:
            traits.append(TRAIT_BY_ASPECT_ID[aspect.id])

    return {
        "id": idiom.id,
        "phrase": idiom.phrase,
        "explanation": idiom.meaning,
        "topic": topic,
        "traits": traits,
    }


def srs_from_card(card: Flashcard) -> dict:
    return {
        "ease": card.ease,
        "interval": card.interval_days,
        "repetitions": card.repetitions,
        "due": iso(card.due_at) or "",
        "lastReviewed": iso(card.last_reviewed),
    }


def apply_srs(card: Flashcard, srs: dict) -> None:
    card.ease = float(srs["ease"])
    card.interval_days = int(srs["interval"])
    card.repetitions = int(srs["repetitions"])
    card.due_at = datetime.fromisoformat(srs["due"].replace("Z", "+00:00"))
    if srs.get("lastReviewed"):
        card.last_reviewed = datetime.fromisoformat(srs["lastReviewed"].replace("Z", "+00:00"))
    else:
        card.last_reviewed = None


def card_out(card: Flashcard) -> dict:
    return {
        "id": str(card.id),
        "deckId": card.deck_id,
        "idiomId": card.idiom_id,
        "idiom": idiom_out(card.idiom),
        "srs": srs_from_card(card),
    }


def deck_out(deck: Deck, cards: list[Flashcard]) -> dict:
    from app.lib.srs import is_due, is_learned, is_new

    now = datetime.utcnow().astimezone()
    srs_list = [srs_from_card(c) for c in cards]
    return {
        "id": deck.id,
        "name": deck.name,
        "description": deck.description,
        "source": deck.source,
        "topic": deck.topic,
        "cardCount": len(cards),
        "dueCount": sum(1 for s in srs_list if not is_new(s) and is_due(s, now)),
        "newCount": sum(1 for s in srs_list if is_new(s)),
        "learnedCount": sum(1 for s in srs_list if is_learned(s)),
        "createdAt": iso(deck.created_at) or "",
    }


def grading_out(sub: Submission) -> dict:
    feedback = sub.feedback if isinstance(sub.feedback, dict) else {}
    scores = feedback.get("scores") or {
        "accuracy": float(sub.accuracy_score or 0),
        "nuance": float(sub.cultural_alignment_score or 0),
        "fluency": float(sub.fluency_score or 0),
        "completeness": float(sub.completeness_score or 0),
    }
    return {
        "id": str(sub.id),
        "idiomId": sub.idiom_id,
        "phrase": feedback.get("phrase") or (sub.idiom.phrase if sub.idiom else ""),
        "answer": sub.answer_text,
        "scores": scores,
        "overall": float(sub.overall_score or feedback.get("overall") or 0),
        "feedback": feedback.get("feedback")
        or {
            "summary": "",
            "comments": {},
            "issues": [],
            "strengths": [],
            "missingKeywords": [],
        },
        "reference": feedback.get("reference") or (sub.idiom.meaning if sub.idiom else ""),
        "createdAt": iso(sub.submitted_at) or "",
    }


def quiz_out(quiz: Quiz) -> dict:
    questions = []
    for q in quiz.questions:
        import json

        try:
            answer = json.loads(q.correct_answer)
        except Exception:
            answer = [0]
        questions.append(
            {
                "id": str(q.id),
                "type": q.question_type,
                "idiomId": q.idiom_id,
                "prompt": q.question_text,
                "highlight": q.highlight,
                "options": q.options or [],
                "answer": answer,
                "explanation": q.explanation or "",
            }
        )
    return {
        "id": str(quiz.id),
        "config": quiz.config or {},
        "questions": questions,
        "createdAt": iso(quiz.created_at) or "",
    }


def quiz_result_out(attempt: QuizAttempt) -> dict:
    return {
        "id": str(attempt.id),
        "quizId": str(attempt.quiz_id),
        "correct": int(attempt.score or 0),
        "total": int(attempt.total_points or 0),
        "durationSec": int(attempt.duration_sec or 0),
        "createdAt": iso(attempt.completed_at or attempt.started_at) or "",
    }
