from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk
from app.services.document_processor import extract_text
from app.services.chunker import chunk_text


def process_document(
    document: Document,
    db: Session,
) -> int:
    """
    Extract text from a document, split it into chunks,
    and save the chunks to PostgreSQL.
    """

    # -----------------------------------------------------
    # Extract text
    # -----------------------------------------------------

    text = extract_text(
        document.file_path,
        document.document_type,
    )

    if not text.strip():
        raise ValueError(
            "No text could be extracted from the document"
        )

    # -----------------------------------------------------
    # Split text into chunks
    # -----------------------------------------------------

    chunks = chunk_text(text)

    if not chunks:
        raise ValueError(
            "No chunks were created"
        )

    # -----------------------------------------------------
    # Remove existing chunks
    # -----------------------------------------------------

    existing_chunks = db.execute(
        select(DocumentChunk).where(
            DocumentChunk.document_id == document.id
        )
    ).scalars().all()

    for existing_chunk in existing_chunks:
        db.delete(existing_chunk)

    # -----------------------------------------------------
    # Create new chunks
    # -----------------------------------------------------

    for index, chunk in enumerate(chunks):

        document_chunk = DocumentChunk(
            document_id=document.id,
            chunk_index=index,
            page_number=None,
            text=chunk,
        )

        db.add(document_chunk)

    document.status = "processed"

    db.flush()

    return len(chunks)