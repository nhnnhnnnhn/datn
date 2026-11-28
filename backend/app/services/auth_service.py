from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    generate_password_reset_code,
    hash_password,
    hash_password_reset_code,
    password_reset_expiry,
    verify_password,
)
from app.lib.email import send_password_reset_email
from app.lib.serializers import user_out
from app.models import User

_FORGOT_MESSAGE = "Nếu email tồn tại, hãy dùng mã đặt lại mật khẩu trong thời hạn cho phép."
_FORGOT_SENT_MESSAGE = "Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi. Hãy kiểm tra hộp thư."
_RESET_INVALID = "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"


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
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa")
    return {"token": create_access_token(str(user.id)), "user": user_out(user)}


def forgot_password(db: Session, email: str) -> dict:
    email = _normalize_email(email)
    out: dict = {"message": _FORGOT_MESSAGE}
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return out

    code = generate_password_reset_code()
    user.password_reset_code_hash = hash_password_reset_code(code)
    user.password_reset_expires_at = password_reset_expiry()
    db.commit()

    emailed = send_password_reset_email(
        to=user.email,
        reset_token=code,
        name=user.full_name or "",
    )
    if emailed:
        out["message"] = _FORGOT_SENT_MESSAGE
    return out


def reset_password(db: Session, token: str, password: str) -> dict:
    _validate_password(password)
    code_hash = hash_password_reset_code(token)
    user = (
        db.query(User)
        .filter(
            User.password_reset_code_hash == code_hash,
            User.password_reset_expires_at.isnot(None),
        )
        .first()
    )
    expires = user.password_reset_expires_at if user else None
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if not user or expires is None or expires <= datetime.now(UTC):
        raise HTTPException(status_code=400, detail=_RESET_INVALID)

    user.password_hash = hash_password(password)
    user.password_reset_code_hash = None
    user.password_reset_expires_at = None
    db.commit()
    db.refresh(user)
    return {"token": create_access_token(str(user.id)), "user": user_out(user)}
