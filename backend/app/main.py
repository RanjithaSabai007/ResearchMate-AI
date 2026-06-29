from fastapi import FastAPI, Depends, HTTPException, Request, Response, status, UploadFile, File, Form
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.ai import router as ai_router
import json
import httpx

from app import ai
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware
from app.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET,
    LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    JWT_SECRET
)

from app import models, schemas, crud, auth
from app.database import engine, get_db

# Initialize Database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ResearchMate AI API",
    description="Secure research management backend",
    version="1.0.0"
)
app.include_router(ai.router)
app.include_router(ai_router)

config_data = {
    "GOOGLE_CLIENT_ID": GOOGLE_CLIENT_ID or "placeholder",
    "GOOGLE_CLIENT_SECRET": GOOGLE_CLIENT_SECRET or "placeholder",
    "MICROSOFT_CLIENT_ID": MICROSOFT_CLIENT_ID or "placeholder",
    "MICROSOFT_CLIENT_SECRET": MICROSOFT_CLIENT_SECRET or "placeholder",
    "LINKEDIN_CLIENT_ID": LINKEDIN_CLIENT_ID or "placeholder",
    "LINKEDIN_CLIENT_SECRET": LINKEDIN_CLIENT_SECRET or "placeholder",
    "GITHUB_CLIENT_ID": GITHUB_CLIENT_ID or "placeholder",
    "GITHUB_CLIENT_SECRET": GITHUB_CLIENT_SECRET or "placeholder",
}

config = Config(environ=config_data)
oauth = OAuth(config)

# Google SSO
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID or "placeholder",
    client_secret=GOOGLE_CLIENT_SECRET or "placeholder",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    }
)

# Microsoft SSO
oauth.register(
    name="microsoft",
    client_id=MICROSOFT_CLIENT_ID or "placeholder",
    client_secret=MICROSOFT_CLIENT_SECRET or "placeholder",
    server_metadata_url="https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile User.Read"
    }
)

# LinkedIn SSO
oauth.register(
    name="linkedin",
    client_id=LINKEDIN_CLIENT_ID or "placeholder",
    client_secret=LINKEDIN_CLIENT_SECRET or "placeholder",
    server_metadata_url="https://www.linkedin.com/oauth/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid profile email"
    }
)

# GitHub SSO
oauth.register(
    name="github",
    client_id=GITHUB_CLIENT_ID or "placeholder",
    client_secret=GITHUB_CLIENT_SECRET or "placeholder",
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={
        "scope": "user:email"
    }
)

