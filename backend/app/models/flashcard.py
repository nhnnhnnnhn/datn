from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    idiom_id: Mapped[int] = mapped_column(ForeignKey("idioms.id"), nullable=False)
    deck_id: Mapped[str] = mapped_column(ForeignKey("decks.id"), nullable=False)
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    generated_by: Mapped[str | None] = mapped_column(String(100))
    # SM-2 style SRS fields used by the frontend
    ease: Mapped[float] = mapped_column(Float, nullable=False, server_default="2.5")
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    repetitions: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    last_reviewed: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user = relationship("User", back_populates="flashcards")
    idiom = relationship("Idiom", back_populates="flashcards")
    deck = relationship("Deck", back_populates="cards")
    reviews = relationship(
        "FlashcardReview",
        back_populates="flashcard",
        cascade="all, delete-orphan",
    )


class FlashcardReview(Base):
    __tablename__ = "flashcard_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flashcard_id: Mapped[int] = mapped_column(ForeignKey("flashcards.id"), nullable=False)
    confidence_rating: Mapped[int | None] = mapped_column(Integer)
    rating: Mapped[str | None] = mapped_column(String(20))  # again | hard | good | easy
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    flashcard = relationship("Flashcard", back_populates="reviews")
