from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DocumentChunk

from app.services.embedding_service import (
    generate_embedding,
)

from app.services.vector_store import (
    load_index,
    search_index,
)


def search_document(
    document_id: int,
    question: str,
    db: Session,
    top_k: int = 3,
) -> list[dict]:
    """
    Search a document for chunks relevant to a question.
    """

    # -----------------------------------------------------
    # Load FAISS index
    # -----------------------------------------------------

    try:
        index = load_index(document_id)

    except FileNotFoundError:
        raise ValueError(
            "Vector index not found for this document"
        )

    # -----------------------------------------------------
    # Generate question embedding
    # -----------------------------------------------------

    query_embedding = generate_embedding(
        question
    )

    # -----------------------------------------------------
    # Search FAISS
    # -----------------------------------------------------

    results = search_index(
        index,
        query_embedding,
        top_k,
    )

    if not results:
        return []

    # -----------------------------------------------------
    # Get document chunks
    # -----------------------------------------------------

    indices = [pos for pos, dist in results]
    
    chunks = db.execute(
        select(DocumentChunk)
        .where(
            DocumentChunk.document_id == document_id,
            DocumentChunk.chunk_index.in_(indices)
        )
    ).scalars().all()
    
    chunk_map = {chunk.chunk_index: chunk for chunk in chunks}

    # -----------------------------------------------------
    # Build response
    # -----------------------------------------------------

    search_results = []

    for chunk_position, distance in results:

        chunk = chunk_map.get(chunk_position)
        if not chunk:
            continue

        search_results.append(
            {
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "distance": distance,
            }
        )

    return search_results