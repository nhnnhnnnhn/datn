from pydantic import BaseModel, ConfigDict, Field


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    role: str = Field(pattern="^(student|teacher)$")


class ForgotPasswordIn(BaseModel):
    email: str


class ResetPasswordIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    token: str = Field(min_length=1)
    password: str = Field(min_length=6)
