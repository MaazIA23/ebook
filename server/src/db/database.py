import os
from typing import Generator

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    load_dotenv = None
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session


if load_dotenv:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/ebookdb")

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

