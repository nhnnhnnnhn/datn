from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.schemas.grading import GradeIn
from app.services import grading_service

router = APIRouter(prefix="/grading", tags=["grading"])


@router.post("")
def grade(body: GradeIn, db: DbSession, user: CurrentUser):
    return grading_service.grade(db, user, body.idiom_id, body.answer)


@router.get("/history")
def history(
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
):
    return grading_service.history(db, user, limit)
