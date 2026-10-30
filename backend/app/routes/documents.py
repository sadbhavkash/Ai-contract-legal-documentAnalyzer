import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models import Document, User
from app.routes.auth import get_current_user
from app.schemas import DocumentResponse

from sqlalchemy import select

from app.services.chunk_service import process_document
from app.schemas import (
    DocumentResponse,
    DocumentProcessResponse,
)

from app.services.search_service import search_document

from app.services.analysis_service import analyze_document

from app.services.vector_service import (
    create_document_vector_store,
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


# =========================================================
# Upload Document
# =========================================================

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a PDF or DOCX document.
    """

    # -----------------------------------------------------
    # Check file exists
    # -----------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided",
        )

    # -----------------------------------------------------
    # Check file type
    # -----------------------------------------------------

    extension = Path(file.filename).suffix.lower()

    allowed_extensions = {
        ".pdf": "pdf",
        ".docx": "docx",
    }

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported",
        )

    document_type = allowed_extensions[extension]

    # -----------------------------------------------------
    # Create unique filename
    # -----------------------------------------------------

    unique_filename = (
        f"{uuid4().hex}{extension}"
    )

    file_path = (
        Path(settings.UPLOAD_DIR)
        / unique_filename
    )

    # -----------------------------------------------------
    # Save file
    # -----------------------------------------------------

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer,
            )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file",
        )

    # -----------------------------------------------------
    # Create database record
    # -----------------------------------------------------

    document = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_path=str(file_path),
        document_type=document_type,
        status="uploaded",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document

# =========================================================
# Process Document
# =========================================================

@router.post(
    "/{document_id}/process",
    response_model=DocumentProcessResponse,
)
def process_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Extract text from an uploaded document and
    save its chunks to PostgreSQL.
    """

    # Find document
    result = db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    try:
        chunks_created = process_document(
            document,
            db,
        )

        vectors_created = create_document_vector_store(
            document_id=document.id,
            db=db,
        )

        db.commit()

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except Exception as e:
        db.rollback()

        print("DOCUMENT PROCESSING ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to process document",
        )

    return {
        "status": "success",
        "message": "Document processed successfully",
        "document_id": document.id,
        "chunks_created": chunks_created,
        "vectors_created": vectors_created,
    }

# =========================================================
# Search Document
# =========================================================

@router.get(
    "/{document_id}/search",
)
def search_document_endpoint(
    document_id: int,
    question: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search a document using semantic similarity.
    """

    # -----------------------------------------------------
    # Check document belongs to current user
    # -----------------------------------------------------

    result = db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # -----------------------------------------------------
    # Search document
    # -----------------------------------------------------

    try:
        results = search_document(
            document_id=document_id,
            question=question,
            db=db,
            top_k=3,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    return {
        "document_id": document_id,
        "question": question,
        "results": results,
    }

# =========================================================
# Analyze Document
# =========================================================

@router.post(
    "/{document_id}/analyze",
)
def analyze_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a basic AI analysis of a contract.
    """

    # -----------------------------------------------------
    # Check document belongs to current user
    # -----------------------------------------------------

    result = db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # -----------------------------------------------------
    # Generate analysis
    # -----------------------------------------------------

    try:

        analysis = analyze_document(
            document_id=document_id,
            db=db,
        )

        db.commit()
        db.refresh(analysis)

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except Exception as e:

        print(
            "ANALYSIS ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to analyze document",
        )

    # -----------------------------------------------------
    # Return analysis
    # -----------------------------------------------------

    return {
        "id": analysis.id,
        "document_id": analysis.document_id,
        "summary": analysis.summary,
        "key_clauses": analysis.key_clauses,
        "risks": analysis.risks,
        "created_at": analysis.created_at,
    }