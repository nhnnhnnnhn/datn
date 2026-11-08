from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # student, teacher, admin
    daily_goal: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    submissions = relationship("Submission", back_populates="user")
    quizzes = relationship("Quiz", back_populates="user")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    flashcards = relationship("Flashcard", back_populates="user")
    decks = relationship("Deck", back_populates="user")