# Session Middleware (Required by Authlib to track OAuth state)
app.add_middleware(
    SessionMiddleware,
    secret_key=JWT_SECRET
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

def verify_sso_configured(provider: str, client_id: str, client_secret: str):
    if not client_id or not client_secret or client_id == "placeholder" or client_secret == "placeholder":
        raise HTTPException(
            status_code=400,
            detail={
                "status_code": 400,
                "error_code": "SSO_NOT_CONFIGURED",
                "message": f"{provider.capitalize()} SSO is not configured on the server. Please add your credentials to backend/.env."
            }
        )

@app.get("/api/auth/{provider}/login")
async def sso_login(provider: str, request: Request):
    if provider == "google":
        verify_sso_configured("google", GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
        redirect_uri = "http://localhost:8000/api/auth/google/callback"
        return await oauth.google.authorize_redirect(request, redirect_uri)
    elif provider == "microsoft":
        verify_sso_configured("microsoft", MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET)
        redirect_uri = "http://localhost:8000/api/auth/microsoft/callback"
        return await oauth.microsoft.authorize_redirect(request, redirect_uri)
    elif provider == "linkedin":
        verify_sso_configured("linkedin", LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET)
        redirect_uri = "http://localhost:8000/api/auth/linkedin/callback"
        return await oauth.linkedin.authorize_redirect(request, redirect_uri)
    elif provider == "github":
        verify_sso_configured("github", GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
        redirect_uri = "http://localhost:8000/api/auth/github/callback"
        return await oauth.github.authorize_redirect(request, redirect_uri)
    else:
        raise HTTPException(status_code=400, detail="Unknown SSO provider.")

# Helper to login/create user and redirect to frontend
def handle_sso_success(request: Request, db: Session, email: str, username: str, provider: str):
    import urllib.parse
    import secrets
    from fastapi.responses import RedirectResponse
    
    db_user = crud.get_user_by_email(db, email)
    if not db_user:
        # Check if username is already taken, if so append random characters
        base_username = username
        counter = 1
        while crud.get_user_by_username(db, username):
            username = f"{base_username}{counter}"
            counter += 1
            
        rand_pwd = secrets.token_hex(16)
        user_create = schemas.UserCreate(
            username=username,
            email=email,
            password=rand_pwd
        )
        db_user = crud.create_user(db, user_create)
        
    user_agent = request.headers.get("user-agent", "Unknown")
    ip_address = request.client.host if request.client else "Unknown"
    
    db_session = auth.create_user_session(
        db,
        user_id=db_user.id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Log audit entry
    crud.create_audit_log(
        db,
        action="SOCIAL_LOGIN",
        user_id=db_user.id,
        session_id=db_session.id,
        ip_address=ip_address,
        details=f"Successful social login via {provider.capitalize()} as {email}"
    )
    
    user_data = {
        "id": str(db_user.id),
        "username": db_user.username,
        "email": db_user.email
    }
    user_json = json.dumps(user_data)
    frontend_url = f"http://localhost:5173/login?token={db_session.session_token}&user={urllib.parse.quote(user_json)}"
    return RedirectResponse(url=frontend_url)

@app.get("/api/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        import urllib.parse
        error_msg = urllib.parse.quote(f"Google authentication failed: {str(e)}")
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"http://localhost:5173/login?error={error_msg}")
        
    user_info = token.get("userinfo")
    if not user_info:
        user_info = await oauth.google.parse_id_token(request, token)
        
    if not user_info:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="http://localhost:5173/login?error=Failed+to+retrieve+user+info+from+Google")
        
    email = user_info.get("email")
    username = user_info.get("name") or email.split("@")[0]
    
    return handle_sso_success(request, db, email, username, "google")

@app.get("/api/auth/microsoft/callback")
async def microsoft_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.microsoft.authorize_access_token(request)
    except Exception as e:
        import urllib.parse
        error_msg = urllib.parse.quote(f"Microsoft authentication failed: {str(e)}")
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"http://localhost:5173/login?error={error_msg}")
        
    user_info = token.get("userinfo")
    if not user_info:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="http://localhost:5173/login?error=Failed+to+retrieve+user+info+from+Microsoft")
        
    email = user_info.get("email") or user_info.get("preferred_username")
    username = user_info.get("name") or user_info.get("given_name") or email.split("@")[0]
    
    return handle_sso_success(request, db, email, username, "microsoft")

@app.get("/api/auth/linkedin/callback")
async def linkedin_callback(request: Request, db: Session = Depends(get_db)):
    from fastapi.responses import RedirectResponse

    code = request.query_params.get("code")

    if not code:
        return RedirectResponse(
            "http://localhost:5173/login?error=No+authorization+code+received"
        )

    token_url = "https://www.linkedin.com/oauth/v2/accessToken"

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            token_url,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": "http://localhost:8000/api/auth/linkedin/callback",
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )

    if token_response.status_code != 200:
        return RedirectResponse(
            f"http://localhost:5173/login?error={token_response.text}"
        )

    token = token_response.json()

    access_token = token["access_token"]

    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={
                "Authorization": f"Bearer {access_token}"
            }
        )

    if user_response.status_code != 200:
        return RedirectResponse(
            "http://localhost:5173/login?error=Unable+to+retrieve+LinkedIn+profile"
        )

    user = user_response.json()

    email = user["email"]
    username = (
        user.get("name")
        or f"{user.get('given_name','')} {user.get('family_name','')}".strip()
        or email.split("@")[0]
    )

    return handle_sso_success(
        request,
        db,
        email,
        username,
        "linkedin"
    )
    
@app.get("/api/auth/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.github.authorize_access_token(request)
    except Exception as e:
        import urllib.parse
        error_msg = urllib.parse.quote(f"GitHub authentication failed: {str(e)}")
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"http://localhost:5173/login?error={error_msg}")
        
    # Get user profile info
    resp = await oauth.github.get("user", token=token)
    user_data = resp.json()
    
    # Try public email
    email = user_data.get("email")
    if not email:
        # Fetch all emails (including private/primary)
        emails_resp = await oauth.github.get("user/emails", token=token)
        if emails_resp.status_code == 200:
            emails = emails_resp.json()
            email = next((e["email"] for e in emails if e.get("primary")), None)
            if not email and emails:
                email = emails[0].get("email")
                
    if not email:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="http://localhost:5173/login?error=GitHub+account+must+have+a+verified+email")
        
    username = user_data.get("login") or user_data.get("name") or email.split("@")[0]
    
    return handle_sso_success(request, db, email, username, "github")


