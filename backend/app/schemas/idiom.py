from pydantic import BaseModel, ConfigDict, Field


class IdiomQuery(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    q: str | None = None
    topic: str | None = None
    trait: str | None = None
    page: int = 1
    page_size: int = Field(default=20, alias="pageSize")
