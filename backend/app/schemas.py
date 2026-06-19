from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Generic, TypeVar
from uuid import UUID

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class SessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    session_token: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    is_active: bool
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[UUID] = None
    session_id: Optional[UUID] = None
    action: str
    ip_address: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ErrorDetail(BaseModel):
    loc: Optional[List[str]] = None
    msg: str
    type: str

class CustomErrorResponse(BaseModel):
    status_code: int
    error_code: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    timestamp: datetime

class PaperBase(BaseModel):
    title: str
    author: str
    domain: str
    keywords: Optional[str] = None
    abstract: Optional[str] = None

class PaperCreate(PaperBase):
    pass

class PaperResponse(PaperBase):
    id: UUID
    user_id: UUID
    file_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error_code: Optional[str] = None
    message: Optional[str] = None
    details: Optional[List[str]] = None


