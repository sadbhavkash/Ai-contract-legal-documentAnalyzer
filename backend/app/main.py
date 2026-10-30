from fastapi import FastAPI

from app.core.config import settings
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
from app.routes.chat import router as chats_router

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
)


from fastapi.middleware.cors import CORSMiddleware

# =========================================================
# CORS Middleware
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# Routes
# =========================================================

app.include_router(
    auth_router,
    prefix=settings.API_V1_PREFIX,
)

app.include_router(
    documents_router,
    prefix=settings.API_V1_PREFIX,
)

app.include_router(
    chats_router,
    prefix="/api/v1",
)


# =========================================================
# Health Check
# =========================================================

@app.get("/")
def root():
    return {
        "message": "AI Contract and Legal Document Analyzer API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }