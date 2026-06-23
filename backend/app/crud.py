from sqlalchemy.orm import Session
from app import models, schemas, auth
import json
from uuid import UUID

def get_user_by_username(db: Session, username: str):
    # SQLAlchemy EncryptedString automatically encrypts the query parameter,
    # so we can filter directly!
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pwd = auth.hash_password(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_pwd
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log the audit action
    create_audit_log(
        db, 
        user_id=db_user.id, 
        action="USER_REGISTER", 
        details=f"User {user.username} registered."
    )
    return db_user

def get_session_by_token(db: Session, token: str):
    return db.query(models.Session).filter(models.Session.session_token == token, models.Session.is_active == True).first()

def deactivate_session(db: Session, token: str):
    db_session = db.query(models.Session).filter(models.Session.session_token == token).first()
    if db_session:
        db_session.is_active = False
        db.commit()
        
        # Log the audit action
        create_audit_log(
            db, 
            user_id=db_session.user_id, 
            session_id=db_session.id, 
            action="USER_LOGOUT", 
            details="User logged out."
        )
    return db_session

def create_audit_log(db: Session, action: str, user_id: UUID = None, session_id: UUID = None, ip_address: str = None, details: str = None):
    db_log = models.AuditLog(
        user_id=user_id,
        session_id=session_id,
        action=action,
        ip_address=ip_address,
        details=details
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_audit_logs(db: Session, user_id: UUID):
    return db.query(models.AuditLog).filter(models.AuditLog.user_id == user_id).order_by(models.AuditLog.created_at.desc()).all()

def get_user_papers(db: Session, user_id: UUID):
    return db.query(models.Paper).filter(models.Paper.user_id == user_id).order_by(models.Paper.created_at.desc()).all()

def create_user_paper(db: Session, title: str, author: str, domain: str, keywords: str, abstract: str, file_name: str, file_data: bytes, user_id: UUID):
    db_paper = models.Paper(
        user_id=user_id,
        title=title,
        author=author,
        domain=domain,
        keywords=keywords,
        abstract=abstract,
        file_name=file_name,
        file_data=file_data
    )
    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)
    return db_paper

def delete_user_paper(db: Session, paper_id: UUID, user_id: UUID):
    db_paper = db.query(models.Paper).filter(models.Paper.id == paper_id, models.Paper.user_id == user_id).first()
    if db_paper:
        db.delete(db_paper)
        db.commit()
        return True
    return False

def get_user_by_google_id(
    db: Session,
    google_id: str
):
    return (
        db.query(models.User)
        .filter(
            models.User.google_id == google_id
        )
        .first()
    )