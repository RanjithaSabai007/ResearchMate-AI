import ollama


def ask_paper_question(
    paper_text,
    question
):
    prompt = f"""
You are a research assistant.

Answer ONLY from the research paper below.

If the answer is not found in the paper,
say:

"Information not available in the paper."

Paper:

{paper_text[:6000]}

Question:

{question}
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