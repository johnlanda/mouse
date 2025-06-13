from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.price_data import Base
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get database URL from environment variable, default to PostgreSQL if not specified
SQLALCHEMY_DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    # Get database configuration from environment variables
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "mouse")
    DB_USER = os.getenv("DB_USER", "mouse")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=disable"

# Log database configuration
logger.info(f"Using database URL: {SQLALCHEMY_DATABASE_URL}")

# Configure engine based on database type
if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
        echo=True  # Enable SQL query logging
    )
    logger.info("PostgreSQL engine configured")
else:
    # SQLite configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    logger.info("Using SQLite database")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize the database by creating all tables if they don't exist"""
    try:
        logger.info("Starting database initialization...")
        # Test the connection first for PostgreSQL
        if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                    logger.info("Successfully connected to PostgreSQL database")
            except Exception as e:
                logger.error(f"Failed to connect to PostgreSQL: {str(e)}")
                raise
        
        # Log the tables that will be created
        for table in Base.metadata.tables:
            logger.info(f"Will create table: {table}")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Verify tables were created
        with engine.connect() as conn:
            if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
                result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
                tables = [row[0] for row in result]
            else:
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in result]
            logger.info(f"Existing tables in database: {tables}")
            
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}")
        raise

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  