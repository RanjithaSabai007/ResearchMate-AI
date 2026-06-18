import bcrypt
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app import models

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify standard plain text password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def generate_session_token() -> str:
    """Generate a highly secure random session token."""
    return secrets.token_hex(32)

def create_user_session(db: Session, user_id: str, ip_address: str = None, user_agent: str = None) -> models.Session:
    """Create a new database session record, expiring in 7 days."""
    session_token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Deactivate any previous active sessions if you want single-device login
    # For now, let's allow multi-device, but log this session explicitly.
    db_session = models.Session(
        user_id=user_id,
        session_token=session_token,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=expires_at,
        is_active=True
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session
