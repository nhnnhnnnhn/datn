from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": subject, "typ": "access", "exp": expire},
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> str | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if payload.get("typ") not in (None, "access"):
        return None
    sub = payload.get("sub")
    return str(sub) if sub is not None else None


def _password_fingerprint(password_hash: str) -> str:
    return password_hash[-16:]


def create_password_reset_token(subject: str, password_hash: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.password_reset_expire_minutes)
    return jwt.encode(
        {
            "sub": subject,
            "typ": "pwd_reset",
            "pwd": _password_fingerprint(password_hash),
            "exp": expire,
        },
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def decode_password_reset_claims(token: str) -> tuple[str, str] | None:
    """Return (user_id, password_fingerprint) for a password-reset JWT, else None."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if payload.get("typ") != "pwd_reset":
        return None
    sub = payload.get("sub")
    pwd = payload.get("pwd")
    if sub is None or not isinstance(pwd, str):
        return None
    return str(sub), pwd


def password_fingerprint(password_hash: str) -> str:
    return _password_fingerprint(password_hash)
