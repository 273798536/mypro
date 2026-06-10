from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

db = SQLAlchemy()

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()

def get_engine(db_path=None):
    if db_path is None:
        from config import Config
        db_path = Config.SQLALCHEMY_DATABASE_URI
    return create_engine(db_path)

def get_session(db_path=None):
    engine = get_engine(db_path)
    Session = sessionmaker(bind=engine)
    return Session()
