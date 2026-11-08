from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.services import idiom_service

router = APIRouter(prefix="/idioms", tags=["idioms"])


@router.get("")
def list_idioms(
    db: DbSession,
    _user: CurrentUser,
    q: str | None = None,
    topic: str | None = None,
    trait: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
):
    return idiom_service.list_idioms(
        db,
        q=q,
        topic=topic,
        trait=trait,
        page=page,
        page_size=page_size,
    )


@router.get("/daily")
def daily(db: DbSession, _user: CurrentUser):
    return idiom_service.daily_idiom(db)


@router.get("/random")
def random_idiom(
    db: DbSession,
    _user: CurrentUser,
    topic: str | None = None,
    trait: str | None = None,
):
    return idiom_service.random_idiom(db, topic=topic, trait=trait)


@router.get("/{idiom_id}")
def get_idiom(idiom_id: int, db: DbSession, _user: CurrentUser):
    return idiom_service.get_idiom(db, idiom_id)


@router.get("/{idiom_id}/neighbors")
def neighbors(idiom_id: int, db: DbSession, _user: CurrentUser):
    return idiom_service.neighbors(db, idiom_id)
