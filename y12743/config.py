import os
from datetime import datetime

class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'data', 'uploads')
    PROCESSED_FOLDER = os.path.join(BASE_DIR, 'data', 'processed')
    REPORTS_FOLDER = os.path.join(BASE_DIR, 'data', 'reports')
    CHARTS_FOLDER = os.path.join(BASE_DIR, 'static', 'charts')
    RULES_CONFIG = os.path.join(BASE_DIR, 'config', 'rules.yaml')
    
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    
    DATA_STATUS = {
        'AVAILABLE': 'available',
        'PENDING': 'pending',
        'RECOLLECT': 'recollect'
    }
    
    ISSUE_TYPES = {
        'SORTING_UNSTABLE': 'sorting_unstable',
        'EXTRAPOLATION_OUT_OF_BOUNDS': 'extrapolation_out_of_bounds',
        'DATA_MISSING': 'data_missing',
        'DATA_ABNORMAL': 'data_abnormal'
    }

def ensure_dirs():
    for d in [Config.UPLOAD_FOLDER, Config.PROCESSED_FOLDER, 
              Config.REPORTS_FOLDER, Config.CHARTS_FOLDER]:
        os.makedirs(d, exist_ok=True)
