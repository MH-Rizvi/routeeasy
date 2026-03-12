from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.supabase_client import supabase
from app.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency to get the current authenticated user from a Supabase access token.
    Throws 401 if invalid. Returns the Supabase Auth user object.
    """
    try:
        response = supabase.auth.get_user(token)
        if response and hasattr(response, "user") and response.user:
            return response.user

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def admin_required(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Dependency that enforces admin role.
    Chains off get_current_user — first authenticates, then checks the
    user's role in user_profiles. Raises HTTP 403 if role != 'admin'.
    """
    from app.models import UserProfile

    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == str(current_user.id))
        .first()
    )

    if not profile or profile.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return current_user
