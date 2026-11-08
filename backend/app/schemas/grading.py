from pydantic import BaseModel, Field


class GradeIn(BaseModel):
    idiomId: int
    answer: str = Field(min_length=1)
