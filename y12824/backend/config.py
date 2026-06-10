import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
EXPORT_FOLDER = os.path.join(BASE_DIR, 'exports')
PHOTO_FOLDER = os.path.join(BASE_DIR, 'photos')
DB_PATH = os.path.join(BASE_DIR, 'aquaculture.db')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(EXPORT_FOLDER, exist_ok=True)
os.makedirs(PHOTO_FOLDER, exist_ok=True)

class Config:
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DB_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = UPLOAD_FOLDER
    EXPORT_FOLDER = EXPORT_FOLDER
    PHOTO_FOLDER = PHOTO_FOLDER
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024
    SECRET_KEY = 'aquaculture-survival-secret-key'
