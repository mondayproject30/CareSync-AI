import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Database")

# Fetch DATABASE_URL from environment; default to standard local PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/caresync")

engine = None
SessionLocal = None
Base = declarative_base()

# Attempt connection to PostgreSQL. Fallback to SQLite if connection fails.
try:
    if DATABASE_URL.startswith("postgresql"):
        logger.info(f"Attempting connection to PostgreSQL: {DATABASE_URL}")
        # Add quick connect timeout so it doesn't hang long if PostgreSQL is not running
        engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 3})
        # Verify connection
        with engine.connect() as conn:
            logger.info("Connected to PostgreSQL successfully.")
    else:
        # If it's SQLite or something else
        engine = create_engine(DATABASE_URL)
        logger.info("Connected to database successfully.")
except Exception as e:
    logger.warning(f"Database connection failed: {e}. Falling back to SQLite.")
    sqlite_url = "sqlite:///./caresync.db"
    # sqlite requires check_same_thread=False for async FastAPI requests
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    logger.info(f"Initialized SQLite database at {sqlite_url}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
