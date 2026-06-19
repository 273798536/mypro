from typing import Any, Dict, List, Optional
from .models import (
    SnapshotRecord,
    ProcessingStatus,
    Decision,
    DecisionType,
    GrayConfig,
)
from .evidence_manager import EvidenceManager
from .bad_data_detector import BadDataDetector


class DecisionEngine:
    def __init__(
        self,
        evidence_manager: Optional[EvidenceManager] = None,
        bad_data_detector: Optional[BadDataDetector] = None,
    ):
        self.evidence_manager = evidence_manager or EvidenceManager()
        self.bad_data_detector = bad_data_detector or BadDataDetector()
        self.decision_history: List[Decision] = []

    def make_decision(self, record: SnapshotRecord) -> Decision:
        issues = self._assess_record(record)

        if issues["is_duplicate"]:
            decision = self._decide_duplicate(record)
        elif issues["has_bad_data"]:
            decision = self._decide_bad_data(record, issues)
        elif not issues["evidence_complete"]:
            decision = self._decide_insufficient_evidence(record, issues)
        elif issues["is_masked"]:
            decision = self._decide_masked_sample(record)
        elif record.is_approved():
            decision = self._decide_approved(record)
        else:
            decision = self._decide_rejected(record)

        self.decision_history.append(decision)
        return decision

    def make_batch_decisions(
        self, records: List[SnapshotRecord]
    ) -> List[Decision]:
        return [self.make_decision(record) for record in records]

    def get_summary_for_xu(self) -> Dict[str, Any]:
        supplement = [d for d in self.decision_history if d.decision_type == DecisionType.SUPPLEMENT]
        release = [d for d in self.decision_history if d.decision_type == DecisionType.RELEASE]
        hold = [d for d in self.decision_history if d.decision_type == DecisionType.HOLD]
        reject = [d for d in self.decision_history if d.decision_type == DecisionType.REJECT]

        return {
            "total_records": len(self.decision_history),
            "need_supplement": {
                "count": len(supplement),
                "records": [self._format_for_xu(d) for d in supplement],
            },
            "can_release": {
                "count": len(release),
                "records": [self._format_for_xu(d) for d in release],
            },
            "on_hold": {
                "count": len(hold),
                "records": [self._format_for_xu(d) for d in hold],
            },
            "rejected": {
                "count": len(reject),
                "records": [self._format_for_xu(d) for d in reject],
            },
            "action_items": self._generate_action_items(supplement),
        }

    def print_summary_for_xu(self) -> str:
        summary = self.get_summary_for_xu()

        output = []
        output.append("=" * 70)
        output.append("【向量索引版本快照 - 处理结论汇总】")
        output.append("=" * 70)
        output.append(f"总记录数: {summary['total_records']}")
        output.append("")

        output.append(f"📌 需要补充材料: {summary['need_supplement']['count']} 条")
        if summary["need_supplement"]["records"]:
            for item in summary["need_supplement"]["records"]:
                output.append(f"  • 记录 {item['record_id']}: {item['reason']}")
                output.append(f"    行动: {', '.join(item['actions'])}")
                output.append(f"    优先级: {item['priority']}")
                output.append("")

        output.append(f"✅ 可以放行: {summary['can_release']['count']} 条")
        if summary["can_release"]["records"]:
            for item in summary["can_release"]["records"]:
                output.append(f"  • 记录 {item['record_id']}: {item['reason']}")
                output.append("")

        output.append(f"⏸️  暂缓处理: {summary['on_hold']['count']} 条")
        if summary["on_hold"]["records"]:
            for item in summary["on_hold"]["records"]:
                output.append(f"  • 记录 {item['record_id']}: {item['reason']}")
                output.append("")

        output.append(f"❌ 不予通过: {summary['rejected']['count']} 条")
        if summary["rejected"]["records"]:
            for item in summary["rejected"]["records"]:
                output.append(f"  • 记录 {item['record_id']}: {item['reason']}")
                output.append("")

        if summary["action_items"]:
            output.append("-" * 70)
            output.append("【待办事项】")
            for idx, action in enumerate(summary["action_items"], 1):
                output.append(f"{idx}. {action}")
            output.append("")

        return "\n".join(output)

    def _assess_record(self, record: SnapshotRecord) -> Dict[str, Any]:
        evidence_check = self.evidence_manager.check_evidence_completeness(record)

        score_valid = isinstance(record.score, (int, float)) and isinstance(record.threshold, (int, float))

        return {
            "is_duplicate": record.processing_status == ProcessingStatus.DUPLICATE_RUN_ID,
            "has_bad_data": record.processing_status == ProcessingStatus.BAD_DATA,
            "evidence_complete": evidence_check["is_complete"],
            "evidence_issues": evidence_check["issues"],
            "is_masked": record.small_sample_masked,
            "score_above_threshold": score_valid and record.score >= record.threshold,
            "score_gap": record.score - record.threshold if score_valid else 0,
        }

    def _decide_duplicate(self, record: SnapshotRecord) -> Decision:
        return Decision(
            record_id=record.record_id,
            decision_type=DecisionType.REJECT,
            reason=f"run_id '{record.run_id}' 重复，处理结果不作为正常通过",
            required_actions=["删除重复记录或确认哪条是正确的"],
            priority="high",
            evidence_refs=[err for err in record.processing_errors if "run_id重复" in err],
        )

    def _decide_bad_data(
        self, record: SnapshotRecord, issues: Dict[str, Any]
    ) -> Decision:
        bad_data_issues = [err for err in record.processing_errors if "坏数据" in err]
        source_locations = []
        for err in bad_data_issues:
            if "行" in err or "位置" in err:
                source_locations.append(err)

        actions = ["修复坏数据后重新提交"]
        if source_locations:
            actions.append(f"检查以下位置: {', '.join(source_locations)}")

        priority = "high" if record.gray_config.source_line else "medium"

        return Decision(
            record_id=record.record_id,
            decision_type=DecisionType.SUPPLEMENT,
            reason=f"检测到坏数据，共 {len(bad_data_issues)} 个问题",
            required_actions=actions,
            priority=priority,
            evidence_refs=bad_data_issues,
        )

    def _decide_insufficient_evidence(
        self, record: SnapshotRecord, issues: Dict[str, Any]
    ) -> Decision:
        evidence_issues = issues["evidence_issues"]

        actions = []
        for issue in evidence_issues:
            if "缺少特征证据" in issue:
                feat = issue.replace("缺少特征证据: ", "")
                actions.append(f"补充特征 '{feat}' 的样本证据")
            elif "没有关联任何样本证据" in issue:
                actions.append("为该记录关联至少1条样本证据")
            elif "待补充证据" in issue:
                actions.append("补充排班同事提交的样本证据")

        return Decision(
            record_id=record.record_id,
            decision_type=DecisionType.SUPPLEMENT,
            reason=f"证据不完整，共 {len(evidence_issues)} 个问题",
            required_actions=actions,
            priority="medium",
            evidence_refs=evidence_issues,
        )

    def _decide_masked_sample(self, record: SnapshotRecord) -> Decision:
        reason_parts = []
        reason_parts.append(f"小样本被均值掩盖")
        if record.small_sample_mask_reason:
            reason_parts.append(f"原因: {record.small_sample_mask_reason}")
        reason_parts.append(f"原始平均分: {record.raw_mean_score}, 掩盖后分数: {record.score}")

        actions = []
        if record.raw_mean_score is not None and record.raw_mean_score < record.threshold:
            actions.append("小样本原始平均分低于阈值，建议补充更多样本")
        else:
            actions.append("检查均值掩盖配置是否合理，考虑调整小样本量阈值")

        return Decision(
            record_id=record.record_id,
            decision_type=DecisionType.HOLD,
            reason=" | ".join(reason_parts),
            required_actions=actions,
            priority="medium",
            evidence_refs=[f"掩盖原因: {record.small_sample_mask_reason}"] if record.small_sample_mask_reason else [],
        )

    def _decide_approved(self, record: SnapshotRecord) -> Decision:
        score_gap = record.score - record.threshold
        confidence = "高" if score_gap > 0.1 else "中" if score_gap > 0.05 else "低"

        reason = f"分数 {record.score:.4f} ≥ 阈值 {record.threshold:.4f}，超过阈值 {score_gap:.4f}（置信度{confidence}）"

        actions = []
        if confidence == "低":
            actions.append("建议人工复核，分数刚过线")
        else:
            actions.append("无特殊动作，可直接放行")

        evidence_refs = []
        if record.evidence_chain:
            evidence_refs = [f"样本证据 {e.evidence_id}: {e.sample_id}" for e in record.evidence_chain[:3]]

        return Decision(
            record_id=record.record_id,
            decision_type=DecisionType.RELEASE,
            reason=reason,
            required_actions=actions,
            priority="low",
            evidence_refs=evidence_refs,
        )

    def _decide_rejected(self, record: SnapshotRecord) -> Decision:
        score_gap = record.threshold - record.score
        reason = f"分数 {record.score:.4f} < 阈值 {record.threshold:.4f}，差 {score_gap:.4f} 过线"

        actions = []
        if record.evidence_chain:
            actions.append("检查样本证据是否完整，考虑补充更多召回样本")
        else:
            actions.append("补充样本证据后重新评估")

        if score_gap < 0.05:
            actions.append("分数接近阈值，可考虑微调阈值或补充特征")

        return Decision(
            record_id=record.record_id,
            decision_type=DecisionType.REJECT,
            reason=reason,
            required_actions=actions,
            priority="medium",
            evidence_refs=[],
        )

    def _format_for_xu(self, decision: Decision) -> Dict[str, Any]:
        return {
            "record_id": decision.record_id,
            "reason": decision.reason,
            "actions": decision.required_actions,
            "priority": decision.priority,
            "decided_at": decision.decided_at.isoformat(),
        }

    def _generate_action_items(self, supplement_decisions: List[Decision]) -> List[str]:
        action_items = []

        missing_features = set()
        bad_data_count = 0
        evidence_missing_count = 0

        for d in supplement_decisions:
            for action in d.required_actions:
                if "补充特征" in action:
                    feat = action.split("'")[1] if "'" in action else "未知特征"
                    missing_features.add(feat)
                if "坏数据" in d.reason:
                    bad_data_count += 1
                if "证据" in d.reason:
                    evidence_missing_count += 1

        if missing_features:
            action_items.append(f"补充以下特征的样本证据: {', '.join(sorted(missing_features))}")

        if bad_data_count > 0:
            action_items.append(f"修复 {bad_data_count} 条记录中的坏数据问题")

        if evidence_missing_count > 0:
            action_items.append(f"为 {evidence_missing_count} 条记录补充样本证据")

        return action_items

    def get_decisions_by_type(self, decision_type: DecisionType) -> List[Decision]:
        return [d for d in self.decision_history if d.decision_type == decision_type]

    def clear(self) -> None:
        self.decision_history.clear()
