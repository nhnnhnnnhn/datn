from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models import User
from app.services import progress_service

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return progress_service.summary(db, user)
