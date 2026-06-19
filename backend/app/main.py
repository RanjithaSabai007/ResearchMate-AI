from fastapi import FastAPI, Depends, HTTPException, Request, Response, status, UploadFile, File, Form
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
from uuid import UUID

from app import models, schemas, crud, auth
from app.database import engine, get_db

# Initialize Database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ResearchMate AI API",
    description="Secure research management backend",
    version="1.0.0"
)

# CORS Configuration
# Since we are running locally (e.g. FastAPI on 8000, Vite on 5173), we allow the origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Global Exception Handlers for Unified Response Formatting
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        error_code = detail.get("error_code", "ERROR")
        message = detail.get("message", "An error occurred")
        details = detail.get("details", None)
    else:
        error_code = "ERROR"
        message = str(exc.detail)
        details = None
        
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error_code": error_code,
            "message": message,
            "details": details
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(x) for x in err.get("loc", []))
        errors.append(f"{loc}: {err.get('msg')}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": None,
            "error_code": "VALIDATION_ERROR",
            "message": "Request validation failed.",
            "details": errors
        }
    )

# Dependency to fetch and validate active session from Authorization header
def get_current_session(request: Request, db: Session = Depends(get_db)) -> models.Session:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status_code": 401,
                "error_code": "UNAUTHORIZED",
                "message": "Authorization header is missing or malformed."
            }
        )
    
    token = auth_header.split(" ")[1]
    db_session = crud.get_session_by_token(db, token)
    if not db_session or db_session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status_code": 401,
                "error_code": "INVALID_SESSION",
                "message": "Your session has expired or is invalid. Please log in again."
            }
        )
    return db_session

# --- API Endpoints ---

@app.post("/api/auth/register", response_model=schemas.ApiResponse[schemas.UserResponse], status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    existing_username = crud.get_user_by_username(db, user_data.username)
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail={
                "status_code": 400,
                "error_code": "USERNAME_TAKEN",
                "message": "The username is already taken. Please choose another one."
            }
        )
    
    existing_email = crud.get_user_by_email(db, user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail={
                "status_code": 400,
                "error_code": "EMAIL_TAKEN",
                "message": "The email is already registered. Please login or reset your password."
            }
        )
        
    db_user = crud.create_user(db, user_data)
    return {
        "success": True,
        "data": db_user,
        "error_code": None,
        "message": "User registered successfully."
    }

@app.post("/api/auth/login", response_model=schemas.ApiResponse[dict], tags=["Authentication"])
def login(login_data: schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    # Try looking up by username or email
    db_user = crud.get_user_by_username(db, login_data.username_or_email)
    if not db_user:
        db_user = crud.get_user_by_email(db, login_data.username_or_email)
        
    if not db_user or not auth.verify_password(login_data.password, db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={
                "status_code": 401,
                "error_code": "INVALID_CREDENTIALS",
                "message": "Invalid username/email or password. Please check your credentials."
            }
        )
        
    # Get user agent and IP
    user_agent = request.headers.get("user-agent", "Unknown")
    ip_address = request.client.host if request.client else "Unknown"
    
    # Create database-backed Session
    db_session = auth.create_user_session(
        db, 
        user_id=db_user.id, 
        ip_address=ip_address, 
        user_agent=user_agent
    )
    
    # Log audit entry
    crud.create_audit_log(
        db,
        action="USER_LOGIN",
        user_id=db_user.id,
        session_id=db_session.id,
        ip_address=ip_address,
        details=f"Successful login via device: {user_agent}"
    )
    
    return {
        "success": True,
        "data": {
            "session_token": db_session.session_token,
            "user": {
                "id": str(db_user.id),
                "username": db_user.username,
                "email": db_user.email
            }
        },
        "error_code": None,
        "message": "Login successful."
    }

@app.post("/api/auth/logout", response_model=schemas.ApiResponse[dict], tags=["Authentication"])
def logout(current_session: models.Session = Depends(get_current_session), db: Session = Depends(get_db)):
    crud.deactivate_session(db, current_session.session_token)
    return {
        "success": True,
        "data": {"message": "Successfully logged out and session revoked."},
        "error_code": None,
        "message": "Logout successful."
    }

@app.get("/api/auth/me", response_model=schemas.ApiResponse[schemas.UserResponse], tags=["Authentication"])
def get_me(current_session: models.Session = Depends(get_current_session)):
    return {
        "success": True,
        "data": current_session.user,
        "error_code": None,
        "message": "Successfully retrieved user profile."
    }

@app.put("/api/auth/update-profile", response_model=schemas.ApiResponse[schemas.UserResponse], tags=["Authentication"])
def update_profile(
    user_update: schemas.UserBase, 
    current_session: models.Session = Depends(get_current_session), 
    db: Session = Depends(get_db)
):
    db_user = current_session.user
    
    # Check if username or email is changing and already in use
    if user_update.username != db_user.username:
        existing = crud.get_user_by_username(db, user_update.username)
        if existing:
            raise HTTPException(
                status_code=400,
                detail={
                    "status_code": 400,
                    "error_code": "USERNAME_TAKEN",
                    "message": "Username is already in use by another user."
                }
            )
            
    if user_update.email != db_user.email:
        existing = crud.get_user_by_email(db, user_update.email)
        if existing:
            raise HTTPException(
                status_code=400,
                detail={
                    "status_code": 400,
                    "error_code": "EMAIL_TAKEN",
                    "message": "Email is already in use by another user."
                }
            )
            
    db_user.username = user_update.username
    db_user.email = user_update.email
    db.commit()
    db.refresh(db_user)
    
    # Log audit entry
    crud.create_audit_log(
        db,
        action="PROFILE_UPDATE",
        user_id=db_user.id,
        session_id=current_session.id,
        details=f"Updated profile details to: {user_update.username} / {user_update.email}"
    )
    
    return {
        "success": True,
        "data": db_user,
        "error_code": None,
        "message": "Profile updated successfully."
    }

@app.delete("/api/auth/delete-account", response_model=schemas.ApiResponse[dict], tags=["Authentication"])
def delete_account(current_session: models.Session = Depends(get_current_session), db: Session = Depends(get_db)):
    db_user = current_session.user
    db.delete(db_user)
    db.commit()
    return {
        "success": True,
        "data": {"message": "Account successfully deleted."},
        "error_code": None,
        "message": "Account deleted successfully."
    }

@app.get("/api/auth/audit-logs", response_model=schemas.ApiResponse[list[schemas.AuditLogResponse]], tags=["Authentication"])
def get_my_audit_logs(
    current_session: models.Session = Depends(get_current_session), 
    db: Session = Depends(get_db)
):
    return {
        "success": True,
        "data": crud.get_audit_logs(db, current_session.user_id),
        "error_code": None,
        "message": "Audit logs retrieved successfully."
    }

@app.get("/api/auth/sessions", response_model=schemas.ApiResponse[list[schemas.SessionResponse]], tags=["Authentication"])
def get_my_sessions(
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    active_sessions = db.query(models.Session).filter(models.Session.user_id == current_session.user_id, models.Session.is_active == True).all()
    return {
        "success": True,
        "data": active_sessions,
        "error_code": None,
        "message": "Active sessions retrieved successfully."
    }

@app.delete("/api/auth/sessions/{session_id}", response_model=schemas.ApiResponse[dict], tags=["Authentication"])
def revoke_session(
    session_id: str,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    # Deactivate the session matching the ID and belonging to the user
    session_to_revoke = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_session.user_id
    ).first()
    
    if not session_to_revoke:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "SESSION_NOT_FOUND",
                "message": "The session could not be found or you do not have permission to revoke it."
            }
        )
        
    session_to_revoke.is_active = False
    db.commit()
    
    # Log audit trail
    crud.create_audit_log(
        db,
        action="SESSION_REVOKED",
        user_id=current_session.user_id,
        session_id=current_session.id,
        details=f"Revoked active session ID: {session_id}"
    )
    
    return {
        "success": True,
        "data": {"message": "Session successfully revoked."},
        "error_code": None,
        "message": "Session revoked successfully."
    }

