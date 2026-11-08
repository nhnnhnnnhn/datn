from pydantic import BaseModel, ConfigDict, Field


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Paginated(BaseModel):
    items: list
    total: int
    page: int
    pageSize: int
