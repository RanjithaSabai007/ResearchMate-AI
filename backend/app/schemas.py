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
        def val(f):
            if isinstance(data, dict):
                return data.get(f)
            return getattr(data, f, None)
            
        strengths_val = val("strengths")
        if strengths_val is not None:
            weaknesses_val = val("weaknesses")
            best_for_val = val("best_for")
            not_recommended_for_val = val("not_recommended_for")
            
            return {
                "id": val("id"),
                "paper_id": val("paper_id"),
                "overall_score": val("overall_score"),
                "paper_type": val("paper_type"),
                "citation_value": val("citation_value"),
                "research_contribution": val("research_contribution"),
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


class PaperComparisonCreate(BaseModel):
    paper_ids: List[int]


class PaperComparisonResponse(BaseModel):
    id: int
    project_id: int
    selected_papers: List[int]
    comparison_report: dict
    created_at: datetime

    @model_validator(mode='before')
    @classmethod
    def parse_json_fields(cls, data):
        def val(f):
            if isinstance(data, dict):
                return data.get(f)
            return getattr(data, f, None)
            
        papers_val = val("selected_papers")
        if papers_val is not None:
            report_val = val("comparison_report")
            
            return {
                "id": val("id"),
                "project_id": val("project_id"),
                "selected_papers": json.loads(papers_val) if isinstance(papers_val, str) else (papers_val or []),
                "comparison_report": json.loads(report_val) if isinstance(report_val, str) else (report_val or {}),
                "created_at": val("created_at")
            }
        return data

    class Config:
        from_attributes = True


class NoveltyAnalysisResponse(BaseModel):
    id: int
    project_id: int
    draft_version: int
    comparison_papers: List[int]
    analysis_report: dict
    created_at: datetime

    @model_validator(mode='before')
    @classmethod
    def parse_json_fields(cls, data):
        def val(f):
            if isinstance(data, dict):
                return data.get(f)
            return getattr(data, f, None)
            
        papers_val = val("comparison_papers")
        if papers_val is not None:
            report_val = val("analysis_report")
            
            return {
                "id": val("id"),
                "project_id": val("project_id"),
                "draft_version": val("draft_version"),
                "comparison_papers": json.loads(papers_val) if isinstance(papers_val, str) else (papers_val or []),
                "analysis_report": json.loads(report_val) if isinstance(report_val, str) else (report_val or {}),
                "created_at": val("created_at")
            }
        return data

    class Config:
        from_attributes = True


class DiagramCreate(BaseModel):
    name: str
    diagram_type: str
    diagram_style: str
    nodes: List[dict]
    edges: List[dict]


class DiagramGenerateRequest(BaseModel):
    diagram_type: str
    diagram_style: str
    selected_text: Optional[str] = None


class DiagramResponse(BaseModel):
    id: int
    project_id: int
    name: str
    diagram_type: str
    diagram_style: str
    nodes: List[dict]
    edges: List[dict]
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='before')
    @classmethod
    def parse_json_fields(cls, data):
        def val(f):
            if isinstance(data, dict):
                return data.get(f)
            return getattr(data, f, None)
            
        nodes_val = val("nodes")
        if nodes_val is not None:
            edges_val = val("edges")
            
            return {
                "id": val("id"),
                "project_id": val("project_id"),
                "name": val("name"),
                "diagram_type": val("diagram_type"),
                "diagram_style": val("diagram_style"),
                "nodes": json.loads(nodes_val) if isinstance(nodes_val, str) else (nodes_val or []),
                "edges": json.loads(edges_val) if isinstance(edges_val, str) else (edges_val or []),
                "created_at": val("created_at"),
                "updated_at": val("updated_at")
            }
        return data

    class Config:
        from_attributes = True


class WritingAssistantMessageResponse(BaseModel):
    id: int
    project_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class WritingAssistantChatRequest(BaseModel):
    prompt: str
    selected_text: Optional[str] = None
    cursor_paragraph: Optional[str] = None
    current_heading: Optional[str] = None
    draft_content: Optional[str] = None


class WritingAssistantResponse(BaseModel):
    success: bool
    answer: str
    chat_history: List[WritingAssistantMessageResponse] = []