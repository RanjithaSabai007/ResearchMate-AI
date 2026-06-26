import ollama


def ask_paper_question(
    paper_text,
    question,
    chat_history=[]
):
    system_prompt = f"""
You are a research assistant.
Answer user questions based ONLY on the research paper content below.

If the answer is not found in the paper, say exactly:
"Information not available in the paper."

Paper Content:
{paper_text[:6000]}
"""

    messages = [
        {
            "role": "user",
            "content": system_prompt
        }
    ]

    # Append message history (convert DB model instances to dictionary objects)
    for msg in chat_history:
        messages.append({
            "role": "user" if msg.role == "user" else "assistant",
            "content": msg.content
        })

    # Append the new user question
    messages.append({
        "role": "user",
        "content": question
    })

    response = ollama.chat(
        model="phi3:mini",
        messages=messages
    )

    return response["message"]["content"]