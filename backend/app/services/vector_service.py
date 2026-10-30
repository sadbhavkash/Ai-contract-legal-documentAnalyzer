from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DocumentChunk

from app.services.embedding_service import (
    generate_embeddings,
)

from app.services.vector_store import (
    create_index,
    save_index,
)


def create_document_vector_store(
    document_id: int,
    db: Session,
) -> int:
    """
    Create a FAISS vector store for a document.
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
            "No chunks found for this document"
        )

    # -----------------------------------------------------
    # Get chunk text
    # -----------------------------------------------------

    texts = [
        chunk.text
        for chunk in chunks
    ]

    # -----------------------------------------------------
    # Generate embeddings
    # -----------------------------------------------------

    embeddings = generate_embeddings(
        texts
    )

    # -----------------------------------------------------
    # Create FAISS index
    # -----------------------------------------------------

    index = create_index(
        embeddings
    )

    # -----------------------------------------------------
    # Save index
    # -----------------------------------------------------

    save_index(
        index,
        document_id,
    )

    return len(chunks)