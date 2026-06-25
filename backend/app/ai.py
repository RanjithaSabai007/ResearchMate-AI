from fastapi import APIRouter, UploadFile, File
from app.services.pdf_service import extract_first_pages_text
from app.services.metadata_service import extract_metadata
from app.services.summary_services import generate_summary
from app.services.paper_validation_service import is_research_paper
from pydantic import BaseModel
from app.services.chat_service import ask_paper_question

router = APIRouter(
    prefix="/api/ai",
    tags=["AI"]
)

@router.post("/extract-metadata")
async def extract_pdf_metadata(
    file: UploadFile = File(...)
):
    pdf_bytes = await file.read()

    extracted_text = extract_first_pages_text(
        pdf_bytes
    )

    if not is_research_paper(extracted_text):
        return {
            "success": False,
            "message": "This PDF does not appear to be a research paper."
        }

    metadata = extract_metadata(
        extracted_text
    )

    summary = generate_summary(
        extracted_text
    )

    return {
        "success": True,
        "data": {
            "metadata": metadata,
            "summary": summary,
            "paper_text": extracted_text
        }
    }

class ChatRequest(BaseModel):
    paper_text: str
    question: str


@router.post("/chat-paper")
async def chat_with_paper(
    request: ChatRequest
):
    answer = ask_paper_question(
        request.paper_text,
        request.question
    )

    return {
        "success": True,
        "data": {
            "answer": answer
        }
    }