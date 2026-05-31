from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FuelParams(BaseModel):
    name: str = Field(..., description="燃料名称，如 RP-1, LH2, UDMH")
    density: Optional[float] = Field(None, description="密度数值")
    density_unit: str = Field("kg/m³", description="密度单位")
    flow_rate: Optional[float] = Field(None, description="质量流量数值")
    flow_rate_unit: str = Field("kg/s", description="流量单位")
    notes: str = Field("", description="备注信息")


class OxidizerFlow(BaseModel):
    name: str = Field(..., description="氧化剂名称，如 LOX, N2O4")
    density: Optional[float] = Field(None, description="密度数值")
    density_unit: str = Field("kg/m³", description="密度单位")
    flow_rate: Optional[float] = Field(None, description="质量流量数值（可能缺失）")
    flow_rate_unit: str = Field("kg/s", description="流量单位")


class NozzleData(BaseModel):
    throat_diameter: Optional[float] = Field(None, description="喉部直径")
    exit_diameter: Optional[float] = Field(None, description="出口直径")
    expansion_ratio: Optional[float] = Field(None, description="膨胀比 A_e/A_t")
    length_unit: str = Field("mm", description="长度单位")


class CombustionTemp(BaseModel):
    value: Optional[float] = Field(None, description="燃烧温度数值（可能迟到）")
    unit: str = Field("K", description="温度单位")


class EngineCreate(BaseModel):
    name: str = Field(..., description="发动机标识名称")
    fuel_params: FuelParams
    oxidizer_flow: OxidizerFlow
    nozzle_data: NozzleData
    combustion_temp: CombustionTemp
    efficiency: float = Field(0.95, description="效率估算 (0~1)")


class EngineUpdate(BaseModel):
    name: Optional[str] = None
    fuel_params: Optional[FuelParams] = None
    oxidizer_flow: Optional[OxidizerFlow] = None
    nozzle_data: Optional[NozzleData] = None
    combustion_temp: Optional[CombustionTemp] = None
    efficiency: Optional[float] = None


PROPELLANT_PROFILES: dict[str, dict] = {
    "LOX/LH2": {
        "typical_mr": 6.0,
        "mr_range": (4.0, 8.0),
        "temp_limit_K": 3500,
        "gamma": 1.2,
        "R_gas": 4157,
    },
    "LOX/RP-1": {
        "typical_mr": 2.56,
        "mr_range": (1.5, 3.5),
        "temp_limit_K": 3700,
        "gamma": 1.2,
        "R_gas": 368,
    },
    "N2O4/UDMH": {
        "typical_mr": 2.6,
        "mr_range": (1.5, 4.0),
        "temp_limit_K": 3400,
        "gamma": 1.15,
        "R_gas": 340,
    },
    "LOX/CH4": {
        "typical_mr": 3.5,
        "mr_range": (2.0, 5.0),
        "temp_limit_K": 3600,
        "gamma": 1.2,
        "R_gas": 518,
    },
}

FUEL_NAMES = {"RP-1", "LH2", "UDMH", "CH4", "MMH", "HTPB"}
OXIDIZER_NAMES = {"LOX", "N2O4", "H2O2", "N2O", "ClF3"}


def match_propellant_combo(fuel_name: str, oxidizer_name: str) -> Optional[str]:
    fuel = fuel_name.strip().upper()
    oxidizer = oxidizer_name.strip().upper()
    for combo_key in PROPELLANT_PROFILES:
        parts = combo_key.split("/")
        if fuel in parts[1] and oxidizer in parts[0]:
            return combo_key
        if fuel in parts[0] and oxidizer in parts[1]:
            return combo_key
    return None


class UnitWarning(BaseModel):
    field: str
    current_unit: str
    expected_unit: str
    conversion_factor: Optional[float] = None
    suggestion: str


class Suggestion(BaseModel):
    category: str
    severity: str
    message: str
    action: str


class CurvePoint(BaseModel):
    mixture_ratio: float
    c_star: Optional[float] = None
    isp: Optional[float] = None
    efficiency_used: float


class MixtureResult(BaseModel):
    version: int
    mixture_ratio: Optional[float] = None
    boundary_status: str = "unknown"
    boundary_detail: str = ""
    temp_status: str = "unknown"
    temp_detail: str = ""
    unit_warnings: list[UnitWarning] = []
    suggestions: list[Suggestion] = []
    efficiency_used: float = 0.95
    propellant_combo: Optional[str] = None
    curve_data: list[CurvePoint] = []
    calculated_at: str = ""
    missing_fields: list[str] = []


class MixtureDiff(BaseModel):
    old_version: int
    new_version: int
    mixture_ratio_changed: bool
    old_mixture_ratio: Optional[float]
    new_mixture_ratio: Optional[float]
    boundary_changed: bool
    old_boundary_status: str
    new_boundary_status: str
    temp_changed: bool
    old_temp_status: str
    new_temp_status: str
    new_suggestions: list[Suggestion] = []
    resolved_suggestions: list[Suggestion] = []
    efficiency_changed: bool
    old_efficiency: float
    new_efficiency: float


class EngineRecord(BaseModel):
    id: str
    name: str
    fuel_params: FuelParams
    oxidizer_flow: OxidizerFlow
    nozzle_data: NozzleData
    combustion_temp: CombustionTemp
    efficiency: float
    created_at: str
    updated_at: str
    current_version: int = 0
