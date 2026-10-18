from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import base64
import hashlib
import hmac
import secrets
from jose import JWTError, jwt
from passlib.context import CryptContext
from config import settings

# bcrypt_sha256 avoids bcrypt's 72-byte password truncation/limit while the
# legacy bcrypt scheme remains available for existing accounts.
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    deprecated="auto",
)
_PASSWORD_HASH_PREFIX = "apiradar$pbkdf2_sha256"
_PASSWORD_HASH_ROUNDS = 600_000
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

def hash_password(plain: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, _PASSWORD_HASH_ROUNDS)
    salt_text = base64.urlsafe_b64encode(salt).decode("ascii").rstrip("=")
    digest_text = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return f"{_PASSWORD_HASH_PREFIX}${_PASSWORD_HASH_ROUNDS}${salt_text}${digest_text}"

def verify_password(plain: str, hashed: str) -> bool:
    if hashed.startswith(f"{_PASSWORD_HASH_PREFIX}$"):
        try:
            prefix, algorithm, rounds_text, salt_text, digest_text = hashed.split("$", 4)
            if prefix != "apiradar":
                return False
            if algorithm != "pbkdf2_sha256":
                return False
            rounds = int(rounds_text)
            if rounds < 100_000 or rounds > 2_000_000:
                return False
            salt = base64.urlsafe_b64decode(salt_text + "=" * (-len(salt_text) % 4))
            expected = base64.urlsafe_b64decode(digest_text + "=" * (-len(digest_text) % 4))
            actual = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, rounds)
            return hmac.compare_digest(actual, expected)
        except (ValueError, TypeError):
            return False

    # Retain verification for accounts created before PBKDF2 became the default.
    if hashed.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            import bcrypt
            return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("ascii"))
        except (ValueError, TypeError):
            return False
    try:
        return pwd_context.verify(plain, hashed)
    except (ValueError, TypeError):
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
