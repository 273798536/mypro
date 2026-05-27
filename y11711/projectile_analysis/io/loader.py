import json
import csv
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..core.models import (
    InputData, DataPoint, TrajectoryPoint,
    DataSource, Status, CorrectionRecord
)


class DataLoader:
    @staticmethod
    def from_json(file_path: str) -> InputData:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return DataLoader._from_dict(data)

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> InputData:
        return DataLoader._from_dict(data)

    @staticmethod
    def _from_dict(data: Dict[str, Any]) -> InputData:
        frame_rate = DataLoader._parse_data_point(
            data.get("frame_rate", {}), default_source=DataSource.FRAME_RATE)

        scale = DataLoader._parse_data_point(
            data.get("scale", {}), default_source=DataSource.SCALE_REFERENCE)

        release_height = DataLoader._parse_data_point(
            data.get("release_height", {}), default_source=DataSource.RELEASE_HEIGHT)

        trajectory = DataLoader._parse_trajectory(data.get("trajectory", []))

        landing_point = None
        if "landing_point" in data:
            landing_point = DataLoader._parse_data_point(
                data["landing_point"], default_source=DataSource.LANDING_POINT)

        training_report = data.get("training_report")
        metadata = data.get("metadata", {})

        return InputData(
            frame_rate=frame_rate,
            scale=scale,
            release_height=release_height,
            trajectory=trajectory,
            landing_point=landing_point,
            training_report=training_report,
            metadata=metadata
        )

    @staticmethod
    def _parse_data_point(data: Dict[str, Any], default_source: DataSource) -> DataPoint:
        if "value" not in data:
            raise ValueError(f"数据点缺少 value 字段: {data}")

        source = DataSource(data.get("source", default_source))
        confidence = data.get("confidence", 1.0)
        timestamp_str = data.get("timestamp")
        timestamp = datetime.fromisoformat(timestamp_str) if timestamp_str else None
        raw_value = data.get("raw_value")
        status = Status(data.get("status", "raw"))
        notes = data.get("notes", [])

        correction_history = []
        for corr in data.get("correction_history", []):
            correction_history.append(CorrectionRecord(
                timestamp=datetime.fromisoformat(corr["timestamp"]) if "timestamp" in corr else datetime.now(),
                correction_type=corr.get("correction_type"),
                old_value=corr.get("old_value"),
                new_value=corr.get("new_value"),
                reason=corr.get("reason", ""),
                source=DataSource(corr.get("source", DataSource.AUTO_CORRECTION)),
                author=corr.get("author")
            ))

        dp = DataPoint(
            value=data["value"],
            source=source,
            confidence=confidence,
            timestamp=timestamp,
            raw_value=raw_value,
            status=status,
            notes=notes
        )
        dp.correction_history = correction_history
        return dp

    @staticmethod
    def _parse_trajectory(trajectory_data: List[Dict[str, Any]]) -> List[TrajectoryPoint]:
        points = []
        for i, p in enumerate(trajectory_data):
            required_fields = ["frame", "t", "x", "y"]
            missing = [f for f in required_fields if f not in p]
            if missing:
                raise ValueError(f"轨迹点 {i} 缺少字段: {missing}")

            points.append(TrajectoryPoint(
                frame=p["frame"],
                t=p["t"],
                x=p["x"],
                y=p["y"],
                x_source=DataSource(p.get("x_source", DataSource.VIDEO_MARKER)),
                y_source=DataSource(p.get("y_source", DataSource.VIDEO_MARKER)),
                confidence=p.get("confidence", 1.0),
                is_outlier=p.get("is_outlier", False)
            ))
        return points

    @staticmethod
    def from_csv(file_path: str, frame_rate: float, scale: float,
                  release_height: float) -> InputData:
        trajectory = []
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                frame = int(row.get("frame", i))
                t = float(row.get("t", frame / frame_rate))
                x = float(row["x"]) * scale
                y = float(row["y"]) * scale
                trajectory.append(TrajectoryPoint(
                    frame=frame,
                    t=t,
                    x=x,
                    y=y,
                    x_source=DataSource.VIDEO_MARKER,
                    y_source=DataSource.VIDEO_MARKER
                ))

        return InputData(
            frame_rate=DataPoint(value=frame_rate, source=DataSource.FRAME_RATE),
            scale=DataPoint(value=scale, source=DataSource.SCALE_REFERENCE),
            release_height=DataPoint(value=release_height, source=DataSource.RELEASE_HEIGHT),
            trajectory=trajectory
        )

    @staticmethod
    def create_sample(v0: float = 12.0, angle_deg: float = 40.0,
                      h: float = 1.8, frame_rate: int = 30,
                      noise: float = 0.02) -> InputData:
        import math
        import random

        angle_rad = math.radians(angle_deg)
        vx0 = v0 * math.cos(angle_rad)
        vy0 = v0 * math.sin(angle_rad)
        g = 9.81

        t_flight = (vy0 + math.sqrt(vy0 * vy0 + 2 * g * h)) / g
        x_landing = vx0 * t_flight

        dt = 1.0 / frame_rate
        trajectory = []
        frame = 0
        t = 0.0

        while t <= t_flight:
            x = vx0 * t + random.gauss(0, noise)
            y = h + vy0 * t - 0.5 * g * t * t + random.gauss(0, noise)
            if y >= 0:
                trajectory.append(TrajectoryPoint(
                    frame=frame,
                    t=t,
                    x=x,
                    y=y,
                    x_source=DataSource.VIDEO_MARKER,
                    y_source=DataSource.VIDEO_MARKER
                ))
            frame += 1
            t += dt

        return InputData(
            frame_rate=DataPoint(value=frame_rate, source=DataSource.FRAME_RATE),
            scale=DataPoint(value=1.0, source=DataSource.SCALE_REFERENCE),
            release_height=DataPoint(value=h, source=DataSource.RELEASE_HEIGHT),
            trajectory=trajectory,
            landing_point=DataPoint(value=x_landing, source=DataSource.ESTIMATED),
            metadata={
                "true_v0": v0,
                "true_angle": angle_deg,
                "noise_level": noise
            }
        )
