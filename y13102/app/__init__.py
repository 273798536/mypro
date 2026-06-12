from .database import Base, engine, get_db
from . import models
from .config import settings

models.Base.metadata.create_all(bind=engine)
