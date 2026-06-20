from typing import Dict, List, Optional
from datetime import datetime
from collections import defaultdict
from .models import (
    ProcessingRecord,
    ProcessingStatus,
    ConfirmationRequest,
    EvidenceSubmission,
    DashboardSummary,
)


class ProcessingStore:
    def __init__(self):
        self._records: Dict[str, ProcessingRecord] = {}
        self._status_history: Dict[str, List[ProcessingStatus]] = defaultdict(list)

    def add_record(self, record: ProcessingRecord) -> ProcessingRecord:
        self._records[record.run_id] = record
        self._status_history[record.run_id].append(record.status)
        return record

    def update_record(self, run_id: str, **kwargs) -> Optional[ProcessingRecord]:
        if run_id not in self._records:
            return None
        record = self._records[run_id]
        for key, value in kwargs.items():
            if hasattr(record, key):
                setattr(record, key, value)
        record.updated_at = datetime.now()
        if "status" in kwargs:
            self._status_history[run_id].append(kwargs["status"])
        return record

    def get_record(self, run_id: str) -> Optional[ProcessingRecord]:
        return self._records.get(run_id)

    def get_all_records(self) -> List[ProcessingRecord]:
        return list(self._records.values())

    def get_records_by_status(
        self, status: ProcessingStatus
    ) -> List[ProcessingRecord]:
        return [r for r in self._records.values() if r.status == status]

    def get_existing_run_ids(self) -> List[str]:
        return list(self._records.keys())

    def get_status_history(self, run_id: str) -> List[ProcessingStatus]:
        return self._status_history.get(run_id, [])

    def delete_record(self, run_id: str) -> bool:
        if run_id in self._records:
            del self._records[run_id]
            return True
        return False

    def confirm_record(
        self, request: ConfirmationRequest, confirmed_by: str = "user"
    ) -> Optional[ProcessingRecord]:
        record = self._records.get(request.run_id)
        if not record:
            return None
        record.confirmation_reason = request.reason
        record.confirmation_note = request.note
        record.next_steps = request.next_steps
        record.status = ProcessingStatus.EVIDENCE_REQUIRED
        record.evidence_items = []
        record.processed_by = confirmed_by
        record.updated_at = datetime.now()
        self._status_history[request.run_id].append(ProcessingStatus.EVIDENCE_REQUIRED)
        return record

    def resolve_confirmation(
        self, run_id: str, resolution: str, resolved_by: str = "user"
    ) -> Optional[ProcessingRecord]:
        record = self._records.get(run_id)
        if not record:
            return None
        record.status = ProcessingStatus.PROCESSED
        record.confirmation_note = (
            f"{record.confirmation_note or ''} [已解决: {resolution}]"
        )
        record.processed_at = datetime.now()
        record.processed_by = resolved_by
        record.updated_at = datetime.now()
        self._status_history[run_id].append(ProcessingStatus.PROCESSED)
        return record

    def add_evidence(
        self, submission: EvidenceSubmission, submitted_by: str = "user"
    ) -> Optional[ProcessingRecord]:
        record = self._records.get(submission.run_id)
        if not record:
            return None
        evidence_entry = (
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"{submitted_by}: {submission.evidence_description}"
        )
        record.evidence_items.append(evidence_entry)
        record.updated_at = datetime.now()
        return record

    def mark_evidence_complete(
        self, run_id: str, marked_by: str = "user"
    ) -> Optional[ProcessingRecord]:
        record = self._records.get(run_id)
        if not record:
            return None
        if record.status == ProcessingStatus.EVIDENCE_REQUIRED:
            record.status = ProcessingStatus.PROCESSED
            record.processed_at = datetime.now()
            record.processed_by = marked_by
            record.updated_at = datetime.now()
            self._status_history[run_id].append(ProcessingStatus.PROCESSED)
        return record

    def get_dashboard_summary(self) -> DashboardSummary:
        total_runs = len(self._records)
        processed = len(self.get_records_by_status(ProcessingStatus.PROCESSED))
        pending = len(self.get_records_by_status(ProcessingStatus.PENDING))
        needs_confirmation = len(
            self.get_records_by_status(ProcessingStatus.NEEDS_CONFIRMATION)
        )
        evidence_required = len(
            self.get_records_by_status(ProcessingStatus.EVIDENCE_REQUIRED)
        )

        total_cost = 0.0
        cost_unit = "元"
        for record in self._records.values():
            for calc in record.cost_calculations:
                if calc.formula.name == "总成本":
                    total_cost += calc.result
                    cost_unit = calc.unit

        return DashboardSummary(
            total_runs=total_runs,
            processed=processed,
            pending=pending,
            needs_confirmation=needs_confirmation,
            evidence_required=evidence_required,
            total_cost=round(total_cost, 2),
            cost_unit=cost_unit,
        )

    def bulk_get_records(self, run_ids: List[str]) -> Dict[str, Optional[ProcessingRecord]]:
        return {run_id: self._records.get(run_id) for run_id in run_ids}
