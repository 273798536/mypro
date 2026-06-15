import json
from database import get_conn

REQUIRED_FIELDS = {"source", "process_status"}
DEFAULTS = {"process_status": "pending"}


def load_mappings():
    with get_conn() as conn:
        rows = conn.execute("SELECT incoming_field, standard_field FROM field_mappings").fetchall()
        return {r["incoming_field"]: r["standard_field"] for r in rows}


def normalize_record(raw: dict) -> dict:
    mappings = load_mappings()
    normalized = {}
    for key, value in raw.items():
        std_key = mappings.get(str(key).strip(), str(key).strip())
        normalized[std_key] = value

    if "source" not in normalized or not normalized["source"]:
        normalized["source"] = "未知来源"

    if "process_status" not in normalized or not normalized["process_status"]:
        normalized["process_status"] = DEFAULTS["process_status"]

    if "source_row" not in normalized or normalized["source_row"] is None:
        normalized["source_row"] = 0

    normalized["raw_fields"] = json.dumps(raw, ensure_ascii=False)
    return normalized


def ensure_required(normalized: dict) -> dict:
    for f in REQUIRED_FIELDS:
        if f not in normalized or normalized[f] in (None, ""):
            normalized[f] = DEFAULTS.get(f, "未设置")
    return normalized
