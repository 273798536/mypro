import numpy as np


def detect_missing_points(t, expected_interval=None, tolerance=0.5):
    t = np.asarray(t, dtype=float)
    dt = np.diff(t)
    
    if len(dt) == 0:
        return [], []
    
    if expected_interval is None:
        expected_interval = np.median(dt)
    
    missing_indices = []
    missing_info = []
    
    for i, delta in enumerate(dt):
        if delta > expected_interval * (1 + tolerance):
            num_missing = int(round(float(delta) / float(expected_interval))) - 1
            missing_indices.append(int(i))
            missing_info.append({
                'index': int(i),
                'time_before': float(t[i]),
                'time_after': float(t[i+1]),
                'gap': float(delta),
                'expected_gap': float(expected_interval),
                'estimated_missing_count': int(num_missing)
            })
    
    return missing_indices, missing_info


def detect_anomalies_iqr(x, k=1.5):
    x = np.asarray(x, dtype=float)
    q1 = np.percentile(x, 25)
    q3 = np.percentile(x, 75)
    iqr = q3 - q1
    
    lower_bound = q1 - k * iqr
    upper_bound = q3 + k * iqr
    
    anomalies = []
    for i, val in enumerate(x):
        if val < lower_bound or val > upper_bound:
            anomalies.append({
                'index': int(i),
                'value': float(val),
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound),
                'type': 'IQR_outlier'
            })
    
    return anomalies


def detect_anomalies_residuals(residuals, threshold=3.0):
    residuals = np.asarray(residuals, dtype=float)
    std = np.std(residuals)
    
    if std == 0:
        return []
    
    anomalies = []
    for i, res in enumerate(residuals):
        z_score = abs(res) / std
        if z_score > threshold:
            anomalies.append({
                'index': int(i),
                'residual': float(res),
                'z_score': float(z_score),
                'threshold': float(threshold),
                'type': 'residual_outlier'
            })
    
    return anomalies


def detect_amplitude_anomalies(t, x, window_size=10):
    x = np.asarray(x, dtype=float)
    n = len(x)
    
    if n < window_size * 2:
        return []
    
    anomalies = []
    x_centered = x - np.mean(x)
    
    for i in range(window_size, n - window_size):
        local_std = np.std(x_centered[i-window_size:i+window_size])
        if local_std == 0:
            continue
        
        local_deviation = abs(x_centered[i]) / local_std
        
        if local_deviation > 3.0:
            anomalies.append({
                'index': int(i),
                'value': float(x[i]),
                'local_deviation': float(local_deviation),
                'type': 'amplitude_spike'
            })
    
    return anomalies


def detect_all_anomalies(t, x, residuals=None):
    t = np.asarray(t, dtype=float)
    x = np.asarray(x, dtype=float)
    
    all_anomalies = []
    
    _, missing_info = detect_missing_points(t)
    for info in missing_info:
        all_anomalies.append(info)
    
    iqr_anomalies = detect_anomalies_iqr(x)
    all_anomalies.extend(iqr_anomalies)
    
    if residuals is not None:
        res_anomalies = detect_anomalies_residuals(residuals)
        all_anomalies.extend(res_anomalies)
    
    amp_anomalies = detect_amplitude_anomalies(t, x)
    all_anomalies.extend(amp_anomalies)
    
    return all_anomalies


def summarize_anomalies(anomalies):
    if not anomalies:
        return {
            'total': 0,
            'by_type': {},
            'severity': 'normal',
            'message': '未检测到异常点'
        }
    
    by_type = {}
    for anomaly in anomalies:
        atype = anomaly.get('type', 'unknown')
        by_type[atype] = by_type.get(atype, 0) + 1
    
    total = len(anomalies)
    
    if total >= 10:
        severity = 'critical'
        message = f'检测到 {total} 个异常点，数据质量严重问题'
    elif total >= 5:
        severity = 'warning'
        message = f'检测到 {total} 个异常点，请留意'
    else:
        severity = 'info'
        message = f'检测到 {total} 个异常点'
    
    return {
        'total': total,
        'by_type': by_type,
        'severity': severity,
        'message': message
    }
