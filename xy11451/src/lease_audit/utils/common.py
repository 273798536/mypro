import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
import uuid


def generate_hash(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def generate_file_hash(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def generate_batch_no(source_type: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    short_uuid = str(uuid.uuid4())[:8].upper()
    return f"{source_type.upper()}-{timestamp}-{short_uuid}"


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, default=str)


def json_loads(data: str) -> Any:
    return json.loads(data)


def safe_float(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip()


def parse_date(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    date_formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%d-%m-%Y",
    ]
    value_str = str(value).strip()
    for fmt in date_formats:
        try:
            return datetime.strptime(value_str, fmt)
        except ValueError:
            continue
    return None


def get_current_user() -> str:
    return os.environ.get("LEASE_AUDIT_USER", os.environ.get("USER", "unknown"))


def ensure_dir(path: str) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def get_data_dir() -> str:
    base_dir = Path.home() / ".lease-audit"
    ensure_dir(str(base_dir))
    return str(base_dir)


def get_db_path() -> str:
    return str(Path(get_data_dir()) / "lease_audit.db")


def get_export_dir() -> str:
    export_dir = Path(get_data_dir()) / "exports"
    ensure_dir(str(export_dir))
    return str(export_dir)


def get_import_dir() -> str:
    import_dir = Path(get_data_dir()) / "imports"
    ensure_dir(str(import_dir))
    return str(import_dir)


def dict_to_markdown_table(data: Dict[str, Any], title: str = "") -> str:
    lines = []
    if title:
        lines.append(f"## {title}")
        lines.append("")
    lines.append("| 字段 | 值 |")
    lines.append("|------|-----|")
    for key, value in data.items():
        lines.append(f"| {key} | {value} |")
    return "\n".join(lines)
