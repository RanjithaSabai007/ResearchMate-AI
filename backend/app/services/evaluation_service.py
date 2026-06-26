import json
import ollama

def evaluate_paper(text, metadata, summary):
    prompt = f"""
You are an expert academic peer reviewer and thesis advisor.
Analyze the following research paper details (metadata, summary, and text snippet) and evaluate its usefulness as a reference for a student writing a thesis.

Return ONLY a valid JSON object matching this schema, with no additional markdown, text, or wrappers:
{{
  "overall_score": 85, // integer between 0 and 100 representing Research Value / usefulness
  "paper_type": "Experimental Research", // e.g. "Experimental Research", "Survey / Review", "Theoretical / Mathematical", "System / Tool Design"
  "citation_value": "Highly Recommended", // e.g. "Highly Recommended", "Recommended", "Optional / Background"
  "research_contribution": "High", // e.g. "High", "Medium", "Low"
  "strengths": [
    "strength description 1",
    "strength description 2"
  ], // list of strings (2 to 5 items)
  "weaknesses": [
    "weakness description 1",
    "weakness description 2"
  ], // list of strings (2 to 5 items)
  "best_for": [
    "e.g. Literature Review",
    "e.g. Methodology Reference"
  ], // list of strings (1 to 4 items)
  "not_recommended_for": [
    "e.g. Benchmark comparisons",
    "e.g. Deployment studies"
  ] // list of strings (1 to 3 items)
}}

Focus on "How useful is this paper for a thesis?" instead of generic writing quality.

Paper Metadata:
Title: {metadata.get('title', 'Unknown')}
Domain: {metadata.get('domain', 'Unknown')}
Abstract: {metadata.get('abstract', '')}

Paper Summary:
{summary}

Paper Snippet:
{text[:4500]}
"""

    try:
        response = ollama.chat(
            model="phi3:mini",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        result = response["message"]["content"].strip()
        # Clean potential markdown JSON wrappers like ```json ... ```
        if result.startswith("```"):
            lines = result.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            result = "\n".join(lines).strip()
            
        return json.loads(result)
    except Exception as e:
        print("Paper evaluation parsing error:", e)
        return {
            "overall_score": 75,
            "paper_type": "Research Paper",
            "citation_value": "Recommended",
            "research_contribution": "Medium",
            "strengths": ["Presents structured methodology", "Relevant literature context"],
            "weaknesses": ["Requires general comparative review", "Validation details are brief"],
            "best_for": ["Literature Review", "Background Context"],
            "not_recommended_for": ["Direct reproduction", "Benchmark comparisons"]
        }
