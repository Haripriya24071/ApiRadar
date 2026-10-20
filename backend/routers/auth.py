import secrets
import uuid
from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from jose import jwk, jwt as jose_jwt
from jose.exceptions import JWTClaimsError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import get_current_user
from models.oauth_identity import OAuthIdentity
from models.user import User
from services.auth_service import create_access_token, hash_password, verify_password
from services.login_alerts import register_login_device, send_new_device_alert

router = APIRouter(prefix="/auth", tags=["auth"])
OAUTH_STATE_COOKIE = "apiradar_oauth_state"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    user: UserResponse
    token_type: str = "cookie"


def _secure_cookie() -> bool:
    return settings.APP_ENV.lower() in {"production", "prod"}


def _frontend_url(path: str) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}{path}"


def _redirect_auth_error(error: str) -> RedirectResponse:
    return RedirectResponse(f"{_frontend_url('/login')}?auth_error={error}", status_code=303)


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        "apiradar_session",
        token,
        max_age=60 * 60 * 24 * 7,
        httponly=True,
        secure=_secure_cookie(),
        samesite="lax",
        path="/",
    )


async def _start_oauth(provider: str) -> RedirectResponse:
    if provider == "google":
        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id or not settings.GOOGLE_CLIENT_SECRET:
            return _redirect_auth_error("google_not_configured")
        state, nonce = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        query = urlencode({
            "client_id": client_id,
            "redirect_uri": f"{settings.BACKEND_BASE_URL.rstrip('/')}/api/auth/google/callback",
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "nonce": nonce,
            "prompt": "select_account",
        })
        url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    else:
        client_id = settings.GITHUB_CLIENT_ID
        if not client_id or not settings.GITHUB_CLIENT_SECRET:
            return _redirect_auth_error("github_not_configured")
        state, nonce = secrets.token_urlsafe(32), ""
        query = urlencode({
            "client_id": client_id,
            "redirect_uri": f"{settings.BACKEND_BASE_URL.rstrip('/')}/api/auth/github/callback",
            "scope": "read:user user:email",
            "state": state,
        })
        url = f"https://github.com/login/oauth/authorize?{query}"

    response = RedirectResponse(url, status_code=303)
    response.set_cookie(
        OAUTH_STATE_COOKIE,
        f"{provider}:{state}:{nonce}",
        max_age=600,
        httponly=True,
        secure=_secure_cookie(),
        samesite="lax",
        path="/api/auth",
    )
    return response


def _validate_oauth_state(provider: str, state: str, request: Request) -> bool:
    cookie = request.cookies.get(OAUTH_STATE_COOKIE, "")
    parts = cookie.split(":", 2)
    return len(parts) == 3 and parts[0] == provider and secrets.compare_digest(parts[1], state)


def _clear_oauth_cookie(response: Response) -> None:
    response.delete_cookie(OAUTH_STATE_COOKIE, path="/api/auth", secure=_secure_cookie(), httponly=True, samesite="lax")


def _oauth_error_summary(exc: Exception) -> str:
    """Describe upstream/auth failures without logging credentials or tokens."""
    if isinstance(exc, JWTClaimsError):
        return f"identity-token claims rejected: {str(exc)[:160]}"
    if isinstance(exc, httpx.HTTPStatusError):
        provider_error = ""
        try:
            provider_error = str(exc.response.json().get("error", ""))[:80]
        except (ValueError, AttributeError):
            pass
        suffix = f" ({provider_error})" if provider_error else ""
        return f"provider returned HTTP {exc.response.status_code}{suffix}"
    if isinstance(exc, httpx.RequestError):
        return f"provider connection failed: {type(exc).__name__}"
    return type(exc).__name__


async def _google_profile(code: str, nonce: str) -> tuple[str, str]:
    redirect_uri = f"{settings.BACKEND_BASE_URL.rstrip('/')}/api/auth/google/callback"
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_response.raise_for_status()
        token_payload = token_response.json()
        id_token = token_payload.get("id_token")
        access_token = token_payload.get("access_token")
        if not id_token or not access_token:
            raise ValueError("Google did not return the tokens required to validate this sign-in")
        header = jose_jwt.get_unverified_header(id_token)
        if header.get("alg") != "RS256" or not header.get("kid"):
            raise ValueError("Google identity token used an unsupported signing key")
        jwks_response = await client.get("https://www.googleapis.com/oauth2/v3/certs")
        jwks_response.raise_for_status()
        key_data = next((key for key in jwks_response.json().get("keys", []) if key.get("kid") == header["kid"]), None)
        if not key_data:
            raise ValueError("Google signing key was not found")
        signing_key = jwk.construct(key_data, algorithm="RS256")
        claims = jose_jwt.decode(
            id_token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            access_token=access_token,
            options={"verify_iss": False},
        )
        if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
            raise ValueError("Google identity token issuer was invalid")
        if not secrets.compare_digest(str(claims.get("nonce", "")), nonce):
            raise ValueError("Google identity token nonce did not match")
        if claims.get("email_verified") is not True:
            raise ValueError("Google account email is not verified")
        subject, email = claims.get("sub"), claims.get("email")
        if not subject or not email:
            raise ValueError("Google did not provide a verified email address")
        return str(subject), str(email).strip().casefold()