@app.get("/api/papers", response_model=schemas.ApiResponse[list[schemas.PaperResponse]], tags=["Research Papers"])
def get_papers(
    project_id: int = None,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    return {
        "success": True,
        "data": crud.get_user_papers(db, current_session.user_id, project_id=project_id),
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
    summary: str = Form(None),
    file: UploadFile = File(None),
    paper_text: str = Form(None),
    project_id: int = Form(None),
    evaluation: str = Form(None),
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

    eval_data = None
    if evaluation:
        try:
            eval_data = json.loads(evaluation)
        except Exception as e:
            print("Failed to parse evaluation field in POST /api/papers:", e)
    
    new_paper = crud.create_user_paper(
        db,
        title=title,
        author=author,
        domain=domain,
        keywords=keywords,
        abstract=abstract,
        summary=summary,
        file_name=file_name,
        file_data=file_data,
        paper_text=paper_text,
        user_id=current_session.user_id,
        project_id=project_id,
        evaluation_data=eval_data
    )
    return {
        "success": True,
        "data": new_paper,
        "error_code": None,
        "message": "Paper created successfully."
    }

# --- Paper Specific Chat Endpoints ---

@app.get("/api/papers/{paper_id}/chat", response_model=schemas.ApiResponse[list[schemas.PaperChatMessageResponse]], tags=["Research Papers"])
def get_paper_chat(
    paper_id: int,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    # Verify paper ownership
    paper = db.query(models.Paper).filter(models.Paper.id == paper_id, models.Paper.user_id == current_session.user_id).first()
    if not paper:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "PAPER_NOT_FOUND",
                "message": "The reference paper could not be found."
            }
        )
    return {
        "success": True,
        "data": crud.get_paper_chat_history(db, paper_id),
        "error_code": None,
        "message": "Paper chat history retrieved successfully."
    }

@app.post("/api/papers/{paper_id}/chat", response_model=schemas.ApiResponse[dict], tags=["Research Papers"])
def send_paper_chat(
    paper_id: int,
    chat_req: schemas.PaperChatRequest,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    # Verify paper ownership
    paper = db.query(models.Paper).filter(models.Paper.id == paper_id, models.Paper.user_id == current_session.user_id).first()
    if not paper:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "PAPER_NOT_FOUND",
                "message": "The reference paper could not be found."
            }
        )
        
    question = chat_req.question
    
    # Load conversation history
    history = crud.get_paper_chat_history(db, paper_id)
    
    # Query Ollama with chat memory context
    from app.services.chat_service import ask_paper_question
    answer = ask_paper_question(
        paper_text=paper.paper_text or paper.summary or "",
        question=question,
        chat_history=history
    )
    
    # Save conversation context
    crud.add_paper_chat_message(db, paper_id, role="user", content=question)
    crud.add_paper_chat_message(db, paper_id, role="assistant", content=answer)
    
    return {
        "success": True,
        "data": {
            "answer": answer
        },
        "error_code": None,
        "message": "Question answered and stored successfully."
    }

# --- Project Endpoints ---

@app.get("/api/projects", response_model=schemas.ApiResponse[list[schemas.ProjectResponse]], tags=["Projects"])
def get_projects(
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    return {
        "success": True,
        "data": crud.get_user_projects(db, current_session.user_id),
        "error_code": None,
        "message": "Projects retrieved successfully."
    }

@app.post("/api/projects", response_model=schemas.ApiResponse[schemas.ProjectResponse], status_code=status.HTTP_201_CREATED, tags=["Projects"])
def create_project(
    project_data: schemas.ProjectCreate,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    # Log audit entry
    crud.create_audit_log(
        db,
        action="ADD_PROJECT",
        user_id=current_session.user_id,
        session_id=current_session.id,
        details=f"Created project: {project_data.title}"
    )

    db_project = crud.create_project(db, project_data, current_session.user_id)
    return {
        "success": True,
        "data": db_project,
        "error_code": None,
        "message": "Project created successfully."
    }

@app.get("/api/projects/{project_id}", response_model=schemas.ApiResponse[schemas.ProjectDetailResponse], tags=["Projects"])
def get_project_details(
    project_id: int,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    project = crud.get_project(db, project_id, current_session.user_id)
    if not project:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "PROJECT_NOT_FOUND",
                "message": "The project could not be found."
            }
        )
    
    # List papers to return in ProjectDetailResponse
    project.papers = crud.get_user_papers(db, current_session.user_id, project_id=project_id)

    return {
        "success": True,
        "data": project,
        "error_code": None,
        "message": "Project details retrieved successfully."
    }

@app.put("/api/projects/{project_id}/draft", response_model=schemas.ApiResponse[schemas.ProjectResponse], tags=["Projects"])
def update_draft(
    project_id: int,
    draft_data: schemas.DraftUpdateRequest,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    project = crud.get_project(db, project_id, current_session.user_id)
    if not project:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "PROJECT_NOT_FOUND",
                "message": "The project could not be found."
            }
        )

    # Log audit entry
    crud.create_audit_log(
        db,
        action="UPDATE_PROJECT_DRAFT",
        user_id=current_session.user_id,
        session_id=current_session.id,
        details=f"Updated draft in project: {project.title}"
    )

    updated_project = crud.update_project_draft(
        db, 
        project_id=project_id, 
        draft_title=draft_data.draft_title, 
        draft_content=draft_data.draft_content, 
        user_id=current_session.user_id
    )

    return {
        "success": True,
        "data": updated_project,
        "error_code": None,
        "message": "Project draft updated successfully."
    }

