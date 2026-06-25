import json
import ollama
import time

def extract_metadata(text):

    start = time.time()

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

{text[:2500]}
"""

    print("Sending to phi3:mini...")

    ai_start = time.time()

    response = ollama.chat(
        model="phi3:mini",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    print("AI Time:", time.time() - ai_start)

    result = response["message"]["content"]

    print("TOTAL:", time.time() - start)

    try:
        return json.loads(result)

    except Exception as e:
        print("\nJSON ERROR:")
        print(e)

        print("\nRAW RESPONSE:")
        print(result)

        return {
            "title": "",
            "author": [],
            "domain": "",
            "keywords": [],
            "abstract": ""
        }