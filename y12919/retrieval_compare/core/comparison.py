import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from ..models.schemas import (
    ModelLog, SegmentItem, SafetyRule, AnomalyRecord, ComparisonResult,
    AnomalyType, NextAction, RecordStatus, HumanRemark, HumanFeedback
)


def _now_str() -> str:
    return datetime.now().isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def load_model_logs(path: str) -> List[ModelLog]:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    logs = []
    for item in raw:
        remarks = [HumanRemark(**r) for r in item.get("human_remarks", [])]
        logs.append(ModelLog(
            log_id=item["log_id"],
            query=item["query"],
            segment_id=item["segment_id"],
            retrieved_segments=item.get("retrieved_segments", []),
            score=item["score"],
            safety_rule_hit=item.get("safety_rule_hit", []),
            timestamp=item.get("timestamp", ""),
            human_remarks=remarks,
            extra=item.get("extra", {}),
        ))
    return logs


def load_segments(path: str) -> List[SegmentItem]:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    segments = []
    for item in raw:
        remarks = [HumanRemark(**r) for r in item.get("human_remarks", [])]
        segments.append(SegmentItem(
            segment_id=item["segment_id"],
            content=item["content"],
            category=item["category"],
            safety_rules=item.get("safety_rules", []),
            tags=item.get("tags", []),
            human_remarks=remarks,
            extra=item.get("extra", {}),
        ))
    return segments


def load_safety_rules(path: str) -> List[SafetyRule]:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    rules = []
    for item in raw:
        remarks = [HumanRemark(**r) for r in item.get("human_remarks", [])]
        rules.append(SafetyRule(
            rule_id=item["rule_id"],
            rule_name=item["rule_name"],
            description=item["description"],
            applicable_categories=item.get("applicable_categories", []),
            enabled=item.get("enabled", True),
            human_remarks=remarks,
        ))
    return rules


def load_feedback(path: str) -> List[HumanFeedback]:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return [HumanFeedback(**item) for item in raw]


def _detect_safety_rule_missing(
    log: ModelLog,
    segment: Optional[SegmentItem],
    safety_rules: List[SafetyRule],
) -> Optional[AnomalyRecord]:
    if segment is None:
        return None
    enabled_rule_ids = {r.rule_id for r in safety_rules if r.enabled}
    category_applicable = {
        r.rule_id for r in safety_rules
        if r.enabled and (not r.applicable_categories or segment.category in r.applicable_categories)
    }
    segment_rules = set(segment.safety_rules) & enabled_rule_ids
    log_hit = set(log.safety_rule_hit) & enabled_rule_ids

    missing_in_segment = category_applicable - segment_rules - log_hit
    missing_in_log = segment_rules - log_hit

    if missing_in_segment or missing_in_log:
        parts = []
        if missing_in_segment:
            parts.append(f"切分清单未配置规则: {', '.join(sorted(missing_in_segment))}")
        if missing_in_log:
            parts.append(f"模型日志未命中规则: {', '.join(sorted(missing_in_log))}")
        description = "；".join(parts)

        if missing_in_segment and not missing_in_log:
            next_action = NextAction.SUPPLEMENT_MATERIAL
        elif missing_in_log and not missing_in_segment:
            next_action = NextAction.ADJUST_CRITERION
        else:
            next_action = NextAction.CONFIRM_RULE

        return AnomalyRecord(
            record_id=_new_id("anom"),
            anomaly_type=AnomalyType.SAFETY_RULE_MISSING,
            model_log=log,
            segment=segment,
            description=description,
            next_action=next_action,
            status=RecordStatus.PENDING,
            human_remarks=[],
            feedback_history=[],
            detected_at=_now_str(),
            last_updated_at=_now_str(),
        )
    return None


def _detect_segment_mismatch(log: ModelLog, segment: Optional[SegmentItem]) -> Optional[AnomalyRecord]:
    if segment is None:
        return None
    if log.segment_id and log.segment_id != segment.segment_id:
        return AnomalyRecord(
            record_id=_new_id("anom"),
            anomaly_type=AnomalyType.SEGMENT_MISMATCH,
            model_log=log,
            segment=segment,
            description=f"模型日志命中的 segment_id={log.segment_id} 与清单中 {segment.segment_id} 不一致",
            next_action=NextAction.ADJUST_CRITERION,
            status=RecordStatus.PENDING,
            detected_at=_now_str(),
            last_updated_at=_now_str(),
        )
    return None


