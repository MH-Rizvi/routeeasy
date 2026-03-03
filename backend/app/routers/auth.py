from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app import models, schemas
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    verify_token
)
from fastapi import Response, Request

router = APIRouter()


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def signup(request: schemas.SignupRequest, response: Response, db: Session = Depends(get_db)):
    """Register a new user and create their location profile."""
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Hash password
    hashed_password = get_password_hash(request.password)
    
    # Create User
    new_user = models.User(
        email=request.email,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.flush()  # get new_user.id
    
    # Combine full location
    full_loc = f"{request.city}, {request.state}"
    
    # Create UserProfile
    new_profile = models.UserProfile(
        user_id=new_user.id,
        city=request.city,
        state=request.state,
        zip_code=request.zip_code,
        full_location=full_loc
    )
    db.add(new_profile)
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error creating user profile",
        )
        
    db.refresh(new_user)
    db.refresh(new_profile)
    
    # Generate tokens
    access_token = create_access_token(new_user.id)
    refresh_token = create_refresh_token(new_user.id)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,        # set True in production
        samesite="lax",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "city": new_profile.city,
            "state": new_profile.state,
            "full_location": new_profile.full_location
        }
    }


@router.post("/login", response_model=dict)
async def login(request: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Login and get access and refresh tokens."""
    
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
        
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
        
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,        # set True in production
        samesite="lax",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    profile = user.profile
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "city": profile.city if profile else "",
            "state": profile.state if profile else "",
            "full_location": profile.full_location if profile else ""
        }
    }


@router.post("/refresh", response_model=schemas.TokenResponse)
async def refresh(request: Request, response: Response):
    """Get a new access token using a valid refresh token from cookie."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
        
    user_id = verify_token(refresh_token, token_type="refresh")
    
    new_access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )
    
    return schemas.TokenResponse(
        access_token=new_access_token,
        token_type="bearer"
    )

@router.post("/logout")
async def logout(response: Response):
    """Clear the refresh token cookie."""
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=schemas.UserResponse)
async def me(current_user: models.User = Depends(get_current_user)):
    """Return the current logged-in user details."""
    profile = current_user.profile
    return schemas.UserResponse(
        id=current_user.id,
        email=current_user.email,
        city=profile.city if profile else "",
        state=profile.state if profile else "",
        full_location=profile.full_location if profile else ""
    )