@app.get("/api/papers", response_model=schemas.ApiResponse[list[schemas.PaperResponse]], tags=["Research Papers"])
def get_papers(
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    return {
        "success": True,
        "data": crud.get_user_papers(db, current_session.user_id),
        "error_code": None,
        "message": "Papers retrieved successfully."
    }

@app.post("/api/papers", response_model=schemas.ApiResponse[schemas.PaperResponse], status_code=status.HTTP_201_CREATED, tags=["Research Papers"])
async def create_paper(
    title: str = Form(...),
    author: str = Form(...),
    domain: str = Form(...),
    keywords: str = Form(None),
    abstract: str = Form(None),
    file: UploadFile = File(None),
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    file_name = None
    file_data = None
    if file:
        file_name = file.filename
        file_data = await file.read()

    # Log audit entry for adding a paper
    crud.create_audit_log(
        db,
        action="ADD_PAPER",
        user_id=current_session.user_id,
        session_id=current_session.id,
        details=f"Added paper: {title}"
    )
    
    new_paper = crud.create_user_paper(
        db,
        title=title,
        author=author,
        domain=domain,
        keywords=keywords,
        abstract=abstract,
        file_name=file_name,
        file_data=file_data,
        user_id=current_session.user_id
    )
    return {
        "success": True,
        "data": new_paper,
        "error_code": None,
        "message": "Paper created successfully."
    }

@app.get("/api/papers/{paper_id}/file", tags=["Research Papers"])
def get_paper_file(
    paper_id: UUID,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    db_paper = db.query(models.Paper).filter(
        models.Paper.id == paper_id, 
        models.Paper.user_id == current_session.user_id
    ).first()
    
    if not db_paper:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "PAPER_NOT_FOUND",
                "message": "The requested paper record could not be found."
            }
        )
        
    if not db_paper.file_data:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "FILE_NOT_FOUND",
                "message": "No file was uploaded for this research paper record."
            }
        )
        
    return Response(
        content=db_paper.file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={db_paper.file_name}"
        }
    )

@app.delete("/api/papers/{paper_id}", response_model=schemas.ApiResponse[dict], tags=["Research Papers"])
def delete_paper(
    paper_id: UUID,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    success = crud.delete_user_paper(db, paper_id, current_session.user_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "PAPER_NOT_FOUND",
                "message": "The paper could not be found or you do not have permission to delete it."
            }
        )
        
    # Log audit entry
    crud.create_audit_log(
        db,
        action="DELETE_PAPER",
        user_id=current_session.user_id,
        session_id=current_session.id,
        details=f"Deleted paper ID: {str(paper_id)}"
    )
    return {
        "success": True,
        "data": {"message": "Paper successfully deleted."},
        "error_code": None,
        "message": "Paper deleted successfully."
    }
