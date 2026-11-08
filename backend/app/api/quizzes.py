from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models import User
from app.schemas.question import QuizConfigIn, QuizSubmitIn
from app.services import quiz_service

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.post("/generate")
def generate(body: QuizConfigIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return quiz_service.generate(db, user, body.model_dump())


@router.post("/{quiz_id}/submit")
def submit(
    quiz_id: str,
    body: QuizSubmitIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    answers = [a.model_dump() for a in body.answers]
    return quiz_service.submit(db, user, quiz_id, answers, body.durationSec)


@router.get("/history")
def history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return quiz_service.history(db, user, limit)
