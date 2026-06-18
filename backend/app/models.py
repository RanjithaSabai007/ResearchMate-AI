import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.encryption import EncryptedString

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Using EncryptedString to satisfy: "encryption and decryption from and to database"
    username = Column(EncryptedString, unique=True, nullable=False)
    email = Column(EncryptedString, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_token = Column(String, unique=True, nullable=False)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="sessions")
    audit_logs = relationship("AuditLog", back_populates="session")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)  # e.g., "USER_REGISTER", "USER_LOGIN", "USER_LOGOUT"
    ip_address = Column(String, nullable=True)
    details = Column(EncryptedString, nullable=True)  # Store encrypted audit log details
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="audit_logs")
    session = relationship("Session", back_populates="audit_logs")
