import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")

INPUT_FILE = os.path.join(RAW_DATA_DIR, "sensor_logs.csv")

FLOW_UNIT_TO_M3H = {
    "m3/h": 1.0,
    "m^3/h": 1.0,
    "m³/h": 1.0,
    "l/min": 0.06,
    "L/min": 0.06,
    "l/h": 0.001,
    "L/h": 0.001,
    "m3/s": 3600.0,
    "m^3/s": 3600.0,
}

DIAMETER_UNIT_TO_MM = {
    "mm": 1.0,
    "毫米": 1.0,
    "cm": 10.0,
    "m": 1000.0,
}

TEMP_UNIT_TO_DEGC = {
    "degC": 1.0,
    "°C": 1.0,
    "℃": 1.0,
    "celsius": 1.0,
    "C": 1.0,
}

VELOCITY_UNIT_TO_MS = {
    "m/s": 1.0,
    "m/s^-1": 1.0,
    "km/h": 0.277778,
    "m/min": 1.0 / 60.0,
}

THRESHOLDS = {
    "water_flow_min": 50.0,
    "water_flow_max": 200.0,
    "droplet_diameter_min": 1.0,
    "droplet_diameter_max": 5.0,
    "water_temp_min": 10.0,
    "water_temp_max": 50.0,
    "air_velocity_min": 0.5,
    "air_velocity_max": 8.0,
    "heat_dissipation_min": 100.0,
    "heat_dissipation_max": 7000.0,
    "jump_ratio": 1.5,
}

CALCULATION_FORMULAS = {
    "heat_dissipation": "Q = k * water_flow * water_temperature / droplet_diameter",
    "k_value": 4.2,
}

STATUS_CATEGORIES = [
    "已处理",
    "待补证据_单位异常",
    "待补证据_公式计算失败",
    "待补证据_阈值越界",
    "待补证据_设备编号重复",
    "待补证据_字段缺失",
]

FAILURE_REASONS = {
    "unit_unknown": "单位无法识别",
    "unit_magnitude_suspect": "单位换算后数量级存疑",
    "formula_param_missing": "公式参数缺失",
    "formula_divide_by_zero": "公式除零错误",
    "threshold_flow_out": "水流量超出阈值",
    "threshold_diameter_out": "水滴直径超出阈值",
    "threshold_temp_out": "水温超出阈值",
    "threshold_velocity_out": "风速超出阈值",
    "threshold_result_out": "计算结果超出阈值",
    "device_duplicate": "设备编号重复",
    "field_missing": "必要字段缺失",
}
