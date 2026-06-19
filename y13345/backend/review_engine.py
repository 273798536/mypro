from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from .field_mapper import SampleRecord


STATUS_CATEGORIES = {
    "processed": ["已处理", "已完成", "已复核", "通过", "已通过", "处理完成"],
    "pending_material": ["待补材料", "待补充", "材料不全", "缺引用", "缺少证据", "待补"],
    "manual_review": ["人工改判", "待人工", "人工复核", "需人工", "争议", "待判定", "人工改"],
}

QUEUE_DISPLAY_NAMES = {
    "processed": "已处理",
    "pending_material": "待补材料",
    "manual_review": "人工改判",
    "all": "全部异常",
}


def categorize_status(status: str) -> str:
    status_lower = status.lower().strip()
    for category, keywords in STATUS_CATEGORIES.items():
        for kw in keywords:
            if kw.lower() in status_lower or status_lower == kw.lower():
                return category
    if not status or status == "待处理":
        return "pending_material"
    return "manual_review"


@dataclass
class FilterConditions:
    source: Optional[str] = None
    status_category: Optional[str] = None
    has_conflict: Optional[bool] = None
    risk_level: Optional[str] = None
    label: Optional[str] = None
    keyword: Optional[str] = None


@dataclass
class Statistics:
    total_count: int = 0
    processed_count: int = 0
    pending_material_count: int = 0
    manual_review_count: int = 0
    conflict_count: int = 0
    source_distribution: Dict[str, int] = field(default_factory=dict)
    label_distribution: Dict[str, int] = field(default_factory=dict)
    risk_distribution: Dict[str, int] = field(default_factory=dict)


@dataclass
class ReviewResult:
    records: List[SampleRecord]
    statistics: Statistics
    queues: Dict[str, List[SampleRecord]]
    filter_conditions: FilterConditions
    field_mapping: Dict[str, str]
    unmapped_columns: List[str]
    ambiguous_fields: List[Any]


def calculate_statistics(records: List[SampleRecord]) -> Statistics:
    stats = Statistics(total_count=len(records))
    source_dist = {}
    label_dist = {}
    risk_dist = {}

    for r in records:
        category = categorize_status(r.status)
        if category == "processed":
            stats.processed_count += 1
        elif category == "pending_material":
            stats.pending_material_count += 1
        elif category == "manual_review":
            stats.manual_review_count += 1

        if r.conflict_flag:
            stats.conflict_count += 1

        if r.source:
            source_dist[r.source] = source_dist.get(r.source, 0) + 1
        if r.new_label or r.label:
            lbl = r.new_label or r.label
            label_dist[lbl] = label_dist.get(lbl, 0) + 1
        if r.risk_level:
            risk_dist[r.risk_level] = risk_dist.get(r.risk_level, 0) + 1

    stats.source_distribution = source_dist
    stats.label_distribution = label_dist
    stats.risk_distribution = risk_dist
    return stats


def filter_records(
    records: List[SampleRecord], conditions: FilterConditions
) -> List[SampleRecord]:
    result = []
    for r in records:
        if conditions.source and r.source != conditions.source:
            continue
        if conditions.status_category:
            cat = categorize_status(r.status)
            if cat != conditions.status_category:
                continue
        if conditions.has_conflict is not None and r.conflict_flag != conditions.has_conflict:
            continue
        if conditions.risk_level and r.risk_level != conditions.risk_level:
            continue
        if conditions.label:
            lbl = r.new_label or r.label
            if lbl != conditions.label:
                continue
        if conditions.keyword:
            kw = conditions.keyword.lower()
            search_text = " ".join([
                r.sample_id, r.content, r.reason, r.remark,
                r.original_label, r.new_label, r.label
            ]).lower()
            if kw not in search_text:
                continue
        result.append(r)
    return result


def build_queues(records: List[SampleRecord]) -> Dict[str, List[SampleRecord]]:
    queues = {
        "processed": [],
        "pending_material": [],
        "manual_review": [],
        "all": [],
    }
    for r in records:
        if r.conflict_flag or categorize_status(r.status) != "processed":
            queues["all"].append(r)
        category = categorize_status(r.status)
        if category in queues:
            queues[category].append(r)
    return queues


def generate_review_result(
    records: List[SampleRecord],
    mapping_result,
    conditions: Optional[FilterConditions] = None,
) -> ReviewResult:
    if conditions is None:
        conditions = FilterConditions()

    filtered = filter_records(records, conditions)
    stats = calculate_statistics(filtered)
    queues = build_queues(filtered)

    return ReviewResult(
        records=filtered,
        statistics=stats,
        queues=queues,
        filter_conditions=conditions,
        field_mapping=mapping_result.mapping,
        unmapped_columns=mapping_result.unmapped_columns,
        ambiguous_fields=mapping_result.ambiguous_fields,
    )


def get_conflict_detail(record: SampleRecord) -> Dict[str, Any]:
    return {
        "sample_id": record.sample_id,
        "source": record.source,
        "original_label": record.original_label,
        "new_label": record.new_label,
        "status": record.status,
        "conflict_flag": record.conflict_flag,
        "conflict_detail": record.conflict_detail,
        "reason": record.reason,
        "evidence_ref": record.evidence_ref,
        "raw_fields": record.raw_fields,
        "field_mapping": record.field_mapping,
        "content": record.content,
        "risk_level": record.risk_level,
    }


def explain_label_change(
    old_record: SampleRecord, new_records: List[SampleRecord]
) -> Dict[str, Any]:
    matched = None
    for r in new_records:
        if r.sample_id == old_record.sample_id:
            matched = r
            break

    if not matched:
        return {
            "found": False,
            "message": f"未找到样本ID为 {old_record.sample_id} 的新记录",
        }

    changes = []
    if old_record.original_label != matched.new_label and matched.new_label:
        changes.append({
            "field": "标签",
            "old": old_record.original_label or old_record.label,
            "new": matched.new_label,
            "reason": matched.reason or "未提供理由",
        })

    if old_record.status != matched.status:
        changes.append({
            "field": "处理状态",
            "old": old_record.status,
            "new": matched.status,
        })

    if old_record.risk_level != matched.risk_level and matched.risk_level:
        changes.append({
            "field": "风险等级",
            "old": old_record.risk_level,
            "new": matched.risk_level,
        })

    return {
        "found": True,
        "sample_id": matched.sample_id,
        "source": matched.source,
        "changes": changes,
        "has_conflict": matched.conflict_flag,
        "conflict_detail": matched.conflict_detail,
        "evidence_ref": matched.evidence_ref,
        "raw_original_fields": old_record.raw_fields,
        "raw_new_fields": matched.raw_fields,
    }
