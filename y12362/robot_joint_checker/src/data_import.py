import json
import csv
import os
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from .config import JointConfig, LoadConfig, MotionConfig, DataSource, CheckResult


class DataImporter:
    def __init__(self, check_result: Optional[CheckResult] = None):
        self.check_result = check_result or CheckResult()

    def import_joint_config(self, file_path: str) -> Dict[int, JointConfig]:
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()

        source = DataSource(
            source_type="joint_config",
            file_path=os.path.abspath(file_path),
            metadata={"format": ext, "import_method": "manual_import"},
        )
        self.check_result.add_source(source)

        try:
            raw_data = self._read_file(file_path, ext)
            self.check_result.raw_data[f"joint_config_{len(self.check_result.sources)}"] = raw_data

            joint_configs = self._parse_joint_config(raw_data)
            self.check_result.joint_configs.update(joint_configs)
            self.check_result.processed_data["joint_configs"] = {
                k: v.to_dict() for k, v in joint_configs.items()
            }

            return joint_configs
        except (ValueError, KeyError, TypeError) as e:
            raise ValueError(
                f"解析关节配置文件失败: {file_path}\n"
                f"  错误: {str(e)}\n"
                f"  请检查文件内容是否包含必需字段: joint_id, link_length, min_angle, max_angle, max_angular_velocity, max_torque"
            ) from e

    def import_load_config(self, file_path: str) -> LoadConfig:
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()

        source = DataSource(
            source_type="load_config",
            file_path=os.path.abspath(file_path),
            metadata={"format": ext, "import_method": "manual_import"},
        )
        self.check_result.add_source(source)

        try:
            raw_data = self._read_file(file_path, ext)
            self.check_result.raw_data[f"load_config_{len(self.check_result.sources)}"] = raw_data

            load_config = self._parse_load_config(raw_data)
            self.check_result.load_config = load_config
            self.check_result.processed_data["load_config"] = load_config.to_dict()

            return load_config
        except (ValueError, KeyError, TypeError) as e:
            raise ValueError(
                f"解析载荷配置文件失败: {file_path}\n"
                f"  错误: {str(e)}\n"
                f"  请检查文件内容是否包含必需字段: load_mass, load_position, max_load_mass, max_load_radius"
            ) from e

    def import_motion_sequence(self, file_path: str) -> MotionConfig:
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()

        source = DataSource(
            source_type="motion_sequence",
            file_path=os.path.abspath(file_path),
            metadata={"format": ext, "import_method": "manual_import"},
        )
        self.check_result.add_source(source)

        try:
            raw_data = self._read_file(file_path, ext)
            self.check_result.raw_data[f"motion_sequence_{len(self.check_result.sources)}"] = raw_data

            motion_config = self._parse_motion_sequence(raw_data)
            self.check_result.motion_config = motion_config
            self.check_result.processed_data["motion_config"] = motion_config.to_dict()

            return motion_config
        except (ValueError, KeyError, TypeError) as e:
            raise ValueError(
                f"解析动作序列文件失败: {file_path}\n"
                f"  错误: {str(e)}\n"
                f"  请检查文件内容是否包含必需字段: time_steps, joint_angles"
            ) from e

    def _read_file(self, file_path: str, ext: str) -> Any:
        if not os.path.exists(file_path):
            raise FileNotFoundError(
                f"文件不存在: {file_path}\n"
                f"  请检查文件路径是否正确，或确认文件已上传。"
            )

        if not os.path.isfile(file_path):
            raise FileNotFoundError(
                f"路径不是文件: {file_path}"
            )

        if ext == ".json":
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(
                    f"JSON格式错误: {file_path}\n"
                    f"  错误位置: 第{e.lineno}行, 第{e.colno}列\n"
                    f"  错误信息: {e.msg}\n"
                    f"  请检查文件格式是否符合JSON规范。"
                ) from e
            except UnicodeDecodeError as e:
                raise ValueError(
                    f"文件编码错误: {file_path}\n"
                    f"  请确保文件使用UTF-8编码。"
                ) from e

        elif ext in [".csv", ".txt"]:
            try:
                rows = []
                with open(file_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        rows.append(row)
                return rows
            except UnicodeDecodeError as e:
                raise ValueError(
                    f"文件编码错误: {file_path}\n"
                    f"  请确保文件使用UTF-8编码。"
                ) from e
            except csv.Error as e:
                raise ValueError(
                    f"CSV格式错误: {file_path}\n"
                    f"  错误信息: {str(e)}\n"
                    f"  请检查CSV格式是否正确。"
                ) from e
        else:
            raise ValueError(
                f"不支持的文件格式: {ext}\n"
                f"  支持的格式: .json, .csv, .txt"
            )

    def _parse_joint_config(self, raw_data: Any) -> Dict[int, JointConfig]:
        joint_configs = {}

        if isinstance(raw_data, dict) and "joints" in raw_data:
            items = raw_data["joints"]
        elif isinstance(raw_data, list):
            items = raw_data
        else:
            items = [raw_data]

        for item in items:
            joint_id = int(item.get("joint_id", item.get("id", 0)))
            joint_configs[joint_id] = JointConfig(
                joint_id=joint_id,
                name=str(item.get("name", f"Joint_{joint_id}")),
                link_length=float(item.get("link_length", item.get("length", 0.0))),
                min_angle=float(item.get("min_angle", item.get("min", -180.0))),
                max_angle=float(item.get("max_angle", item.get("max", 180.0))),
                max_angular_velocity=float(item.get("max_angular_velocity", item.get("max_vel", 100.0))),
                max_torque=float(item.get("max_torque", item.get("max_torque", 100.0))),
                mass=float(item.get("mass", 0.0)),
                center_of_mass=float(item.get("center_of_mass", item.get("com", 0.5))),
            )

        return joint_configs

    def _parse_load_config(self, raw_data: Any) -> LoadConfig:
        if isinstance(raw_data, dict):
            data = raw_data
        elif isinstance(raw_data, list) and len(raw_data) > 0:
            data = raw_data[0]
        else:
            data = {}

        load_position = data.get("load_position", data.get("position", [0.0, 0.0, 0.0]))
        if isinstance(load_position, str):
            load_position = [float(x) for x in load_position.split(",")]

        return LoadConfig(
            load_mass=float(data.get("load_mass", data.get("mass", 0.0))),
            load_position=[float(x) for x in load_position],
            max_load_mass=float(data.get("max_load_mass", data.get("max_mass", 10.0))),
            max_load_radius=float(data.get("max_load_radius", data.get("max_radius", 1.0))),
        )

    def _parse_motion_sequence(self, raw_data: Any) -> MotionConfig:
        time_steps: List[float] = []
        joint_angles: Dict[int, List[float]] = {}

        if isinstance(raw_data, dict):
            if "time_steps" in raw_data:
                time_steps = [float(t) for t in raw_data["time_steps"]]
            if "joint_angles" in raw_data:
                for k, v in raw_data["joint_angles"].items():
                    joint_angles[int(k)] = [float(x) for x in v]
        elif isinstance(raw_data, list):
            for i, row in enumerate(raw_data):
                if "time" in row:
                    time_steps.append(float(row["time"]))
                else:
                    time_steps.append(float(i) * 0.01)

                for key, value in row.items():
                    if key.startswith("joint_") or key.startswith("angle_"):
                        joint_id = int(key.split("_")[-1])
                        if joint_id not in joint_angles:
                            joint_angles[joint_id] = []
                        joint_angles[joint_id].append(float(value))

        if not time_steps and joint_angles:
            first_joint = next(iter(joint_angles.values()))
            time_steps = [i * 0.01 for i in range(len(first_joint))]

        sample_rate = float(raw_data.get("sample_rate", 100.0)) if isinstance(raw_data, dict) else 100.0

        return MotionConfig(
            time_steps=time_steps,
            joint_angles=joint_angles,
            sample_rate=sample_rate,
        )

    def get_check_result(self) -> CheckResult:
        return self.check_result

    def get_data_summary(self) -> Dict[str, Any]:
        return {
            "total_sources": len(self.check_result.sources),
            "source_types": [s.source_type for s in self.check_result.sources],
            "joint_count": len(self.check_result.joint_configs),
            "has_load_config": self.check_result.load_config is not None,
            "has_motion_config": self.check_result.motion_config is not None,
            "motion_steps": len(self.check_result.motion_config.time_steps)
            if self.check_result.motion_config
            else 0,
        }
