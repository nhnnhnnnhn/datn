from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.lib.serializers import user_out
from app.schemas.user import ForgotPasswordIn, LoginIn, RegisterIn, ResetPasswordIn
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginIn, db: DbSession):
    return auth_service.login(db, body.email, body.password)


@router.post("/register")
def register(body: RegisterIn, db: DbSession):
    return auth_service.register(db, body.name, body.email, body.password, body.role)


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordIn, db: DbSession):
    return auth_service.forgot_password(db, body.email)


@router.post("/reset-password")
def reset_password(body: ResetPasswordIn, db: DbSession):
    return auth_service.reset_password(db, body.token, body.password)


@router.get("/me")
def me(user: CurrentUser):
    return user_out(user)
