from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.services import progress_service

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/summary")
def summary(db: DbSession, user: CurrentUser):
    return progress_service.summary(db, user)
