from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


# ---------------------------------------------------------
# Database Engine
# ---------------------------------------------------------

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)


# ---------------------------------------------------------
# Database Session
# ---------------------------------------------------------

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


# ---------------------------------------------------------
# Base class for database models
# ---------------------------------------------------------

class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------
# Database dependency
# ---------------------------------------------------------

def get_db():
    """
    Creates a database session for an API request
    and closes it when the request is finished.
    """

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()