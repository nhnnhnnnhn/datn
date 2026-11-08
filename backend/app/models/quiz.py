from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JsonText


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    difficulty: Mapped[str | None] = mapped_column(String(20))
    generated_by: Mapped[str | None] = mapped_column(String(100))
    config: Mapped[dict | None] = mapped_column(JsonText)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user = relationship("User", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    idiom_id: Mapped[int] = mapped_column(ForeignKey("idioms.id"), nullable=False)
    question_type: Mapped[str | None] = mapped_column(String(30))
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    highlight: Mapped[str | None] = mapped_column(Text)
    options: Mapped[dict | list | None] = mapped_column(JsonText)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)  # JSON list of indices
    explanation: Mapped[str | None] = mapped_column(Text)
    points: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")

    quiz = relationship("Quiz", back_populates="questions")
    idiom = relationship("Idiom", back_populates="quiz_questions")
    answers = relationship("QuizAnswer", back_populates="question")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    total_points: Mapped[int | None] = mapped_column(Integer)
    duration_sec: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    quiz = relationship("Quiz", back_populates="attempts")
    user = relationship("User", back_populates="quiz_attempts")
    answers = relationship("QuizAnswer", back_populates="attempt", cascade="all, delete-orphan")


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_quiz_answers_attempt_question"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("quiz_attempts.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("quiz_questions.id"), nullable=False)
    answer_text: Mapped[str | None] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    awarded_points: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    answered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("QuizQuestion", back_populates="answers")
