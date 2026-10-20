import uuid
import hmac
from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from fastapi import Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from services.auth_service import decode_access_token
from config import settings

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

async def require_admin_key(x_admin_key: Optional[str] = Header(default=None)) -> None:
    """Protect operational endpoints with a separately configured secret."""
    if not settings.ADMIN_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin operations are disabled")
    if not x_admin_key or not hmac.compare_digest(x_admin_key, settings.ADMIN_API_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")

async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    token = credentials.credentials if credentials else (request.cookies.get("apiradar_session") if request else None)
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        return None
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials if credentials else (request.cookies.get("apiradar_session") if request else None)
    if not token:
        raise credentials_exception
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
        
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
        
    return user
