import re
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple

CANONICAL_FIELDS = {
    "security_code": ["证券代码", "代码", "股票代码", "code", "security_code", "symbol", "ticker"],
    "security_name": ["证券名称", "名称", "股票名称", "简称", "name", "security_name", "security"],
    "weight": ["权重", "占比", "weight", "proportion", "份额"],
    "x_value": ["X值", "自变量", "因子", "factor", "x", "x_value", "independent", "beta"],
    "y_value": ["Y值", "因变量", "收益", "收益率", "y", "y_value", "dependent", "return", "ret"],
    "unit": ["单位", "计量单位", "unit"],
    "breakpoint": ["断点", "分段点", "breakpoint", "knot", "threshold"],
}

UNIT_HINTS = ["单位", "计量单位", "unit", "Units", "units"]


def _normalize(s: str) -> str:
    return re.sub(r"[\s_－—\-（）()【】\[\]、,，.。:：;；/]", "", s).lower()


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def match_columns(raw_columns: List[str]) -> Tuple[Dict[str, Optional[str]], List[Dict]]:
    mapping: Dict[str, Optional[str]] = {}
    matches_report: List[Dict] = []

    for canonical, aliases in CANONICAL_FIELDS.items():
        scored: List[Tuple[str, float]] = []
        for col in raw_columns:
            best = max(similarity(col, alias) for alias in aliases + [canonical])
            if best > 0.3:
                scored.append((col, best))
        scored.sort(key=lambda x: x[1], reverse=True)

        chosen = scored[0][0] if scored and scored[0][1] >= 0.5 else None
        mapping[canonical] = chosen
        matches_report.append({
            "canonical": canonical,
            "candidates": [c for c, _ in scored[:3]],
            "chosen": chosen,
            "confidence": scored[0][1] if scored else 0.0,
        })

    return mapping, matches_report


def extract_unit_from_row(raw_row: Dict, raw_columns: List[str]) -> Tuple[Optional[str], Optional[str]]:
    for col in raw_columns:
        if any(h in col for h in UNIT_HINTS):
            val = raw_row.get(col)
            if val is not None and str(val).strip():
                return str(val).strip(), f"原始表字段[{col}]"

    for col in raw_columns:
        val = raw_row.get(col)
        if val is None:
            continue
        val_str = str(val)
        if "%" in val_str and ("收益" in col or "Y" in col or "y" in col or "return" in col.lower()):
            return "%", f"字段[{col}]值含%推测"
        if "元" in val_str:
            return "元", f"字段[{col}]值含元推测"
        if "倍" in val_str:
            return "倍", f"字段[{col}]值含倍推测"

    return None, None
