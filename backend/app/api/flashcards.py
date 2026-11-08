from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models import User
from app.services import flashcard_service

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


class DeckGenerateIn(BaseModel):
    name: str | None = None
    count: int = Field(default=10, ge=1, le=100)
    topic: str | None = None
    trait: str | None = None
    fromWeak: bool = False


@router.get("/decks")
def decks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return flashcard_service.list_decks(db, user)


@router.post("/decks/generate")
def generate_deck(body: DeckGenerateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return flashcard_service.generate_deck(db, user, body.model_dump())


@router.get("/decks/{deck_id}")
def get_deck(deck_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return flashcard_service.get_deck(db, user, deck_id)


@router.delete("/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    flashcard_service.delete_deck(db, user, deck_id)


@router.get("/decks/{deck_id}/cards")
def cards(deck_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return flashcard_service.list_cards(db, user, deck_id)
