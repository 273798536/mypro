import math
from typing import Dict, List, Tuple, Optional
from .config import JointConfig, LoadConfig, MotionConfig, CheckResult


class TorqueCalculator:
    GRAVITY = 9.81

    def __init__(self, check_result: Optional[CheckResult] = None):
        self.check_result = check_result or CheckResult()

    def calculate(
        self,
        joint_configs: Dict[int, JointConfig],
        load_config: LoadConfig,
        motion_config: MotionConfig,
    ) -> Tuple[Dict[int, List[float]], Dict[int, List[float]]]:
        torque_results: Dict[int, List[float]] = {}
        velocity_results: Dict[int, List[float]] = {}

        for joint_id in joint_configs:
            torque_results[joint_id] = []
            velocity_results[joint_id] = []

        time_steps = motion_config.time_steps
        joint_angles = motion_config.joint_angles

        for joint_id, config in joint_configs.items():
            if joint_id not in joint_angles:
                continue

            angles = joint_angles[joint_id]
            velocities = self._calculate_velocities(angles, time_steps)
            velocity_results[joint_id] = velocities

            torques = self._calculate_joint_torque(
                joint_id=joint_id,
                config=config,
                angles=angles,
                joint_configs=joint_configs,
                load_config=load_config,
            )
            torque_results[joint_id] = torques

        self.check_result.torque_results = torque_results
        self.check_result.velocity_results = velocity_results
        self.check_result.processed_data["torque_calculation"] = {
            "method": "Newton-Euler simplified",
            "gravity": self.GRAVITY,
            "joint_count": len(torque_results),
            "time_steps": len(time_steps),
        }

        return torque_results, velocity_results

    def _calculate_velocities(
        self, angles: List[float], time_steps: List[float]
    ) -> List[float]:
        velocities = []
        n = len(angles)

        if n < 2:
            return [0.0] * n

        velocities.append(0.0)

        for i in range(1, n - 1):
            dt = time_steps[i + 1] - time_steps[i - 1]
            if dt > 0:
                vel = (angles[i + 1] - angles[i - 1]) / dt
                velocities.append(math.degrees(vel))
            else:
                velocities.append(0.0)

        velocities.append(0.0)

        return velocities

    def _calculate_joint_torque(
        self,
        joint_id: int,
        config: JointConfig,
        angles: List[float],
        joint_configs: Dict[int, JointConfig],
        load_config: LoadConfig,
    ) -> List[float]:
        torques = []

        cumulative_length = self._get_cumulative_length(joint_id, joint_configs)

        for angle_deg in angles:
            angle_rad = math.radians(angle_deg)

            link_torque = self._calculate_link_torque(
                config=config,
                angle_rad=angle_rad,
                load_config=load_config,
                cumulative_length=cumulative_length,
            )

            load_torque = self._calculate_load_torque(
                joint_id=joint_id,
                config=config,
                angle_rad=angle_rad,
                joint_configs=joint_configs,
                load_config=load_config,
            )

            total_torque = link_torque + load_torque
            torques.append(abs(total_torque))

        return torques

    def _get_cumulative_length(
        self, joint_id: int, joint_configs: Dict[int, JointConfig]
    ) -> float:
        cumulative = 0.0
        sorted_joints = sorted(joint_configs.keys())

        for jid in sorted_joints:
            if jid <= joint_id:
                cumulative += joint_configs[jid].link_length
            else:
                break

        return cumulative

    def _calculate_link_torque(
        self,
        config: JointConfig,
        angle_rad: float,
        load_config: LoadConfig,
        cumulative_length: float,
    ) -> float:
        if config.mass <= 0:
            return 0.0

        com_distance = config.center_of_mass * config.link_length
        torque = config.mass * self.GRAVITY * com_distance * math.cos(angle_rad)

        return torque

    def _calculate_load_torque(
        self,
        joint_id: int,
        config: JointConfig,
        angle_rad: float,
        joint_configs: Dict[int, JointConfig],
        load_config: LoadConfig,
    ) -> float:
        if load_config.load_mass <= 0:
            return 0.0

        distance_from_joint = self._get_distance_from_joint(
            joint_id=joint_id,
            joint_configs=joint_configs,
            load_position=load_config.load_position,
        )

        torque = load_config.load_mass * self.GRAVITY * distance_from_joint * math.cos(angle_rad)

        return torque

    def _get_distance_from_joint(
        self,
        joint_id: int,
        joint_configs: Dict[int, JointConfig],
        load_position: List[float],
    ) -> float:
        if len(load_position) >= 2:
            return math.sqrt(load_position[0] ** 2 + load_position[1] ** 2)

        cumulative = 0.0
        sorted_joints = sorted(joint_configs.keys())

        for jid in sorted_joints:
            cumulative += joint_configs[jid].link_length

        return cumulative

    def get_max_torques(self) -> Dict[int, float]:
        return {
            joint_id: max(torques) if torques else 0.0
            for joint_id, torques in self.check_result.torque_results.items()
        }

    def get_average_torques(self) -> Dict[int, float]:
        return {
            joint_id: sum(torques) / len(torques) if torques else 0.0
            for joint_id, torques in self.check_result.torque_results.items()
        }

    def get_summary(self) -> Dict[str, Dict[int, float]]:
        return {
            "max_torque": self.get_max_torques(),
            "average_torque": self.get_average_torques(),
            "max_velocity": {
                joint_id: max(vels) if vels else 0.0
                for joint_id, vels in self.check_result.velocity_results.items()
            },
        }
