import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
EXPORT_DIR = os.path.join(BASE_DIR, 'exports')
TEST_DIR = os.path.join(BASE_DIR, 'tests', 'test_data')

for d in [DATA_DIR, UPLOAD_DIR, EXPORT_DIR, TEST_DIR]:
    os.makedirs(d, exist_ok=True)

class Config:
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_DIR, "pedigree.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'pedigree-validator-secret-key'
    UPLOAD_FOLDER = UPLOAD_DIR
    EXPORT_FOLDER = EXPORT_DIR
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024
    ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'gif'}
