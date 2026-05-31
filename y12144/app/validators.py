from typing import List, Tuple, Dict
from app.models import DataStatus, NextVerifier
from app.status_machine import check_transition


def validate_coordinates(lat: float, lon: float) -> Tuple[bool, str]:
    if not (-90 <= lat <= 90):
        return False, f"纬度 {lat} 超出范围 [-90, 90]"
    if not (-180 <= lon <= 180):
        return False, f"经度 {lon} 超出范围 [-180, 180]"
    return True, ""


def validate_station_code(code: str) -> Tuple[bool, str]:
    if not code or len(code) == 0:
        return False, "台站代码不能为空"
    if len(code) > 20:
        return False, "台站代码长度不能超过20字符"
    return True, ""


def validate_phase(phase: str) -> Tuple[bool, str]:
    valid_phases = ["P", "S", "Pg", "Sg", "Pn", "Sn", "PmP", "SmS"]
    if phase.upper() not in [p.upper() for p in valid_phases]:
        return False, f"震相 {phase} 不支持，支持的震相: {', '.join(valid_phases)}"
    return True, ""


def validate_status_transition(from_status: DataStatus, to_status: DataStatus) -> Tuple[bool, str, NextVerifier]:
    result = check_transition(from_status, to_status)
    if not result["allowed"]:
        return False, result["description"], None
    return True, result["description"], result["required_verifier"]


def validate_inversion_input(arrivals: List, stations: List) -> Tuple[bool, List[str]]:
    errors = []
    
    normal_arrivals = [a for a in arrivals if a.status in [DataStatus.NORMAL, DataStatus.CONFIRMED]]
    if len(normal_arrivals) < 4:
        errors.append(f"有效到时记录不足，需要至少4条，当前只有 {len(normal_arrivals)} 条")
    
    station_ids = {a.station_id for a in normal_arrivals}
    if len(station_ids) < 3:
        errors.append(f"涉及台站数量不足，需要至少3个台站，当前只有 {len(station_ids)} 个")
    
    return len(errors) == 0, errors


def validate_velocity_model(layers: List[Dict]) -> Tuple[bool, List[str]]:
    errors = []
    
    if not layers:
        errors.append("波速模型至少需要1层")
        return False, errors
    
    sorted_layers = sorted(layers, key=lambda x: x["depth_top"])
    
    for i, layer in enumerate(sorted_layers):
        if layer["depth_bottom"] <= layer["depth_top"]:
            errors.append(f"第{i+1}层: 层底深度必须大于层顶深度")
        
        if layer["vp"] <= 0:
            errors.append(f"第{i+1}层: P波速度必须大于0")
        
        if layer["vs"] <= 0:
            errors.append(f"第{i+1}层: S波速度必须大于0")
        
        if layer["vs"] >= layer["vp"]:
            errors.append(f"第{i+1}层: S波速度应小于P波速度")
        
        if i > 0 and sorted_layers[i-1]["depth_bottom"] != layer["depth_top"]:
            errors.append(f"第{i}层和第{i+1}层之间存在间隙或重叠")
    
    return len(errors) == 0, errors
