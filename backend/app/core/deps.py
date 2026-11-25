from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models import User

bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]
AuthCreds = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def get_current_user(creds: AuthCreds, db: DbSession) -> User:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bạn cần đăng nhập",
        )
    user_id = decode_access_token(creds.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ",
        )
    user = db.get(User, int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bạn cần đăng nhập",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
