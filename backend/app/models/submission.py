from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JsonText


class Submission(Base):
    """Practice grading attempt (student explains one idiom)."""

    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    idiom_id: Mapped[int] = mapped_column(ForeignKey("idioms.id"), nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    accuracy_score: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    completeness_score: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    cultural_alignment_score: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    fluency_score: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    overall_score: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    feedback: Mapped[dict | str | None] = mapped_column(JsonText)
    ai_model: Mapped[str | None] = mapped_column(String(100))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="submissions")
    idiom = relationship("Idiom", back_populates="submissions")
