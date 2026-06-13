"""核心数据模型定义."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Literal
from uuid import uuid4


Severity = Literal["normal", "warning", "critical"]


@dataclass
class BuoyData:
    """浮标原始数据."""

    device_id: str
    timestamp: datetime
    longitude: float
    latitude: float
    wave_height: float
    wave_period: float
    wave_direction: float
    water_temperature: float
    wind_speed: float
    wind_direction: float
    air_pressure: float
    source_file: str
    raw_id: str = field(default_factory=lambda: uuid4().hex[:8])


@dataclass
class MaintenanceNote:
    """维修备注."""

    note_id: str
    device_id: str
    timestamp: datetime
    content: str
    author: str
    version: int = 1
    is_original: bool = True
    replaced_by: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class AnomalyRecord:
    """异常记录."""

    anomaly_id: str
    device_id: str
    timestamp: datetime
    metric: str
    value: float
    expected_range: tuple[float, float]
    severity: Severity
    linked_note_id: Optional[str] = None
    description: str = ""


@dataclass
class CalculationParams:
    """计算参数配置."""

    param_id: str
    wave_height_threshold: float = 4.0
    wave_period_min: float = 3.0
    wave_period_max: float = 25.0
    temp_min: float = 0.0
    temp_max: float = 35.0
    wind_speed_threshold: float = 20.0
    anomaly_sigma: float = 3.0
    created_at: datetime = field(default_factory=datetime.now)

    def describe(self) -> dict[str, str]:
        """返回参数说明（含单位）."""
        return {
            "wave_height_threshold": f"{self.wave_height_threshold} m (浪高阈值)",
            "wave_period_range": f"{self.wave_period_min}-{self.wave_period_max} s (周期范围)",
            "water_temp_range": f"{self.temp_min}-{self.temp_max} °C (水温范围)",
            "wind_speed_threshold": f"{self.wind_speed_threshold} m/s (风速阈值)",
            "anomaly_sigma": f"{self.anomaly_sigma} σ (异常标准差倍数)",
        }

    def formulas(self) -> dict[str, str]:
        """返回计算公式说明."""
        return {
            "异常检测": "|x - μ| > σ × threshold，其中μ为均值，σ为标准差",
            "浪高风险": "H ≥ H_threshold 时标记为高风险",
            "综合评分": "Score = 0.4×H/H_max + 0.3×T/T_opt + 0.3×V/V_max",
        }


@dataclass
class ConfirmationRequest:
    """人工确认请求."""

    request_id: str
    device_id: str
    reason: str
    next_step: str
    affected_data_count: int
    created_at: datetime = field(default_factory=datetime.now)
    resolved: bool = False


@dataclass
class ReportResult:
    """报告导出结果."""

    report_id: str
    generated_at: datetime
    params_used: CalculationParams
    buoy_count: int
    anomaly_count: int
    notes_count: int
    output_path: str
    needs_confirmation: bool = False
    confirmations: list[ConfirmationRequest] = field(default_factory=list)
    boundary_samples: list[dict] = field(default_factory=list)
    param_sensitivity: dict = field(default_factory=dict)
