from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.lib.serializers import user_out
from app.models import User
from app.schemas.user import LoginIn, RegisterIn
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    return auth_service.login(db, body.email, body.password)


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    return auth_service.register(db, body.name, body.email, body.password, body.role)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)
