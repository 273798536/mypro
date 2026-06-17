from collections import Counter, defaultdict
from typing import Dict, Any, List
from ..models.schemas import (
    ComparisonResult, AnomalyType, NextAction, RecordStatus
)


def compute_statistics(result: ComparisonResult) -> Dict[str, Any]:
    anomalies = result.anomalies

    by_type = Counter(a.anomaly_type.value for a in anomalies)
    by_next_action = Counter(a.next_action.value for a in anomalies)
    by_status = Counter(a.status.value for a in anomalies)

    type_with_next_action: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for a in anomalies:
        type_with_next_action[a.anomaly_type.value][a.next_action.value] += 1

    category_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for a in anomalies:
        cat = "unknown"
        if a.segment:
            cat = a.segment.category
        elif a.model_log:
            cat = f"log:{a.model_log.segment_id or 'unknown'}"
        category_stats[cat][a.anomaly_type.value] += 1

    safety_rule_detail = Counter()
    for a in anomalies:
        if a.anomaly_type == AnomalyType.SAFETY_RULE_MISSING:
            if "未配置规则" in a.description:
                part = a.description.split("未配置规则:")
                if len(part) > 1:
                    rules_str = part[1].split("；")[0].split("模型日志")[0].strip()
                    for r in rules_str.split(", "):
                        safety_rule_detail[f"missing_rule:{r.strip()}"] += 1
            if "未命中规则" in a.description:
                part = a.description.split("未命中规则:")
                if len(part) > 1:
                    rules_str = part[1].strip()
                    for r in rules_str.split(", "):
                        safety_rule_detail[f"unhit_rule:{r.strip()}"] += 1

    stats = {
        "summary": {
            "total_anomalies": len(anomalies),
            "total_model_logs": result.total_model_logs,
            "total_segments": result.total_segments,
            "matched_records": result.matched_records,
            "match_rate": round(
                result.matched_records / max(result.total_model_logs, 1), 4
            ),
            "anomaly_rate": round(
                len(anomalies) / max(result.total_model_logs, 1), 4
            ),
        },
        "by_type": dict(by_type),
        "by_next_action": dict(by_next_action),
        "by_status": dict(by_status),
        "type_with_next_action": {
            k: dict(v) for k, v in type_with_next_action.items()
        },
        "by_category": {
            k: dict(v) for k, v in category_stats.items()
        },
        "safety_rule_detail": dict(safety_rule_detail),
        "next_action_breakdown": {
            NextAction.SUPPLEMENT_MATERIAL.value: {
                "label": "补材料",
                "description": "切分清单缺少必要条目或安全规则，请先补齐物料",
                "count": by_next_action.get(NextAction.SUPPLEMENT_MATERIAL.value, 0),
            },
            NextAction.ADJUST_CRITERION.value: {
                "label": "改口径",
                "description": "模型召回逻辑或判断口径需要调整",
                "count": by_next_action.get(NextAction.ADJUST_CRITERION.value, 0),
            },
            NextAction.CONFIRM_RULE.value: {
                "label": "确认规则",
                "description": "清单和日志同时缺失，需人工确认规则适用性",
                "count": by_next_action.get(NextAction.CONFIRM_RULE.value, 0),
            },
            NextAction.AWAIT_REVIEW.value: {
                "label": "待审核",
                "description": "尚未给出处理建议，等待安全审核员判断",
                "count": by_next_action.get(NextAction.AWAIT_REVIEW.value, 0),
            },
        },
    }

    result.statistics = stats
    return stats


def refresh_statistics(result: ComparisonResult) -> ComparisonResult:
    compute_statistics(result)
    return result


def get_action_guidance(anomaly_type: str) -> Dict[str, str]:
    guidance_map = {
        AnomalyType.SAFETY_RULE_MISSING.value: {
            "title": "安全规则漏配",
            "immediate": "核查该条目的安全规则配置，区分是清单漏配还是模型未命中。",
            "supplement": "如果切分清单没配规则，在清单中补充适用规则 ID。",
            "adjust": "如果模型日志没命中，检查模型召回逻辑或调整阈值。",
        },
        AnomalyType.SEGMENT_MISMATCH.value: {
            "title": "切分不匹配",
            "immediate": "对比模型日志 segment_id 与清单，确认谁是正确的。",
            "supplement": "如果清单条目缺失，新增正确的 segment。",
            "adjust": "如果模型召回错误，修正召回逻辑。",
        },
        AnomalyType.MODEL_LOG_ONLY.value: {
            "title": "只有日志无清单",
            "immediate": "补全切分清单中缺失的 segment_id 条目。",
            "supplement": "按模板补充 segment 内容、分类和安全规则。",
            "adjust": "",
        },
        AnomalyType.SEGMENT_ONLY.value: {
            "title": "只有清单无日志",
            "immediate": "确认该 segment 是否仍在召回范围内。",
            "supplement": "",
            "adjust": "如已下线，从清单移除；如应召回则调整模型。",
        },
        AnomalyType.SCORE_DEVIATION.value: {
            "title": "分数异常",
            "immediate": "检查分数阈值与评分口径是否一致。",
            "supplement": "",
            "adjust": "调整模型评分逻辑或阈值配置。",
        },
    }
    return guidance_map.get(anomaly_type, {
        "title": anomaly_type,
        "immediate": "请安全审核员人工判断处理方式。",
        "supplement": "",
        "adjust": "",
    })
