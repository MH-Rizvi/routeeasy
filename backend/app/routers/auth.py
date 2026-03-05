from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.supabase_client import supabase

router = APIRouter()


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def signup(request: schemas.SignupRequest, response: Response, db: Session = Depends(get_db)):
    """Register a new user via Supabase Auth and create their location profile."""
    try:
        auth_res = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_res.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup failed or email already registered"
            )
            
        user_uuid = auth_res.user.id
        full_loc = f"{request.city}, {request.state}"
        
        new_profile = models.UserProfile(
            user_id=user_uuid,
            first_name=request.first_name,
            last_name=request.last_name,
            birthday=request.birthday,
            city=request.city,
            state=request.state,
            zip_code=request.zip_code,
            full_location=full_loc
        )
        try:
            db.add(new_profile)
            db.commit()
            db.refresh(new_profile)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please sign in instead."
            )
        
        # If email confirmation is enabled in Supabase, session will be None.
        # The user's identities list will also be empty until they confirm.
        requires_verification = (
            auth_res.session is None or 
            not getattr(auth_res.user, 'identities', None)
        )
        
        if requires_verification:
            return {
                "message": "Please check your email to verify your account before logging in.",
                "requires_verification": True,
                "user": {
                    "id": user_uuid,
                    "email": request.email,
                }
            }
        
        return {
            "access_token": auth_res.session.access_token,
            "user": {
                "id": user_uuid,
                "email": request.email,
                "first_name": request.first_name,
                "last_name": request.last_name,
                "city": request.city,
                "state": request.state,
                "zip_code": request.zip_code,
                "full_location": full_loc
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/check-email", response_model=dict)
async def check_email(request: schemas.EmailCheckRequest):
    """Check if an email is already registered using the admin client."""
    try:
        # supabase is initialized with service_role_key in supabase_client.py 
        # so we have admin access to list users.
        users = supabase.auth.admin.list_users()
        # users is a list of User objects
        exists = any(u.email.lower() == request.email.lower() for u in users)
        return {"exists": exists}
    except Exception as e:
        print(f"Error checking email: {e}")
        # Default to false so we don't block signup on a weird API error
        return {"exists": False}


@router.post("/login", response_model=dict)
async def login(request: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Login via Supabase Auth and fetch profile."""
    try:
        auth_res = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_res.user or not auth_res.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
            
        user_uuid = auth_res.user.id
        
        profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_uuid).first()
        
        return {
            "access_token": auth_res.session.access_token,
            "refresh_token": auth_res.session.refresh_token,
            "user": {
                "id": user_uuid,
                "email": request.email,
                "city": profile.city if profile else "",
                "state": profile.state if profile else "",
                "zip_code": profile.zip_code if profile else "",
                "full_location": profile.full_location if profile else ""
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/google", response_model=dict)
async def google_login():
    """Get Google OAuth URL via Supabase."""
    try:
        auth_res = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {"redirect_to": "http://localhost:5173"}
        })
        return {"url": auth_res.url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/refresh", response_model=dict)
async def refresh(request: Request):
    """Get a new access token using a refresh token."""
    try:
        body = await request.json()
        refresh_token = body.get("refresh_token")
    except Exception:
        refresh_token = request.cookies.get("refresh_token")
        
    if not refresh_token:
        refresh_token = request.cookies.get("refresh_token")
        
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
        
    try:
        auth_res = supabase.auth.refresh_session(refresh_token)
        if not auth_res.session:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        return {"access_token": auth_res.session.access_token}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.get("/me", response_model=dict)
async def me(current_user: Any = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the current user's profile based on the validated Supabase access token."""
    try:
        profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == current_user.id).first()
        
        if not profile:
            # If no profile exists, this is a new Google/OAuth user who hasn't 
            # finished onboarding. Send a clean response with is_new_user: True
            # so the frontend knows to route them to /complete-profile.
            return {
                "id": str(current_user.id),
                "email": current_user.email,
                "first_name": None,
                "last_name": None,
                "city": None,
                "state": None,
                "zip_code": None,
                "is_new_user": True
            }
        
        # Consider a user "new" (needs onboarding) if they have no city or state set,
        # or if it's the default placeholder value.
        is_new = (
            not profile.city or 
            not profile.state or 
            profile.city == "Set your city" or 
            profile.city.strip() == "" or
            profile.state.strip() == "??" or
            profile.state.strip() == ""
        )
        
        return {
            "id": str(current_user.id),
            "email": current_user.email,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "birthday": profile.birthday,
            "city": profile.city,
            "state": profile.state,
            "zip_code": profile.zip_code,
            "full_location": profile.full_location,
            "is_new_user": is_new
        }
    except Exception as e:
        print(f"Error fetching profile for {current_user.id}: {e}")
        # Fallback response for ANY error so we don't return a 500 
        # and cause an infinite login loop on the frontend.
        return {
            "id": str(current_user.id),
            "email": current_user.email,
            "first_name": None,
            "last_name": None,
            "city": None,
            "state": None,
            "zip_code": None,
            "is_new_user": True
        }


class ProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    birthday: str | None = None


@router.patch("/me", response_model=dict)
async def update_profile(request: ProfileUpdate, current_user: Any = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update the current user's profile information."""
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == str(current_user.id)).first()
    if not profile:
        profile = models.UserProfile(user_id=str(current_user.id))
        db.add(profile)

    if request.first_name is not None: profile.first_name = request.first_name
    if request.last_name is not None: profile.last_name = request.last_name
    if request.city is not None: profile.city = request.city
    if request.state is not None: profile.state = request.state
    if request.zip_code is not None: profile.zip_code = request.zip_code
    if request.birthday is not None: profile.birthday = request.birthday
    
    if profile.city and profile.state:
        profile.full_location = f"{profile.city}, {profile.state}"
    
    db.commit()
    db.refresh(profile)
    
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "birthday": profile.birthday,
        "city": profile.city,
        "state": profile.state,
        "zip_code": profile.zip_code,
        "full_location": profile.full_location,
        "is_new_user": False
    }


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(current_user: Any = Depends(get_current_user), db: Session = Depends(get_db)):
    """Permanently delete user account and all associated data."""
    try:
        user_uuid = str(current_user.id)
        
        # 1. Purge all vector embeddings mapped to this user
        from app.services import vector_service
        vector_service.delete_user_collections(user_uuid)
        
        # 2. Hard delete all related database rows
        # (Order matters to prevent foreign key issues if cascades aren't fully configured)
        db.query(models.Stop).filter(models.Stop.user_id == user_uuid).delete()
        db.query(models.TripHistory).filter(models.TripHistory.user_id == user_uuid).delete()
        db.query(models.Trip).filter(models.Trip.user_id == user_uuid).delete()
        db.query(models.LLMLog).filter(models.LLMLog.user_id == user_uuid).delete()
        db.query(models.UserProfile).filter(models.UserProfile.user_id == user_uuid).delete()
        db.commit()

        # 3. Destroy account from Supabase Auth completely (using the service role admin key)
        res = supabase.auth.admin.delete_user(user_uuid)
        
    except Exception as e:
        db.rollback()
        print(f"Error during account deletion: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete account from system."
        )
