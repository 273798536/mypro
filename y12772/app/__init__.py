import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
EXPORT_DIR = os.path.join(DATA_DIR, 'exports')
DB_PATH = os.path.join(DATA_DIR, 'records.json')

for d in [DATA_DIR, UPLOAD_DIR, EXPORT_DIR]:
    os.makedirs(d, exist_ok=True)
