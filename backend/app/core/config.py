from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables
    and the .env file.
    """

    # ---------------------------------------------------------
    # Application
    # ---------------------------------------------------------

    APP_NAME: str = "AI Contract and Legal Document Analyzer"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # ---------------------------------------------------------
    # Database
    # ---------------------------------------------------------

    DATABASE_URL: str

    # ---------------------------------------------------------
    # Security
    # ---------------------------------------------------------

    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ---------------------------------------------------------
    # Ollama
    # ---------------------------------------------------------

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"

    # ---------------------------------------------------------
    # Embeddings
    # ---------------------------------------------------------

    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ---------------------------------------------------------
    # File storage
    # ---------------------------------------------------------

    UPLOAD_DIR: str = "uploads"
    VECTOR_STORE_PATH: str = "vector_store"

    # ---------------------------------------------------------
    # Pydantic settings configuration
    # ---------------------------------------------------------

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Create one settings object that can be imported throughout
# the application.
settings = Settings()


# -------------------------------------------------------------
# Make sure required directories exist
# -------------------------------------------------------------

Path(settings.UPLOAD_DIR).mkdir(
    parents=True,
    exist_ok=True,
)

Path(settings.VECTOR_STORE_PATH).mkdir(
    parents=True,
    exist_ok=True,
)