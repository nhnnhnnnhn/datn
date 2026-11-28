from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.lib.aspects import ASPECT_ID_BY_TOPIC, TOPIC_BY_ASPECT_ID
from app.lib.serializers import admin_user_out
from app.models import (
    Deck,
    Flashcard,
    FlashcardReview,
    Idiom,
    IdiomAspectMap,
    Quiz,
    QuizAnswer,
    QuizAttempt,
    QuizQuestion,
    Submission,
    User,
)

ROLES = ("student", "teacher", "admin")
MIN_PASSWORD = 6
SIGNUP_DAYS = 14


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def _count(db: Session, column, *criteria) -> int:
    return db.query(func.count(column)).filter(*criteria).scalar() or 0


def _idioms_by_topic(db: Session, total: int) -> dict[str, int]:
    rows = (
        db.query(IdiomAspectMap.aspect_id, func.count(Idiom.id))
        .join(Idiom, Idiom.id == IdiomAspectMap.idiom_id)
        .filter(Idiom.archived_at.is_(None), IdiomAspectMap.aspect_id.in_(TOPIC_BY_ASPECT_ID))
        .group_by(IdiomAspectMap.aspect_id)
        .all()
    )
    by_topic = dict.fromkeys(ASPECT_ID_BY_TOPIC, 0)
    for aspect_id, count in rows:
        by_topic[TOPIC_BY_ASPECT_ID[aspect_id]] = count
    # An idiom without a topic aspect is shown as "other", like the idiom serializer does
    by_topic["other"] += total - sum(by_topic.values())
    return by_topic


