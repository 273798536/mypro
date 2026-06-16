import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///forget_diagnosis.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_AS_ASCII = False
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    DIAGNOSIS_CONFIG = {
        'FORGET_THRESHOLD': 0.3,
        'LEAKAGE_SIMILARITY_THRESHOLD': 0.95,
        'MAX_BATCH_SIZE': 1000,
        'MAX_CONTENT_HASH_ALGO': 'sha256',
    }
