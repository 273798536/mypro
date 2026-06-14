import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict


FORCE_UNITS = {
    "N": 1.0,
    "newton": 1.0,
    "newtons": 1.0,
    "牛": 1.0,
    "牛顿": 1.0,
    "kN": 1000.0,
    "千牛": 1000.0,
    "kgf": 9.80665,
    "公斤力": 9.80665,
    "kg": 9.80665,
    "公斤": 9.80665,
    "t": 9806.65,
    "吨": 9806.65,
    "tf": 9806.65,
    "吨力": 9806.65,
    "lb": 4.44822,
    "磅": 4.44822,
    "lbf": 4.44822,
}

UNIT_PATTERN = re.compile(
    r"(?P<value>-?\d+\.?\d*)\s*(?P<unit>[a-zA-Z\u4e00-\u9fa5]+)",
    re.UNICODE,
)


@dataclass
class UnitMismatchIssue:
    record_id: str
    source_line: int
    raw_value: str
    detected_unit: str
    standard_unit: str
    converted_value: float
    raw_numeric: float
    magnitude_factor: float
    confidence: float
    description: str = ""

    def to_dict(self) -> dict:
        return {
            "record_id": self.record_id,
            "source_line": self.source_line,
            "raw_value": self.raw_value,
            "detected_unit": self.detected_unit,
            "standard_unit": self.standard_unit,
            "converted_value": round(self.converted_value, 4),
            "raw_numeric": self.raw_numeric,
            "magnitude_factor": self.magnitude_factor,
            "confidence": round(self.confidence, 3),
            "description": self.description,
        }


class UnitConverter:
    def __init__(self, standard_unit: str = "N"):
        self.standard_unit = standard_unit
        self._standard_factor = FORCE_UNITS.get(standard_unit, 1.0)

    def parse_value(self, raw_str: str) -> Tuple[float, str, float]:
        raw_str = raw_str.strip()
        match = UNIT_PATTERN.match(raw_str)
        if not match:
            try:
                return float(raw_str), "", float(raw_str)
            except ValueError:
                raise ValueError(f"无法解析张力值: {raw_str}")

        value = float(match.group("value"))
        unit = match.group("unit")

        factor = self._find_unit_factor(unit)
        if factor is None:
            return value, unit, value

        converted = value * factor / self._standard_factor
        return value, unit, converted

    def _find_unit_factor(self, unit_str: str) -> Optional[float]:
        unit_lower = unit_str.lower()
        for key, factor in FORCE_UNITS.items():
            if key.lower() == unit_lower:
                return factor
        for key, factor in FORCE_UNITS.items():
            if key.lower() in unit_lower or unit_lower in key.lower():
                return factor
        return None

    def detect_mismatch(
        self,
        records: List[dict],
        value_field: str = "tension",
        id_field: str = "id",
        line_field: str = "line",
    ) -> List[UnitMismatchIssue]:
        issues = []
        converted_values = []

        for rec in records:
            raw = str(rec.get(value_field, ""))
            rid = rec.get(id_field, "unknown")
            line = rec.get(line_field, 0)

            try:
                raw_num, detected_unit, converted = self.parse_value(raw)
                converted_values.append((rid, line, raw, detected_unit, converted, raw_num))
            except ValueError:
                continue

        if not converted_values:
            return issues

        median_val = self._median([cv[4] for cv in converted_values if cv[4] != 0])
        if median_val == 0:
            median_val = 1.0

        for rid, line, raw, detected_unit, converted, raw_num in converted_values:
            if detected_unit and detected_unit != self.standard_unit:
                factor = FORCE_UNITS.get(detected_unit, 1.0) / self._standard_factor
                magnitude_ratio = abs(converted) / abs(median_val) if median_val else 0

                confidence = 0.0
                if abs(factor - 1.0) > 0.01:
                    confidence = min(0.95, 0.5 + 0.3 * abs(magnitude_ratio - 1.0))
                    if magnitude_ratio < 0.01 or magnitude_ratio > 100:
                        confidence = min(0.99, confidence + 0.3)

                if confidence > 0.3:
                    desc = (
                        f"原值 {raw} 检测为{detected_unit}单位, "
                        f"换算为{self.standard_unit}后为 {round(converted, 2)} "
                        f"(数量级差异 {round(magnitude_ratio, 2)}倍)"
                    )
                    issues.append(
                        UnitMismatchIssue(
                            record_id=rid,
                            source_line=line,
                            raw_value=raw,
                            detected_unit=detected_unit,
                            standard_unit=self.standard_unit,
                            converted_value=converted,
                            raw_numeric=raw_num,
                            magnitude_factor=factor,
                            confidence=confidence,
                            description=desc,
                        )
                    )

        return issues

    def convert_all(
        self,
        records: List[dict],
        value_field: str = "tension",
        target_field: str = "tension_std",
    ) -> List[dict]:
        result = []
        for rec in records:
            new_rec = dict(rec)
            raw = str(rec.get(value_field, ""))
            try:
                _, _, converted = self.parse_value(raw)
                new_rec[target_field] = round(converted, 4)
                new_rec["unit_original"] = self._extract_unit(raw)
            except ValueError:
                new_rec[target_field] = None
                new_rec["unit_original"] = None
            result.append(new_rec)
        return result

    def _extract_unit(self, raw_str: str) -> str:
        match = UNIT_PATTERN.match(raw_str.strip())
        if match:
            return match.group("unit")
        return ""

    @staticmethod
    def _median(values: List[float]) -> float:
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        if n == 0:
            return 0.0
        if n % 2 == 1:
            return sorted_vals[n // 2]
        return (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2
