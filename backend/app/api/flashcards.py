from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.core.deps import CurrentUser, DbSession
from app.services import flashcard_service

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


class DeckGenerateIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    count: int = Field(default=10, ge=1, le=100)
    topic: str | None = None
    trait: str | None = None
    from_weak: bool = Field(default=False, alias="fromWeak")


@router.get("/decks")
def decks(db: DbSession, user: CurrentUser):
    return flashcard_service.list_decks(db, user)


@router.post("/decks/generate")
def generate_deck(body: DeckGenerateIn, db: DbSession, user: CurrentUser):
    return flashcard_service.generate_deck(db, user, body.model_dump(by_alias=True))


@router.get("/decks/{deck_id}")
def get_deck(deck_id: str, db: DbSession, user: CurrentUser):
    return flashcard_service.get_deck(db, user, deck_id)


@router.delete("/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: str, db: DbSession, user: CurrentUser):
    flashcard_service.delete_deck(db, user, deck_id)


@router.get("/decks/{deck_id}/cards")
def cards(deck_id: str, db: DbSession, user: CurrentUser):
    return flashcard_service.list_cards(db, user, deck_id)
