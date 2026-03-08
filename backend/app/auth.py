from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.config import settings
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class AuthUser:
    """Lightweight user object extracted from a verified JWT."""
    def __init__(self, id: str, email: str):
        self.id = id
        self.email = email


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency to get the current authenticated user.
    Decodes the Supabase JWT locally using the shared JWT secret (HS256).
    Zero network calls — instant validation.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    secret = settings.jwt_secret
    if not secret:
        logger.error("JWT_SECRET is not configured — cannot validate tokens")
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        user_id: str = payload.get("sub")
        user_email: str = payload.get("email", "")

        if not user_id:
            raise credentials_exception

        return AuthUser(id=user_id, email=user_email)

    except JWTError as e:
        logger.warning(f"JWT decode failed: {e}")
        raise credentials_exception
