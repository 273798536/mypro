import io
import csv
import json
import numpy as np
import pandas as pd


def parse_csv_data(content, filename=None):
    try:
        df = pd.read_csv(io.StringIO(content))
        return parse_dataframe(df, filename)
    except Exception as e:
        raise ValueError(f"CSV解析失败: {str(e)}")


def parse_txt_data(content, filename=None):
    try:
        lines = content.strip().split('\n')
        data_lines = []
        delimiter = None
        
        for line in lines[:5]:
            if '\t' in line:
                delimiter = '\t'
                break
            elif ',' in line:
                delimiter = ','
                break
            elif ';' in line:
                delimiter = ';'
                break
        
        if delimiter is None:
            delimiter = ','
        
        reader = csv.reader(lines, delimiter=delimiter)
        for row in reader:
            if row and not row[0].startswith('#'):
                data_lines.append(row)
        
        if not data_lines:
            raise ValueError("文本文件中没有找到有效数据")
        
        header = data_lines[0]
        data = data_lines[1:]
        
        df = pd.DataFrame(data, columns=header)
        return parse_dataframe(df, filename)
    except Exception as e:
        raise ValueError(f"文本文件解析失败: {str(e)}")


def parse_json_data(content, filename=None):
    try:
        data = json.loads(content)
        
        if isinstance(data, dict):
            if 'time' in data and 'displacement' in data:
                t = data['time']
                x = data['displacement']
                metadata = {k: v for k, v in data.items() if k not in ['time', 'displacement']}
            elif 't' in data and 'x' in data:
                t = data['t']
                x = data['x']
                metadata = {k: v for k, v in data.items() if k not in ['t', 'x']}
            else:
                raise ValueError("JSON数据需要包含 time/displacement 或 t/x 字段")
        elif isinstance(data, list):
            t = [item.get('time', item.get('t')) for item in data]
            x = [item.get('displacement', item.get('x')) for item in data]
            metadata = {}
        else:
            raise ValueError("不支持的JSON数据格式")
        
        t = np.asarray(t, dtype=float)
        x = np.asarray(x, dtype=float)
        
        return {
            'time': t.tolist(),
            'displacement': x.tolist(),
            'metadata': metadata,
            'source': filename or 'json_data',
            'unit_warnings': []
        }
    except Exception as e:
        raise ValueError(f"JSON解析失败: {str(e)}")


def parse_dataframe(df, filename=None):
    unit_warnings = []
    metadata = {}
    
    time_col = None
    disp_col = None
    
    df.columns = df.columns.str.strip().str.lower()
    
    for col in df.columns:
        col_lower = col.lower()
        if 'time' in col_lower or 't' in col_lower or '时间' in col:
            time_col = col
        elif 'displacement' in col_lower or 'position' in col_lower or 'x' in col_lower or '位移' in col or '位置' in col:
            disp_col = col
    
    if time_col is None or disp_col is None:
        if len(df.columns) >= 2:
            time_col = df.columns[0]
            disp_col = df.columns[1]
            unit_warnings.append(f"自动识别列: 时间={time_col}, 位移={disp_col}")
        else:
            raise ValueError("无法识别时间和位移列，请确保数据包含时间和位移字段")
    
    for col in df.columns:
        if col not in [time_col, disp_col]:
            try:
                metadata[col] = df[col].iloc[0] if len(df) > 0 else None
            except:
                pass
    
    t = pd.to_numeric(df[time_col], errors='coerce')
    x = pd.to_numeric(df[disp_col], errors='coerce')
    
    t_nan = t.isna().sum()
    x_nan = x.isna().sum()
    
    if t_nan > 0:
        unit_warnings.append(f"时间列有 {t_nan} 个无效值已被忽略")
    if x_nan > 0:
        unit_warnings.append(f"位移列有 {x_nan} 个无效值已被忽略")
    
    t = t.dropna()
    x = x.dropna()
    
    if len(t) != len(x):
        min_len = min(len(t), len(x))
        t = t[:min_len]
        x = x[:min_len]
        unit_warnings.append("时间和位移序列长度不一致，已截断到相同长度")
    
    t = np.asarray(t, dtype=float)
    x = np.asarray(x, dtype=float)
    
    t_unit = detect_time_unit(t)
    x_unit = detect_displacement_unit(x)
    
    if t_unit['converted']:
        unit_warnings.append(f"时间单位自动转换: {t_unit['message']}")
        t = t_unit['values']
    
    if x_unit['converted']:
        unit_warnings.append(f"位移单位自动转换: {x_unit['message']}")
        x = x_unit['values']
    
    return {
        'time': t.tolist(),
        'displacement': x.tolist(),
        'metadata': metadata,
        'source': filename or 'csv_data',
        'unit_warnings': unit_warnings
    }


def detect_time_unit(t):
    t = np.asarray(t, dtype=float)
    t_range = np.max(t) - np.min(t)
    
    converted = False
    message = ""
    values = t
    
    if t_range < 10 and np.mean(t) < 1:
        converted = True
        message = "检测到时间值较小，假设单位为秒(s)"
    elif t_range > 1000 and np.mean(t) > 1000:
        converted = True
        values = t / 1000.0
        message = "检测到时间值较大，已从毫秒(ms)转换为秒(s)"
    
    return {
        'converted': converted,
        'message': message,
        'values': values
    }


def detect_displacement_unit(x):
    x = np.asarray(x, dtype=float)
    x_range = np.max(x) - np.min(x)
    
    converted = False
    message = ""
    values = x
    
    if x_range > 100:
        converted = True
        values = x / 100.0
        message = "检测到位移值较大，已从厘米(cm)转换为米(m)"
    
    return {
        'converted': converted,
        'message': message,
        'values': values
    }


def load_data(file_content, filename):
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.csv'):
        return parse_csv_data(file_content, filename)
    elif filename_lower.endswith('.txt'):
        return parse_txt_data(file_content, filename)
    elif filename_lower.endswith('.json'):
        return parse_json_data(file_content, filename)
    else:
        raise ValueError(f"不支持的文件格式: {filename}。支持的格式: .csv, .txt, .json")


def validate_data(data):
    errors = []
    warnings = []
    
    t = np.asarray(data['time'], dtype=float)
    x = np.asarray(data['displacement'], dtype=float)
    
    if len(t) < 10:
        errors.append(f"数据点太少: {len(t)} 个，至少需要 10 个点")
    
    if len(t) != len(x):
        errors.append(f"时间序列长度({len(t)})与位移序列长度({len(x)})不一致")
    
    dt = np.diff(t)
    if np.any(dt <= 0):
        errors.append("时间序列必须严格递增，请检查数据是否有重复或倒退的时间点")
    
    if np.std(dt) / np.mean(dt) > 0.5 and np.mean(dt) > 0:
        warnings.append("采样间隔不均匀，可能影响拟合结果")
    
    if np.std(x) < 1e-6:
        errors.append("位移数据几乎没有变化，可能是无效数据")
    
    if np.any(np.isnan(t)) or np.any(np.isnan(x)):
        errors.append("数据中包含 NaN 值")
    
    if np.any(np.isinf(t)) or np.any(np.isinf(x)):
        errors.append("数据中包含无穷大值")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings + data.get('unit_warnings', [])
    }
