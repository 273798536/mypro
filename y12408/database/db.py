from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

from config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={'check_same_thread': False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


@contextmanager
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import Contract, StayRecord, Reschedule, Cancellation, \
        VerificationSheet, DisputeNote, AuditLog
    Base.metadata.create_all(bind=engine)
