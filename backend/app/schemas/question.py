from pydantic import BaseModel, Field


class QuizConfigIn(BaseModel):
    count: int = Field(ge=1, le=50, default=10)
    types: list[str] = Field(default_factory=lambda: ["meaning", "reverse", "fill_blank"])
    topic: str | None = None
    trait: str | None = None
    deckId: str | None = None


class QuizAnswerIn(BaseModel):
    questionId: str
    selected: list[int]


class QuizSubmitIn(BaseModel):
    answers: list[QuizAnswerIn]
    durationSec: int = 0
