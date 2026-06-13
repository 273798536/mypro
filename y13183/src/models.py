#!/usr/bin/env python3
"""冷却塔水滴误差归因 - 数据模型定义"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
from enum import Enum


class ErrorCategory(str, Enum):
    DRIFT = "漂移偏差"
    CALIBRATION = "校准偏差"
    SAMPLING = "采样缺口"
    ENVIRONMENT = "环境干扰"
    UNKNOWN = "待确认"


class Status(str, Enum):
    PENDING = "待处理"
    IN_PROGRESS = "处理中"
    RESOLVED = "已闭环"
    ESCALATED = "已升级"


@dataclass
class Nameplate:
    """设备铭牌信息"""
    device_id: str
    device_name: str
    model: str
    manufacturer: str
    install_date: str
    rated_flow_m3h: float
    rated_pressure_kpa: float
    accuracy_class: str
    last_calibration_date: str
    next_calibration_date: str
    sensor_range_min: float
    sensor_range_max: float
    unit: str = "m3/h"
    notes: str = ""

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "Nameplate":
        return cls(**data)


@dataclass
class Measurement:
    """单次测量记录"""
    timestamp: str
    device_id: str
    raw_value: float
    reference_value: Optional[float] = None
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    pressure_kpa: Optional[float] = None
    is_boundary: bool = False
    flag: str = ""
    operator: str = ""

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "Measurement":
        return cls(**data)


@dataclass
class Alarm:
    """报警记录"""
    alarm_id: str
    timestamp: str
    device_id: str
    alarm_code: str
    alarm_desc: str
    severity: str
    acknowledged: bool = False
    ack_operator: str = ""

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "Alarm":
        return cls(**data)


@dataclass
class Note:
    """人工备注"""
    note_id: str
    timestamp: str
    device_id: str
    author: str
    content: str
    linked_alarm_id: Optional[str] = None

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "Note":
        return cls(**data)


@dataclass
class AnomalyItem:
    """异常队列条目"""
    anomaly_id: str
    device_id: str
    timestamp: str
    category: ErrorCategory
    description: str
    measured_value: float
    expected_value: float
    error_pct: float
    status: Status = Status.PENDING
    assignee: str = "老何"
    boundary_hint: str = ""
    action_next: str = ""
    history: List[Dict[str, str]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "anomaly_id": self.anomaly_id,
            "device_id": self.device_id,
            "timestamp": self.timestamp,
            "category": self.category.value,
            "description": self.description,
            "measured_value": self.measured_value,
            "expected_value": self.expected_value,
            "error_pct": round(self.error_pct, 2),
            "status": self.status.value,
            "assignee": self.assignee,
            "boundary_hint": self.boundary_hint,
            "action_next": self.action_next,
            "history": self.history
        }


@dataclass
class AttributionResult:
    """归因分析结果"""
    run_id: str
    run_timestamp: str
    device_id: str
    total_samples: int
    valid_samples: int
    sampling_gap_count: int
    mean_error_pct: float
    max_error_pct: float
    min_error_pct: float
    std_error_pct: float
    drift_pct: float
    calibration_pct: float
    environmental_pct: float
    sampling_gap_pct: float
    unknown_pct: float
    formula_used: str
    formula_units: Dict[str, str]
    parameters_used: Dict[str, float]
    boundary_samples: List[Dict[str, Any]] = field(default_factory=list)
    detail_rows: List[Dict[str, Any]] = field(default_factory=list)
    anomalies: List[AnomalyItem] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass
class PersistentState:
    """持久化状态 - 保证重启后历史备注、状态、异常队列一致"""
    version: str = "1.0"
    last_run_id: str = ""
    last_run_timestamp: str = ""
    current_status: Dict[str, str] = field(default_factory=dict)
    historical_notes: List[Dict[str, str]] = field(default_factory=list)
    anomaly_queue: List[Dict[str, Any]] = field(default_factory=list)
    parameter_history: List[Dict[str, Any]] = field(default_factory=list)
    report_history: List[Dict[str, str]] = field(default_factory=list)

    @classmethod
    def load(cls, path: str) -> "PersistentState":
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return cls(
                version=data.get("version", "1.0"),
                last_run_id=data.get("last_run_id", ""),
                last_run_timestamp=data.get("last_run_timestamp", ""),
                current_status=data.get("current_status", {}),
                historical_notes=data.get("historical_notes", []),
                anomaly_queue=data.get("anomaly_queue", []),
                parameter_history=data.get("parameter_history", []),
                report_history=data.get("report_history", [])
            )
        except (FileNotFoundError, json.JSONDecodeError):
            return cls()

    def save(self, path: str):
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "version": self.version,
                "last_run_id": self.last_run_id,
                "last_run_timestamp": self.last_run_timestamp,
                "current_status": self.current_status,
                "historical_notes": self.historical_notes,
                "anomaly_queue": self.anomaly_queue,
                "parameter_history": self.parameter_history,
                "report_history": self.report_history
            }, f, ensure_ascii=False, indent=2)
