import copy
from typing import List, Optional, Callable
from data.models import TrainingRecord, AnnotationRecord, RecordStatus
from data.sample_data import build_training_records


class DataStore:
    def __init__(self):
        self._records: List[TrainingRecord] = build_training_records()
        self._listeners: List[Callable] = []

    def get_all_records(self) -> List[TrainingRecord]:
        return copy.deepcopy(self._records)

    def get_record_by_id(self, record_id: str) -> Optional[TrainingRecord]:
        for rec in self._records:
            if rec.record_id == record_id:
                return copy.deepcopy(rec)
        return None

    def get_records_by_status(self, status: RecordStatus) -> List[TrainingRecord]:
        return [copy.deepcopy(r) for r in self._records if r.current_status == status]

    def get_records_by_batch(self, batch_id: str) -> List[TrainingRecord]:
        return [copy.deepcopy(r) for r in self._records if r.batch_id == batch_id]

    def update_record_status(self, record_id: str, new_status: RecordStatus) -> bool:
        for rec in self._records:
            if rec.record_id == record_id:
                rec.current_status = new_status
                self._notify_listeners()
                return True
        return False

    def add_annotation(self, record_id: str, annotation: AnnotationRecord) -> bool:
        for rec in self._records:
            if rec.record_id == record_id:
                rec.annotations.append(annotation)
                if annotation.manual_note and not rec.raw_manual_note:
                    rec.raw_manual_note = annotation.manual_note
                rec.current_status = annotation.final_decision
                self._notify_listeners()
                return True
        return False

    def update_manual_note(self, record_id: str, note: str) -> bool:
        for rec in self._records:
            if rec.record_id == record_id:
                rec.raw_manual_note = note
                self._notify_listeners()
                return True
        return False

    def increment_retry_count(self, record_id: str) -> bool:
        for rec in self._records:
            if rec.record_id == record_id:
                rec.retry_count += 1
                self._notify_listeners()
                return True
        return False

    def get_unusable_records(self) -> List[TrainingRecord]:
        unusable = []
        for rec in self._records:
            if (
                rec.current_status == RecordStatus.BLOCKED
                and rec.retry_count >= 2
            ):
                unusable.append(copy.deepcopy(rec))
            elif (
                rec.current_status == RecordStatus.BLOCKED
                and rec.failure_category.value in ("安全规则漏配", "安全规则与评测题库不匹配")
                and not rec.matched_question_bank
            ):
                unusable.append(copy.deepcopy(rec))
        return unusable

    def register_listener(self, callback: Callable):
        self._listeners.append(callback)

    def _notify_listeners(self):
        for cb in self._listeners:
            try:
                cb()
            except Exception:
                pass


_store_instance: Optional[DataStore] = None


def get_store() -> DataStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = DataStore()
    return _store_instance
