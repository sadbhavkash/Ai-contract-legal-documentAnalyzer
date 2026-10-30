import json

import requests
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Analysis, DocumentChunk


OLLAMA_URL = "http://localhost:11434/api/generate"

MODEL_NAME = "qwen2.5:3b"


def analyze_document(
    document_id: int,
    db: Session,
) -> Analysis:
    """
    Generate a basic contract analysis using Ollama.
    """

    # -----------------------------------------------------
    # Get document chunks
    # -----------------------------------------------------

    chunks = db.execute(
        select(DocumentChunk)
        .where(
            DocumentChunk.document_id == document_id
        )
        .order_by(
            DocumentChunk.chunk_index
        )
    ).scalars().all()

    if not chunks:
        raise ValueError(
            "No document chunks found"
        )

    # -----------------------------------------------------
    # Build document context
    # -----------------------------------------------------

    context_parts = []

    # Limit to first 15 chunks to avoid exceeding LLM context window
    for chunk in chunks[:15]:
        context_parts.append(chunk.text)

    context = "\n\n---\n\n".join(
        context_parts
    )

    # -----------------------------------------------------
    # Create prompt
    # -----------------------------------------------------

    prompt = f"""
You are a contract analysis assistant.

Analyze the contract below.

Use ONLY information from the contract.
Do not invent information.
Do not provide legal advice.

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{{
    "summary": "Short summary of the contract.",
    "key_clauses": "Important clauses found in the contract.",
    "risks": "Potentially important or unfavorable terms found in the contract."
}}

If something is not mentioned in the contract,
write:

"Not mentioned in the document."

CONTRACT:
{context}
"""

    # -----------------------------------------------------
    # Call Ollama directly
    # -----------------------------------------------------

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
        },
        timeout=180,
    )

    response.raise_for_status()

    data = response.json()

    ai_response = data.get("response", "").strip()

    if not ai_response:
        raise ValueError(
            "Ollama returned an empty response"
        )

    # -----------------------------------------------------
    # Parse JSON
    # -----------------------------------------------------

    try:

        analysis_data = json.loads(
            ai_response
        )

    except json.JSONDecodeError:

        # Sometimes the model adds text before/after JSON.
        start = ai_response.find("{")
        end = ai_response.rfind("}")

        if start == -1 or end == -1:
            raise ValueError(
                "The AI returned an invalid analysis response"
            )

        try:

            analysis_data = json.loads(
                ai_response[start:end + 1]
            )

        except json.JSONDecodeError:

            raise ValueError(
                "The AI returned an invalid analysis response"
            )

    # -----------------------------------------------------
    # Make sure values are strings
    # -----------------------------------------------------

    summary = analysis_data.get(
        "summary",
        "Not mentioned in the document.",
    )

    key_clauses = analysis_data.get(
        "key_clauses",
        "Not mentioned in the document.",
    )

    risks = analysis_data.get(
        "risks",
        "Not mentioned in the document.",
    )

    # -----------------------------------------------------
    # Convert dictionaries/lists to strings if necessary
    # -----------------------------------------------------

    if not isinstance(summary, str):
        summary = json.dumps(
            summary,
            ensure_ascii=False,
        )

    if not isinstance(key_clauses, str):
        key_clauses = json.dumps(
            key_clauses,
            ensure_ascii=False,
        )

    if not isinstance(risks, str):
        risks = json.dumps(
            risks,
            ensure_ascii=False,
        )

    # -----------------------------------------------------
    # Check existing analysis
    # -----------------------------------------------------

    analysis = db.execute(
        select(Analysis)
        .where(
            Analysis.document_id == document_id
        )
    ).scalar_one_or_none()

    # -----------------------------------------------------
    # Create analysis
    # -----------------------------------------------------

    if analysis is None:

        analysis = Analysis(
            document_id=document_id,
            summary=summary,
            key_clauses=key_clauses,
            risks=risks,
        )

        db.add(analysis)

    # -----------------------------------------------------
    # Update existing analysis
    # -----------------------------------------------------

    else:

        analysis.summary = summary
        analysis.key_clauses = key_clauses
        analysis.risks = risks

    # -----------------------------------------------------
    # Save (Caller handles commit)
    # -----------------------------------------------------

    db.flush()

    return analysis