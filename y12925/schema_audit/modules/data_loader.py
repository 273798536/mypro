import json
import os
import re
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field

from .sample_data import write_sample_data


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RECORDS_FILE = "sample_schema_records.json"
MATERIALS_FILE = "sample_source_materials.json"
CORRECTIONS_FILE = "sample_corrections.json"


@dataclass
class AuditDataset:
    records: List[Dict[str, Any]] = field(default_factory=list)
    materials: List[Dict[str, Any]] = field(default_factory=list)
    corrections: List[Dict[str, Any]] = field(default_factory=list)

    def record_by_id(self, rid: str) -> Optional[Dict[str, Any]]:
        for r in self.records:
            if r["record_id"] == rid:
                return r
        return None

    def material_by_id(self, mid: str) -> Optional[Dict[str, Any]]:
        for m in self.materials:
            if m["material_id"] == mid:
                return m
        return None


def ensure_sample_data_exists() -> None:
    need = [RECORDS_FILE, MATERIALS_FILE, CORRECTIONS_FILE]
    missing = [f for f in need if not os.path.exists(os.path.join(DATA_DIR, f))]
    if missing:
        write_sample_data(DATA_DIR)


def load_dataset() -> AuditDataset:
    ensure_sample_data_exists()
    with open(os.path.join(DATA_DIR, RECORDS_FILE), encoding="utf-8") as f:
        records = json.load(f)
    with open(os.path.join(DATA_DIR, MATERIALS_FILE), encoding="utf-8") as f:
        materials = json.load(f)
    with open(os.path.join(DATA_DIR, CORRECTIONS_FILE), encoding="utf-8") as f:
        corrections = json.load(f)
    return AuditDataset(records=records, materials=materials, corrections=corrections)


def load_dataset_from_file(records_path: str, materials_path: Optional[str] = None,
                           corrections_path: Optional[str] = None) -> AuditDataset:
    with open(records_path, encoding="utf-8") as f:
        records = json.load(f)
    materials, corrections = [], []
    if materials_path and os.path.exists(materials_path):
        with open(materials_path, encoding="utf-8") as f:
            materials = json.load(f)
    if corrections_path and os.path.exists(corrections_path):
        with open(corrections_path, encoding="utf-8") as f:
            corrections = json.load(f)
    return AuditDataset(records=records, materials=materials, corrections=corrections)


_BOOLEAN_KEYWORDS_TRUE = {"true", "1", "yes", "是", "必填", "必需"}
_BOOLEAN_KEYWORDS_FALSE = {"false", "0", "no", "否", "非必填", "选填"}


def parse_mixed_required(value: Any) -> Tuple[Optional[bool], Optional[str]]:
    """
    解析混写的 required 字段，返回 (清洗后的布尔值, 剥离出的备注)
    例如 "必填 注意和XX对齐" -> (True, "注意和XX对齐")
    """
    if isinstance(value, bool):
        return value, None
    if isinstance(value, (int, float)):
        return bool(value), None
    if value is None:
        return None, None
    text = str(value).strip()
    if not text:
        return None, None

    lowered = text.lower()
    clean_bool = None
    for kw in _BOOLEAN_KEYWORDS_TRUE:
        if kw in lowered:
            clean_bool = True
            break
    if clean_bool is None:
        for kw in _BOOLEAN_KEYWORDS_FALSE:
            if kw in lowered:
                clean_bool = False
                break

    tokens = re.split(r"\s+", text)
    remark_tokens = []
    for tok in tokens:
        tok_lower = tok.lower()
        is_kw = any(kw in tok_lower for kw in _BOOLEAN_KEYWORDS_TRUE | _BOOLEAN_KEYWORDS_FALSE)
        if not is_kw:
            remark_tokens.append(tok)
    remark = " ".join(remark_tokens) if remark_tokens else None

    return clean_bool, remark


def find_duplicate_groups(records: List[Dict[str, Any]]) -> List[List[str]]:
    """
    找到重复标注组：同工具 + 参数结构完全相同 + 标注时间差<=3天 + 不同标注员
    （只把明显是「同一批被多个人同时标了」的视为重复）
    """
    from datetime import datetime
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for r in records:
        param_struct = tuple(sorted(
            (p["param_name"], p["param_type"]) for p in r["params"]
        ))
        key = (r["tool_name"], param_struct)
        buckets.setdefault(str(key), []).append(r)

    result = []
    for _, group in buckets.items():
        if len(group) <= 1:
            continue
        used = [False] * len(group)
        for i in range(len(group)):
            if used[i]:
                continue
            cluster = [group[i]["record_id"]]
            used[i] = True
            try:
                t_i = datetime.strptime(group[i]["annotated_at"], "%Y-%m-%d %H:%M:%S")
            except Exception:
                t_i = None
            for j in range(i + 1, len(group)):
                if used[j]:
                    continue
                same_annotator = group[i]["annotator"] == group[j]["annotator"]
                close_time = False
                if t_i is not None:
                    try:
                        t_j = datetime.strptime(group[j]["annotated_at"], "%Y-%m-%d %H:%M:%S")
                        close_time = abs((t_i - t_j).days) <= 3
                    except Exception:
                        close_time = False
                explicit_risk = (
                    "重复标注" in group[i].get("risk_tags", [])
                    or "重复标注" in group[j].get("risk_tags", [])
                )
                if explicit_risk or (not same_annotator and close_time):
                    cluster.append(group[j]["record_id"])
                    used[j] = True
            if len(cluster) > 1:
                result.append(cluster)
    return result


def count_dirty_issues(records: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    统计脏数据条目数
    """
    counts = {
        "空值_description为空": 0,
        "空值_enum为空数组": 0,
        "重复标注": 0,
        "备注混写_required非布尔": 0,
        "结论冲突_摘要与状态不符": 0,
        "来源不可追溯": 0,
    }
    for r in records:
        if not r.get("source_material_ids"):
            counts["来源不可追溯"] += 1
        summary = r.get("original_audit_summary", "")
        status = r.get("original_audit_status", "")
        if status == "通过" and ("待确认" in summary or "未通过" in summary):
            counts["结论冲突_摘要与状态不符"] += 1
        for p in r.get("params", []):
            if p.get("description") is None:
                counts["空值_description为空"] += 1
            if isinstance(p.get("enum"), list) and len(p.get("enum", [])) == 0:
                counts["空值_enum为空数组"] += 1
            if not isinstance(p.get("required"), bool):
                counts["备注混写_required非布尔"] += 1
    dup_groups = find_duplicate_groups(records)
    counts["重复标注"] = sum(len(g) for g in dup_groups)
    return counts
