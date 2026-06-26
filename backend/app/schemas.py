from pydantic import BaseModel, EmailStr, model_validator
from datetime import datetime
from typing import Optional, List, Generic, TypeVar
import json



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


class PaperEvaluationResponse(BaseModel):
    id: int
    paper_id: int
    overall_score: int
    paper_type: str
    citation_value: str
    research_contribution: str
    strengths: List[str] = []
    weaknesses: List[str] = []
    best_for: List[str] = []
    not_recommended_for: List[str] = []

    @model_validator(mode='before')
    @classmethod
    def parse_json_fields(cls, data):
        if hasattr(data, "strengths"):
            strengths_val = getattr(data, "strengths")
            weaknesses_val = getattr(data, "weaknesses")
            best_for_val = getattr(data, "best_for")
            not_recommended_for_val = getattr(data, "not_recommended_for")
            
            return {
                "id": getattr(data, "id"),
                "paper_id": getattr(data, "paper_id"),
                "overall_score": getattr(data, "overall_score"),
                "paper_type": getattr(data, "paper_type"),
                "citation_value": getattr(data, "citation_value"),
                "research_contribution": getattr(data, "research_contribution"),
                "strengths": json.loads(strengths_val) if isinstance(strengths_val, str) else (strengths_val or []),
                "weaknesses": json.loads(weaknesses_val) if isinstance(weaknesses_val, str) else (weaknesses_val or []),
                "best_for": json.loads(best_for_val) if isinstance(best_for_val, str) else (best_for_val or []),
                "not_recommended_for": json.loads(not_recommended_for_val) if isinstance(not_recommended_for_val, str) else (not_recommended_for_val or []),
            }
        return data

    class Config:
        from_attributes = True


class PaperChatMessageResponse(BaseModel):
    id: int
    paper_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaperResponse(PaperBase):
    id: int
    user_id: int
    project_id: Optional[int] = None
    file_name: Optional[str] = None
    summary: str | None = None
    paper_text: str | None = None
    created_at: datetime
    evaluation: Optional[PaperEvaluationResponse] = None

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


class PaperChatRequest(BaseModel):
    question: str



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