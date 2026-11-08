from pydantic import BaseModel, ConfigDict, Field


class QuizConfigIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    count: int = Field(ge=1, le=50, default=10)
    types: list[str] = Field(default_factory=lambda: ["meaning", "reverse", "fill_blank"])
    topic: str | None = None
    trait: str | None = None
    deck_id: str | None = Field(default=None, alias="deckId")


class QuizAnswerIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question_id: str = Field(alias="questionId")
    selected: list[int]


class QuizSubmitIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    answers: list[QuizAnswerIn]
    duration_sec: int = Field(default=0, alias="durationSec")
