import re
from typing import Any, Dict


def mask_phone(phone: str) -> str:
    if not phone or len(phone) < 7:
        return phone or ""
    return phone[:3] + "****" + phone[-4:]


def mask_id_card(id_card: str) -> str:
    if not id_card or len(id_card) < 10:
        return id_card or ""
    if len(id_card) == 18:
        return id_card[:6] + "********" + id_card[-4:]
    return id_card[:4] + "****" + id_card[-4:]


def mask_email(email: str) -> str:
    if not email or "@" not in email:
        return email or ""
    name, domain = email.split("@", 1)
    if len(name) <= 2:
        return "*" * len(name) + "@" + domain
    return name[0] + "*" * (len(name) - 2) + name[-1] + "@" + domain


def mask_name(name: str) -> str:
    if not name:
        return ""
    if len(name) == 1:
        return "*"
    if len(name) == 2:
        return name[0] + "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


SENSITIVE_FIELDS = {
    "guest_phone": mask_phone,
    "guest_name": mask_name,
    "id_card": mask_id_card,
    "operator": mask_name,
    "adjusted_by": mask_name,
    "frozen_by": mask_name,
    "created_by": mask_name,
    "updated_by": mask_name,
}


def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
    result = {}
    for key, value in data.items():
        if key in SENSITIVE_FIELDS and isinstance(value, str):
            result[key] = SENSITIVE_FIELDS[key](value)
        elif isinstance(value, dict):
            result[key] = mask_sensitive_data(value)
        elif isinstance(value, list):
            result[key] = [
                mask_sensitive_data(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            result[key] = value
    return result
