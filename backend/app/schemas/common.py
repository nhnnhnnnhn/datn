from pydantic import BaseModel, ConfigDict, Field


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Paginated(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list
    total: int
    page: int
    page_size: int = Field(alias="pageSize")
