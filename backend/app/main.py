from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from app import models, schemas, crud, auth
from app.database import engine, get_db
from app.encryption import encrypt_payload, decrypt_payload

# Initialize Database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ResearchMate AI API",
    description="Secure research management backend with encrypted network payloads",
    version="1.0.0"
)

# CORS Configuration
# Since we are running locally (e.g. FastAPI on 8000, Vite on 5173), we allow the origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Encrypted"]
)

# Custom Middleware for Network Payload Encryption/Decryption
# Ensures that network traffic is encrypted and hidden in Chrome DevTools (Inspect)
@app.middleware("http")
async def payload_encryption_middleware(request: Request, call_next):
    # Exclude API documentation paths from encryption so Swagger UI works normally
    if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
        return await call_next(request)
        
    is_encrypted = request.headers.get("X-Encrypted") == "true"
    
    # 1. Decrypt Request Payload
    if is_encrypted and request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                body_json = json.loads(body.decode('utf-8'))
                encrypted_payload = body_json.get("payload")
                if encrypted_payload:
                    decrypted_str = decrypt_payload(encrypted_payload)

                    body_bytes = decrypted_str.encode("utf-8")

                    async def receive():
                        return {
                            "type": "http.request",
                            "body": body_bytes,
                            "more_body": False
                        }

                    request._receive = receive
                    request._body = body_bytes
                else:
                    return Response(
                        content=json.dumps({
                            "status_code": 400,
                            "error_code": "DECRYPTION_ERROR",
                            "message": "Missing encrypted payload field",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }),
                        status_code=400,
                        media_type="application/json"
                    )
        except Exception as e:
            return Response(
                content=json.dumps({
                    "status_code": 400,
                    "error_code": "DECRYPTION_ERROR",
                    "message": f"Failed to decrypt payload: {str(e)}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }),
                status_code=400,
                media_type="application/json"
            )

    # Execute endpoint handler
    print(">>> ABOUT TO CALL ENDPOINT <<<")
    response = await call_next(request)
    
    # 2. Encrypt Response Payload
    # Check if client requested encryption or was using encryption, and response is JSON
    if is_encrypted and response.headers.get("content-type", "").startswith("application/json"):
        # Read the plain response body
        body_chunks = [chunk async for chunk in response.body_iterator]
        response_body = b"".join(body_chunks)
        
        try:
            plain_str = response_body.decode('utf-8')
            encrypted_str = encrypt_payload(plain_str)
            encrypted_body = json.dumps({"payload": encrypted_str}).encode('utf-8')
            
            # Re-construct response headers
            headers = dict(response.headers)
            headers["content-length"] = str(len(encrypted_body))
            headers["X-Encrypted"] = "true"  # Let frontend know it needs to decrypt
            
            return Response(
                content=encrypted_body,
                status_code=response.status_code,
                headers=headers,
                media_type="application/json"
            )
        except Exception as e:
            # Fallback to plain if encryption fails
            headers = dict(response.headers)
            headers["X-Encryption-Error"] = str(e)
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=headers,
                media_type="application/json"
            )
            
    return response

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

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
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
        
    return crud.create_user(db, user_data)

@app.post("/api/auth/login")
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
        "session_token": db_session.session_token,
        "user": {
            "id": str(db_user.id),
            "username": db_user.username,
            "email": db_user.email
        }
    }

@app.post("/api/auth/logout")
def logout(current_session: models.Session = Depends(get_current_session), db: Session = Depends(get_db)):
    crud.deactivate_session(db, current_session.session_token)
    return {"message": "Successfully logged out and session revoked."}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_session: models.Session = Depends(get_current_session)):
    return current_session.user

@app.put("/api/auth/update-profile", response_model=schemas.UserResponse)
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
    
    return db_user

@app.delete("/api/auth/delete-account")
def delete_account(current_session: models.Session = Depends(get_current_session), db: Session = Depends(get_db)):
    db_user = current_session.user
    db.delete(db_user)
    db.commit()
    return {"message": "Account successfully deleted."}

@app.get("/api/auth/audit-logs", response_model=list[schemas.AuditLogResponse])
def get_my_audit_logs(
    current_session: models.Session = Depends(get_current_session), 
    db: Session = Depends(get_db)
):
    return crud.get_audit_logs(db, current_session.user_id)

@app.get("/api/auth/sessions", response_model=list[schemas.SessionResponse])
def get_my_sessions(
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    return db.query(models.Session).filter(models.Session.user_id == current_session.user_id, models.Session.is_active == True).all()

@app.delete("/api/auth/sessions/{session_id}")
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
    
    return {"message": "Session successfully revoked."}

