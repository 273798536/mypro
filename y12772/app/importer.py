import os
import pandas as pd
from datetime import datetime
from . import UPLOAD_DIR
from .storage import Storage
from .mwd_calc import build_distribution_dataframe, calculate_mwd, distribution_points, detect_anomalies


def read_raw_file(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext in ['.xlsx', '.xls']:
        return pd.read_excel(filepath)
    elif ext == '.csv':
        for enc in ['utf-8-sig', 'utf-8', 'gbk', 'gb2312']:
            try:
                return pd.read_csv(filepath, encoding=enc)
            except UnicodeDecodeError:
                continue
        return pd.read_csv(filepath, encoding='utf-8', errors='ignore')
    elif ext == '.txt':
        for enc in ['utf-8', 'gbk']:
            try:
                return pd.read_csv(filepath, sep=None, engine='python', encoding=enc)
            except UnicodeDecodeError:
                continue
    raise ValueError(f'不支持的文件格式: {ext}')


def save_upload(file_storage):
    ts = datetime.now().strftime('%Y%m%d_%H%M%S_')
    safe_name = ts + os.path.basename(file_storage.filename)
    path = os.path.join(UPLOAD_DIR, safe_name)
    file_storage.save(path)
    return path


def compare_stats(old_stats, new_stats):
    keys = ['Mn', 'Mw', 'PDI', 'Mp']
    diffs = {}
    for k in keys:
        if k in old_stats and k in new_stats:
            o, n = old_stats[k], new_stats[k]
            rel = abs(n - o) / max(abs(o), 1e-9)
            diffs[k] = {'old': o, 'new': n, 'rel_diff': rel}
    return diffs


def process_batch(batch_no, raw_df, meta=None, conflict_strategy='merge'):
    meta = meta or {}
    df = build_distribution_dataframe(raw_df)
    if df.empty:
        raise ValueError('未识别到有效的分子量/重量分数数据列')

    stats = calculate_mwd(df['分子量'].tolist(), df['重量分数'].tolist())
    dist = distribution_points(df)

    existing = Storage.get_batch(batch_no)
    conflict_info = None
    if existing:
        diffs = compare_stats(existing.get('stats', {}), stats)
        rel_max = max((d['rel_diff'] for d in diffs.values()), default=0.0)
        conflict_info = {
            'exists': True,
            'previous_runs': existing.get('run_count', 0),
            'first_seen': existing.get('first_seen'),
            'last_seen': existing.get('last_seen'),
            'differences': diffs,
            'max_relative_diff': rel_max,
        }
        if conflict_strategy == 'skip':
            return {
                'skipped': True,
                'batch_no': batch_no,
                'conflict_info': conflict_info,
                'message': '批号已存在，按策略跳过本次导入。',
            }
        elif conflict_strategy == 'replace':
            conflict_info['strategy'] = 'replace'
        else:
            conflict_info['strategy'] = 'merge'

    batch_record = {
        'batch_no': batch_no,
        'first_seen': existing.get('first_seen') if existing else datetime.now().isoformat(),
        'last_seen': datetime.now().isoformat(),
        'run_count': (existing.get('run_count') if existing else 0) + 1,
        'latest_stats': stats,
        'stats_history': (existing.get('stats_history') if existing else []) + [stats],
        'meta': {**(existing.get('meta') if existing else {}), **meta},
        'latest_data_points': {
            'mw': dist['mw'],
            'log_mw': dist['log_mw'],
            'weight': dist['weight'],
            'cumulative': dist['cumulative'],
            'row_count': len(df),
        },
    }
    Storage.upsert_batch(batch_no, batch_record)

    run_record = {
        'batch_no': batch_no,
        'stats': stats,
        'row_count': len(df),
        'meta': meta,
        'conflict_info': conflict_info,
    }
    saved_run = Storage.add_run(run_record)

    anomalies = detect_anomalies(df, stats, batch_no, saved_run['run_id'])
    for a in anomalies:
        Storage.add_anomaly(a)

    return {
        'batch_no': batch_no,
        'run_id': saved_run['run_id'],
        'stats': stats,
        'distribution': dist,
        'row_count': len(df),
        'anomalies': anomalies,
        'conflict_info': conflict_info,
        'batch_record': batch_record,
    }
