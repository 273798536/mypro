import copy
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime

from .storage import Storage
from .models import FailureQueueRecord, EvidenceSnapshot, AuditLogEntry


GATE_CHANGES_NOTE = (
    "[影子流量上线守门] 判断变更说明："
    "1) run_id重复时自动挂起等待复核，不再覆盖旧结论；"
    "2) 每次重跑前归档旧证据至evidence_archive，永不覆盖；"
    "3) 人工确认前后变化记入audit_log，社区公示前可追溯。"
)


class GateResult:
    def __init__(self, accepted: bool, suspended: bool, message: str,
                 record: Optional[FailureQueueRecord] = None):
        self.accepted = accepted
        self.suspended = suspended
        self.message = message
        self.record = record

    def to_dict(self) -> Dict[str, Any]:
        return {
            "accepted": self.accepted,
            "suspended": self.suspended,
            "message": self.message,
            "run_id": self.record.run_id if self.record else None,
            "status": self.record.status if self.record else None,
            "rerun_count": self.record.rerun_count if self.record else 0,
        }


class ShadowGate:
    def __init__(self, storage: Optional[Storage] = None, data_dir: str = "./data"):
        self.storage = storage or Storage(data_dir=data_dir)

    def submit(self, run_id: str, params: Dict[str, Any], failure_reason: str,
               page_summary: str, metrics: Optional[Dict[str, Any]] = None,
               samples: Optional[List[Any]] = None, thresholds: Optional[Dict[str, Any]] = None,
               manual_corrections: Optional[List[Dict[str, Any]]] = None,
               note: str = "", actor: str = "system") -> GateResult:
        if not run_id:
            return GateResult(False, False, "run_id不能为空")

        new_evidence = EvidenceSnapshot(
            failure_reason=failure_reason,
            page_summary=page_summary,
            params=params or {},
            metrics=metrics or {},
            samples=samples or [],
            thresholds=thresholds or {},
            manual_corrections=manual_corrections or [],
        )

        existing = self.storage.get_record(run_id)

        if existing is None:
            record = FailureQueueRecord(
                run_id=run_id,
                status="pending",
                note=self._merge_note(note),
                evidence=new_evidence,
                rerun_count=0,
                history=[],
            )
            record.history.append({
                "event": "created",
                "timestamp": datetime.now().isoformat(),
                "evidence": new_evidence.to_dict(),
            })
            self.storage.upsert_record(record)
            self.storage.append_audit(AuditLogEntry(
                run_id=run_id, action="create", actor=actor,
                before=None, after=record.to_dict(), comment="首次入队",
            ))
            return GateResult(True, False, "已入队，等待处理", record)

        if existing.suspended:
            return GateResult(
                False, True,
                f"run_id={run_id} 已挂起，原因：{existing.suspend_reason}。请复核人确认后再操作。",
                existing,
            )

        archive_path = self.storage.archive_evidence(
            run_id, existing.evidence, f"rerun_{existing.rerun_count}"
        )

        before_snapshot = copy.deepcopy(existing.to_dict())

        existing.history.append({
            "event": "rerun_archive",
            "timestamp": datetime.now().isoformat(),
            "archive_path": archive_path,
            "old_evidence": existing.evidence.to_dict(),
        })

        existing.evidence = new_evidence
        existing.rerun_count += 1
        existing.updated_at = datetime.now().isoformat()
        existing.status = "pending"
        if note:
            existing.note = self._merge_note(note, existing.note)
        elif not existing.note:
            existing.note = GATE_CHANGES_NOTE

        if existing.rerun_count >= 1:
            existing.suspended = True
            existing.suspend_reason = (
                f"run_id重复（第{existing.rerun_count + 1}次提交），"
                "已挂起等待复核人确认，避免覆盖旧证据给出假稳定结论。"
            )
            existing.status = "suspended"

        self.storage.upsert_record(existing)

        self.storage.append_audit(AuditLogEntry(
            run_id=run_id, action="rerun", actor=actor,
            before=before_snapshot, after=existing.to_dict(),
            comment=f"重跑，旧证据已归档至 {archive_path}",
        ))

        if existing.suspended:
            return GateResult(
                False, True,
                existing.suspend_reason + f" 旧证据归档：{archive_path}",
                existing,
            )

        return GateResult(
            True, False,
            f"重跑已记录，旧证据归档：{archive_path}",
            existing,
        )

    def resume(self, run_id: str, actor: str = "reviewer",
               comment: str = "") -> GateResult:
        record = self.storage.get_record(run_id)
        if record is None:
            return GateResult(False, False, f"run_id={run_id} 不存在")

        if not record.suspended:
            return GateResult(False, False, f"run_id={run_id} 未挂起，无需恢复")

        before_snapshot = copy.deepcopy(record.to_dict())
        record.suspended = False
        record.suspend_reason = ""
        record.status = "pending"
        record.updated_at = datetime.now().isoformat()
        record.history.append({
            "event": "resumed",
            "timestamp": datetime.now().isoformat(),
            "actor": actor,
            "comment": comment,
        })

        self.storage.upsert_record(record)
        self.storage.append_audit(AuditLogEntry(
            run_id=run_id, action="resume", actor=actor,
            before=before_snapshot, after=record.to_dict(),
            comment=comment or "复核人确认后恢复",
        ))
        return GateResult(True, False, f"已恢复，run_id={run_id}", record)

    def confirm(self, run_id: str, conclusion: str, actor: str = "reviewer",
                comment: str = "") -> GateResult:
        record = self.storage.get_record(run_id)
        if record is None:
            return GateResult(False, False, f"run_id={run_id} 不存在")

        before_snapshot = copy.deepcopy(record.to_dict())
        record.status = conclusion
        record.updated_at = datetime.now().isoformat()
        record.history.append({
            "event": "confirmed",
            "timestamp": datetime.now().isoformat(),
            "actor": actor,
            "conclusion": conclusion,
            "comment": comment,
        })

        self.storage.upsert_record(record)
        self.storage.append_audit(AuditLogEntry(
            run_id=run_id, action="confirm", actor=actor,
            before=before_snapshot, after=record.to_dict(),
            comment=f"人工确认结论：{conclusion}。{comment}",
        ))
        return GateResult(True, False, f"已确认结论：{conclusion}", record)

    def get_page_summary(self, run_id: str) -> Optional[Dict[str, Any]]:
        record = self.storage.get_record(run_id)
        if record is None:
            return None
        return {
            "run_id": record.run_id,
            "status": record.status,
            "suspended": record.suspended,
            "suspend_reason": record.suspend_reason,
            "rerun_count": record.rerun_count,
            "note": record.note,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "failure_reason": record.evidence.failure_reason,
            "page_summary": record.evidence.page_summary,
            "params": record.evidence.params,
            "metrics": record.evidence.metrics,
            "history_tail": record.history[-5:],
        }

    def list_records(self, status: Optional[str] = None,
                     suspended_only: bool = False) -> List[Dict[str, Any]]:
        queue = self.storage.load_queue()
        results = []
        for rec in queue.values():
            if suspended_only and not rec.suspended:
                continue
            if status and rec.status != status:
                continue
            results.append({
                "run_id": rec.run_id,
                "status": rec.status,
                "suspended": rec.suspended,
                "rerun_count": rec.rerun_count,
                "failure_reason": rec.evidence.failure_reason[:80],
                "updated_at": rec.updated_at,
            })
        results.sort(key=lambda r: r["updated_at"], reverse=True)
        return results

    def _merge_note(self, new_note: str, old_note: str = "") -> str:
        parts = []
        if old_note:
            parts.append(old_note)
        if GATE_CHANGES_NOTE not in (old_note or ""):
            if new_note:
                parts.append(GATE_CHANGES_NOTE + " " + new_note)
            else:
                parts.append(GATE_CHANGES_NOTE)
        elif new_note:
            parts.append(new_note)
        return " | ".join(parts)
