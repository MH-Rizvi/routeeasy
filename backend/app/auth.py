from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.supabase_client import supabase

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
