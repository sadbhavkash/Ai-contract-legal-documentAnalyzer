import requests


OLLAMA_URL = "http://localhost:11434/api/generate"

MODEL_NAME = "qwen2.5:3b"


def generate_answer(
    question: str,
    context: str,
    chat_history: str = "",
) -> str:
    """
    Generate an answer using Ollama
    based only on the supplied document context and history.
    """
    
    history_section = ""
    if chat_history:
        history_section = f"\nPREVIOUS CHAT HISTORY:\n{chat_history}\n"

    prompt = f"""
You are a helpful contract analysis assistant.

Answer the user's question using ONLY the information
provided in the contract context below.

If the answer cannot be found in the context,
say:

"I could not find this information in the document."

Do not make up information.
Do not use outside knowledge.
{history_section}
CONTRACT CONTEXT:
{context}

USER QUESTION:
{question}

ANSWER:
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    return data["response"].strip()