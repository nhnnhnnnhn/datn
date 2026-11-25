from pydantic import BaseModel, ConfigDict, Field


class GradeIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    idiom_id: int = Field(alias="idiomId")
    answer: str = Field(min_length=1)
