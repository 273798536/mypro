import csv
import json
import os
from datetime import datetime
from typing import List, Optional, Tuple
from .models import Point, AnomalyRecord, AnomalyType, CalculationResult
from .calculator import calculate_convex_hull_area


class DataImporter:
    @staticmethod
    def from_csv(file_path: str) -> Tuple[List[Point], List[AnomalyRecord]]:
        points: List[Point] = []
        anomalies: List[AnomalyRecord] = []

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"数据文件不存在: {file_path}")

        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader, start=1):
                record_id = row.get("record_id") or row.get("id") or f"ROW_{idx}"
                anomalies.extend(DataImporter._validate_row(row, record_id))
                point = DataImporter._row_to_point(row, record_id)
                if point:
                    points.append(point)

        if len(points) < 3:
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.POINT_INSUFFICIENT,
                details=f"仅解析到 {len(points)} 个有效点，至少需要 3 个"
            ))

        return points, anomalies

    @staticmethod
    def _validate_row(row: dict, record_id: str) -> List[AnomalyRecord]:
        anomalies: List[AnomalyRecord] = []

        unit = (row.get("unit") or "").strip()
        if not unit:
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.UNIT_MISSING,
                record_id=record_id,
                details=f"记录 {record_id} 未提供单位字段",
                affected_fields=["unit"]
            ))

        x_str = (row.get("x") or "").strip()
        y_str = (row.get("y") or "").strip()
        invalid_fields = []
        try:
            float(x_str)
        except (ValueError, TypeError):
            invalid_fields.append("x")
        try:
            float(y_str)
        except (ValueError, TypeError):
            invalid_fields.append("y")
        if invalid_fields:
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.COORDINATE_INVALID,
                record_id=record_id,
                details=f"记录 {record_id} 坐标字段无效: {', '.join(invalid_fields)}",
                affected_fields=invalid_fields
            ))

        return anomalies

    @staticmethod
    def _row_to_point(row: dict, record_id: str) -> Optional[Point]:
        try:
            x = float((row.get("x") or "").strip())
            y = float((row.get("y") or "").strip())
        except (ValueError, TypeError):
            return None

        unit = (row.get("unit") or "").strip() or None
        source = (row.get("source") or "").strip() or None
        return Point(x=x, y=y, unit=unit, record_id=record_id, source=source)

    @staticmethod
    def load_parameter_meta(file_path: Optional[str]) -> Tuple[Optional[str], Optional[datetime]]:
        if not file_path or not os.path.exists(file_path):
            return None, None
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            version = meta.get("version")
            ts_str = meta.get("timestamp") or meta.get("updated_at")
            ts = datetime.fromisoformat(ts_str) if ts_str else None
            return version, ts
        except Exception:
            return None, None


class CalculationEngine:
    def __init__(self, parameter_file: Optional[str] = None):
        self.parameter_file = parameter_file
        self.param_version, self.param_ts = DataImporter.load_parameter_meta(parameter_file)

    def run(self, data_file: str, parameter_expected_version: Optional[str] = None,
            notes: str = "") -> CalculationResult:
        points, anomalies = DataImporter.from_csv(data_file)

        if (parameter_expected_version and self.param_version
                and self.param_version != parameter_expected_version):
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.PARAMETER_OUTDATED,
                details=(f"当前参数表版本 {self.param_version}，"
                         f"预期版本 {parameter_expected_version}")
            ))

        units = {p.unit for p in points if p.unit}
        unit = next(iter(units)) if len(units) == 1 else None

        valid_points = [p for p in points if p.unit]
        hull, area = calculate_convex_hull_area(valid_points) if len(valid_points) >= 3 else ([], 0.0)

        return CalculationResult(
            points=points,
            hull_points=hull,
            raw_area=area,
            unit=unit,
            anomalies=anomalies,
            parameter_version=self.param_version,
            parameter_timestamp=self.param_ts,
            notes=notes
        )
