from datetime import datetime
from typing import List, Dict, Any, Optional
from .models import (
    TimelineEvent, WeightChange, Note, ParamRow,
    JudgmentChange, Evidence, EvidenceStatus,
)
from .param_table import ParamTableManager


class TimelineBuilder:
    def __init__(self):
        self.events: List[TimelineEvent] = []
        self._counter = 0

    def _next_id(self) -> str:
        self._counter += 1
        return f"TL-{self._counter:04d}"

    def add_event(self, event_type: str, actor: str, summary: str,
                  timestamp: Optional[datetime] = None,
                  details: Dict[str, Any] = None) -> TimelineEvent:
        evt = TimelineEvent(
            event_id=self._next_id(),
            event_type=event_type,
            timestamp=timestamp or datetime.now(),
            actor=actor,
            summary=summary,
            details=details or {},
        )
        self.events.append(evt)
        return evt

    def add_param_initial(self, params: ParamTableManager, actor: str) -> None:
        for row in params.list_rows():
            self.add_event(
                event_type="PARAM_INIT",
                actor=actor,
                summary=f"参数表「{params.version}」载入: {row.param_name} = {row.param_value}{row.unit.value}, 权重={row.weight}",
                details={"row_id": row.row_id, "param_name": row.param_name,
                         "value": row.param_value, "unit": row.unit.value,
                         "weight": row.weight, "version": params.version},
            )

    def add_weight_changes(self, changes: List[WeightChange]) -> None:
        for c in changes:
            self.add_event(
                event_type="WEIGHT_CHANGE",
                actor=c.changed_by,
                timestamp=c.changed_at,
                summary=f"权重变更: {c.param_name} {c.old_weight} → {c.new_weight}",
                details={"row_id": c.row_id, "old_weight": c.old_weight,
                         "new_weight": c.new_weight, "reason": c.reason},
            )

    def add_notes(self, notes: List[Note]) -> None:
        for n in notes:
            tag = "[临时]" if n.is_temporary else ""
            self.add_event(
                event_type="NOTE_ADD",
                actor=n.author,
                timestamp=n.created_at,
                summary=f"{tag}备注({n.target_type}={n.target_id}): {n.content[:40]}",
                details={"note_id": n.note_id, "target_type": n.target_type,
                         "target_id": n.target_id, "content": n.content,
                         "is_temporary": n.is_temporary},
            )

    def add_judgment_changes(self, judgments: List[JudgmentChange]) -> None:
        for j in judgments:
            self.add_event(
                event_type="JUDGMENT_CHANGE",
                actor="排队窗口批量验算",
                summary=f"判断变更: {j.rule_name} {j.old_outcome.value} → {j.new_outcome.value}",
                details={"judgment_id": j.judgment_id, "old": j.old_outcome.value,
                         "new": j.new_outcome.value, "explanation": j.explanation,
                         "related_params": j.related_param_changes},
            )

    def add_evidence_events(self, evidences: List[Evidence]) -> None:
        for e in evidences:
            if e.status == EvidenceStatus.PROVIDED and e.provided_at:
                self.add_event(
                    event_type="EVIDENCE_PROVIDED",
                    actor=e.provided_by or "未知",
                    timestamp=e.provided_at,
                    summary=f"证据提交: {e.title}",
                    details={"evidence_id": e.evidence_id, "ref_type": e.ref_type,
                             "ref_id": e.ref_id, "attachment": e.attachment_ref},
                )
            else:
                self.add_event(
                    event_type="EVIDENCE_PENDING",
                    actor="系统",
                    summary=f"证据待补: {e.title}",
                    details={"evidence_id": e.evidence_id, "ref_type": e.ref_type,
                             "ref_id": e.ref_id, "description": e.description},
                )

    def add_verification_run(self, report_id: str, actor: str,
                             counts: Dict[str, int]) -> None:
        self.add_event(
            event_type="VERIFY_RUN",
            actor=actor,
            summary=f"执行「排队窗口批量验算」: 参数变更{counts.get('param_rows',0)}项, "
                    f"判断变更{counts.get('judgment_changes',0)}项, "
                    f"外推越界{counts.get('extrapolation_issues',0)}处, "
                    f"待补证据{counts.get('evidences_pending',0)}条",
            details={"report_id": report_id, **counts},
        )

    def sorted_events(self) -> List[TimelineEvent]:
        return sorted(self.events, key=lambda e: e.timestamp)