def stats(db: Session) -> dict:
    now = datetime.now(UTC)
    idioms = _count(db, Idiom.id, Idiom.archived_at.is_(None))
    window_start = (now - timedelta(days=SIGNUP_DAYS - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    signups: dict[str, int] = {}
    for (created_at,) in db.query(User.created_at).filter(User.created_at >= window_start):
        if created_at:
            key = _aware(created_at).date().isoformat()
            signups[key] = signups.get(key, 0) + 1

    return {
        "users": {
            "total": _count(db, User.id),
            "students": _count(db, User.id, User.role == "student"),
            "admins": _count(db, User.id, User.role == "admin"),
            "newLast7Days": _count(db, User.id, User.created_at >= now - timedelta(days=7)),
        },
        "content": {"idioms": idioms, "byTopic": _idioms_by_topic(db, idioms)},
        "activity": {
            "gradings": _count(db, Submission.id),
            "quizzes": _count(db, QuizAttempt.id, QuizAttempt.completed_at.isnot(None)),
            "flashcardReviews": _count(db, FlashcardReview.id),
        },
        "signupsByDay": [
            {"date": day, "count": signups.get(day, 0)}
            for day in (
                (window_start + timedelta(days=i)).date().isoformat() for i in range(SIGNUP_DAYS)
            )
        ],
    }


def _last_active(db: Session, user_ids: list[int]) -> dict[int, datetime]:
    """Latest grading, quiz or flashcard review per user."""
    latest: dict[int, datetime] = {}
    if not user_ids:
        return latest
    rows = [
        db.query(Submission.user_id, func.max(Submission.submitted_at))
        .filter(Submission.user_id.in_(user_ids))
        .group_by(Submission.user_id),
        db.query(QuizAttempt.user_id, func.max(QuizAttempt.completed_at))
        .filter(QuizAttempt.user_id.in_(user_ids))
        .group_by(QuizAttempt.user_id),
        db.query(Flashcard.user_id, func.max(FlashcardReview.reviewed_at))
        .join(FlashcardReview, FlashcardReview.flashcard_id == Flashcard.id)
        .filter(Flashcard.user_id.in_(user_ids))
        .group_by(Flashcard.user_id),
    ]
    for query in rows:
        for user_id, at in query.all():
            if at is None:
                continue
            at = _aware(at)
            if user_id not in latest or at > latest[user_id]:
                latest[user_id] = at
    return latest


def list_users(db: Session, *, q: str | None, role: str | None, page: int, page_size: int) -> dict:
    query = db.query(User)
    if role in ROLES:
        query = query.filter(User.role == role)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(User.full_name.ilike(like), User.email.ilike(like)))
    total = query.count()
    rows = (
        query.order_by(User.created_at.desc(), User.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    last = _last_active(db, [u.id for u in rows])
    return {
        "items": [admin_user_out(u, last.get(u.id)) for u in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


def _get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


def _out(db: Session, user: User) -> dict:
    return admin_user_out(user, _last_active(db, [user.id]).get(user.id))


def _other_active_admins(db: Session, user_id: int) -> int:
    return _count(db, User.id, User.role == "admin", User.is_active.is_(True), User.id != user_id)


def _keep_an_admin(db: Session, user: User) -> None:
    if user.role == "admin" and user.is_active and _other_active_admins(db, user.id) == 0:
        raise HTTPException(
            status_code=400,
            detail="Hệ thống phải còn ít nhất một quản trị viên đang hoạt động",
        )


def create_user(db: Session, body) -> dict:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Vui lòng nhập họ tên")
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Email không hợp lệ")
    if len(body.password) < MIN_PASSWORD:
        raise HTTPException(status_code=400, detail="Mật khẩu cần tối thiểu 6 ký tự")
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ")
    if db.query(User.id).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email đã được đăng ký")

    user = User(
        full_name=name,
        email=email,
        password_hash=hash_password(body.password),
        role=body.role,
        daily_goal=10,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _out(db, user)


def update_user(db: Session, actor: User, user_id: int, patch: dict) -> dict:
    user = _get_user(db, user_id)
    if not patch:
        raise HTTPException(status_code=400, detail="Không có thay đổi nào để lưu")
    if "name" in patch and not (patch["name"] or "").strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập họ tên")
    if patch.get("role") is not None and patch["role"] not in ROLES:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ")
    changes_access = patch.get("role") is not None or patch.get("active") is not None
    if user.id == actor.id and changes_access:
        raise HTTPException(
            status_code=400,
            detail="Bạn không thể đổi vai trò hoặc khóa chính mình",
        )

    loses_admin = (patch.get("role") is not None and patch["role"] != "admin") or (
        patch.get("active") is False
    )
    if loses_admin:
        _keep_an_admin(db, user)

    if patch.get("name") is not None:
        user.full_name = patch["name"].strip()
    if patch.get("role") is not None:
        user.role = patch["role"]
    if patch.get("active") is not None:
        user.is_active = patch["active"]
    db.commit()
    db.refresh(user)
    return _out(db, user)


def delete_user(db: Session, actor: User, user_id: int) -> None:
    user = _get_user(db, user_id)
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail="Bạn không thể xóa chính mình")
    _keep_an_admin(db, user)

    attempts = select(QuizAttempt.id).where(QuizAttempt.user_id == user_id)
    quizzes = select(Quiz.id).where(Quiz.user_id == user_id)
    cards = select(Flashcard.id).where(Flashcard.user_id == user_id)
    questions = select(QuizQuestion.id).where(QuizQuestion.quiz_id.in_(quizzes))
    db.query(QuizAnswer).filter(
        or_(QuizAnswer.attempt_id.in_(attempts), QuizAnswer.question_id.in_(questions))
    ).delete(synchronize_session=False)
    db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).delete(synchronize_session=False)
    db.query(QuizQuestion).filter(QuizQuestion.quiz_id.in_(quizzes)).delete(
        synchronize_session=False
    )
    db.query(Quiz).filter(Quiz.user_id == user_id).delete(synchronize_session=False)
    db.query(FlashcardReview).filter(FlashcardReview.flashcard_id.in_(cards)).delete(
        synchronize_session=False
    )
    db.query(Flashcard).filter(Flashcard.user_id == user_id).delete(synchronize_session=False)
    db.query(Deck).filter(Deck.user_id == user_id).delete(synchronize_session=False)
    db.query(Submission).filter(Submission.user_id == user_id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()
