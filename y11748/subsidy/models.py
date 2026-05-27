from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum


class AnomalyType(Enum):
    MILEAGE_DECREASE = "mileage_decrease"
    MILEAGE_GAP = "mileage_gap"
    CHARGING_GAP = "charging_gap"
    INVALID_OPERATION_DAY = "invalid_operation_day"
    SUSPICIOUS_MILEAGE = "suspicious_mileage"


class CorrectionType(Enum):
    MILEAGE_INTERPOLATION = "mileage_interpolation"
    CHARGING_ESTIMATION = "charging_estimation"
    OPERATION_DAY_ADJUST = "operation_day_adjust"
    OUTLIER_REMOVAL = "outlier_removal"


@dataclass
class VehicleRecord:
    vehicle_id: str
    plate_number: str
    vehicle_type: str
    battery_capacity: float
    join_date: date
    exit_date: Optional[date] = None
    source: str = "vehicle_archive"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "plate_number": self.plate_number,
            "vehicle_type": self.vehicle_type,
            "battery_capacity": self.battery_capacity,
            "join_date": self.join_date.isoformat(),
            "exit_date": self.exit_date.isoformat() if self.exit_date else None,
            "source": self.source
        }


@dataclass
class MileageRecord:
    vehicle_id: str
    record_date: date
    start_mileage: float
    end_mileage: float
    source: str = "mileage_reader"
    raw_data: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def daily_mileage(self) -> float:
        return max(0, self.end_mileage - self.start_mileage)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "record_date": self.record_date.isoformat(),
            "start_mileage": self.start_mileage,
            "end_mileage": self.end_mileage,
            "daily_mileage": self.daily_mileage,
            "source": self.source
        }


@dataclass
class ChargingRecord:
    vehicle_id: str
    charge_date: date
    charge_start_time: Optional[datetime]
    charge_end_time: Optional[datetime]
    charged_kwh: float
    start_soc: Optional[float] = None
    end_soc: Optional[float] = None
    source: str = "charging_station"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "charge_date": self.charge_date.isoformat(),
            "charge_start_time": self.charge_start_time.isoformat() if self.charge_start_time else None,
            "charge_end_time": self.charge_end_time.isoformat() if self.charge_end_time else None,
            "charged_kwh": self.charged_kwh,
            "start_soc": self.start_soc,
            "end_soc": self.end_soc,
            "source": self.source
        }


@dataclass
class OperationCalendar:
    vehicle_id: str
    operation_date: date
    is_operating: bool
    online_hours: float = 0.0
    source: str = "operation_system"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "operation_date": self.operation_date.isoformat(),
            "is_operating": self.is_operating,
            "online_hours": self.online_hours,
            "source": self.source
        }


@dataclass
class SubsidyRule:
    rule_id: str
    effective_date: date
    expiry_date: date
    min_daily_mileage: float
    min_monthly_days: int
    subsidy_per_km: float
    max_monthly_subsidy: float
    min_charge_ratio: float = 0.8
    source: str = "subsidy_policy"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "effective_date": self.effective_date.isoformat(),
            "expiry_date": self.expiry_date.isoformat(),
            "min_daily_mileage": self.min_daily_mileage,
            "min_monthly_days": self.min_monthly_days,
            "subsidy_per_km": self.subsidy_per_km,
            "max_monthly_subsidy": self.max_monthly_subsidy,
            "min_charge_ratio": self.min_charge_ratio,
            "source": self.source
        }


@dataclass
class Anomaly:
    anomaly_type: AnomalyType
    vehicle_id: str
    date: date
    description: str
    severity: str = "warning"
    raw_value: Optional[float] = None
    expected_value: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "anomaly_type": self.anomaly_type.value,
            "vehicle_id": self.vehicle_id,
            "date": self.date.isoformat(),
            "description": self.description,
            "severity": self.severity,
            "raw_value": self.raw_value,
            "expected_value": self.expected_value
        }


@dataclass
class CorrectionTrace:
    vehicle_id: str
    correction_type: CorrectionType
    date: date
    original_value: Optional[float]
    corrected_value: Optional[float]
    reason: str
    source_record: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "correction_type": self.correction_type.value,
            "date": self.date.isoformat(),
            "original_value": self.original_value,
            "corrected_value": self.corrected_value,
            "reason": self.reason,
            "source_record": self.source_record
        }


@dataclass
class DailySummary:
    vehicle_id: str
    summary_date: date
    mileage: float
    charged_kwh: float
    is_operating: bool
    online_hours: float
    mileage_valid: bool
    charging_valid: bool
    operation_valid: bool
    anomalies: List[Anomaly] = field(default_factory=list)
    corrections: List[CorrectionTrace] = field(default_factory=list)
    
    @property
    def is_valid_day(self) -> bool:
        return (self.mileage_valid and 
                self.charging_valid and 
                self.operation_valid and 
                len([a for a in self.anomalies if a.severity == "error"]) == 0)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "summary_date": self.summary_date.isoformat(),
            "mileage": self.mileage,
            "charged_kwh": self.charged_kwh,
            "is_operating": self.is_operating,
            "online_hours": self.online_hours,
            "mileage_valid": self.mileage_valid,
            "charging_valid": self.charging_valid,
            "operation_valid": self.operation_valid,
            "is_valid_day": self.is_valid_day,
            "anomalies_count": len(self.anomalies),
            "corrections_count": len(self.corrections)
        }


@dataclass
class ProcessedResult:
    vehicle_id: str
    period_start: date
    period_end: date
    total_mileage: float
    valid_mileage: float
    total_charged_kwh: float
    operating_days: int
    valid_days: int
    estimated_subsidy: float
    daily_summaries: List[DailySummary] = field(default_factory=list)
    all_anomalies: List[Anomaly] = field(default_factory=list)
    all_corrections: List[CorrectionTrace] = field(default_factory=list)
    subsidy_rule_applied: Optional[SubsidyRule] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "total_mileage": self.total_mileage,
            "valid_mileage": self.valid_mileage,
            "total_charged_kwh": self.total_charged_kwh,
            "operating_days": self.operating_days,
            "valid_days": self.valid_days,
            "estimated_subsidy": self.estimated_subsidy,
            "anomalies_count": len(self.all_anomalies),
            "corrections_count": len(self.all_corrections),
            "rule_applied": self.subsidy_rule_applied.rule_id if self.subsidy_rule_applied else None
        }
