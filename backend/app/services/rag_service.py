from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Chat, ChatMessage

from app.services.search_service import search_document
from app.services.llm_service import generate_answer


def answer_question(
    chat_id: int,
    question: str,
    db: Session,
) -> dict:
    """
    Complete RAG pipeline for a chat.

    1. Get chat and associated document
    2. Search relevant document chunks
    3. Build context
    4. Generate answer using Ollama
    5. Save question and answer to the chat
    6. Return answer and sources
    """

    # -----------------------------------------------------
    # Get chat
    # -----------------------------------------------------

    chat = db.execute(
        select(Chat).where(
            Chat.id == chat_id,
        )
    ).scalar_one_or_none()

    if chat is None:
        raise ValueError("Chat not found")

    document_id = chat.document_id

    # -----------------------------------------------------
    # Retrieve relevant chunks
    # -----------------------------------------------------

    results = search_document(
        document_id=document_id,
        question=question,
        db=db,
        top_k=3,
    )

    if not results:
        answer = (
            "I could not find this information "
            "in the document."
        )

        chat_message = ChatMessage(
            chat_id=chat_id,
            question=question,
            answer=answer,
        )

        db.add(chat_message)
        db.commit()
        db.refresh(chat_message)

        return {
            "answer": answer,
            "sources": [],
            "chat_message_id": chat_message.id,
        }

    # -----------------------------------------------------
    # Build context
    # -----------------------------------------------------

    context_parts = []

    for result in results:
        context_parts.append(
            result["text"]
        )

    context = "\n\n---\n\n".join(
        context_parts
    )

    # -----------------------------------------------------
    # Get recent chat history
    # -----------------------------------------------------
    
    recent_messages = db.execute(
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(5)
    ).scalars().all()
    
    recent_messages.reverse()
    
    history_parts = []
    for msg in recent_messages:
        history_parts.append(f"User: {msg.question}\nAssistant: {msg.answer}")
        
    chat_history = "\n\n".join(history_parts)

    # -----------------------------------------------------
    # Generate answer
    # -----------------------------------------------------

    answer = generate_answer(
        question=question,
        context=context,
        chat_history=chat_history,
    )

    # -----------------------------------------------------
    # Save chat message
    # -----------------------------------------------------

    chat_message = ChatMessage(
        chat_id=chat_id,
        question=question,
        answer=answer,
    )

    db.add(chat_message)

    db.commit()

    db.refresh(chat_message)

    # -----------------------------------------------------
    # Return sources
    # -----------------------------------------------------

    sources = []

    for result in results:
        sources.append(
            {
                "chunk_id": result["chunk_id"],
                "chunk_index": result["chunk_index"],
                "text": result["text"],
            }
        )

    return {
        "answer": answer,
        "sources": sources,
        "chat_message_id": chat_message.id,
    }