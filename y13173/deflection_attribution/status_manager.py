"""处理状态管理与补证据追踪。

复核人重点关注：哪些已处理、哪些还要补证据。
提供状态更新、批量操作、证据待办列表等功能。
"""

from typing import List, Dict, Any, Optional
from collections import defaultdict
import datetime

from .models import DeflectionRecord, ProcessStatus, AttributionCategory


class StatusManager:
    """状态管理器。"""

    def __init__(self, records: List[DeflectionRecord]):
        self.records = records

    def _touch(self, record: DeflectionRecord):
        record.updated_at = datetime.datetime.now().isoformat()

    def update_status(
        self,
        record_id: str,
        new_status: ProcessStatus,
        note: str = "",
    ) -> bool:
        """更新单条记录的状态。"""
        for record in self.records:
            if record.record_id == record_id:
                record.status = new_status
                if note:
                    record.status_note = note
                self._touch(record)
                return True
        return False

    def mark_processed(self, record_id: str, note: str = "已复核") -> bool:
        """标记为已处理。"""
        return self.update_status(record_id, ProcessStatus.PROCESSED, note)

    def mark_need_evidence(self, record_id: str, reason: str) -> bool:
        """标记为待补证据。"""
        return self.update_status(record_id, ProcessStatus.NEED_EVIDENCE, reason)

    def mark_reviewed(self, record_id: str, note: str = "复核通过") -> bool:
        """标记为已复核。"""
        return self.update_status(record_id, ProcessStatus.REVIEWED, note)

    def mark_error(self, record_id: str, error_msg: str) -> bool:
        """标记为处理异常。"""
        return self.update_status(record_id, ProcessStatus.ERROR, error_msg)

    def batch_update_status(
        self,
        record_ids: List[str],
        new_status: ProcessStatus,
        note: str = "",
    ) -> int:
        """批量更新状态。返回更新数量。"""
        count = 0
        for rid in record_ids:
            if self.update_status(rid, new_status, note):
                count += 1
        return count

    def get_by_status(self, status: ProcessStatus) -> List[DeflectionRecord]:
        """按状态筛选记录。"""
        return [r for r in self.records if r.status == status]

    def get_status_counts(self) -> Dict[str, int]:
        """获取各状态的记录数量。"""
        counts: Dict[str, int] = defaultdict(int)
        for r in self.records:
            counts[r.status.value] += 1
        return dict(counts)

    def get_evidence_todo_list(self) -> List[Dict[str, Any]]:
        """获取待补证据清单。

        复核人重点关注此列表。
        """
        todos = []
        for r in self.records:
            if r.status == ProcessStatus.NEED_EVIDENCE:
                todos.append({
                    "record_id": r.record_id,
                    "beam_id": r.beam_id,
                    "measure_point": r.measure_point,
                    "status": r.status.value,
                    "status_note": r.status_note,
                    "is_sampling_gap": r.is_sampling_gap,
                    "is_extreme": r.is_extreme,
                    "risk_level": r.risk_level.value,
                    "attribution": r.attribution.value,
                    "deflection_ratio": r.deflection_ratio,
                    "source_file": r.source_file,
                    "source_line": r.source_line,
                })
        return todos

    def get_review_summary(self) -> Dict[str, Any]:
        """获取复核汇总。

        复核人最后看的不是功能表，而是处理进度和待办。
        """
        total = len(self.records)
        processed = sum(
            1 for r in self.records
            if r.status in (ProcessStatus.PROCESSED, ProcessStatus.REVIEWED)
        )
        pending = sum(
            1 for r in self.records
            if r.status == ProcessStatus.PENDING
        )
        need_evidence = sum(
            1 for r in self.records
            if r.status == ProcessStatus.NEED_EVIDENCE
        )
        error = sum(
            1 for r in self.records
            if r.status == ProcessStatus.ERROR
        )

        progress = (processed / total * 100) if total > 0 else 0

        gap_evidence = [r for r in self.records if r.status == ProcessStatus.NEED_EVIDENCE and r.is_sampling_gap]
        extreme_evidence = [r for r in self.records if r.status == ProcessStatus.NEED_EVIDENCE and r.is_extreme]

        return {
            "total": total,
            "processed": processed,
            "pending": pending,
            "need_evidence": need_evidence,
            "error": error,
            "progress_percent": round(progress, 1),
            "gap_to_fix": len(gap_evidence),
            "extreme_to_review": len(extreme_evidence),
            "evidence_todo_count": need_evidence,
        }

    def get_record_by_id(self, record_id: str) -> Optional[DeflectionRecord]:
        """根据ID查找记录。"""
        for r in self.records:
            if r.record_id == record_id:
                return r
        return None

    def add_evidence_note(self, record_id: str, note: str) -> bool:
        """追加证据备注。"""
        record = self.get_record_by_id(record_id)
        if record is None:
            return False
        if record.status_note:
            record.status_note = f"{record.status_note}; {note}"
        else:
            record.status_note = note
        self._touch(record)
        return True
