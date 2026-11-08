from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models import User
from app.services import idiom_service

router = APIRouter(prefix="/idioms", tags=["idioms"])


@router.get("")
def list_idioms(
    q: str | None = None,
    topic: str | None = None,
    trait: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return idiom_service.list_idioms(db, q=q, topic=topic, trait=trait, page=page, page_size=pageSize)


@router.get("/daily")
def daily(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return idiom_service.daily_idiom(db)


@router.get("/random")
def random_idiom(
    topic: str | None = None,
    trait: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return idiom_service.random_idiom(db, topic=topic, trait=trait)


@router.get("/{idiom_id}")
def get_idiom(idiom_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return idiom_service.get_idiom(db, idiom_id)


@router.get("/{idiom_id}/neighbors")
def neighbors(idiom_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return idiom_service.neighbors(db, idiom_id)
