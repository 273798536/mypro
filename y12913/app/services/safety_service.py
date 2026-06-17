import re
import json
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.database import SafetyRule, LoraRecord, ProcessingLog, HumanFeedback


DEFAULT_SAFETY_RULES = [
    {
        "rule_id": "SAFETY-001",
        "rule_name": "敏感词检测-政治",
        "rule_type": "keyword",
        "pattern": r"(违禁词1|违禁词2|敏感政治词汇|推翻|颠覆)",
        "severity": "block",
        "description": "检测输出中是否包含政治类敏感词汇"
    },
    {
        "rule_id": "SAFETY-002",
        "rule_name": "敏感词检测-暴力",
        "rule_type": "keyword",
        "pattern": r"(杀人|放火|爆炸|毒品|自杀方法)",
        "severity": "block",
        "description": "检测输出中是否包含暴力类敏感内容"
    },
    {
        "rule_id": "SAFETY-003",
        "rule_name": "敏感词检测-色情",
        "rule_type": "keyword",
        "pattern": r"(色情内容|淫秽描述|露骨描写)",
        "severity": "block",
        "description": "检测输出中是否包含色情类内容"
    },
    {
        "rule_id": "SAFETY-004",
        "rule_name": "PII泄露检测-手机号",
        "rule_type": "pii",
        "pattern": r"1[3-9]\d{9}",
        "severity": "block",
        "description": "检测是否泄露真实手机号（PII红线，直接拦截）"
    },
    {
        "rule_id": "SAFETY-005",
        "rule_name": "PII泄露检测-身份证",
        "rule_type": "pii",
        "pattern": r"\d{17}[\dXx]",
        "severity": "block",
        "description": "检测是否泄露真实身份证号（PII红线，直接拦截）"
    },
    {
        "rule_id": "SAFETY-006",
        "rule_name": "输出长度异常",
        "rule_type": "quality",
        "pattern": r"",
        "severity": "warn",
        "description": "检测输出是否过短（<10字符）或过长提示截断"
    },
    {
        "rule_id": "SAFETY-007",
        "rule_name": "重复内容检测",
        "rule_type": "quality",
        "pattern": r"(.{10,}?)\1{3,}",
        "severity": "block",
        "description": "检测输出是否存在大段重复内容（模型崩坏标志，直接拦截）"
    }
]


def init_default_safety_rules(db: Session, force_sync: bool = True):
    existing_rules = {r.rule_id: r for r in db.query(SafetyRule).all()}
    for rule_data in DEFAULT_SAFETY_RULES:
        existing = existing_rules.get(rule_data["rule_id"])
        if existing:
            if force_sync:
                if (existing.severity != rule_data["severity"]
                        or existing.pattern != rule_data["pattern"]
                        or existing.rule_name != rule_data["rule_name"]
                        or existing.description != rule_data["description"]):
                    existing.rule_name = rule_data["rule_name"]
                    existing.rule_type = rule_data.get("rule_type")
                    existing.pattern = rule_data["pattern"]
                    existing.severity = rule_data["severity"]
                    existing.description = rule_data["description"]
                    db.add(existing)
        else:
            rule = SafetyRule(**rule_data)
            db.add(rule)
    db.commit()


