from datetime import datetime
from typing import List, Dict, Optional
from .models import Evidence, EvidenceStatus, ProcessingStatus, WindowVerdict


class EvidenceTracker:
    def __init__(self):
        self.evidences: Dict[str, Evidence] = {}
        self._counter = 0

    def _next_id(self) -> str:
        self._counter += 1
        return f"EVI-{self._counter:04d}"

    def add_evidence(self, ref_type: str, ref_id: str, title: str,
                     description: str = "", status: EvidenceStatus = EvidenceStatus.PENDING,
                     provided_by: str = "", attachment_ref: str = "") -> Evidence:
        ev = Evidence(
            evidence_id=self._next_id(),
            ref_type=ref_type,
            ref_id=ref_id,
            title=title,
            description=description,
            status=status,
            provided_by=provided_by,
            provided_at=datetime.now() if status == EvidenceStatus.PROVIDED else None,
            attachment_ref=attachment_ref,
        )
        self.evidences[ev.evidence_id] = ev
        return ev

    def update_status(self, evidence_id: str, status: EvidenceStatus,
                      provided_by: str = "") -> Evidence:
        if evidence_id not in self.evidences:
            raise ValueError(f"[VERIFY-E004] 证据不存在: evidence_id={evidence_id}")
        ev = self.evidences[evidence_id]
        ev.status = status
        if status == EvidenceStatus.PROVIDED:
            ev.provided_at = datetime.now()
            if provided_by:
                ev.provided_by = provided_by
        return ev

    def list_evidences(self, status: Optional[EvidenceStatus] = None) -> List[Evidence]:
        result = list(self.evidences.values())
        if status:
            result = [e for e in result if e.status == status]
        return sorted(result, key=lambda e: e.evidence_id)

    def find_by_ref(self, ref_type: str, ref_id: str) -> List[Evidence]:
        return [
            e for e in self.evidences.values()
            if e.ref_type == ref_type and e.ref_id == ref_id
        ]

    def auto_create_from_verdicts(self, verdicts: List[WindowVerdict]) -> None:
        for v in verdicts:
            if v.handling_status == ProcessingStatus.NEED_EVIDENCE:
                self.add_evidence(
                    ref_type="WINDOW",
                    ref_id=v.window_id,
                    title=f"{v.window_name} 排队失败补证",
                    description=f"窗口「{v.window_name}」判定为{v.outcome.value}, "
                                f"综合评分{v.final_score:.2f}, 需要补充现场流量、服务时长或窗口配置的实际数据。",
                    status=EvidenceStatus.PENDING,
                )
            elif v.handling_status == ProcessingStatus.TODO:
                self.add_evidence(
                    ref_type="WINDOW",
                    ref_id=v.window_id,
                    title=f"{v.window_name} 排队警告复核",
                    description=f"窗口「{v.window_name}」判定为{v.outcome.value}, "
                                f"综合评分{v.final_score:.2f}, 建议补充非高峰时段观测数据作为佐证。",
                    status=EvidenceStatus.PENDING,
                )

    def link_evidence_to_verdicts(self, verdicts: List[WindowVerdict]) -> None:
        for v in verdicts:
            related = self.find_by_ref("WINDOW", v.window_id)
            v.evidence_ids = [e.evidence_id for e in related]
