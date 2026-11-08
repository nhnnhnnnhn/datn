from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session, joinedload

from app.lib.aspects import TOPIC_BY_ASPECT_ID, TRAIT_BY_ASPECT_ID
from app.lib.serializers import idiom_out, srs_from_card
from app.lib.srs import is_due, is_learned, is_new
from app.models import Flashcard, FlashcardReview, Idiom, QuizAttempt, Submission, User


def _date_key(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).date().isoformat()


def _mastery(avg_score: float | None) -> str:
    if avg_score is None:
        return "not_started"
    if avg_score < 2:
        return "attempted"
    if avg_score < 3:
        return "familiar"
    if avg_score < 4:
        return "proficient"
    return "mastered"


def _idiom_topic_traits(idiom: Idiom) -> tuple[str, list[str]]:
    topic = "other"
    traits: list[str] = []
    for aspect in idiom.aspects or []:
        if aspect.id in TOPIC_BY_ASPECT_ID:
            topic = TOPIC_BY_ASPECT_ID[aspect.id]
        elif aspect.id in TRAIT_BY_ASPECT_ID:
            traits.append(TRAIT_BY_ASPECT_ID[aspect.id])
    return topic, traits


def summary(db: Session, user: User) -> dict:
    idioms = db.query(Idiom).options(joinedload(Idiom.aspects)).all()
    attempts = (
        db.query(Submission)
        .filter(Submission.user_id == user.id)
        .order_by(Submission.submitted_at.asc())
        .all()
    )
    quiz_results = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user.id, QuizAttempt.completed_at.isnot(None))
        .all()
    )
    cards = (
        db.query(Flashcard)
        .options(joinedload(Flashcard.idiom))
        .filter(Flashcard.user_id == user.id)
        .all()
    )
    reviews = (
        db.query(FlashcardReview)
        .join(Flashcard)
        .filter(Flashcard.user_id == user.id)
        .all()
    )

    by_id = {i.id: i for i in idioms}
    best: dict[int, float] = {}
    for a in attempts:
        score = float(a.overall_score or 0)
        best[a.idiom_id] = max(score, best.get(a.idiom_id, score))

    activity: dict[str, int] = defaultdict(int)
    for a in attempts:
        if a.submitted_at:
            activity[_date_key(a.submitted_at)] += 1
    for r in quiz_results:
        if r.completed_at:
            activity[_date_key(r.completed_at)] += 1
    for rev in reviews:
        if rev.reviewed_at:
            activity[_date_key(rev.reviewed_at)] += 1

    today = datetime.now(timezone.utc)
    today_key = _date_key(today)
    streak = 0
    cursor = today
    if today_key not in activity:
        cursor = today - timedelta(days=1)
    while _date_key(cursor) in activity:
        streak += 1
        cursor -= timedelta(days=1)

    learned_cards = {c.idiom_id for c in cards if is_learned(srs_from_card(c))}
    reviewed_ids = {c.idiom_id for c in cards if c.last_reviewed}
    studied = set(best) | reviewed_ids
    learned = {i for i, s in best.items() if s >= 4} | learned_cards

    topic_ids = ["criticism", "life_lessons", "work_nature", "social", "love", "virtues", "other"]
    trait_ids = ["literal", "pragmatic", "sino_vietnamese", "uncommon_vocab", "folk_knowledge"]

    by_topic = []
    for topic in topic_ids:
        ids = [i.id for i in idioms if _idiom_topic_traits(i)[0] == topic]
        scores = [
            float(a.overall_score or 0)
            for a in attempts
            if a.idiom_id in by_id and _idiom_topic_traits(by_id[a.idiom_id])[0] == topic
        ]
        by_topic.append(
            {
                "topic": topic,
                "total": len(ids),
                "studied": sum(1 for i in ids if i in studied),
                "learned": sum(1 for i in ids if i in learned),
                "avgScore": (sum(scores) / len(scores)) if scores else None,
            }
        )

    by_trait = []
    mastery_levels = ["not_started", "attempted", "familiar", "proficient", "mastered"]
    for trait in trait_ids:
        group = [i for i in idioms if trait in _idiom_topic_traits(i)[1]]
        scores = [
            float(a.overall_score or 0)
            for a in attempts
            if a.idiom_id in by_id and trait in _idiom_topic_traits(by_id[a.idiom_id])[1]
        ]
        levels = {m: 0 for m in mastery_levels}
        for idiom in group:
            levels[_mastery(best.get(idiom.id))] += 1
        by_trait.append(
            {
                "trait": trait,
                "total": len(group),
                "attempts": len(scores),
                "avgScore": (sum(scores) / len(scores)) if scores else None,
                "levels": levels,
            }
        )

    activity_days = []
    for i in range(84):
        d = today - timedelta(days=83 - i)
        key = _date_key(d)
        activity_days.append({"date": key, "count": activity.get(key, 0)})

    total_q = sum(int(r.total_points or 0) for r in quiz_results)
    correct_q = sum(int(r.score or 0) for r in quiz_results)
    attempt_scores = [float(a.overall_score or 0) for a in attempts]

    weak = sorted(((i, s) for i, s in best.items() if s <= 2), key=lambda x: x[1])[:5]
    weak_idioms = [
        {"idiom": idiom_out(by_id[i]), "bestScore": s}
        for i, s in weak
        if i in by_id
    ]

    return {
        "totalIdioms": len(idioms),
        "studiedCount": len(studied),
        "learnedCount": len(learned),
        "streak": streak,
        "todayCount": activity.get(today_key, 0),
        "dailyGoal": user.daily_goal or 10,
        "avgScore": (sum(attempt_scores) / len(attempt_scores)) if attempt_scores else None,
        "quizAccuracy": (correct_q / total_q) if total_q else None,
        "practiceCount": len(attempts),
        "quizCount": len(quiz_results),
        "reviewCount": len(reviews),
        "cardsDue": sum(
            1 for c in cards if not is_new(srs_from_card(c)) and is_due(srs_from_card(c))
        ),
        "byTopic": by_topic,
        "byTrait": by_trait,
        "activity": activity_days,
        "weakIdioms": weak_idioms,
    }
