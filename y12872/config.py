import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'samples.db')
DEMO_DIR = os.path.join(DATA_DIR, 'demo')
EXPORT_DIR = os.path.join(DATA_DIR, 'exports')

for d in [DATA_DIR, DEMO_DIR, EXPORT_DIR]:
    if not os.path.exists(d):
        os.makedirs(d)

STATUS_COLORS = {
    'normal': '#28a745',
    'warning': '#ffc107',
    'abnormal': '#dc3545',
    'reviewed': '#17a2b8',
    'pending': '#6c757d',
}

STATUS_LABELS = {
    'normal': '正常',
    'warning': '预警',
    'abnormal': '异常',
    'reviewed': '已复核',
    'pending': '待处理',
}

ABNORMAL_TYPES = {
    'wave_forecast_delay': '风浪预报晚到',
    'sample_temp_exceed': '样品温度越界',
    'transport_delay': '运输超时',
    'storage_timeout': '存储超时',
    'log_missing': '养殖日志缺失',
}
