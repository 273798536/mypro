"""数据解析模块 - 处理空行、备注、缺列等脏数据"""

import csv
import re
from typing import List, Tuple, Any
from .models import Angle, AngleUnit, DataError, ErrorType


class DataParser:
    """数据解析器"""

    def __init__(self):
        self.errors: List[DataError] = []

    def parse_angle(self, value: str, row_num: int = 0) -> Angle:
        """解析角度，自动检测单位"""
        if not value or value.strip() == "":
            raise ValueError("空角度值")

        value = value.strip()
        original = value

        if "°" in value or "deg" in value.lower() or "度" in value:
            num = re.sub(r"[°度\s]", "", value)
            num = re.sub(r"deg", "", num, flags=re.IGNORECASE)
            try:
                return Angle(float(num), AngleUnit.DEGREE)
            except ValueError:
                raise ValueError(f"无法解析角度: {original}")

        if "rad" in value.lower() or "π" in value or "pi" in value.lower():
            value = value.lower()
            if "π" in value or "pi" in value:
                value = value.replace("π", "pi").replace("pi", "*3.1415926535")
            value = re.sub(r"rad", "", value)
            try:
                return Angle(eval(value), AngleUnit.RADIAN)
            except:
                raise ValueError(f"无法解析弧度: {original}")

        try:
            num = float(value)
            if abs(num) > 2 * 3.14159 + 0.1:
                return Angle(num, AngleUnit.DEGREE)
            else:
                return Angle(num, AngleUnit.RADIAN)
        except ValueError:
            raise ValueError(f"无法解析角度: {original}")

    def parse_csv(self, filepath: str, required_columns: List[str]) -> Tuple[List[dict], List[DataError]]:
        """解析CSV文件，处理脏数据"""
        self.errors = []
        results = []

        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()

        header = None
        for line_num, line in enumerate(lines, 1):
            line = line.rstrip("\n\r")

            if not line.strip():
                self.errors.append(DataError(
                    error_type=ErrorType.BAD_ROW,
                    row_number=line_num,
                    message="空行",
                    raw_data=""
                ))
                continue

            if line.strip().startswith("#") or line.strip().startswith("//"):
                self.errors.append(DataError(
                    error_type=ErrorType.BAD_ROW,
                    row_number=line_num,
                    message="备注行",
                    raw_data=line
                ))
                continue

            parts = [p.strip() for p in line.split(",")]

            if header is None:
                header = parts
                missing = [col for col in required_columns if col not in header]
                if missing:
                    raise ValueError(f"缺少必需列: {', '.join(missing)}")
                continue

            if len(parts) < len(header):
                self.errors.append(DataError(
                    error_type=ErrorType.BAD_ROW,
                    row_number=line_num,
                    message=f"列数不足: 期望 {len(header)}, 实际 {len(parts)}",
                    raw_data=line
                ))
                continue

            row_dict = dict(zip(header, parts))
            results.append(row_dict)

        return results, self.errors

    def detect_angle_unit_mix(self, angles: List[Angle]) -> bool:
        """检测角度制混用"""
        if len(angles) < 2:
            return False
        units = {a.unit for a in angles}
        return len(units) > 1

    def parse_beam_angle_log(self, filepath: str) -> Tuple[List[Angle], List[DataError]]:
        """解析光束角日志文件"""
        angles: List[Angle] = []
        errors: List[DataError] = []

        with open(filepath, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    errors.append(DataError(
                        error_type=ErrorType.BAD_ROW,
                        row_number=line_num,
                        message="空行",
                        raw_data=""
                    ))
                    continue
                try:
                    angle = self.parse_angle(line, line_num)
                    angles.append(angle)
                except ValueError as e:
                    errors.append(DataError(
                        error_type=ErrorType.BAD_ROW,
                        row_number=line_num,
                        message=str(e),
                        raw_data=line
                    ))

        if self.detect_angle_unit_mix(angles):
            errors.append(DataError(
                error_type=ErrorType.ANGLE_UNIT_MIX,
                row_number=0,
                message="检测到角度制混用: 同时存在度和弧度",
                raw_data=""
            ))

        return angles, errors
