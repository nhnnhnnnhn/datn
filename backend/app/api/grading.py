from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models import User
from app.schemas.grading import GradeIn
from app.services import grading_service

router = APIRouter(prefix="/grading", tags=["grading"])


@router.post("")
def grade(body: GradeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return grading_service.grade(db, user, body.idiomId, body.answer)


@router.get("/history")
def history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return grading_service.history(db, user, limit)
