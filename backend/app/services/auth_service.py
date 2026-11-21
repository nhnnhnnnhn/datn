from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_claims,
    hash_password,
    password_fingerprint,
    verify_password,
)
from app.lib.serializers import user_out
from app.models import User

_FORGOT_MESSAGE = "Nếu email tồn tại, hãy dùng mã đặt lại mật khẩu trong thời hạn cho phép."


def _normalize_email(email: str) -> str:
    email = email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Email không hợp lệ")
    return email


def _validate_password(password: str) -> None:
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu cần tối thiểu 6 ký tự")


def _validate(email: str, password: str) -> str:
    _validate_password(password)
    return _normalize_email(email)


def register(db: Session, name: str, email: str, password: str, role: str) -> dict:
    if not name.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập họ tên")
    email = _validate(email, password)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email đã được đăng ký")
    if role not in ("student", "teacher"):
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ")

    user = User(
        full_name=name.strip(),
        email=email,
        password_hash=hash_password(password),
        role=role,
        daily_goal=10,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_access_token(str(user.id)), "user": user_out(user)}


def login(db: Session, email: str, password: str) -> dict:
    email = _validate(email, password)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    return {"token": create_access_token(str(user.id)), "user": user_out(user)}


def forgot_password(db: Session, email: str) -> dict:
    email = _normalize_email(email)
    settings = get_settings()
    out: dict = {"message": _FORGOT_MESSAGE}
    user = db.query(User).filter(User.email == email).first()
    if user and settings.expose_reset_token:
        out["resetToken"] = create_password_reset_token(str(user.id), user.password_hash)
    return out


def reset_password(db: Session, token: str, password: str) -> dict:
    _validate_password(password)
    claims = decode_password_reset_claims(token)
    if not claims:
        raise HTTPException(
            status_code=400,
            detail="Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
        )
    user_id, pwd_fp = claims
    user = db.get(User, int(user_id))
    if not user or password_fingerprint(user.password_hash) != pwd_fp:
        raise HTTPException(
            status_code=400,
            detail="Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
        )

    user.password_hash = hash_password(password)
    db.commit()
    db.refresh(user)
    return {"token": create_access_token(str(user.id)), "user": user_out(user)}
