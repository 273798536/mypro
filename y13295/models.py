from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class DataSource(Enum):
    APPROVAL_LEDGER = "审批台账"
    CHAT_RECORD = "聊天记录"
    COMPLAINT_RECORD = "投诉记录"
    OTHER = "其他来源"


class MergeStatus(Enum):
    PENDING = "待处理"
    MERGED = "已归并"
    NEEDS_EVIDENCE = "待补证据"
    REVIEWED = "已复核"
    REJECTED = "不予归并"


class ComplaintStatus(Enum):
    SINGLE = "单条投诉"
    DUPLICATE = "重复投诉"
    NEEDS_REVIEW = "需人工确认"


@dataclass
class RawPointRecord:
    record_id: str
    source: DataSource
    original_location_text: str
    normalized_location: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    complaint_content: Optional[str] = None
    complaint_time: Optional[datetime] = None
    complainant: Optional[str] = None
    approval_number: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "source": self.source.value,
            "original_location_text": self.original_location_text,
            "normalized_location": self.normalized_location or "",
            "longitude": self.longitude or "",
            "latitude": self.latitude or "",
            "complaint_content": self.complaint_content or "",
            "complaint_time": self.complaint_time.strftime("%Y-%m-%d %H:%M:%S") if self.complaint_time else "",
            "complainant": self.complainant or "",
            "approval_number": self.approval_number or "",
            "notes": self.notes or "",
        }


@dataclass
class MergedPointGroup:
    group_id: str
    canonical_location: str
    merged_records: List[RawPointRecord]
    merge_status: MergeStatus = MergeStatus.PENDING
    complaint_status: ComplaintStatus = ComplaintStatus.SINGLE
    merge_evidence: List[str] = field(default_factory=list)
    duplicate_count: int = 0
    handler_notes: Optional[str] = None
    next_step_hint: Optional[str] = None
    merged_at: Optional[datetime] = None

    @property
    def record_count(self) -> int:
        return len(self.merged_records)

    @property
    def has_duplicate_complaints(self) -> bool:
        return self.complaint_status in (ComplaintStatus.DUPLICATE, ComplaintStatus.NEEDS_REVIEW)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "group_id": self.group_id,
            "canonical_location": self.canonical_location,
            "record_count": self.record_count,
            "duplicate_count": self.duplicate_count,
            "merge_status": self.merge_status.value,
            "complaint_status": self.complaint_status.value,
            "merge_evidence": "; ".join(self.merge_evidence),
            "handler_notes": self.handler_notes or "",
            "next_step_hint": self.next_step_hint or "",
            "merged_at": self.merged_at.strftime("%Y-%m-%d %H:%M:%S") if self.merged_at else "",
            "record_ids": "; ".join([r.record_id for r in self.merged_records]),
            "original_locations": "; ".join([r.original_location_text for r in self.merged_records]),
        }


@dataclass
class FilterCriteria:
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    data_sources: Optional[List[DataSource]] = None
    merge_statuses: Optional[List[MergeStatus]] = None
    min_record_count: Optional[int] = None
    location_keywords: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "start_date": self.start_date.strftime("%Y-%m-%d") if self.start_date else "",
            "end_date": self.end_date.strftime("%Y-%m-%d") if self.end_date else "",
            "data_sources": "; ".join([s.value for s in self.data_sources]) if self.data_sources else "",
            "merge_statuses": "; ".join([s.value for s in self.merge_statuses]) if self.merge_statuses else "",
            "min_record_count": self.min_record_count or "",
            "location_keywords": "; ".join(self.location_keywords) if self.location_keywords else "",
        }


@dataclass
class Statistics:
    total_raw_records: int = 0
    total_merged_groups: int = 0
    by_source: Dict[str, int] = field(default_factory=dict)
    by_merge_status: Dict[str, int] = field(default_factory=dict)
    by_complaint_status: Dict[str, int] = field(default_factory=dict)
    duplicate_complaint_groups: int = 0
    needs_evidence_groups: int = 0
    pending_groups: int = 0
    reviewed_groups: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "总原始记录数": self.total_raw_records,
            "总归并组数": self.total_merged_groups,
            "按来源统计": self.by_source,
            "按归并状态统计": self.by_merge_status,
            "按投诉状态统计": self.by_complaint_status,
            "重复投诉组数": self.duplicate_complaint_groups,
            "待补证据组数": self.needs_evidence_groups,
            "待处理组数": self.pending_groups,
            "已复核组数": self.reviewed_groups,
        }


@dataclass
class ProcessingResult:
    filter_criteria: FilterCriteria
    raw_records: List[RawPointRecord]
    merged_groups: List[MergedPointGroup]
    statistics: Statistics
    generated_at: datetime = field(default_factory=datetime.now)
