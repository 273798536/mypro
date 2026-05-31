from typing import List, Dict, Optional, Tuple
from datetime import date, datetime
from collections import defaultdict
from models import EntryRecord, EntryType, AdjustmentRecord, AdjustmentType
import uuid


class EntryDeduplicationService:
    def __init__(self, data_store):
        self.data_store = data_store

    def detect_duplicates(self, account_id: str, entry_date: date) -> List[EntryRecord]:
        entries = [
            e for e in self.data_store.get_entry_records_by_account(account_id)
            if e.entry_date == entry_date and e.is_valid
        ]
        if len(entries) <= 1:
            return []
        sorted_entries = sorted(entries, key=lambda e: e.entry_time or datetime.min)
        duplicates = sorted_entries[1:]
        for dup in duplicates:
            dup.is_duplicate = True
            dup.duplicate_of_entry_id = sorted_entries[0].entry_id
            dup.entry_type = EntryType.DUPLICATE
        return duplicates

    def deduplicate_all_entries(self) -> Dict[str, List[EntryRecord]]:
        duplicates_by_account = defaultdict(list)
        entry_groups: Dict[Tuple[str, date], List[EntryRecord]] = defaultdict(list)
        for entry in self.data_store.entry_records.values():
            if entry.is_valid:
                entry_groups[(entry.account_id, entry.entry_date)].append(entry)
        for (account_id, entry_date), entries in entry_groups.items():
            if len(entries) > 1:
                sorted_entries = sorted(entries, key=lambda e: e.entry_time or datetime.min)
                for dup in sorted_entries[1:]:
                    dup.is_duplicate = True
                    dup.duplicate_of_entry_id = sorted_entries[0].entry_id
                    dup.entry_type = EntryType.DUPLICATE
                    duplicates_by_account[account_id].append(dup)
        return dict(duplicates_by_account)

    def get_valid_entry_records(self, account_id: str, start_date: date,
                                end_date: date) -> List[EntryRecord]:
        entries = self.data_store.get_entry_records_by_account(account_id)
        return [
            e for e in entries
            if start_date <= e.entry_date <= end_date
            and not e.is_duplicate
            and e.is_valid
        ]

    def get_duplicate_entries(self, account_id: Optional[str] = None) -> List[EntryRecord]:
        if account_id:
            entries = self.data_store.get_entry_records_by_account(account_id)
        else:
            entries = list(self.data_store.entry_records.values())
        return [e for e in entries if e.is_duplicate]

    def get_entry_count_by_date(self, account_id: str, start_date: date,
                                end_date: date, deduplicated: bool = True) -> Dict[date, int]:
        counts = defaultdict(int)
        entries = self.data_store.get_entry_records_by_account(account_id)
        for e in entries:
            if start_date <= e.entry_date <= end_date:
                if deduplicated and e.is_duplicate:
                    continue
                counts[e.entry_date] += 1
        return dict(counts)

    def create_duplicate_adjustment(self, account_id: str, entry_date: date,
                                    operator: Optional[str] = None) -> Optional[AdjustmentRecord]:
        duplicates = self.detect_duplicates(account_id, entry_date)
        if not duplicates:
            return None
        affected_details = [
            d.detail_id
            for d in self.data_store.get_revenue_details_by_account(account_id)
            if d.revenue_date == entry_date
        ]
        adjustment = AdjustmentRecord(
            adjustment_id=f"adj_{uuid.uuid4().hex[:8]}",
            account_id=account_id,
            adjustment_type=AdjustmentType.DUPLICATE_ENTRY,
            adjustment_date=date.today(),
            amount=0,
            affected_revenue_detail_ids=affected_details,
            source_record_id=duplicates[0].entry_id,
            source_record_type="duplicate_entry",
            is_processed=True,
            processed_at=datetime.now(),
            operator=operator,
            remarks=f"检测到 {len(duplicates)} 条重复入园记录于 {entry_date}"
        )
        self.data_store.add_adjustment_record(adjustment)
        return adjustment
