from dataclasses import dataclass, field
from datetime import date
from typing import Any


@dataclass
class FieldSpec:
    raw_column: str
    display_name: str
    dtype: str
    description: str = ""


@dataclass
class FilterSpec:
    key: str
    label: str
    field: str
    filter_type: str
    default: Any = None
    options: list[str] = field(default_factory=list)


@dataclass
class AuditSpec:
    key: str
    label: str
    description: str
    severity: str
    enabled: bool = True


@dataclass
class Settings:
    raw_data_dir: str = "sample_data"
    output_dir: str = "output"
    keep_raw_data: bool = True
    report_language: str = "zh-CN"
