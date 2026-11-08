from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.schemas.question import QuizConfigIn, QuizSubmitIn
from app.services import quiz_service

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.post("/generate")
def generate(body: QuizConfigIn, db: DbSession, user: CurrentUser):
    return quiz_service.generate(db, user, body.model_dump(by_alias=True))


@router.post("/{quiz_id}/submit")
def submit(
    quiz_id: str,
    body: QuizSubmitIn,
    db: DbSession,
    user: CurrentUser,
):
    answers = [a.model_dump(by_alias=True) for a in body.answers]
    return quiz_service.submit(db, user, quiz_id, answers, body.duration_sec)


@router.get("/history")
def history(
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
):
    return quiz_service.history(db, user, limit)
