import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
RESET_CODE_DIGITS = 6


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


def generate_password_reset_code() -> str:
    """Return a zero-padded numeric code (e.g. 048291)."""
    n = secrets.randbelow(10**RESET_CODE_DIGITS)
    return f"{n:0{RESET_CODE_DIGITS}d}"


def hash_password_reset_code(code: str) -> str:
    settings = get_settings()
    normalized = "".join(ch for ch in code.strip() if ch.isdigit())
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        normalized.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def password_reset_expiry() -> datetime:
    settings = get_settings()
    return datetime.now(UTC) + timedelta(minutes=settings.password_reset_expire_minutes)
