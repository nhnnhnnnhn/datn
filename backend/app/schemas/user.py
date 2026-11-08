from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    role: str = Field(pattern="^(student|teacher)$")
