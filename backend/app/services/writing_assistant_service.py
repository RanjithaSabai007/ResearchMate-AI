import ollama
from sqlalchemy.orm import Session
from app import models
from app.services.project_context_service import get_project_context
from app.services.document_context_service import get_document_context
from app.services.prompt_builder import build_system_prompt, build_user_prompt

def chat_with_assistant(
    project_id: int,
    user_prompt: str,
    selected_text: str,
    cursor_paragraph: str,
    current_heading: str,
    draft_content: str,
    db: Session
) -> dict:
    """
    Orchestrates the AI Writing Assistant interaction.
    """
    # 1. Fetch contexts
    project_context = get_project_context(project_id, db)
    doc_type = project_context.get("project_info", {}).get("document_type", "Research Thesis")
    
    document_context = get_document_context(
        draft_content=draft_content,
        selected_text=selected_text,
        cursor_paragraph=cursor_paragraph,
        current_heading=current_heading
    )

    # 2. Build system and custom prompt
    system_prompt = build_system_prompt(doc_type)
    assembled_user_prompt = build_user_prompt(
        user_prompt=user_prompt,
        project_context=project_context,
        document_context=document_context
    )

    # 3. Retrieve conversation history from DB
    history_records = (
        db.query(models.WritingAssistantMessage)
        .filter(models.WritingAssistantMessage.project_id == project_id)
        .order_by(models.WritingAssistantMessage.created_at.asc())
        .all()
    )

    # 4. Formulate the LLM messages list
    messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]

    # Add historical messages (clean, without prompt-builder templates)
    for record in history_records:
        messages.append({
            "role": record.role,
            "content": record.content
        })

    # Add the current user prompt (fully populated with project metadata/summaries)
    messages.append({
        "role": "user",
        "content": assembled_user_prompt
    })

    # 5. Call Ollama
    try:
        response = ollama.chat(
            model="phi3:mini",
            messages=messages
        )
        ai_response_content = response["message"]["content"]
    except Exception as e:
        ai_response_content = f"Error communicating with Ollama: {str(e)}"

    # 6. Save message exchange in the DB (save raw user input for clean display)
    user_msg = models.WritingAssistantMessage(
        project_id=project_id,
        role="user",
        content=user_prompt
    )
    assistant_msg = models.WritingAssistantMessage(
        project_id=project_id,
        role="assistant",
        content=ai_response_content
    )
    
    db.add(user_msg)
    db.add(assistant_msg)
    db.commit()

    # 7. Get updated chat history to return
    updated_history = (
        db.query(models.WritingAssistantMessage)
        .filter(models.WritingAssistantMessage.project_id == project_id)
        .order_by(models.WritingAssistantMessage.created_at.asc())
        .all()
    )

    return {
        "success": True,
        "answer": ai_response_content,
        "chat_history": updated_history
    }
