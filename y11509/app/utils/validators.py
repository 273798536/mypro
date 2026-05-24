import re
from datetime import datetime
from typing import Tuple, Optional


def validate_record_no(record_no: str) -> Tuple[bool, Optional[str]]:
    if not record_no or len(record_no.strip()) == 0:
        return False, "记录编号不能为空"
    if len(record_no) > 100:
        return False, "记录编号长度不能超过100字符"
    return True, None


def validate_device_name(device_name: str) -> Tuple[bool, Optional[str]]:
    if not device_name or len(device_name.strip()) == 0:
        return False, "设备名称不能为空"
    if len(device_name) > 200:
        return False, "设备名称长度不能超过200字符"
    return True, None


def validate_department(department: str) -> Tuple[bool, Optional[str]]:
    if not department or len(department.strip()) == 0:
        return False, "科室不能为空"
    if len(department) > 100:
        return False, "科室名称长度不能超过100字符"
    return True, None


def validate_date(date_str: str, field_name: str = "日期") -> Tuple[bool, Optional[str], Optional[datetime]]:
    if not date_str:
        return True, None, None
    try:
        if isinstance(date_str, datetime):
            return True, None, date_str
        for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d"]:
            try:
                dt = datetime.strptime(date_str, fmt)
                return True, None, dt
            except ValueError:
                continue
        return False, f"{field_name}格式不正确，请使用YYYY-MM-DD格式", None
    except Exception:
        return False, f"{field_name}解析失败", None


def validate_certificate_no(certificate_no: str) -> Tuple[bool, Optional[str]]:
    if not certificate_no:
        return True, None
    if len(certificate_no) > 100:
        return False, "证书编号长度不能超过100字符"
    return True, None


def mask_sensitive_data(data: dict, role: str = "nurse") -> dict:
    if not data:
        return data

    sensitive_fields = ["device_sn", "original_data", "parsed_data"]
    sensitive_text_fields = ["issues_found", "fault_description", "supplementary_reason"]

    masked = data.copy()

    if role in ["nurse", "department_head"]:
        for field in sensitive_fields:
            if field in masked and masked[field]:
                if field == "device_sn":
                    sn = str(masked[field])
                    if len(sn) > 4:
                        masked[field] = sn[:2] + "****" + sn[-2:]
                    else:
                        masked[field] = "****"
                elif field in ["original_data", "parsed_data"]:
                    if isinstance(masked[field], dict):
                        for key in masked[field]:
                            if "sn" in key.lower() or "serial" in key.lower():
                                masked[field][key] = "****"

    if role == "nurse":
        for field in sensitive_text_fields:
            if field in masked and masked[field]:
                content = str(masked[field])
                if len(content) > 10:
                    masked[field] = content[:10] + "..."
    return masked


def mask_record_list(records: list, role: str = "nurse") -> list:
    return [mask_sensitive_data(r, role) for r in records]
