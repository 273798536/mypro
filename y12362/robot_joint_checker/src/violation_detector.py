import math
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from .config import JointConfig, LoadConfig, MotionConfig, CheckResult


@dataclass
class Violation:
    violation_type: str
    joint_id: Optional[int]
    time_step: Optional[int]
    time_value: Optional[float]
    actual_value: float
    limit_value: float
    severity: str
    message: str
    details: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "violation_type": self.violation_type,
            "joint_id": self.joint_id,
            "time_step": self.time_step,
            "time_value": self.time_value,
            "actual_value": self.actual_value,
            "limit_value": self.limit_value,
            "severity": self.severity,
            "message": self.message,
            "details": self.details,
        }


class ViolationDetector:
    def __init__(self, check_result: Optional[CheckResult] = None):
        self.check_result = check_result or CheckResult()
        self.violations: List[Violation] = []

    def detect_all(
        self,
        joint_configs: Dict[int, JointConfig],
        load_config: LoadConfig,
        motion_config: MotionConfig,
        torque_results: Dict[int, List[float]],
        velocity_results: Dict[int, List[float]],
    ) -> List[Violation]:
        self.violations = []

        self.detect_load_violations(load_config)

        self.detect_angle_violations(joint_configs, motion_config)

        self.detect_velocity_violations(joint_configs, velocity_results, motion_config)

        self.detect_torque_violations(joint_configs, torque_results, motion_config)

        self.check_result.violations = [v.to_dict() for v in self.violations]

        return self.violations

    def detect_load_violations(self, load_config: LoadConfig) -> List[Violation]:
        violations = []

        if load_config.load_mass > load_config.max_load_mass:
            violation = Violation(
                violation_type="load_mass_exceeded",
                joint_id=None,
                time_step=None,
                time_value=None,
                actual_value=load_config.load_mass,
                limit_value=load_config.max_load_mass,
                severity="critical",
                message=f"载荷质量超限: {load_config.load_mass:.2f}kg > {load_config.max_load_mass:.2f}kg",
                details={
                    "load_mass": load_config.load_mass,
                    "max_load_mass": load_config.max_load_mass,
                    "excess": load_config.load_mass - load_config.max_load_mass,
                    "excess_percent": ((load_config.load_mass - load_config.max_load_mass) / load_config.max_load_mass) * 100,
                },
            )
            violations.append(violation)
            self.violations.append(violation)

        load_radius = math.sqrt(sum(x**2 for x in load_config.load_position))
        if load_radius > load_config.max_load_radius:
            violation = Violation(
                violation_type="load_radius_exceeded",
                joint_id=None,
                time_step=None,
                time_value=None,
                actual_value=load_radius,
                limit_value=load_config.max_load_radius,
                severity="warning",
                message=f"载荷作用半径超限: {load_radius:.3f}m > {load_config.max_load_radius:.3f}m",
                details={
                    "load_radius": load_radius,
                    "max_load_radius": load_config.max_load_radius,
                    "load_position": load_config.load_position,
                },
            )
            violations.append(violation)
            self.violations.append(violation)

        return violations

    def detect_angle_violations(
        self,
        joint_configs: Dict[int, JointConfig],
        motion_config: MotionConfig,
    ) -> List[Violation]:
        violations = []
        time_steps = motion_config.time_steps

        for joint_id, angles in motion_config.joint_angles.items():
            if joint_id not in joint_configs:
                continue

            config = joint_configs[joint_id]

            for step_idx, angle in enumerate(angles):
                if angle < config.min_angle:
                    violation = Violation(
                        violation_type="angle_min_exceeded",
                        joint_id=joint_id,
                        time_step=step_idx,
                        time_value=time_steps[step_idx] if step_idx < len(time_steps) else None,
                        actual_value=angle,
                        limit_value=config.min_angle,
                        severity="warning",
                        message=f"关节{joint_id}角度低于下限: {angle:.2f}° < {config.min_angle:.2f}°",
                        details={
                            "joint_name": config.name,
                            "min_angle": config.min_angle,
                            "max_angle": config.max_angle,
                        },
                    )
                    violations.append(violation)
                    self.violations.append(violation)

                if angle > config.max_angle:
                    violation = Violation(
                        violation_type="angle_max_exceeded",
                        joint_id=joint_id,
                        time_step=step_idx,
                        time_value=time_steps[step_idx] if step_idx < len(time_steps) else None,
                        actual_value=angle,
                        limit_value=config.max_angle,
                        severity="warning",
                        message=f"关节{joint_id}角度超出上限: {angle:.2f}° > {config.max_angle:.2f}°",
                        details={
                            "joint_name": config.name,
                            "min_angle": config.min_angle,
                            "max_angle": config.max_angle,
                        },
                    )
                    violations.append(violation)
                    self.violations.append(violation)

        return violations

    def detect_velocity_violations(
        self,
        joint_configs: Dict[int, JointConfig],
        velocity_results: Dict[int, List[float]],
        motion_config: MotionConfig,
    ) -> List[Violation]:
        violations = []
        time_steps = motion_config.time_steps

        for joint_id, velocities in velocity_results.items():
            if joint_id not in joint_configs:
                continue

            config = joint_configs[joint_id]
            max_vel = config.max_angular_velocity

            for step_idx, vel in enumerate(velocities):
                abs_vel = abs(vel)
                if abs_vel > max_vel:
                    violation = Violation(
                        violation_type="velocity_exceeded",
                        joint_id=joint_id,
                        time_step=step_idx,
                        time_value=time_steps[step_idx] if step_idx < len(time_steps) else None,
                        actual_value=abs_vel,
                        limit_value=max_vel,
                        severity="critical",
                        message=f"关节{joint_id}速度超限: {abs_vel:.2f}°/s > {max_vel:.2f}°/s",
                        details={
                            "joint_name": config.name,
                            "max_velocity": max_vel,
                            "excess": abs_vel - max_vel,
                            "excess_percent": ((abs_vel - max_vel) / max_vel) * 100,
                        },
                    )
                    violations.append(violation)
                    self.violations.append(violation)

        return violations

    def detect_torque_violations(
        self,
        joint_configs: Dict[int, JointConfig],
        torque_results: Dict[int, List[float]],
        motion_config: MotionConfig,
    ) -> List[Violation]:
        violations = []
        time_steps = motion_config.time_steps

        for joint_id, torques in torque_results.items():
            if joint_id not in joint_configs:
                continue

            config = joint_configs[joint_id]
            max_torque = config.max_torque

            for step_idx, torque in enumerate(torques):
                if torque > max_torque:
                    violation = Violation(
                        violation_type="torque_exceeded",
                        joint_id=joint_id,
                        time_step=step_idx,
                        time_value=time_steps[step_idx] if step_idx < len(time_steps) else None,
                        actual_value=torque,
                        limit_value=max_torque,
                        severity="critical",
                        message=f"关节{joint_id}力矩超限: {torque:.2f}Nm > {max_torque:.2f}Nm",
                        details={
                            "joint_name": config.name,
                            "max_torque": max_torque,
                            "excess": torque - max_torque,
                            "excess_percent": ((torque - max_torque) / max_torque) * 100,
                        },
                    )
                    violations.append(violation)
                    self.violations.append(violation)

        return violations

    def get_violations_by_type(self, violation_type: str) -> List[Violation]:
        return [v for v in self.violations if v.violation_type == violation_type]

    def get_violations_by_joint(self, joint_id: int) -> List[Violation]:
        return [v for v in self.violations if v.joint_id == joint_id]

    def get_violations_by_severity(self, severity: str) -> List[Violation]:
        return [v for v in self.violations if v.severity == severity]

    def get_summary(self) -> Dict[str, Any]:
        violation_types = {}
        for v in self.violations:
            if v.violation_type not in violation_types:
                violation_types[v.violation_type] = 0
            violation_types[v.violation_type] += 1

        return {
            "total_violations": len(self.violations),
            "critical_count": len(self.get_violations_by_severity("critical")),
            "warning_count": len(self.get_violations_by_severity("warning")),
            "violation_types": violation_types,
            "has_load_violation": any(v.violation_type.startswith("load_") for v in self.violations),
            "has_angle_violation": any(v.violation_type.startswith("angle_") for v in self.violations),
            "has_velocity_violation": any(v.violation_type == "velocity_exceeded" for v in self.violations),
            "has_torque_violation": any(v.violation_type == "torque_exceeded" for v in self.violations),
        }
