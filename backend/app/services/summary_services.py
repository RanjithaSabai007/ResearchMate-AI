import ollama

def generate_summary(text):

    prompt = f"""
You are a research paper summarizer.

Generate a concise academic summary.

Requirements:
- 150-250 words
- Objective
- Methodology
- Findings
- Conclusion

Return only the summary.

Paper:

{text[:3000]}
"""

    response = ollama.chat(
        model="phi3:mini",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response["message"]["content"]