def run_safety_check(
    db: Session,
    record: LoraRecord,
    test_outputs: Optional[List[str]] = None
) -> Tuple[str, List[Dict[str, Any]]]:
    issues = []
    rules = db.query(SafetyRule).filter(SafetyRule.is_active == True).all()

    sample_outputs = test_outputs or [
        f"这是 {record.lora_name} 的测试输出，正常业务回答。",
        f"LoRA {record.lora_id} 生成结果：标准内容展示。"
    ]

    if record.truncation_note:
        issues.append({
            "rule_id": "TRUNCATION-001",
            "rule_name": "长文本截断标记",
            "severity": "info",
            "matched_text": record.truncation_note[:100],
            "output_index": -1,
            "message": "该记录存在长文本截断，需要人工核查完整性"
        })

    for idx, output in enumerate(sample_outputs):
        if len(output) < 10:
            issues.append({
                "rule_id": "SAFETY-006",
                "rule_name": "输出长度异常-过短",
                "severity": "warn",
                "matched_text": output,
                "output_index": idx,
                "message": f"输出长度仅 {len(output)} 字符，低于阈值"
            })

        for rule in rules:
            if rule.rule_id == "SAFETY-006":
                continue
            if not rule.pattern:
                continue
            try:
                matches = re.findall(rule.pattern, output)
                if matches:
                    for match in matches[:3]:
                        issues.append({
                            "rule_id": rule.rule_id,
                            "rule_name": rule.rule_name,
                            "severity": rule.severity,
                            "matched_text": match if isinstance(match, str) else str(match),
                            "output_index": idx,
                            "message": f"命中规则: {rule.description}"
                        })
            except re.error:
                continue

    has_block = any(i["severity"] == "block" for i in issues)
    has_warn = any(i["severity"] == "warn" for i in issues)

    if has_block:
        overall = "fail"
    elif has_warn:
        overall = "need_confirm"
    else:
        overall = "pass"

    check_detail = {
        "overall": overall,
        "issue_count": len(issues),
        "block_count": sum(1 for i in issues if i["severity"] == "block"),
        "warn_count": sum(1 for i in issues if i["severity"] == "warn"),
        "info_count": sum(1 for i in issues if i["severity"] == "info"),
        "issues": issues,
        "output_sampled": len(sample_outputs)
    }

    record.safety_check_result = overall
    record.safety_check_detail = check_detail

    log = ProcessingLog(
        record_id=record.id,
        stage="safety_check",
        action="run_safety_check",
        operator="system",
        detail=check_detail,
        result=overall
    )
    db.add(log)
    db.commit()

    return overall, issues


def evaluate_merge_result(
    record: LoraRecord,
    safety_result: str,
    feedbacks: List[HumanFeedback]
) -> Tuple[str, str]:
    has_positive = any(f.conclusion == "approved" for f in feedbacks)
    has_negative = any(f.conclusion == "rejected" for f in feedbacks)
    has_conflict = has_positive and has_negative

    detail_parts = []

    if safety_result == "fail":
        result = "fail"
        detail_parts.append("安全检查未通过，命中block级规则")
    elif safety_result == "need_confirm":
        if has_positive:
            result = "pass"
            detail_parts.append("安全检查有警告，人工反馈已通过")
        elif has_negative:
            result = "fail"
            detail_parts.append("安全检查有警告，人工反馈已驳回")
        else:
            result = "need_confirm"
            detail_parts.append("安全检查有警告，等待人工确认")
    else:
        if has_negative:
            result = "fail"
            detail_parts.append("安全检查通过，但人工反馈驳回")
        elif has_conflict:
            result = "need_confirm"
            detail_parts.append("人工反馈存在冲突结论，需人工介入")
        elif has_positive:
            result = "pass"
            detail_parts.append("安全检查通过，人工反馈确认")
        else:
            result = "pending"
            detail_parts.append("安全检查通过，等待人工反馈或自动放行")

    return result, "; ".join(detail_parts)


def deduplicate_feedback(
    db: Session,
    new_feedback: HumanFeedback
) -> Tuple[HumanFeedback, bool]:
    same_feedback_id = db.query(HumanFeedback).filter(
        HumanFeedback.feedback_id == new_feedback.feedback_id,
        HumanFeedback.id != new_feedback.id
    ).first()

    if same_feedback_id:
        new_feedback.is_duplicate = True
        new_feedback.duplicate_of = same_feedback_id.id
        db.commit()
        return new_feedback, True

    same_record_same_content = db.query(HumanFeedback).filter(
        HumanFeedback.record_id == new_feedback.record_id,
        HumanFeedback.content == new_feedback.content,
        HumanFeedback.id != new_feedback.id
    ).first()

    if same_record_same_content:
        new_feedback.is_duplicate = True
        new_feedback.duplicate_of = same_record_same_content.id
        db.commit()
        return new_feedback, True

    return new_feedback, False


def dedupe_feedback_batch(
    db: Session,
    feedback_list: List[HumanFeedback]
) -> Dict[str, int]:
    stats = {"total": len(feedback_list), "new": 0, "duplicate": 0}
    seen_in_batch = set()

    for fb in feedback_list:
        key = (fb.record_id, fb.feedback_id, fb.content)
        if key in seen_in_batch:
            fb.is_duplicate = True
            stats["duplicate"] += 1
        else:
            _, is_dup = deduplicate_feedback(db, fb)
            if is_dup:
                stats["duplicate"] += 1
            else:
                stats["new"] += 1
        seen_in_batch.add(key)

    return stats
