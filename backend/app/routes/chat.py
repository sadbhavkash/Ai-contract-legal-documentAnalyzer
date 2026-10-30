from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid import uuid4
import shutil

from app.database import get_db
from app.models import Chat, Document, User
from app.schemas import ChatCreate, ChatResponse
from app.routes.auth import get_current_user

from app.services.rag_service import answer_question

from app.core.config import settings
from app.services.chunk_service import process_document
from app.services.vector_service import create_document_vector_store
from app.services.analysis_service import analyze_document


router = APIRouter(
    prefix="/chats",
    tags=["Chats"],
)


# =========================================================
# Create Chat
# =========================================================

@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_chat(
    chat_data: ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new chat for the logged-in user.

    The user_id is taken from the JWT.
    It is never accepted from the client.
    """

    # -----------------------------------------------------
    # Check document belongs to current user
    # -----------------------------------------------------

    document = db.execute(
        select(Document).where(
            Document.id == chat_data.document_id,
            Document.user_id == current_user.id,
        )
    ).scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # -----------------------------------------------------
    # Create chat
    # -----------------------------------------------------

    chat = Chat(
        user_id=current_user.id,
        document_id=document.id,
        title=chat_data.title,
    )

    db.add(chat)
    db.commit()
    db.refresh(chat)

    return chat


# =========================================================
# Get My Chats
# =========================================================

@router.get(
    "",
    response_model=list[ChatResponse],
)
def get_my_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return only chats belonging to the logged-in user.
    """

    result = db.execute(
        select(Chat)
        .where(
            Chat.user_id == current_user.id,
        )
        .order_by(
            Chat.created_at.desc()
        )
    )

    chats = result.scalars().all()

    return chats


# =========================================================
# Get Single Chat
# =========================================================

@router.get(
    "/{chat_id}",
    response_model=ChatResponse,
)
def get_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single chat.

    A chat can only be accessed by its owner.
    """

    chat = db.execute(
        select(Chat).where(
            Chat.id == chat_id,
            Chat.user_id == current_user.id,
        )
    ).scalar_one_or_none()

    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    return chat


# =========================================================
# Get Chat Messages
# =========================================================

@router.get(
    "/{chat_id}/messages",
)
def get_chat_messages(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all messages for a specific chat.
    """
    
    # Verify chat ownership
    chat = db.execute(
        select(Chat).where(
            Chat.id == chat_id,
            Chat.user_id == current_user.id,
        )
    ).scalar_one_or_none()

    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    return chat.messages


# =========================================================
# Ask Question in Chat
# =========================================================

@router.get(
    "/{chat_id}/ask",
)
def ask_chat(
    chat_id: int,
    question: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ask a question about the document associated
    with this chat.
    """

    # -----------------------------------------------------
    # Check chat belongs to current user
    # -----------------------------------------------------

    chat = db.execute(
        select(Chat).where(
            Chat.id == chat_id,
            Chat.user_id == current_user.id,
        )
    ).scalar_one_or_none()

    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    # -----------------------------------------------------
    # Run RAG pipeline
    # -----------------------------------------------------

    try:

        result = answer_question(
            chat_id=chat_id,
            question=question,
            db=db,
        )

    except Exception as e:

        db.rollback()

        print(
            "RAG ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate answer",
        )

    # -----------------------------------------------------
    # Return response
    # -----------------------------------------------------

    return {
        "chat_id": chat_id,
        "question": question,
        "answer": result["answer"],
        "sources": result["sources"],
        "chat_message_id": result["chat_message_id"],
    }

# =========================================================
# Create New Chat with Contract
# =========================================================

@router.post(
    "/create",
    status_code=status.HTTP_201_CREATED,
)
def create_chat_with_document(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new chat and process its contract.

    Flow:
        1. Validate file
        2. Save file
        3. Create document
        4. Create chat
        5. Create chunks
        6. Create FAISS vectors
        7. Analyze contract
    """

    # -----------------------------------------------------
    # Validate file
    # -----------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided",
        )

    extension = Path(
        file.filename
    ).suffix.lower()

    allowed_extensions = {
        ".pdf": "pdf",
        ".docx": "docx",
    }

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported",
        )

    document_type = allowed_extensions[
        extension
    ]

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

    except Exception as e:

        print(
            "FILE SAVE ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file",
        )

    # -----------------------------------------------------
    # Create Document
    # -----------------------------------------------------

    document = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_path=str(file_path),
        document_type=document_type,
        status="uploaded",
    )

    db.add(document)
    db.flush()

    # -----------------------------------------------------
    # Create Chat
    # -----------------------------------------------------

    chat = Chat(
        user_id=current_user.id,
        document_id=document.id,
        title=title,
    )

    db.add(chat)
    db.flush()

    # -----------------------------------------------------
    # Process contract
    # -----------------------------------------------------

    try:

        # Create document chunks
        chunks_created = process_document(
            document,
            db,
        )

        # Create FAISS vector store
        vectors_created = create_document_vector_store(
            document_id=document.id,
            db=db,
        )

        # Generate contract analysis
        analyze_document(
            document_id=document.id,
            db=db,
        )

        # Mark document as processed
        document.status = "processed"

        db.commit()
        db.refresh(document)

    except Exception as e:

        db.rollback()

        if file_path.exists():
            file_path.unlink()
            
        index_path = Path(settings.VECTOR_STORE_PATH) / f"document_{document.id}.index"
        if index_path.exists():
            index_path.unlink()

        print(
            "CHAT PROCESSING ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to process contract",
        )

    # -----------------------------------------------------
    # Return result
    # -----------------------------------------------------

    return {
        "chat_id": chat.id,
        "chat_title": chat.title,
        "document_id": document.id,
        "filename": document.filename,
        "status": "success",
        "chunks_created": chunks_created,
        "vectors_created": vectors_created,
        "analysis_created": True,
    }