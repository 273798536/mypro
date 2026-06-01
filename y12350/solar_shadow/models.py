from dataclasses import dataclass, field
from datetime import date, time
from enum import Enum
from typing import Optional


class Severity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class WeatherCondition(Enum):
    CLEAR = "clear"
    PARTLY_CLOUDY = "partly_cloudy"
    OVERCAST = "overcast"
    UNKNOWN = "unknown"


@dataclass
class DataSource:
    name: str
    version: str
    imported_at: str = ""

    def to_dict(self):
        return {
            "name": self.name,
            "version": self.version,
            "imported_at": self.imported_at,
        }


@dataclass
class Observation:
    site_name: str
    latitude: float
    longitude: float
    obs_date: date
    obs_time: time
    timezone_offset: float
    shadow_length: Optional[float] = None
    pole_height: Optional[float] = None
    weather: WeatherCondition = WeatherCondition.UNKNOWN
    source: Optional[DataSource] = None
    notes: str = ""

    @property
    def timezone_offset_hours(self) -> float:
        return self.timezone_offset

    @property
    def timezone_label(self) -> str:
        sign = "+" if self.timezone_offset >= 0 else ""
        return f"UTC{sign}{self.timezone_offset}"

    def to_dict(self):
        return {
            "site_name": self.site_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "obs_date": self.obs_date.isoformat(),
            "obs_time": self.obs_time.isoformat(),
            "timezone_offset": self.timezone_offset,
            "timezone_label": self.timezone_label,
            "shadow_length": self.shadow_length,
            "pole_height": self.pole_height,
            "weather": self.weather.value,
            "source": self.source.to_dict() if self.source else None,
            "notes": self.notes,
        }


@dataclass
class ValidationIssue:
    code: str
    severity: Severity
    message: str
    affected_fields: list[str] = field(default_factory=list)
    explanation: str = ""

    def to_dict(self):
        return {
            "code": self.code,
            "severity": self.severity.value,
            "message": self.message,
            "affected_fields": self.affected_fields,
            "explanation": self.explanation,
        }


@dataclass
class ValidationResult:
    issues: list[ValidationIssue] = field(default_factory=list)
    passed: bool = True

    def add_issue(self, issue: ValidationIssue):
        self.issues.append(issue)
        if issue.severity == Severity.ERROR:
            self.passed = False

    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.WARNING]

    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.ERROR]

    def to_dict(self):
        return {
            "passed": self.passed,
            "issue_count": len(self.issues),
            "issues": [i.to_dict() for i in self.issues],
        }


@dataclass
class CalculationResult:
    observation_index: int
    site_name: str
    obs_date: str
    obs_time: str
    timezone_label: str
    solar_elevation_angle_deg: Optional[float] = None
    solar_elevation_angle_rad: Optional[float] = None
    azimuth_deg: Optional[float] = None
    pole_height_used: Optional[float] = None
    shadow_length_used: Optional[float] = None
    angle_source: str = ""
    unit_source: str = ""
    error_estimate_deg: Optional[float] = None
    error_explanation: str = ""
    skip_reason: str = ""

    def to_dict(self):
        return {
            "observation_index": self.observation_index,
            "site_name": self.site_name,
            "obs_date": self.obs_date,
            "obs_time": self.obs_time,
            "timezone_label": self.timezone_label,
            "solar_elevation_angle_deg": self.solar_elevation_angle_deg,
            "solar_elevation_angle_rad": self.solar_elevation_angle_rad,
            "azimuth_deg": self.azimuth_deg,
            "pole_height_used": self.pole_height_used,
            "shadow_length_used": self.shadow_length_used,
            "angle_source": self.angle_source,
            "unit_source": self.unit_source,
            "error_estimate_deg": self.error_estimate_deg,
            "error_explanation": self.error_explanation,
            "skip_reason": self.skip_reason,
        }


@dataclass
class Report:
    title: str
    generated_at: str
    source: Optional[DataSource]
    observations: list[dict]
    validation: dict
    calculations: list[dict]
    summary: str
    datetime_conclusion: str

    def to_dict(self):
        return {
            "title": self.title,
            "generated_at": self.generated_at,
            "source": self.source.to_dict() if self.source else None,
            "observations": self.observations,
            "validation": self.validation,
            "calculations": self.calculations,
            "summary": self.summary,
            "datetime_conclusion": self.datetime_conclusion,
        }
