def build_system_prompt(document_type: str) -> str:
    """
    Builds the system instructions based on the selected document type.
    """
    base_persona = (
        "You are an expert project-aware AI Writing Assistant and collaborative writing partner. "
        "Your goal is to help the user collaboratively author, refine, and review their document. "
        "IMPORTANT RULES:\n"
        "1. Prioritize project knowledge (uploaded reference documents, current draft) over generic knowledge.\n"
        "2. Do not invent facts. Answer based on the project context supplied. If not found in the project context, "
        "rely on professional domain principles but state clearly if you are using general knowledge.\n"
        "3. Provide structured, precise, and highly relevant content suitable for the requested document type.\n"
        "4. Respond with the content directly. Do not add conversational conversational filler like 'Sure, here is...' or 'Okay, let's write...'."
    )

    doc_type_instructions = {
        "Research Thesis": (
            "You are assisting with an Academic Research Thesis. "
            "Maintain an objective, formal, and academic tone. Follow scientific structures, referencing style, "
            "and methodology explanations. Cite relevant findings from the reference documents when appropriate."
        ),
        "Research Proposal": (
            "You are assisting with a Research Proposal. "
            "Focus on defining clear research questions, methodologies, objectives, and significance/contributions."
        ),
        "PRD": (
            "You are assisting with a Product Requirements Document (PRD). "
            "Use clear, technical product terminology. Define user personas, features, acceptance criteria, and release phases."
        ),
        "BRD": (
            "You are assisting with a Business Requirements Document (BRD). "
            "Focus on business goals, high-level objectives, stakeholders, constraints, and business value metrics."
        ),
        "SRS": (
            "You are assisting with a Software Requirements Specification (SRS). "
            "Focus on functional requirements, non-functional requirements, system boundaries, and interface descriptions."
        ),
        "Technical Design Document": (
            "You are assisting with a Technical Design Document. "
            "Focus on architecture patterns, database design, system flows, API specifications, and performance considerations."
        ),
        "Whitepaper": (
            "You are assisting with a Whitepaper. "
            "Provide authoritative, persuasive, in-depth reports or guides about a specific technology or product."
        ),
        "Patent Draft": (
            "You are assisting with a Patent Draft. "
            "Follow precise legal-technical wording. Focus on independent/dependent claims, background, summary of invention, and detailed descriptions."
        ),
        "Grant Proposal": (
            "You are assisting with a Grant Proposal. "
            "Focus on societal or scientific impact, feasibility, clear project milestone plans, and direct alignment with budget requests."
        ),
        "Meeting Notes": (
            "You are assisting with Meeting Notes. "
            "Summarize discussions clearly, listing attendees, main topics, decisions made, action items, and next steps."
        ),
        "Documentation": (
            "You are assisting with Technical Documentation. "
            "Write clear, user-friendly step-by-step guides, API references, or tutorials with clear formatting."
        )
    }

    specific = doc_type_instructions.get(document_type, "Maintain a professional and clear tone suitable for the context.")
    
    return f"{base_persona}\n\nDocument Context Specifics:\n{specific}"


def build_user_prompt(
    user_prompt: str,
    project_context: dict,
    document_context: dict
) -> str:
    """
    Assembles the final user prompt by laying out the project, reference papers, and current document contexts.
    """
    # 1. Project Info
    project_info = project_context.get("project_info", {})
    project_section = f"Project Title: {project_info.get('title', 'N/A')}\nProject Description: {project_info.get('description', 'N/A')}"
    
    # 2. Reference Papers
    papers_list = project_context.get("papers", [])
    papers_text = ""
    if papers_list:
        papers_text += "\nUploaded Reference Papers & Summaries:\n"
        for idx, paper in enumerate(papers_list, 1):
            papers_text += (
                f"--- Reference Paper #{idx} ---\n"
                f"Title: {paper.get('title', 'N/A')}\n"
                f"Authors: {paper.get('author', 'N/A')}\n"
                f"Summary: {paper.get('summary', 'No summary generated yet.')}\n"
            )
    else:
        papers_text = "No reference papers uploaded."

    # 3. Novelty & Comparison Reports
    comparison = project_context.get("latest_comparison", None)
    novelty = project_context.get("latest_novelty", None)
    
    reports_text = ""
    if comparison:
        reports_text += f"\nLatest Multi-Paper Comparison Report (JSON Summary):\n{comparison}\n"
    if novelty:
        reports_text += f"\nLatest Novelty Analysis Report (JSON Summary):\n{novelty}\n"

    # 4. Document Draft Context
    selected_text = document_context.get("selected_text")
    cursor_paragraph = document_context.get("cursor_paragraph")
    current_heading = document_context.get("current_heading")
    draft_content = document_context.get("draft_content", "")

    # Clean draft_content if it is HTML
    draft_sample = draft_content[:4000] if draft_content else "Empty draft."
    
    document_section = f"Current Chapter/Heading: {current_heading or 'N/A'}\n"
    if cursor_paragraph:
        document_section += f"Cursor context (surrounding paragraph): {cursor_paragraph}\n"
    if selected_text:
        document_section += f"Selected Text: \"{selected_text}\"\n"
    document_section += f"\nDraft Content (Sample, first 4000 characters):\n{draft_sample}"

    # Construct the final prompt structure
    final_prompt = f"""[PROJECT METADATA]
{project_section}

[REFERENCE PAPERS SUMMARY]
{papers_text}
{reports_text}

[CURRENT DRAFT STATE]
{document_section}

[USER INSTRUCTION]
{user_prompt}

Generate a collaborative and constructive contribution. Focus on answering the user's instruction precisely using the contexts above.
If the instruction asks to rewrite, refine or expand the selected text, produce only the direct replacement content.
"""
    return final_prompt
