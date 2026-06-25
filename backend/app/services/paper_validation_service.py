def is_research_paper(text):

    text = text.lower()

    major_sections = [
        "abstract",
        "introduction",
        "references"
    ]

    optional_sections = [
        "keywords",
        "methodology",
        "methods",
        "results",
        "discussion",
        "conclusion",
        "literature review"
    ]

    major_score = 0
    optional_score = 0

    for item in major_sections:
        if item in text:
            major_score += 1

    for item in optional_sections:
        if item in text:
            optional_score += 1

    print(f"Major Score: {major_score}")
    print(f"Optional Score: {optional_score}")

    return major_score >= 2 and optional_score >= 1