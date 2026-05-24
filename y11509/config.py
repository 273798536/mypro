import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key-change-in-production"
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL"
    ) or "sqlite:///" + os.path.join(basedir, "medical_device.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    UPLOAD_FOLDER = os.path.join(basedir, "uploads")
    EXPORT_FOLDER = os.path.join(basedir, "exports")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv"}

    CERTIFICATE_WARNING_DAYS = 30
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
