from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AspectType, IdiomType


class Idiom(Base):
    __tablename__ = "idioms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phrase: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[IdiomType] = mapped_column(Enum(IdiomType, name="idiom_type"), nullable=False)
    meaning: Mapped[str] = mapped_column(Text, nullable=False)
    example_usage: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    aspects = relationship("IdiomAspect", secondary="idiom_aspect_map", back_populates="idioms")
    submissions = relationship("Submission", back_populates="idiom")
    quiz_questions = relationship("QuizQuestion", back_populates="idiom")
    flashcards = relationship("Flashcard", back_populates="idiom")


class IdiomAspect(Base):
    __tablename__ = "idiom_aspects"
    __table_args__ = (UniqueConstraint("name", "aspect", "type", name="uq_idiom_aspects_name_aspect_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    aspect: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[AspectType] = mapped_column(Enum(AspectType, name="aspect_type"), nullable=False)

    idioms = relationship("Idiom", secondary="idiom_aspect_map", back_populates="aspects")


class IdiomAspectMap(Base):
    __tablename__ = "idiom_aspect_map"

    idiom_id: Mapped[int] = mapped_column(ForeignKey("idioms.id"), primary_key=True)
    aspect_id: Mapped[int] = mapped_column(ForeignKey("idiom_aspects.id"), primary_key=True)
