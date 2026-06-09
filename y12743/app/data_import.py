import os
import hashlib
import pandas as pd
from config import Config


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def compute_file_hash(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def read_data_file(filepath):
    ext = filepath.rsplit('.', 1)[1].lower()
    if ext == 'csv':
        df = pd.read_csv(filepath)
    elif ext in ('xlsx', 'xls'):
        df = pd.read_excel(filepath)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")
    return df


def normalize_columns(df):
    rename_map = {
        '题目ID': 'question_id',
        '题目id': 'question_id',
        '题号': 'question_id',
        '分数': 'score',
        '得分': 'score',
        '外推值': 'extrapolated_value',
        '外推分数': 'extrapolated_value',
        '历史值': 'historical_value',
        '历史分数': 'historical_value',
        '抽样日期': 'sample_date',
        '日期': 'sample_date',
        '批次': 'batch_id',
        '学生ID': 'student_id',
        '学生id': 'student_id',
    }
    df = df.rename(columns={c: rename_map.get(c, c) for c in df.columns})
    return df


def save_uploaded_file(file_storage, filename=None):
    if filename is None:
        filename = file_storage.filename
    filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
    file_storage.save(filepath)
    return filepath
