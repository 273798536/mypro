import hashlib
import os
import re
from datetime import datetime, date
import pandas as pd
import numpy as np

def calculate_file_hash(filepath):
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def clean_filename(filename):
    filename = re.sub(r'[^\w\-\.]', '_', filename)
    return filename.strip('._')

def safe_str(value):
    if pd.isna(value) or value is None:
        return None
    return str(value).strip()

def safe_int(value):
    if pd.isna(value) or value is None or value == '':
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None

def safe_float(value):
    if pd.isna(value) or value is None or value == '':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def parse_date(value):
    if pd.isna(value) or value is None or value == '':
        return None
    if isinstance(value, (datetime, date)):
        return value
    try:
        return pd.to_datetime(value)
    except (ValueError, TypeError):
        return None

def parse_gender(value):
    if pd.isna(value) or value is None:
        return None
    g = str(value).strip().lower()
    if g in ['m', 'male', '男', '1']:
        return 'Male'
    elif g in ['f', 'female', '女', '2']:
        return 'Female'
    elif g in ['u', 'unknown', '未知', '0']:
        return 'Unknown'
    return str(value).strip()

def parse_affection(value):
    if pd.isna(value) or value is None:
        return None
    a = str(value).strip().lower()
    if a in ['a', 'affected', '患病', '是', '1', 'yes']:
        return 'Affected'
    elif a in ['u', 'unaffected', '正常', '否', '0', 'no']:
        return 'Unaffected'
    elif a in ['p', 'probably_affected', '疑似']:
        return 'Probably Affected'
    return str(value).strip()

def get_file_extension(filename):
    return os.path.splitext(filename)[1].lower()

def is_excel_file(filename):
    ext = get_file_extension(filename)
    return ext in ['.xlsx', '.xls']

def is_csv_file(filename):
    return get_file_extension(filename) == '.csv'

def is_image_file(filename):
    ext = get_file_extension(filename)
    return ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']

def standardize_sample_id(sample_id):
    if not sample_id:
        return None
    return re.sub(r'[^\w\-]', '', str(sample_id).strip().upper())

def generate_unique_id(prefix='ID'):
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')[:-3]
    return f"{prefix}_{timestamp}"

def detect_duplicates(df, subset=None):
    if subset is None:
        subset = df.columns.tolist()
    dup_mask = df.duplicated(subset=subset, keep=False)
    return df[dup_mask].copy()

def human_readable_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / (1024 ** 2):.2f} MB"
    else:
        return f"{size_bytes / (1024 ** 3):.2f} GB"
