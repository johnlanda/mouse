from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.price_data import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./prices.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize the database by dropping and recreating all tables"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 