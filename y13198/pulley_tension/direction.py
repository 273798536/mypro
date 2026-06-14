import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict


DIRECTION_PATTERNS = {
    "up": ["上", "上行", "↑", "^", "up", "UP", "提升", "起升", "上升"],
    "down": ["下", "下行", "↓", "v", "down", "DOWN", "下降", "下落", "下放"],
    "left": ["左", "←", "<", "left", "LEFT", "左侧"],
    "right": ["右", "→", ">", "right", "RIGHT", "右侧"],
    "forward": ["前", "前进", "forward", "FORWARD", "正行"],
    "backward": ["后", "后退", "backward", "BACKWARD", "BACK", "逆行"],
    "positive": ["正", "+", "positive", "POSITIVE", "拉", "张紧"],
    "negative": ["负", "-", "negative", "NEGATIVE", "松", "放松"],
}

DIRECTION_PAIRS = [
    ("up", "down"),
    ("left", "right"),
    ("forward", "backward"),
    ("positive", "negative"),
]


@dataclass
class DirectionIssue:
    record_id: str
    source_line: int
    declared_direction: str
    implied_direction: str
    tension_value: float
    expected_sign: int
    actual_sign: int
    impact_scope: List[str]
    description: str = ""

    def to_dict(self) -> dict:
        return {
            "record_id": self.record_id,
            "source_line": self.source_line,
            "declared_direction": self.declared_direction,
            "implied_direction": self.implied_direction,
            "tension_value": self.tension_value,
            "expected_sign": self.expected_sign,
            "actual_sign": self.actual_sign,
            "impact_scope": self.impact_scope,
            "description": self.description,
        }


class DirectionReversalDetector:
    def __init__(self, sign_convention: Optional[dict] = None):
        if sign_convention is None:
            self.sign_convention = {
                "up": 1,
                "down": -1,
                "left": -1,
                "right": 1,
                "forward": 1,
                "backward": -1,
                "positive": 1,
                "negative": -1,
            }
        else:
            self.sign_convention = sign_convention

    def detect_direction(self, text: str) -> Optional[str]:
        text_lower = text.lower()
        best_dir = None
        best_len = 0

        for direction, patterns in DIRECTION_PATTERNS.items():
            for pattern in patterns:
                if pattern.lower() in text_lower:
                    if len(pattern) > best_len:
                        best_len = len(pattern)
                        best_dir = direction

        return best_dir

    def detect_reversals(
        self,
        records: List[dict],
        value_field: str = "tension_std",
        direction_field: str = "direction",
        id_field: str = "id",
        line_field: str = "line",
    ) -> List[DirectionIssue]:
        issues = []

        for rec in records:
            rid = rec.get(id_field, "unknown")
            line = rec.get(line_field, 0)
            tension = rec.get(value_field)
            direction_text = str(rec.get(direction_field, ""))

            if tension is None or tension == 0:
                continue

            declared_dir = self.detect_direction(direction_text)
            if declared_dir is None:
                continue

            expected_sign = self.sign_convention.get(declared_dir, 1)
            actual_sign = 1 if tension > 0 else -1

            if expected_sign != actual_sign:
                opposite_dir = self._get_opposite(declared_dir)
                impact_scope = self._assess_impact(declared_dir, records, value_field)

                desc = (
                    f"记录{rid}标注方向为{declared_dir}"
                    f"(应{self._sign_name(expected_sign)}), "
                    f"但张力值{self._sign_name(actual_sign)}({tension}), "
                    f"可能方向符号写反为{opposite_dir}"
                )

                issues.append(
                    DirectionIssue(
                        record_id=rid,
                        source_line=line,
                        declared_direction=declared_dir,
                        implied_direction=opposite_dir,
                        tension_value=tension,
                        expected_sign=expected_sign,
                        actual_sign=actual_sign,
                        impact_scope=impact_scope,
                        description=desc,
                    )
                )

        return issues

    def _get_opposite(self, direction: str) -> str:
        for positive, negative in DIRECTION_PAIRS:
            if direction == positive:
                return negative
            if direction == negative:
                return positive
        return direction

    def _sign_name(self, sign: int) -> str:
        if sign > 0:
            return "为正"
        return "为负"

    def _assess_impact(
        self, direction: str, records: List[dict], value_field: str
    ) -> List[str]:
        scope = []
        same_dir_count = 0
        total_count = len(records)

        for rec in records:
            dir_text = str(rec.get("direction", ""))
            if self.detect_direction(dir_text) == direction:
                same_dir_count += 1

        scope.append(f"同方向记录数: {same_dir_count}/{total_count}")

        if same_dir_count > total_count * 0.3:
            scope.append("影响范围: 较大(超过30%的记录)")
        elif same_dir_count > total_count * 0.1:
            scope.append("影响范围: 中等(10%-30%的记录)")
        else:
            scope.append("影响范围: 较小(不足10%的记录)")

        scope.append("建议: 复核该方向全部记录的符号一致性")

        return scope
