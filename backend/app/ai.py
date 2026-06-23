from fastapi import APIRouter, UploadFile, File

from app.services.pdf_service import extract_first_pages_text
from app.services.metadata_service import extract_metadata

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

    metadata = extract_metadata(
        extracted_text
    )

    return {
        "success": True,
        "metadata": metadata
    }