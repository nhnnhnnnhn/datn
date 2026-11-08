from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Deck(Base):
    __tablename__ = "decks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source: Mapped[str] = mapped_column(String(20), nullable=False)  # topic | ai | saved
    topic: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="decks")
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")
