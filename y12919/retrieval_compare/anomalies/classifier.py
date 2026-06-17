from typing import List, Dict, Any
from ..models.schemas import (
    AnomalyRecord, AnomalyType, NextAction, RecordStatus
)
from ..statistics.distribution import get_action_guidance


TYPE_LABELS = {
    AnomalyType.SAFETY_RULE_MISSING.value: "安全规则漏配",
    AnomalyType.SEGMENT_MISMATCH.value: "切分不匹配",
    AnomalyType.MODEL_LOG_ONLY.value: "只有日志无清单",
    AnomalyType.SEGMENT_ONLY.value: "只有清单无日志",
    AnomalyType.SCORE_DEVIATION.value: "分数异常",
    AnomalyType.HUMAN_REVIEW_REQUIRED.value: "需人工审核",
}

ACTION_LABELS = {
    NextAction.SUPPLEMENT_MATERIAL.value: "补材料",
    NextAction.ADJUST_CRITERION.value: "改口径",
    NextAction.CONFIRM_RULE.value: "确认规则",
    NextAction.AWAIT_REVIEW.value: "待审核",
}

STATUS_LABELS = {
    RecordStatus.PENDING.value: "待处理",
    RecordStatus.CONFIRMED.value: "已确认",
    RecordStatus.RESOLVED.value: "已解决",
    RecordStatus.DISPUTED.value: "有争议",
}


def _collect_all_remarks(anom: AnomalyRecord) -> List[Dict[str, Any]]:
    all_remarks = []
    for src, tag in [
        (anom.human_remarks, "异常记录"),
        (anom.model_log.human_remarks if anom.model_log else [], "模型日志"),
        (anom.segment.human_remarks if anom.segment else [], "切分清单"),
    ]:
        for r in _preserve_remarks(src):
            r["source"] = tag
            all_remarks.append(r)
    all_remarks.sort(key=lambda x: x["created_at"])
    return all_remarks


def classify_anomalies(anomalies: List[AnomalyRecord]) -> Dict[str, List[Dict[str, Any]]]:
    grouped: Dict[str, List[Dict[str, Any]]] = {
        action.value: [] for action in NextAction
    }
    for anom in anomalies:
        guidance = get_action_guidance(anom.anomaly_type.value)
        model_log_hit_rules = anom.model_log.safety_rule_hit if anom.model_log else []
        segment_cfg_rules = anom.segment.safety_rules if anom.segment else []
        segment_content = anom.segment.content if anom.segment else ""
        segment_category = anom.segment.category if anom.segment else ""
        item = {
            "record_id": anom.record_id,
            "type": anom.anomaly_type.value,
            "type_label": TYPE_LABELS.get(anom.anomaly_type.value, anom.anomaly_type.value),
            "description": anom.description,
            "status": anom.status.value,
            "status_label": STATUS_LABELS.get(anom.status.value, anom.status.value),
            "next_action": anom.next_action.value,
            "next_action_label": ACTION_LABELS.get(anom.next_action.value, anom.next_action.value),
            "guidance": guidance,
            "query": anom.model_log.query if anom.model_log else "",
            "segment_id": (
                anom.model_log.segment_id if anom.model_log
                else (anom.segment.segment_id if anom.segment else "")
            ),
            "segment_category": segment_category,
            "segment_content": segment_content,
            "model_log_hit_rules": model_log_hit_rules,
            "segment_cfg_rules": segment_cfg_rules,
            "human_remarks": _collect_all_remarks(anom),
            "feedback_history": _preserve_feedback(anom.feedback_history),
            "detected_at": anom.detected_at,
            "last_updated_at": anom.last_updated_at,
        }
        grouped.setdefault(anom.next_action.value, []).append(item)
    return grouped


def _preserve_remarks(remarks: List) -> List[Dict[str, Any]]:
    result = []
    for r in remarks:
        if hasattr(r, "to_dict"):
            d = r.to_dict()
        else:
            d = dict(r) if isinstance(r, dict) else {}
        content = d.get("content", "")
        result.append({
            "remark_id": d.get("remark_id", ""),
            "content": content,
            "reviewer": d.get("reviewer", ""),
            "created_at": d.get("created_at", ""),
            "modified_at": d.get("modified_at"),
        })
    return result


def _preserve_feedback(feedback_list: List) -> List[Dict[str, Any]]:
    result = []
    for fb in feedback_list:
        if hasattr(fb, "to_dict"):
            d = fb.to_dict()
        else:
            d = dict(fb) if isinstance(fb, dict) else {}
        content = d.get("content", "")
        result.append({
            "feedback_id": d.get("feedback_id", ""),
            "record_id": d.get("record_id", ""),
            "feedback_type": d.get("feedback_type", ""),
            "content": content,
            "reviewer": d.get("reviewer", ""),
            "created_at": d.get("created_at", ""),
            "corrected_value": d.get("corrected_value"),
        })
    return result


def print_anomaly_summary(anomalies: List[AnomalyRecord]) -> None:
    grouped = classify_anomalies(anomalies)
    print("=" * 70)
    print("  检索召回对比 —— 异常分类汇总")
    print("=" * 70)
    for action, items in grouped.items():
        if not items:
            continue
        label = ACTION_LABELS.get(action, action)
        print(f"\n【下一步: {label}】 共 {len(items)} 条")
        print("-" * 50)
        for item in items:
            print(f"  [{item['type_label']}] {item['record_id']}")
            print(f"    描述: {item['description']}")
            if item["query"]:
                print(f"    Query: {item['query']}")
            if item["segment_id"]:
                print(f"    Segment: {item['segment_id']}")
            if item["guidance"].get("immediate"):
                print(f"    立即处理: {item['guidance']['immediate']}")
            if item["human_remarks"]:
                print(f"    人工备注 ({len(item['human_remarks'])} 条，原话保留):")
                for rm in item["human_remarks"]:
                    src = rm.get("source", "")
                    tag = f"[{src}] " if src else ""
                    print(f"      - {tag}[{rm['reviewer']}@{rm['created_at'][:16]}] {rm['content']}")
            if item["feedback_history"]:
                last = item["feedback_history"][-1]
                print(f"    最新反馈: [{last['feedback_type']}] {last['content']}")
