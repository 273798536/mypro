from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import math


@dataclass
class Triangle:
    a: float
    b: float
    c: float
    angle_A: Optional[float] = None
    angle_B: Optional[float] = None
    angle_C: Optional[float] = None
    label: str = ""
    unit: str = "cm"

    def sides(self) -> List[float]:
        return sorted([self.a, self.b, self.c])

    def angles(self) -> List[float]:
        result = []
        if self.angle_A is not None:
            result.append(self.angle_A)
        if self.angle_B is not None:
            result.append(self.angle_B)
        if self.angle_C is not None:
            result.append(self.angle_C)
        return sorted(result)

    def validate(self) -> Optional[str]:
        s = sorted([self.a, self.b, self.c])
        if s[0] <= 0 or s[1] <= 0 or s[2] <= 0:
            return "边长必须为正数"
        if s[0] + s[1] <= s[2]:
            return "不满足三角形不等式 (两边之和必须大于第三边)"
        angles = self.angles()
        for ang in angles:
            if ang <= 0 or ang >= 180:
                return "角度必须在 (0°, 180°) 范围内"
        if len(angles) == 3 and abs(sum(angles) - 180.0) > 1e-6:
            return f"三个内角之和应为180°，当前为 {sum(angles):.6f}°"
        return None


@dataclass
class JudgementResult:
    is_similar: Optional[bool] = None
    method: str = ""
    formula: str = ""
    scope: str = ""
    details: Dict[str, Any] = field(default_factory=dict)
    error_reason: Optional[str] = None
    warning: Optional[str] = None
    error_magnitude: float = 0.0


@dataclass
class JudgementRecord:
    triangle_1: Triangle
    triangle_2: Triangle
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    result: Optional[JudgementResult] = None
    source_row: Optional[int] = None
    source_file: Optional[str] = None
    reviewed: bool = False
    review_note: Optional[str] = None
    screenshot_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return d


@dataclass
class ProcessingRecord:
    batch_id: str = field(default_factory=lambda: uuid.uuid4().hex[:10])
    created_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    source_file: str = ""
    tolerance: float = 1e-4
    angle_tolerance: float = 0.01
    judgement_records: List[JudgementRecord] = field(default_factory=list)
    status: str = "pending"

    def summary(self) -> Dict[str, Any]:
        total = len(self.judgement_records)
        similar = sum(1 for r in self.judgement_records if r.result and r.result.is_similar is True)
        different = sum(1 for r in self.judgement_records if r.result and r.result.is_similar is False)
        failed = sum(1 for r in self.judgement_records if r.result and r.result.is_similar is None)
        warnings = sum(1 for r in self.judgement_records if r.result and r.result.warning)
        reviewed = sum(1 for r in self.judgement_records if r.reviewed)
        return {
            "batch_id": self.batch_id,
            "total": total,
            "similar": similar,
            "different": different,
            "failed": failed,
            "warnings": warnings,
            "reviewed": reviewed,
            "status": self.status,
        }

    def find_record(self, record_id: str) -> Optional[JudgementRecord]:
        for r in self.judgement_records:
            if r.record_id == record_id:
                return r
        return None

    def abnormal_records(self) -> List[JudgementRecord]:
        result = []
        for r in self.judgement_records:
            if r.result is None:
                continue
            if r.result.is_similar is None:
                result.append(r)
            elif r.result.warning:
                result.append(r)
            elif r.result.error_magnitude and r.result.error_magnitude > self.tolerance * 10:
                result.append(r)
        return result