async def _github_profile(code: str) -> tuple[str, str]:
    redirect_uri = f"{settings.BACKEND_BASE_URL.rstrip('/')}/api/auth/github/callback"
    headers = {"Accept": "application/json", "User-Agent": "ApiRadar"}
    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            raise ValueError("GitHub did not return an access token")
        auth_headers = {"Authorization": f"Bearer {access_token}"}
        user_response = await client.get("https://api.github.com/user", headers=auth_headers)
        user_response.raise_for_status()
        github_user = user_response.json()
        emails_response = await client.get("https://api.github.com/user/emails", headers=auth_headers)
        emails_response.raise_for_status()
        emails = emails_response.json()
        verified_primary = next(
            (item.get("email") for item in emails if item.get("primary") and item.get("verified")),
            None,
        )
        if not verified_primary:
            verified_primary = next((item.get("email") for item in emails if item.get("verified")), None)
        subject = github_user.get("id")
        if not subject or not verified_primary:
            raise ValueError("GitHub must provide a verified email address to sign in")
        return str(subject), str(verified_primary).strip().casefold()


async def _get_or_create_oauth_user(provider: str, subject: str, email: str, db: AsyncSession) -> User:
    identity_result = await db.execute(select(OAuthIdentity).where(
        OAuthIdentity.provider == provider,
        OAuthIdentity.provider_subject == subject,
    ))
    identity = identity_result.scalar_one_or_none()
    if identity:
        user_result = await db.execute(select(User).where(User.id == identity.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            return user

    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if user is None:
        user = User(email=email, password_hash=f"oauth${secrets.token_urlsafe(32)}")
        db.add(user)
        await db.flush()
    db.add(OAuthIdentity(user_id=user.id, provider=provider, provider_subject=subject))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        identity_result = await db.execute(select(OAuthIdentity).where(
            OAuthIdentity.provider == provider,
            OAuthIdentity.provider_subject == subject,
        ))
        identity = identity_result.scalar_one_or_none()
        if identity:
            user_result = await db.execute(select(User).where(User.id == identity.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                return user
        raise
    await db.refresh(user)
    return user


@router.get("/providers")
async def oauth_providers():
    return {
        "google": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
        "github": bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET),
    }


@router.get("/google")
async def google_start():
    return await _start_oauth("google")


@router.get("/github")
async def github_start():
    return await _start_oauth("github")


async def _complete_provider_login(provider: str, code: str, request: Request, db: AsyncSession, background_tasks: BackgroundTasks):
    if provider == "google":
        cookie = request.cookies.get(OAUTH_STATE_COOKIE, "")
        parts = cookie.split(":", 2)
        if len(parts) != 3:
            raise ValueError("OAuth state expired; please start sign-in again")
        subject, email = await _google_profile(code, parts[2])
    else:
        subject, email = await _github_profile(code)
    user = await _get_or_create_oauth_user(provider, subject, email, db)
    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    response = RedirectResponse(_frontend_url("/auth/callback?status=success"), status_code=303)
    _clear_oauth_cookie(response)
    _set_session_cookie(response, token)
    is_new_device = await register_login_device(user, request, response, db)
    if is_new_device:
        background_tasks.add_task(send_new_device_alert, user.email, request.headers.get("user-agent", ""))
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if error:
        return _redirect_auth_error("google_cancelled")
    if not code or not state or not _validate_oauth_state("google", state, request):
        return _redirect_auth_error("oauth_state_invalid")
    try:
        return await _complete_provider_login("google", code, request, db, background_tasks)
    except Exception as exc:
        print(f"[OAuth] Google sign-in failed: {_oauth_error_summary(exc)}")
        return _redirect_auth_error("google_signin_failed")


@router.get("/github/callback")
async def github_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if error:
        return _redirect_auth_error("github_cancelled")
    if not code or not state or not _validate_oauth_state("github", state, request):
        return _redirect_auth_error("oauth_state_invalid")
    try:
        return await _complete_provider_login("github", code, request, db, background_tasks)
    except Exception as exc:
        print(f"[OAuth] GitHub sign-in failed: {_oauth_error_summary(exc)}")
        return _redirect_auth_error("github_signin_failed")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    email = str(req.email).strip().casefold()
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    new_user = User(email=email, password_hash=hash_password(req.password))
    db.add(new_user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=SessionResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == str(req.email).strip().casefold()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    _set_session_cookie(response, token)
    is_new_device = await register_login_device(user, request, response, db)
    if is_new_device:
        background_tasks.add_task(send_new_device_alert, user.email, request.headers.get("user-agent", ""))
    return SessionResponse(user=UserResponse.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie(
        "apiradar_session",
        path="/",
        secure=_secure_cookie(),
        httponly=True,
        samesite="lax",
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
