import json
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any
from pathlib import Path

from .units import UnitConverter, UnitMismatchIssue
from .direction import DirectionReversalDetector, DirectionIssue


class RecordStatus(str, Enum):
    PROCESSED = "已处理"
    PENDING = "待补材料"
    MANUAL = "人工改判"
    NORMAL = "正常"


@dataclass
class BoundarySample:
    record_id: str
    source_line: int
    tension_value: float
    boundary_type: str
    reason: str
    parameter_effect: str

    def to_dict(self) -> dict:
        return {
            "record_id": self.record_id,
            "source_line": self.source_line,
            "tension_value": self.tension_value,
            "boundary_type": self.boundary_type,
            "reason": self.reason,
            "parameter_effect": self.parameter_effect,
        }


@dataclass
class AttributionResult:
    total_records: int = 0
    normal_count: int = 0
    unit_issues: List[UnitMismatchIssue] = field(default_factory=list)
    direction_issues: List[DirectionIssue] = field(default_factory=list)
    boundary_samples: List[BoundarySample] = field(default_factory=list)
    processed_records: List[dict] = field(default_factory=list)
    pending_records: List[dict] = field(default_factory=list)
    manual_records: List[dict] = field(default_factory=list)
    formulas: List[dict] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    summary: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "total_records": self.total_records,
            "normal_count": self.normal_count,
            "unit_issues": [u.to_dict() for u in self.unit_issues],
            "direction_issues": [d.to_dict() for d in self.direction_issues],
            "boundary_samples": [b.to_dict() for b in self.boundary_samples],
            "processed_records": self.processed_records,
            "pending_records": self.pending_records,
            "manual_records": self.manual_records,
            "formulas": self.formulas,
            "parameters": self.parameters,
            "summary": self.summary,
        }


