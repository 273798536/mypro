from sqlalchemy import create_engine, event
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
        connect_args={
            'check_same_thread': False,
            'timeout': 30
        },
        pool_pre_ping=True,
        pool_recycle=3600,
        isolation_level='AUTOCOMMIT'
    )
    
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    SessionFactory = sessionmaker(bind=engine)
    Base.metadata.create_all(engine)
    return engine

def get_session():
    return SessionFactory()
