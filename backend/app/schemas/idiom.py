from pydantic import BaseModel


class IdiomQuery(BaseModel):
    q: str | None = None
    topic: str | None = None
    trait: str | None = None
    page: int = 1
    pageSize: int = 20