class TensionAttributionAnalyzer:
    def __init__(
        self,
        standard_unit: str = "N",
        tension_tolerance: float = 0.15,
        direction_confidence_threshold: float = 0.5,
        unit_confidence_threshold: float = 0.4,
        boundary_sigma: float = 2.0,
    ):
        self.standard_unit = standard_unit
        self.tension_tolerance = tension_tolerance
        self.direction_confidence_threshold = direction_confidence_threshold
        self.unit_confidence_threshold = unit_confidence_threshold
        self.boundary_sigma = boundary_sigma

        self.unit_converter = UnitConverter(standard_unit=standard_unit)
        self.direction_detector = DirectionReversalDetector()

    def analyze(self, records: List[dict]) -> AttributionResult:
        result = AttributionResult()
        result.total_records = len(records)

        result.parameters = {
            "standard_unit": self.standard_unit,
            "tension_tolerance": self.tension_tolerance,
            "direction_confidence_threshold": self.direction_confidence_threshold,
            "unit_confidence_threshold": self.unit_confidence_threshold,
            "boundary_sigma": self.boundary_sigma,
        }

        records_with_std = self.unit_converter.convert_all(
            records, value_field="tension", target_field="tension_std"
        )

        unit_issues = self.unit_converter.detect_mismatch(records)
        result.unit_issues = [
            u for u in unit_issues if u.confidence >= self.unit_confidence_threshold
        ]

        direction_issues = self.direction_detector.detect_reversals(
            records_with_std,
            value_field="tension_std",
            direction_field="direction",
        )
        result.direction_issues = direction_issues

        unit_issue_ids = {u.record_id for u in result.unit_issues}
        dir_issue_ids = {d.record_id for d in result.direction_issues}
        all_issue_ids = unit_issue_ids | dir_issue_ids

        tension_values = [
            r["tension_std"]
            for r in records_with_std
            if r.get("tension_std") is not None
        ]
        if tension_values:
            mean_val = sum(tension_values) / len(tension_values)
            variance = sum((v - mean_val) ** 2 for v in tension_values) / len(
                tension_values
            )
            std_val = math.sqrt(variance)
        else:
            mean_val = 0
            std_val = 0

        result.formulas = self._build_formulas(mean_val, std_val)

        boundary_samples = self._find_boundary_samples(
            records_with_std, mean_val, std_val
        )
        result.boundary_samples = boundary_samples

        for rec in records_with_std:
            rid = rec.get("id", "unknown")
            status = self._classify_record(rec, all_issue_ids, mean_val, std_val)

            rec_copy = dict(rec)
            rec_copy["status"] = status.value

            if status == RecordStatus.PROCESSED:
                result.processed_records.append(rec_copy)
            elif status == RecordStatus.PENDING:
                result.pending_records.append(rec_copy)
            elif status == RecordStatus.MANUAL:
                result.manual_records.append(rec_copy)
            else:
                result.processed_records.append(rec_copy)

        result.normal_count = len(records) - len(all_issue_ids) - len(result.pending_records)

        result.summary = {
            "total_records": result.total_records,
            "normal_count": result.normal_count,
            "unit_issue_count": len(result.unit_issues),
            "direction_issue_count": len(result.direction_issues),
            "boundary_sample_count": len(result.boundary_samples),
            "processed_count": len(result.processed_records),
            "pending_count": len(result.pending_records),
            "manual_count": len(result.manual_records),
            "mean_tension": round(mean_val, 4),
            "std_tension": round(std_val, 4),
            "standard_unit": self.standard_unit,
        }

        return result

    def _classify_record(
        self,
        rec: dict,
        issue_ids: set,
        mean_val: float,
        std_val: float,
    ) -> RecordStatus:
        rid = rec.get("id", "unknown")
        tension = rec.get("tension_std")

        if tension is None:
            return RecordStatus.PENDING

        raw_tension = rec.get("tension", "")
        if "?" in str(raw_tension) or "待" in str(raw_tension) or "缺" in str(raw_tension):
            return RecordStatus.PENDING

        notes = str(rec.get("notes", ""))
        if "待确认" in notes or "待复核" in notes or "存疑" in notes:
            return RecordStatus.PENDING

        if "人工" in notes or "改判" in notes or "手动" in notes:
            return RecordStatus.MANUAL

        if std_val > 0 and abs(tension - mean_val) > self.boundary_sigma * std_val:
            if rid in issue_ids:
                return RecordStatus.MANUAL
            return RecordStatus.MANUAL

        if rid in issue_ids:
            return RecordStatus.PROCESSED

        return RecordStatus.NORMAL

    def _find_boundary_samples(
        self,
        records: List[dict],
        mean_val: float,
        std_val: float,
    ) -> List[BoundarySample]:
        samples = []
        if std_val == 0:
            return samples

        for rec in records:
            rid = rec.get("id", "unknown")
            tension = rec.get("tension_std")
            line = rec.get("line", 0)

            if tension is None:
                continue

            deviation = abs(tension - mean_val) / std_val

            if deviation >= self.boundary_sigma:
                boundary_type = "上边界" if tension > mean_val else "下边界"

                param_effect = (
                    f"当前boundary_sigma={self.boundary_sigma}, "
                    f"该样本偏离均值{round(deviation, 2)}σ; "
                    f"若调至{round(self.boundary_sigma + 0.5, 1)}, "
                    f"{'将不再判定为边界' if deviation < self.boundary_sigma + 0.5 else '仍为边界样本'}"
                )

                reason = (
                    f"张力值 {round(tension, 2)} {self.standard_unit} "
                    f"偏离均值 {round(mean_val, 2)} {self.standard_unit} "
                    f"达 {round(deviation, 2)}σ, 超过阈值 {self.boundary_sigma}σ"
                )

                samples.append(
                    BoundarySample(
                        record_id=rid,
                        source_line=line,
                        tension_value=tension,
                        boundary_type=boundary_type,
                        reason=reason,
                        parameter_effect=param_effect,
                    )
                )

        return samples

    def _build_formulas(self, mean_val: float, std_val: float) -> List[dict]:
        formulas = []

        formulas.append(
            {
                "name": "单位换算公式",
                "formula": "F_std = F_raw × K_unit",
                "description": f"将原始张力值转换为标准单位({self.standard_unit}), "
                f"其中K_unit为单位换算系数",
                "example": "例如: 5 kN × 1000 = 5000 N",
                "parameters": ["standard_unit", "unit_confidence_threshold"],
            }
        )

        formulas.append(
            {
                "name": "方向符号判定公式",
                "formula": "sign(F) 与 sign(方向约定) 一致性校验",
                "description": "根据标注方向检查张力值符号是否符合约定",
                "example": "标注'上行'约定为正,若张力值为负则判定为方向写反",
                "parameters": ["direction_confidence_threshold"],
            }
        )

        formulas.append(
            {
                "name": "边界样本判定公式",
                "formula": "|F_i - μ| > σ × boundary_sigma",
                "description": f"当前均值μ={round(mean_val, 2)} {self.standard_unit}, "
                f"标准差σ={round(std_val, 2)} {self.standard_unit}",
                "example": f"|F_i - {round(mean_val, 2)}| > {round(std_val, 2)} × {self.boundary_sigma}",
                "parameters": ["boundary_sigma", "tension_tolerance"],
            }
        )

        return formulas

    def save_result_json(self, result: AttributionResult, output_path: str) -> None:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)

    def load_records_json(self, input_path: str) -> List[dict]:
        path = Path(input_path)
        if not path.exists():
            raise FileNotFoundError(f"输入文件不存在: {input_path}")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "records" in data:
            return data["records"]
        raise ValueError(f"输入文件格式不正确: {input_path}")
