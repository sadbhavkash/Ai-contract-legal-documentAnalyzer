from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# =========================================================
# Authentication
# =========================================================

class UserRegister(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
    )


class UserLogin(BaseModel):
    email: EmailStr

    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

# =========================================================
# Documents
# =========================================================

class DocumentResponse(BaseModel):
    id: int
    filename: str
    document_type: str
    status: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class DocumentProcessResponse(BaseModel):
    document_id: int
    status: str
    chunks_created: int

# =========================================================
# Chat
# =========================================================

class ChatCreate(BaseModel):
    document_id: int
    title: str


class ChatMessageResponse(BaseModel):
    id: int
    chat_id: int
    question: str
    answer: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    id: int
    user_id: int
    document_id: int
    title: str
    created_at: datetime
    messages: list[ChatMessageResponse] = []

    class Config:
        from_attributes = True

class ChatListResponse(BaseModel):
    id: int
    document_id: int
    title: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }