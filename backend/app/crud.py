from sqlalchemy.orm import Session
from app import models, schemas, auth
import json

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

def create_audit_log(
    db: Session,
    action: str,
    user_id: int = None,
    session_id: int = None,
    ip_address: str = None,
    details: str = None
):
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


def get_audit_logs(db: Session, user_id: int):
    return (
        db.query(models.AuditLog)
        .filter(models.AuditLog.user_id == user_id)
        .order_by(models.AuditLog.created_at.desc())
        .all()
    )


def get_user_projects(db: Session, user_id: int):
    return (
        db.query(models.Project)
        .filter(models.Project.user_id == user_id)
        .order_by(models.Project.created_at.desc())
        .all()
    )


def get_project(db: Session, project_id: int, user_id: int):
    return (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.user_id == user_id)
        .first()
    )


def create_project(db: Session, project: schemas.ProjectCreate, user_id: int):
    db_project = models.Project(
        user_id=user_id,
        title=project.title,
        description=project.description
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project_draft(db: Session, project_id: int, draft_title: str, draft_content: str, user_id: int):
    db_project = get_project(db, project_id, user_id)
    if db_project:
        db_project.draft_title = draft_title
        db_project.draft_content = draft_content
        db.commit()
        db.refresh(db_project)
    return db_project


def delete_project(db: Session, project_id: int, user_id: int):
    db_project = get_project(db, project_id, user_id)
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False


def get_user_papers(db: Session, user_id: int, project_id: int = None):
    query = db.query(models.Paper).filter(models.Paper.user_id == user_id)
    if project_id is not None:
        query = query.filter(models.Paper.project_id == project_id)
    return (
        query
        .order_by(models.Paper.created_at.desc())
        .all()
    )


def create_user_paper(
    db: Session,
    title: str,
    author: str,
    domain: str,
    keywords: str,
    abstract: str,
    summary: str,
    paper_text: str,
    file_name: str,
    file_data: bytes,
    user_id: int,
    project_id: int = None,
    evaluation_data: dict = None
):
    db_paper = models.Paper(
        user_id=user_id,
        project_id=project_id,
        title=title,
        author=author,
        domain=domain,
        keywords=keywords,
        abstract=abstract,
        summary=summary,
        file_name=file_name,
        file_data=file_data,
        paper_text=paper_text
    )

    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)

    if evaluation_data:
        db_eval = models.PaperEvaluation(
            paper_id=db_paper.id,
            overall_score=evaluation_data.get("overall_score", 70),
            paper_type=evaluation_data.get("paper_type", "Research Paper"),
            citation_value=evaluation_data.get("citation_value", "Recommended"),
            research_contribution=evaluation_data.get("research_contribution", "Medium"),
            strengths=json.dumps(evaluation_data.get("strengths", [])),
            weaknesses=json.dumps(evaluation_data.get("weaknesses", [])),
            best_for=json.dumps(evaluation_data.get("best_for", [])),
            not_recommended_for=json.dumps(evaluation_data.get("not_recommended_for", []))
        )
        db.add(db_eval)
        db.commit()
        db.refresh(db_paper)

    return db_paper



def delete_user_paper(
    db: Session,
    paper_id: int,
    user_id: int
):
    db_paper = (
        db.query(models.Paper)
        .filter(
            models.Paper.id == paper_id,
            models.Paper.user_id == user_id
        )
        .first()
    )

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


def get_paper_chat_history(db: Session, paper_id: int):
    return (
        db.query(models.PaperChatMessage)
        .filter(models.PaperChatMessage.paper_id == paper_id)
        .order_by(models.PaperChatMessage.created_at.asc())
        .all()
    )


def add_paper_chat_message(db: Session, paper_id: int, role: str, content: str):
    db_msg = models.PaperChatMessage(
        paper_id=paper_id,
        role=role,
        content=content
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg


def get_project_comparisons(db: Session, project_id: int):
    return (
        db.query(models.PaperComparison)
        .filter(models.PaperComparison.project_id == project_id)
        .order_by(models.PaperComparison.created_at.desc())
        .all()
    )


def get_comparison(db: Session, comparison_id: int, project_id: int):
    return (
        db.query(models.PaperComparison)
        .filter(
            models.PaperComparison.id == comparison_id,
            models.PaperComparison.project_id == project_id
        )
        .first()
    )


def create_comparison(db: Session, project_id: int, paper_ids: list, report: dict):
    db_comparison = models.PaperComparison(
        project_id=project_id,
        selected_papers=json.dumps(paper_ids),
        comparison_report=json.dumps(report)
    )
    db.add(db_comparison)
    db.commit()
    db.refresh(db_comparison)
    return db_comparison


def delete_comparison(db: Session, comparison_id: int, project_id: int):
    db_comp = get_comparison(db, comparison_id, project_id)
    if db_comp:
        db.delete(db_comp)
        db.commit()
        return True
    return False


def get_project_novelty_analyses(db: Session, project_id: int):
    return (
        db.query(models.NoveltyAnalysis)
        .filter(models.NoveltyAnalysis.project_id == project_id)
        .order_by(models.NoveltyAnalysis.created_at.desc())
        .all()
    )


def get_novelty_analysis(db: Session, analysis_id: int, project_id: int):
    return (
        db.query(models.NoveltyAnalysis)
        .filter(
            models.NoveltyAnalysis.id == analysis_id,
            models.NoveltyAnalysis.project_id == project_id
        )
        .first()
    )


def create_novelty_analysis(db: Session, project_id: int, paper_ids: list, report: dict):
    # Get the latest version number for this project's novelty analyses
    latest = (
        db.query(models.NoveltyAnalysis)
        .filter(models.NoveltyAnalysis.project_id == project_id)
        .order_by(models.NoveltyAnalysis.draft_version.desc())
        .first()
    )
    next_version = (latest.draft_version + 1) if latest else 1

    db_analysis = models.NoveltyAnalysis(
        project_id=project_id,
        draft_version=next_version,
        comparison_papers=json.dumps(paper_ids),
        analysis_report=json.dumps(report)
    )
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis


def delete_novelty_analysis(db: Session, analysis_id: int, project_id: int):
    db_analysis = get_novelty_analysis(db, analysis_id, project_id)
    if db_analysis:
        db.delete(db_analysis)
        db.commit()
        return True
    return False