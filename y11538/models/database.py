from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import SQLALCHEMY_DATABASE_URI
from models import Base

engine = None
SessionFactory = None

def init_db():
    global engine, SessionFactory
    engine = create_engine(
        SQLALCHEMY_DATABASE_URI, 
        echo=False,
        connect_args={'check_same_thread': False},
        pool_pre_ping=True,
        pool_recycle=3600
    )
    SessionFactory = sessionmaker(bind=engine)
    Base.metadata.create_all(engine)
    return engine

def get_session():
    return SessionFactory()
