from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import os


@dataclass
class JointConfig:
    joint_id: int
    name: str
    link_length: float
    min_angle: float
    max_angle: float
    max_angular_velocity: float
    max_torque: float
    mass: float = 0.0
    center_of_mass: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "joint_id": self.joint_id,
            "name": self.name,
            "link_length": self.link_length,
            "min_angle": self.min_angle,
            "max_angle": self.max_angle,
            "max_angular_velocity": self.max_angular_velocity,
            "max_torque": self.max_torque,
            "mass": self.mass,
            "center_of_mass": self.center_of_mass,
        }


@dataclass
class LoadConfig:
    load_mass: float
    load_position: List[float]
    max_load_mass: float
    max_load_radius: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "load_mass": self.load_mass,
            "load_position": self.load_position,
            "max_load_mass": self.max_load_mass,
            "max_load_radius": self.max_load_radius,
        }


@dataclass
class MotionConfig:
    time_steps: List[float]
    joint_angles: Dict[int, List[float]]
    sample_rate: float = 100.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "time_steps": self.time_steps,
            "joint_angles": {str(k): v for k, v in self.joint_angles.items()},
            "sample_rate": self.sample_rate,
        }


@dataclass
class DataSource:
    source_type: str
    file_path: str
    import_time: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "file_path": self.file_path,
            "import_time": self.import_time.isoformat(),
            "metadata": self.metadata,
        }


@dataclass
class CheckResult:
    timestamp: datetime = field(default_factory=datetime.now)
    sources: List[DataSource] = field(default_factory=list)
    joint_configs: Dict[int, JointConfig] = field(default_factory=dict)
    load_config: Optional[LoadConfig] = None
    motion_config: Optional[MotionConfig] = None
    torque_results: Dict[int, List[float]] = field(default_factory=dict)
    velocity_results: Dict[int, List[float]] = field(default_factory=dict)
    violations: List[Dict[str, Any]] = field(default_factory=list)
    raw_data: Dict[str, Any] = field(default_factory=dict)
    processed_data: Dict[str, Any] = field(default_factory=dict)

    def add_source(self, source: DataSource):
        self.sources.append(source)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "sources": [s.to_dict() for s in self.sources],
            "joint_configs": {str(k): v.to_dict() for k, v in self.joint_configs.items()},
            "load_config": self.load_config.to_dict() if self.load_config else None,
            "motion_config": self.motion_config.to_dict() if self.motion_config else None,
            "torque_results": {str(k): v for k, v in self.torque_results.items()},
            "velocity_results": {str(k): v for k, v in self.velocity_results.items()},
            "violations": self.violations,
            "raw_data": self.raw_data,
            "processed_data": self.processed_data,
        }

    def save_json(self, file_path: str):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
