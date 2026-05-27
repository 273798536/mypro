import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
EXPORT_DIR = os.path.join(BASE_DIR, 'exports')
HISTORY_FILE = os.path.join(DATA_DIR, 'processing_history.json')

ALLOWED_EXTENSIONS = {'csv', 'txt', 'json'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)