def _detect_log_only(log: ModelLog, segments_map: Dict[str, SegmentItem]) -> Optional[AnomalyRecord]:
    if log.segment_id and log.segment_id not in segments_map:
        return AnomalyRecord(
            record_id=_new_id("anom"),
            anomaly_type=AnomalyType.MODEL_LOG_ONLY,
            model_log=log,
            segment=None,
            description=f"模型日志引用 segment_id={log.segment_id}，但切分清单中不存在该条目",
            next_action=NextAction.SUPPLEMENT_MATERIAL,
            status=RecordStatus.PENDING,
            detected_at=_now_str(),
            last_updated_at=_now_str(),
        )
    return None


def _detect_segment_only(
    segment: SegmentItem, logs_by_segment: Dict[str, List[ModelLog]]
) -> Optional[AnomalyRecord]:
    if segment.segment_id not in logs_by_segment or not logs_by_segment[segment.segment_id]:
        return AnomalyRecord(
            record_id=_new_id("anom"),
            anomaly_type=AnomalyType.SEGMENT_ONLY,
            model_log=None,
            segment=segment,
            description=f"切分清单存在 segment_id={segment.segment_id}，但没有任何模型日志引用",
            next_action=NextAction.ADJUST_CRITERION,
            status=RecordStatus.PENDING,
            detected_at=_now_str(),
            last_updated_at=_now_str(),
        )
    return None


def run_comparison(
    model_logs: List[ModelLog],
    segments: List[SegmentItem],
    safety_rules: List[SafetyRule],
    existing_feedback: Optional[List[HumanFeedback]] = None,
) -> ComparisonResult:
    segments_map = {s.segment_id: s for s in segments}
    logs_by_segment: Dict[str, List[ModelLog]] = {}
    for log in model_logs:
        logs_by_segment.setdefault(log.segment_id, []).append(log)

    anomalies: List[AnomalyRecord] = []
    matched_count = 0

    for log in model_logs:
        segment = segments_map.get(log.segment_id)
        if segment is not None:
            matched_count += 1

        anom = _detect_log_only(log, segments_map)
        if anom:
            anomalies.append(anom)
            continue

        if segment:
            anom = _detect_segment_mismatch(log, segment)
            if anom:
                anomalies.append(anom)

            anom = _detect_safety_rule_missing(log, segment, safety_rules)
            if anom:
                anomalies.append(anom)

    for segment in segments:
        anom = _detect_segment_only(segment, logs_by_segment)
        if anom:
            anomalies.append(anom)

    if existing_feedback:
        _apply_feedback_to_anomalies(anomalies, existing_feedback)

    return ComparisonResult(
        total_model_logs=len(model_logs),
        total_segments=len(segments),
        matched_records=matched_count,
        anomalies=anomalies,
        statistics={},
        generated_at=_now_str(),
    )


def _apply_feedback_to_anomalies(
    anomalies: List[AnomalyRecord], feedback_list: List[HumanFeedback]
) -> None:
    feedback_by_record: Dict[str, List[HumanFeedback]] = {}
    for fb in feedback_list:
        feedback_by_record.setdefault(fb.record_id, []).append(fb)

    for anom in anomalies:
        relevant = feedback_by_record.get(anom.record_id, [])
        if relevant:
            anom.feedback_history = sorted(relevant, key=lambda x: x.created_at)
            latest = relevant[-1]
            anom.last_updated_at = latest.created_at
            if latest.feedback_type == "confirm":
                anom.status = RecordStatus.CONFIRMED
            elif latest.feedback_type == "resolve":
                anom.status = RecordStatus.RESOLVED
            elif latest.feedback_type == "dispute":
                anom.status = RecordStatus.DISPUTED


def apply_feedback(
    result: ComparisonResult,
    feedback: HumanFeedback,
) -> ComparisonResult:
    _apply_feedback_to_anomalies(result.anomalies, [feedback])
    result.generated_at = _now_str()
    return result
