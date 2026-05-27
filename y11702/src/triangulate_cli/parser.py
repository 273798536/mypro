from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

from .models import (
    AngleUnit,
    Bearing,
    Coordinate,
    CoordinateSystem,
    Correction,
    InputData,
    MapBounds,
    Observation,
    ObservationStatus,
    SourceTrace,
)


@dataclass
class ParseError:
    message: str
    source: SourceTrace
    severity: str = "error"

    def __str__(self) -> str:
        return f"[{self.severity}] {self.source}: {self.message}"


class InputParser:
    def __init__(self, filename: str):
        self.filename = filename
        self.errors: List[ParseError] = []
        self.warnings: List[ParseError] = []

    def parse(self, content: str) -> Tuple[InputData, List[ParseError], List[ParseError]]:
        self.errors = []
        self.warnings = []
        data = InputData()

        lines = content.splitlines()
        current_section = None

        for line_num, raw_line in enumerate(lines, 1):
            line = raw_line.strip()

            if not line or line.startswith("#"):
                continue

            if line.startswith("[") and line.endswith("]"):
                current_section = line[1:-1].lower()
                continue

            source = SourceTrace(
                filename=self.filename,
                line_number=line_num,
                raw_text=raw_line,
            )

            try:
                if current_section == "map":
                    self._parse_map_line(line, data, source)
                elif current_section == "observations":
                    self._parse_observation_line(line, data, source)
                elif current_section == "metadata":
                    self._parse_metadata_line(line, data, source)
                else:
                    self.warnings.append(
                        ParseError(
                            f"未知区域外的内容将被忽略: {line[:30]}...",
                            source,
                            "warning",
                        )
                    )
            except Exception as e:
                self.errors.append(ParseError(str(e), source, "error"))

        return data, self.errors, self.warnings

    def _parse_map_line(self, line: str, data: InputData, source: SourceTrace):
        parts = [p.strip() for p in line.split("=", 1)]
        if len(parts) != 2:
            raise ValueError(f"地图配置格式错误，应为 'key=value'")

        key, value = parts

        if key == "bounds":
            coords = re.findall(r"[-+]?\d*\.?\d+", value)
            if len(coords) != 4:
                raise ValueError(f"边界需要4个坐标值 (min_x,max_x,min_y,max_y)")
            data.map_bounds = MapBounds(
                min_x=float(coords[0]),
                max_x=float(coords[1]),
                min_y=float(coords[2]),
                max_y=float(coords[3]),
                source=source,
            )
        elif key == "name":
            if data.map_bounds:
                data.map_bounds.name = value
        elif key == "coord_system":
            data.metadata["coord_system"] = value

    def _parse_observation_line(self, line: str, data: InputData, source: SourceTrace):
        parts = re.split(r"[,\t|;]", line)
        parts = [p.strip() for p in parts if p.strip()]

        if len(parts) < 4:
            raise ValueError(
                f"观测数据需要至少4个字段 (测站ID, X坐标, Y坐标, 方位角), 实际只有 {len(parts)} 个"
            )

        station_id = parts[0]
        try:
            x = float(parts[1])
            y = float(parts[2])
        except ValueError:
            raise ValueError(f"坐标值必须是数字: '{parts[1]}', '{parts[2]}'")

        angle_str = parts[3]
        angle, unit = self._parse_angle(angle_str, source)

        error = 0.0
        if len(parts) > 4:
            try:
                error = float(parts[4])
            except ValueError:
                self.warnings.append(
                    ParseError(
                        f"误差值格式错误，使用默认值0: '{parts[4]}'",
                        source,
                        "warning",
                    )
                )

        note = ""
        if len(parts) > 5:
            note = " ".join(parts[5:])

        coord_system = CoordinateSystem.CARTESIAN
        if "coord_system" in data.metadata:
            try:
                coord_system = CoordinateSystem(data.metadata["coord_system"].lower())
            except ValueError:
                pass

        observation = Observation(
            station_id=station_id,
            position=Coordinate(x=x, y=y, system=coord_system, source=source),
            bearing=Bearing(angle=angle, unit=unit, error=error, source=source),
            status=ObservationStatus.VALID,
            note=note,
            source=source,
        )

        data.observations.append(observation)

    def _parse_angle(self, angle_str: str, source: SourceTrace) -> Tuple[float, AngleUnit]:
        angle_str = angle_str.strip().lower()

        if angle_str.endswith("deg") or angle_str.endswith("°"):
            num_str = angle_str.replace("deg", "").replace("°", "").strip()
            return float(num_str), AngleUnit.DEGREES
        elif angle_str.endswith("rad"):
            num_str = angle_str.replace("rad", "").strip()
            return float(num_str), AngleUnit.RADIANS
        elif angle_str.endswith("grad"):
            num_str = angle_str.replace("grad", "").strip()
            return float(num_str), AngleUnit.GRADS
        elif angle_str.endswith("mil") or angle_str.endswith("mils"):
            num_str = angle_str.replace("mils", "").replace("mil", "").strip()
            return float(num_str), AngleUnit.MILS

        try:
            angle = float(angle_str)
            if 0 <= angle <= 360:
                self.warnings.append(
                    ParseError(
                        f"未指定角度单位，假设为度 (degrees): {angle_str}",
                        source,
                        "warning",
                    )
                )
                return angle, AngleUnit.DEGREES
            elif 0 <= angle <= 6.284:
                self.warnings.append(
                    ParseError(
                        f"未指定角度单位，值较小可能是弧度: {angle_str}",
                        source,
                        "warning",
                    )
                )
                return angle, AngleUnit.RADIANS
            else:
                return angle, AngleUnit.DEGREES
        except ValueError:
            raise ValueError(f"无效的角度值: '{angle_str}'")

    def _parse_metadata_line(self, line: str, data: InputData, source: SourceTrace):
        parts = [p.strip() for p in line.split("=", 1)]
        if len(parts) == 2:
            data.metadata[parts[0]] = parts[1]

    def add_correction(
        self,
        data: InputData,
        reason: str,
        old_value: str,
        new_value: str,
        source: Optional[SourceTrace] = None,
    ) -> Correction:
        correction = Correction(
            timestamp=time.time(),
            reason=reason,
            old_value=old_value,
            new_value=new_value,
            source=source,
        )
        data.corrections.append(correction)
        return correction


def parse_file(filename: str) -> Tuple[InputData, List[ParseError], List[ParseError]]:
    parser = InputParser(filename)
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    return parser.parse(content)
