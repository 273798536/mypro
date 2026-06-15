from typing import List, Dict, Tuple
from collections import defaultdict

from .models import ComplaintRecord, ComplaintStatus, ReplayState, MeetingMinute


class StatusClassifier:
    def __init__(self, state: ReplayState):
        self.state = state

    def classify_all(self) -> Dict[ComplaintStatus, List[ComplaintRecord]]:
        buckets = defaultdict(list)
        for record in self.state.records.values():
            buckets[record.status].append(record)
        return dict(buckets)

    def get_by_status(self, status: ComplaintStatus) -> List[ComplaintRecord]:
        return [r for r in self.state.records.values() if r.status == status]

    def get_pending_site(self) -> List[ComplaintRecord]:
        return self.get_by_status(ComplaintStatus.PENDING_SITE)

    def get_processed(self) -> List[ComplaintRecord]:
        return self.get_by_status(ComplaintStatus.PROCESSED)

    def get_conflicts(self) -> List[ComplaintRecord]:
        return self.get_by_status(ComplaintStatus.CONFLICT)

    def get_pending_review(self) -> List[ComplaintRecord]:
        return self.get_by_status(ComplaintStatus.PENDING_REVIEW)

    def get_for_review(self) -> Dict[str, List[ComplaintRecord]]:
        return {
            "已处理": self.get_processed(),
            "待现场看": self.get_pending_site(),
            "冲突记录": self.get_conflicts(),
        }

    def detect_conflicts(self) -> List[Tuple[ComplaintRecord, str]]:
        conflicts = []
        records = list(self.state.records.values())

        for i, rec in enumerate(records):
            reasons = []

            if rec.complaint_type == "设施损坏" and rec.status == ComplaintStatus.PROCESSED:
                if "已修复" not in (rec.handle_result or ""):
                    reasons.append("处理结果不完整")

            if rec.status == ComplaintStatus.PENDING_SITE and rec.handler:
                reasons.append("已分配处理人但仍在待现场状态")

            related_minutes = self._get_related_minutes(rec.complaint_id)
            if len(related_minutes) > 1:
                versions = set(m.version for m in related_minutes)
                if len(versions) > 1:
                    reasons.append(f"关联会议纪要存在{len(versions)}个版本，可能有口径不一致")

            if reasons:
                conflicts.append((rec, "; ".join(reasons)))
                if rec.status != ComplaintStatus.CONFLICT:
                    rec.status = ComplaintStatus.CONFLICT
                    rec.extra["conflict_reasons"] = reasons

        return conflicts

    def _get_related_minutes(self, complaint_id: str) -> List[MeetingMinute]:
        result = []
        for versions in self.state.minutes.values():
            for minute in versions:
                if complaint_id in minute.related_complaint_ids:
                    result.append(minute)
        return result

    def stats(self) -> Dict[str, int]:
        buckets = self.classify_all()
        return {
            status.value: len(records) for status, records in buckets.items()
        }

    def summary(self) -> str:
        s = self.stats()
        total = sum(s.values())
        lines = [f"共 {total} 条投诉记录"]
        for status in [ComplaintStatus.PENDING_SITE, ComplaintStatus.PROCESSED, ComplaintStatus.CONFLICT, ComplaintStatus.PENDING_REVIEW]:
            count = s.get(status.value, 0)
            lines.append(f"  {status.value}: {count} 条")
        return "\n".join(lines)
