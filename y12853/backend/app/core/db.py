from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event

from app.core.config import settings

db_url = settings.assemble_db_connection()
connect_args = {}
engine_kwargs = {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine_kwargs = {"connect_args": connect_args}
else:
    engine_kwargs["connect_args"] = connect_args

engine = create_engine(db_url, **engine_kwargs)

if db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
