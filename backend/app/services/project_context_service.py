from sqlalchemy.orm import Session
from app import models
import json

def get_project_context(project_id: int, db: Session) -> dict:
    """
    Retrieves all database context elements related to the project to supply to the LLM.
    """
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        return {}

    # 1. Project Info
    project_info = {
        "title": project.title,
        "description": project.description,
        "document_type": project.document_type
    }

    # 2. Papers Context
    papers = []
    for paper in project.papers:
        papers.append({
            "id": paper.id,
            "title": paper.title,
            "author": paper.author,
            "summary": paper.summary or ""
        })

    # 3. Latest Comparison
    latest_comparison = None
    comp_record = (
        db.query(models.PaperComparison)
        .filter(models.PaperComparison.project_id == project_id)
        .order_by(models.PaperComparison.created_at.desc())
        .first()
    )
    if comp_record:
        latest_comparison = comp_record.comparison_report

    # 4. Latest Novelty Report
    latest_novelty = None
    nov_record = (
        db.query(models.NoveltyAnalysis)
        .filter(models.NoveltyAnalysis.project_id == project_id)
        .order_by(models.NoveltyAnalysis.created_at.desc())
        .first()
    )
    if nov_record:
        latest_novelty = nov_record.analysis_report

    return {
        "project_info": project_info,
        "papers": papers,
        "latest_comparison": latest_comparison,
        "latest_novelty": latest_novelty
    }
