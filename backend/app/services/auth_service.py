from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.lib.serializers import user_out
from app.models import User


def _validate(email: str, password: str) -> str:
    email = email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Email không hợp lệ")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu cần tối thiểu 6 ký tự")
    return email


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