@app.delete("/api/projects/{project_id}", response_model=schemas.ApiResponse[dict], tags=["Projects"])
def delete_project(
    project_id: int,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    project = crud.get_project(db, project_id, current_session.user_id)
    if not project:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "PROJECT_NOT_FOUND",
                "message": "The project could not be found."
            }
        )

    # Log audit entry
    crud.create_audit_log(
        db,
        action="DELETE_PROJECT",
        user_id=current_session.user_id,
        session_id=current_session.id,
        details=f"Deleted project: {project.title}"
    )

    crud.delete_project(db, project_id, current_session.user_id)

    return {
        "success": True,
        "data": {"message": "Project successfully deleted."},
        "error_code": None,
        "message": "Project deleted successfully."
    }


@app.get("/api/papers/{paper_id}/file", tags=["Research Papers"])
def get_paper_file(
    paper_id: int,
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
    paper_id: int,
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

# --- Social Login & Password Reset Endpoints ---

@app.post("/api/auth/social-login", response_model=schemas.ApiResponse[dict], tags=["Authentication"])
def social_login(login_data: schemas.SocialLoginRequest, request: Request, db: Session = Depends(get_db)):
    import secrets
    # Look up by email
    db_user = crud.get_user_by_email(db, login_data.email)
    
    if not db_user:
        # If user doesn't exist, create it!
        # Set a random strong password for database validation
        rand_pwd = secrets.token_hex(16)
        user_create = schemas.UserCreate(
            username=login_data.username,
            email=login_data.email,
            password=rand_pwd
        )
        db_user = crud.create_user(db, user_create)
        
    # Get user agent and IP
    user_agent = request.headers.get("user-agent", "Unknown")
    ip_address = request.client.host if request.client else "Unknown"
    
    # Create DB session
    db_session = auth.create_user_session(
        db,
        user_id=db_user.id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Log audit entry
    crud.create_audit_log(
        db,
        action="SOCIAL_LOGIN",
        user_id=db_user.id,
        session_id=db_session.id,
        ip_address=ip_address,
        details=f"Successful social login via {login_data.provider.capitalize()} as {login_data.email}"
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
        "message": f"Successfully authenticated via {login_data.provider.capitalize()}."
    }

@app.post("/api/auth/forgot-password", response_model=schemas.ApiResponse[dict], tags=["Authentication"])
def forgot_password(data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    import random
    from datetime import timedelta
    db_user = crud.get_user_by_email(db, data.email)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "EMAIL_NOT_FOUND",
                "message": "We couldn't find an account matching that email address."
            }
        )
        
    # Generate 6 digit numeric code
    otp = f"{random.randint(100000, 999999)}"
    db_user.reset_otp = otp
    db_user.reset_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()
    
    # Log audit entry
    crud.create_audit_log(
        db,
        action="FORGOT_PASSWORD_REQUEST",
        user_id=db_user.id,
        details=f"Forgot password request. Generated OTP code: {otp}"
    )
    
    return {
        "success": True,
        "data": {
            "demo_otp": otp  # Exposed in payload for easy manual testing / validation
        },
        "error_code": None,
        "message": "Reset code generated. Use the code to verify your request."
    }

@app.post("/api/auth/reset-password", response_model=schemas.ApiResponse[dict], tags=["Authentication"])
def reset_password(data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, data.email)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail={
                "status_code": 404,
                "error_code": "EMAIL_NOT_FOUND",
                "message": "Account not found."
            }
        )
        
    if not db_user.reset_otp or db_user.reset_otp != data.otp:
        raise HTTPException(
            status_code=400,
            detail={
                "status_code": 400,
                "error_code": "INVALID_OTP",
                "message": "The reset code is invalid. Please double check."
            }
        )
        
    if db_user.reset_otp_expires_at and db_user.reset_otp_expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail={
                "status_code": 400,
                "error_code": "EXPIRED_OTP",
                "message": "The reset code has expired. Please request a new one."
            }
        )
        
    # Reset is valid, update password
    db_user.password_hash = auth.hash_password(data.new_password)
    db_user.reset_otp = None
    db_user.reset_otp_expires_at = None
    db.commit()
    
    # Log audit entry
    crud.create_audit_log(
        db,
        action="PASSWORD_RESET_SUCCESS",
        user_id=db_user.id,
        details=f"Password successfully reset via recovery code."
    )
    
    return {
        "success": True,
        "data": {"message": "Your password has been successfully reset. Please log in with your new password."},
        "error_code": None,
        "message": "Password reset successful."
    }

