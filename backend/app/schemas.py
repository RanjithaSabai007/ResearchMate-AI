from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Generic, TypeVar


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: int
    user_id: int
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
    user_id: Optional[int] = None
    session_id: Optional[int] = None
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


class PaperCreate(BaseModel):
    title: str
    author: str
    domain: str
    keywords: str | None = None
    abstract: str | None = None
    summary: str | None = None
    paper_text: str | None = None


class PaperResponse(PaperBase):
    id: int
    user_id: int
    project_id: Optional[int] = None
    file_name: Optional[str] = None
    summary: str | None = None
    paper_text: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    draft_title: Optional[str] = None
    draft_content: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    user_id: int
    draft_title: str
    draft_content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    papers: List[PaperResponse] = []


class DraftUpdateRequest(BaseModel):
    draft_title: str
    draft_content: str


T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error_code: Optional[str] = None
    message: Optional[str] = None
    details: Optional[List[str]] = None


class SocialLoginRequest(BaseModel):
    email: EmailStr
    username: str
    provider: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str