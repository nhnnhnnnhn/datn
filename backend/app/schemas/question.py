from pydantic import BaseModel, ConfigDict, Field


class QuizConfigIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    count: int = Field(ge=1, le=50, default=10)
    types: list[str] = Field(default_factory=lambda: ["meaning", "reverse", "fill_blank"])
    topic: str | None = None
    trait: str | None = None
    # true → LLM-assisted questions; false → rule-based. Omit → QUIZ_USE_LLM from .env
    ai_generate: bool | None = Field(default=None, alias="AI_generate")


class QuizAnswerIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question_id: str = Field(alias="questionId")
    selected: list[int]


class QuizSubmitIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    answers: list[QuizAnswerIn]
    duration_sec: int = Field(default=0, alias="durationSec")
