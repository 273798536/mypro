from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os

from .models import (
    Sample, SampleStatus, ManualAction, ManualCorrection,
    AuditHistory, DecisionRecord, DecisionReason, generate_id,
)


class ManualConfirmationManager:
    def __init__(self, history_dir: Optional[str] = None):
        self.corrections: List[ManualCorrection] = []
        self.history: List[AuditHistory] = []
        self.history_dir = history_dir
        if self.history_dir and not os.path.exists(self.history_dir):
            os.makedirs(self.history_dir, exist_ok=True)

    def _state_snapshot(self, obj: Any) -> Dict[str, Any]:
        if hasattr(obj, "to_dict"):
            return obj.to_dict()
        if isinstance(obj, dict):
            return dict(obj)
        return {"value": str(obj)}

    def record_audit(
        self,
        event_type: str,
        target_id: str,
        operator: str,
        before: Any,
        after: Any,
        comment: str,
    ) -> AuditHistory:
        event = AuditHistory(
            event_id=generate_id("aud"),
            event_type=event_type,
            target_id=target_id,
            operator=operator,
            before_state=self._state_snapshot(before),
            after_state=self._state_snapshot(after),
            comment=comment,
        )
        self.history.append(event)
        self._persist_if_needed()
        return event

    def apply_correction(
        self,
        sample: Sample,
        action: ManualAction,
        operator: str,
        comment: str,
        previous_decision: Optional[DecisionRecord] = None,
        new_status: Optional[SampleStatus] = None,
        new_decision: Optional[DecisionRecord] = None,
        scheduling_note: str = "",
    ) -> ManualCorrection:
        before_status = sample.status
        if new_status is None:
            if action == ManualAction.APPROVE:
                new_status = SampleStatus.MANUAL_CONFIRMED
            elif action == ManualAction.REJECT:
                new_status = SampleStatus.FAILED
            elif action == ManualAction.REVISE_DATA:
                new_status = SampleStatus.REVISED
            elif action == ManualAction.FLAG_FOR_REVIEW:
                new_status = SampleStatus.PENDING
            else:
                new_status = sample.status

        before_snapshot = sample.to_dict()
        sample.status = new_status
        sample.revision_chain.append(
            f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}|{action.value}|{operator}"
        )
        after_snapshot = sample.to_dict()

        correction = ManualCorrection(
            correction_id=generate_id("cor"),
            sample_id=sample.sample_id,
            action=action,
            operator=operator,
            comment=comment,
            before_status=before_status,
            after_status=new_status,
            before_decision=previous_decision,
            after_decision=new_decision,
            scheduling_note=scheduling_note,
        )
        self.corrections.append(correction)

        self.record_audit(
            event_type=f"manual_correction:{action.value}",
            target_id=sample.sample_id,
            operator=operator,
            before=before_snapshot,
            after=after_snapshot,
            comment=comment + (f" | 排班备注: {scheduling_note}" if scheduling_note else ""),
        )
        self._persist_if_needed()
        return correction

    def create_override_decision(
        self,
        sample: Sample,
        passed: bool,
        operator: str,
        reason_detail: str,
    ) -> DecisionRecord:
        return DecisionRecord(
            decision_id=generate_id("dec"),
            sample_id=sample.sample_id,
            passed=passed,
            reason=DecisionReason.MANUAL_OVERRIDE,
            detail=f"人工[{operator}]修正: {reason_detail}",
            evidence_chain=[f"manual:{operator}"],
            affected_by_sources=[],
        )

    def get_manual_confirmation_queue(
        self,
        samples: List[Sample],
        decisions: List[DecisionRecord],
    ) -> List[Dict[str, Any]]:
        queue = []
        decision_map = {d.sample_id: d for d in decisions}

        for s in samples:
            needs_manual = False
            reasons = []
            next_steps = []

            if s.is_contaminated:
                needs_manual = True
                reasons.append(f"验证集污染: {s.contamination_reason}")
                next_steps.append("确认污染来源，决定剔除/修正/保留")

            if s.is_misclassified_return and s.status == SampleStatus.PENDING:
                needs_manual = True
                reasons.append("旧模型误判回检样本待确认")
                next_steps.append("查看改判解释，确认新模型预测是否正确")

            decision = decision_map.get(s.sample_id)
            if decision and not decision.passed:
                needs_manual = True
                reasons.append(f"算法判定不通过: {decision.reason.value} - {decision.detail}")
                next_steps.append("评估是否人工通过或驳回")

            if s.source.value and "撤回" in s.source.value:
                needs_manual = True
                reasons.append(f"存在撤回记录影响: 任务{s.task_id}")
                next_steps.append("核对撤回记录与当前实验的关联关系")

            if needs_manual:
                queue.append({
                    "sample_id": s.sample_id,
                    "task_id": s.task_id,
                    "source": s.source.value,
                    "current_status": s.status.value,
                    "original_label": s.original_label,
                    "predicted_label": s.predicted_label,
                    "reasons": reasons,
                    "next_steps": next_steps,
                    "algorithm_decision": {
                        "passed": decision.passed if decision else None,
                        "reason": decision.reason.value if decision else None,
                        "detail": decision.detail if decision else None,
                    } if decision else None,
                    "available_actions": [a.value for a in ManualAction],
                })
        return queue

    def get_correction_statistics(self) -> Dict[str, Any]:
        action_count: Dict[str, int] = {}
        operator_count: Dict[str, int] = {}
        status_transitions: Dict[str, int] = {}
        for c in self.corrections:
            key = c.action.value
            action_count[key] = action_count.get(key, 0) + 1
            operator_count[c.operator] = operator_count.get(c.operator, 0) + 1
            trans = f"{c.before_status.value}→{c.after_status.value}"
            status_transitions[trans] = status_transitions.get(trans, 0) + 1
        return {
            "total_corrections": len(self.corrections),
            "action_distribution": action_count,
            "operator_distribution": operator_count,
            "status_transitions": status_transitions,
        }

    def get_history_for_sample(self, sample_id: str) -> List[AuditHistory]:
        return [h for h in self.history if h.target_id == sample_id]

    def get_scheduling_review(self, month_str: Optional[str] = None) -> Dict[str, Any]:
        if month_str is None:
            month_str = datetime.now().strftime("%Y-%m")

        month_corrections = [
            c for c in self.corrections if c.timestamp.startswith(month_str)
        ]
        month_history = [
            h for h in self.history if h.timestamp.startswith(month_str)
        ]

        review_items = []
        for c in month_corrections:
            review_items.append({
                "correction_id": c.correction_id,
                "sample_id": c.sample_id,
                "timestamp": c.timestamp,
                "action": c.action.value,
                "operator": c.operator,
                "comment": c.comment,
                "status_change": f"{c.before_status.value} → {c.after_status.value}",
                "scheduling_note": c.scheduling_note,
            })

        return {
            "month": month_str,
            "total_corrections_in_month": len(month_corrections),
            "total_audit_events_in_month": len(month_history),
            "detailed_review_items": review_items,
            "replay_for_scheduling": self._build_scheduling_replay(review_items),
        }

    def _build_scheduling_replay(self, items: List[Dict[str, Any]]) -> str:
        if not items:
            return "本月无人工确认记录，排班同学无需处理历史遗留。"
        lines = [f"【{datetime.now().strftime('%Y-%m')}月AB守门人工确认复盘】"]
        lines.append(f"本月共发生{len(items)}次人工干预，按时间线回放如下：")
        for idx, it in enumerate(items, 1):
            lines.append(
                f"  {idx}. [{it['timestamp']}] {it['operator']} 执行「{it['action']}」"
                f" 样本{it['sample_id']} ({it['status_change']})"
            )
            lines.append(f"     备注: {it['comment']}")
            if it.get("scheduling_note"):
                lines.append(f"     排班提醒: {it['scheduling_note']}")
        lines.append("以上记录均已入审计历史，月底封账前请排班同学确认无遗漏。")
        return "\n".join(lines)

    def _persist_if_needed(self):
        if not self.history_dir:
            return
        corr_path = os.path.join(self.history_dir, "corrections.json")
        hist_path = os.path.join(self.history_dir, "audit_history.json")
        try:
            with open(corr_path, "w", encoding="utf-8") as f:
                json.dump([c.__dict__ for c in self.corrections], f, ensure_ascii=False, indent=2, default=str)
            with open(hist_path, "w", encoding="utf-8") as f:
                json.dump([h.__dict__ for h in self.history], f, ensure_ascii=False, indent=2, default=str)
        except Exception:
            pass

    def load_history(self, history_dir: str):
        corr_path = os.path.join(history_dir, "corrections.json")
        hist_path = os.path.join(history_dir, "audit_history.json")
        if os.path.exists(corr_path):
            try:
                with open(corr_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    self.corrections.extend(self._deserialize_corrections(raw))
            except Exception:
                pass
        if os.path.exists(hist_path):
            try:
                with open(hist_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    self.history.extend(self._deserialize_history(raw))
            except Exception:
                pass

    def _deserialize_corrections(self, raw_list: List[Dict]) -> List[ManualCorrection]:
        result = []
        for r in raw_list:
            try:
                result.append(ManualCorrection(**{
                    **r,
                    "action": ManualAction(r["action"]) if isinstance(r.get("action"), str) else r["action"],
                    "before_status": SampleStatus(r["before_status"]) if isinstance(r.get("before_status"), str) else r["before_status"],
                    "after_status": SampleStatus(r["after_status"]) if isinstance(r.get("after_status"), str) else r["after_status"],
                }))
            except Exception:
                continue
        return result

    def _deserialize_history(self, raw_list: List[Dict]) -> List[AuditHistory]:
        result = []
        for r in raw_list:
            try:
                result.append(AuditHistory(**r))
            except Exception:
                continue
        return result
