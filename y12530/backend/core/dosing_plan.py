from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime
import json


@dataclass
class DosingEvent:
    time: float
    dose: float
    route: str
    duration: Optional[float] = None
    compartment: str = "central"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "time": self.time,
            "dose": self.dose,
            "route": self.route,
            "duration": self.duration,
            "compartment": self.compartment
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DosingEvent':
        return cls(
            time=float(data["time"]),
            dose=float(data["dose"]),
            route=str(data["route"]),
            duration=float(data["duration"]) if data.get("duration") else None,
            compartment=str(data.get("compartment", "central"))
        )


@dataclass
class DosingPlan:
    events: List[DosingEvent] = field(default_factory=list)
    total_duration: float = 24.0
    time_unit: str = "hours"
    dose_unit: str = "mg"
    notes: str = ""
    source_info: Dict[str, Any] = field(default_factory=dict)

    def add_event(self, event: DosingEvent) -> None:
        self.events.append(event)
        self.events.sort(key=lambda e: e.time)
        if event.time > self.total_duration:
            self.total_duration = event.time * 1.5

    def to_dict(self) -> Dict[str, Any]:
        return {
            "events": [e.to_dict() for e in self.events],
            "total_duration": self.total_duration,
            "time_unit": self.time_unit,
            "dose_unit": self.dose_unit,
            "notes": self.notes,
            "source_info": self.source_info
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DosingPlan':
        events = [DosingEvent.from_dict(e) for e in data.get("events", [])]
        return cls(
            events=events,
            total_duration=float(data.get("total_duration", 24.0)),
            time_unit=str(data.get("time_unit", "hours")),
            dose_unit=str(data.get("dose_unit", "mg")),
            notes=str(data.get("notes", "")),
            source_info=data.get("source_info", {})
        )

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)

    @classmethod
    def from_json(cls, json_str: str) -> 'DosingPlan':
        return cls.from_dict(json.loads(json_str))

    def validate(self) -> List[Dict[str, Any]]:
        errors = []
        for i, event in enumerate(self.events):
            if event.time < 0:
                errors.append({
                    "type": "time_negative",
                    "event_index": i,
                    "message": f"给药事件 {i+1}: 时间 {event.time} {self.time_unit} 不能为负值",
                    "severity": "error"
                })
            if event.dose <= 0:
                errors.append({
                    "type": "dose_non_positive",
                    "event_index": i,
                    "message": f"给药事件 {i+1}: 剂量 {event.dose} {self.dose_unit} 必须大于0",
                    "severity": "error"
                })
            if event.route not in ["iv_bolus", "iv_infusion", "oral", "sc", "im"]:
                errors.append({
                    "type": "invalid_route",
                    "event_index": i,
                    "message": f"给药事件 {i+1}: 给药途径 '{event.route}' 不支持",
                    "severity": "error",
                    "supported_routes": ["iv_bolus", "iv_infusion", "oral", "sc", "im"]
                })
            if event.route == "iv_infusion" and (event.duration is None or event.duration <= 0):
                errors.append({
                    "type": "missing_duration",
                    "event_index": i,
                    "message": f"给药事件 {i+1}: 静脉滴注必须指定持续时间且大于0",
                    "severity": "error"
                })
        return errors
