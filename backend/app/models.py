from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Text, #summary = Column(Text, nullable=True)
    DateTime,
    Boolean,
    ForeignKey,
    Integer,
    LargeBinary
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)

    password_hash = Column(String, nullable=False)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    google_id = Column(String, nullable=True, unique=True)

    reset_otp = Column(String, nullable=True)
    reset_otp_expires_at = Column(DateTime, nullable=True)

    sessions = relationship(
        "Session",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    audit_logs = relationship(
        "AuditLog",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    papers = relationship(
        "Paper",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan"
    )



class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    session_token = Column(
        String,
        unique=True,
        nullable=False
    )

    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    expires_at = Column(DateTime, nullable=False)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    user = relationship(
        "User",
        back_populates="sessions"
    )

    audit_logs = relationship(
        "AuditLog",
        back_populates="session"
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True
    )

    session_id = Column(
        Integer,
        ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True
    )

    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    details = Column(String, nullable=True)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    user = relationship(
        "User",
        back_populates="audit_logs"
    )

    session = relationship(
        "Session",
        back_populates="audit_logs"
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    draft_title = Column(String, default="Untitled Draft", nullable=False)
    draft_content = Column(Text, default="", nullable=False)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    user = relationship(
        "User",
        back_populates="projects"
    )

    papers = relationship(
        "Paper",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    comparisons = relationship(
        "PaperComparison",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    novelty_analyses = relationship(
        "NoveltyAnalysis",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    diagrams = relationship(
        "Diagram",
        back_populates="project",
        cascade="all, delete-orphan"
    )


class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True
    )

    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    domain = Column(String, nullable=False)

    keywords = Column(String, nullable=True)
    abstract = Column(String, nullable=True)

    file_name = Column(String, nullable=True)
    file_data = Column(LargeBinary, nullable=True)
    summary = Column(Text, nullable=True)
    paper_text = Column(Text, nullable=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    user = relationship(
        "User",
        back_populates="papers"
    )

    project = relationship(
        "Project",
        back_populates="papers"
    )

    evaluation = relationship(
        "PaperEvaluation",
        back_populates="paper",
        uselist=False,
        cascade="all, delete-orphan"
    )

    chat_messages = relationship(
        "PaperChatMessage",
        back_populates="paper",
        cascade="all, delete-orphan",
        order_by="PaperChatMessage.created_at.asc()"
    )


class PaperEvaluation(Base):
    __tablename__ = "paper_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(
        Integer,
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    overall_score = Column(Integer, nullable=False, default=70)
    paper_type = Column(String, nullable=False, default="Research Paper")
    citation_value = Column(String, nullable=False, default="Recommended")
    research_contribution = Column(String, nullable=False, default="Medium")

    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    best_for = Column(Text, nullable=True)
    not_recommended_for = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    paper = relationship(
        "Paper",
        back_populates="evaluation"
    )


class PaperChatMessage(Base):
    __tablename__ = "paper_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(
        Integer,
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False
    )
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    paper = relationship(
        "Paper",
        back_populates="chat_messages"
    )


class PaperComparison(Base):
    __tablename__ = "paper_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    selected_papers = Column(Text, nullable=False)
    comparison_report = Column(Text, nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    project = relationship(
        "Project",
        back_populates="comparisons"
    )


class NoveltyAnalysis(Base):
    __tablename__ = "novelty_analyses"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    draft_version = Column(Integer, nullable=False, default=1)
    comparison_papers = Column(Text, nullable=False)
    analysis_report = Column(Text, nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    project = relationship(
        "Project",
        back_populates="novelty_analyses"
    )


class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String, nullable=False)
    diagram_type = Column(String(50), nullable=False)
    diagram_style = Column(String(50), nullable=False)
    nodes = Column(Text, nullable=False)  # JSON string
    edges = Column(Text, nullable=False)  # JSON string
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    project = relationship(
        "Project",
        back_populates="diagrams"
    )
