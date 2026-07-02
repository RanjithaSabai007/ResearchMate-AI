from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app import models, schemas, crud
from app.services.writing_assistant_service import chat_with_assistant
from typing import List

router = APIRouter(
    prefix="/api/projects/{project_id}",
    tags=["AI Writing Assistant"]
)

# Locally defined security dependency to avoid circular imports with main.py
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


def verify_project_ownership(project_id: int, user_id: int, db: Session) -> models.Project:
    project = crud.get_project(db, project_id, user_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status_code": 404,
                "error_code": "PROJECT_NOT_FOUND",
                "message": "The project could not be found."
            }
        )
    return project


@router.post("/writing-assistant/chat", response_model=schemas.WritingAssistantResponse)
def run_assistant_chat(
    project_id: int,
    chat_data: schemas.WritingAssistantChatRequest,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    # 1. Authorize user has access to project
    verify_project_ownership(project_id, current_session.user_id, db)

    # 2. Trigger the writing assistant orchestrator
    result = chat_with_assistant(
        project_id=project_id,
        user_prompt=chat_data.prompt,
        selected_text=chat_data.selected_text,
        cursor_paragraph=chat_data.cursor_paragraph,
        current_heading=chat_data.current_heading,
        draft_content=chat_data.draft_content or "",
        db=db
    )
    return result


@router.get("/writing-assistant/history", response_model=schemas.ApiResponse[List[schemas.WritingAssistantMessageResponse]])
def get_assistant_history(
    project_id: int,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    verify_project_ownership(project_id, current_session.user_id, db)

    history = (
        db.query(models.WritingAssistantMessage)
        .filter(models.WritingAssistantMessage.project_id == project_id)
        .order_by(models.WritingAssistantMessage.created_at.asc())
        .all()
    )
    return {
        "success": True,
        "data": history,
        "error_code": None,
        "message": "Chat history retrieved successfully."
    }


@router.delete("/writing-assistant/history", response_model=schemas.ApiResponse[dict])
def clear_assistant_history(
    project_id: int,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    verify_project_ownership(project_id, current_session.user_id, db)

    db.query(models.WritingAssistantMessage).filter(
        models.WritingAssistantMessage.project_id == project_id
    ).delete()
    db.commit()

    return {
        "success": True,
        "data": {"message": "Chat history successfully cleared."},
        "error_code": None,
        "message": "Chat history cleared successfully."
    }


@router.put("/document-type", response_model=schemas.ApiResponse[schemas.ProjectResponse])
def update_project_document_type(
    project_id: int,
    document_type: str,
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db)
):
    project = verify_project_ownership(project_id, current_session.user_id, db)
    project.document_type = document_type
    db.commit()
    db.refresh(project)

    return {
        "success": True,
        "data": project,
        "error_code": None,
        "message": "Document type updated successfully."
    }
