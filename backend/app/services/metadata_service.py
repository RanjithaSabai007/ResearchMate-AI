import json
import ollama


def extract_metadata(text):
    prompt = f"""
You are an academic research assistant.

Extract:

1. Title
2. Authors
3. Research Domain
4. Keywords
5. Abstract

Return ONLY valid JSON.

{{
  "title": "",
  "author": [],
  "domain": "",
  "keywords": [],
  "abstract": ""
}}

Paper:

{text[:3000]}
"""

    response = ollama.chat(
        model="mistral",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    result = response["message"]["content"]

    try:
        return json.loads(result)
    except:
        return {
            "title": "",
            "author": [],
            "domain": "",
            "keywords": [],
            "abstract": ""
        }

    result = response["message"]["content"]

    print("\n===== MISTRAL RAW RESPONSE =====")
    print(result)
    print("================================\n")

    return result