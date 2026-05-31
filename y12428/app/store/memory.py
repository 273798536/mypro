from __future__ import annotations
from typing import Dict, List, Optional
from app.models.enrollment import Enrollment
from app.models.agreement import Agreement
from app.models.split import SplitDetail
from app.models.dropout import DropoutRecord
from app.models.history import HistoryEntry


class MemoryStore:
    def __init__(self) -> None:
        self.enrollments: Dict[str, Enrollment] = {}
        self.agreements: Dict[str, Agreement] = {}
        self.splits: Dict[str, SplitDetail] = {}
        self.dropouts: Dict[str, DropoutRecord] = {}
        self.history: List[HistoryEntry] = []
        self._counters: Dict[str, int] = {
            "enrollment": 0,
            "agreement": 0,
            "split": 0,
            "dropout": 0,
            "history": 0,
        }

    def next_id(self, prefix: str) -> str:
        self._counters[prefix] = self._counters.get(prefix, 0) + 1
        return f"{prefix.upper()}{self._counters[prefix]:04d}"

    def add_enrollment(self, enr: Enrollment) -> Enrollment:
        self.enrollments[enr.id] = enr
        return enr

    def get_enrollment(self, eid: str) -> Optional[Enrollment]:
        return self.enrollments.get(eid)

    def list_enrollments(self) -> List[Enrollment]:
        return list(self.enrollments.values())

    def update_enrollment(self, eid: str, enr: Enrollment) -> Optional[Enrollment]:
        if eid not in self.enrollments:
            return None
        self.enrollments[eid] = enr
        return enr

    def add_agreement(self, agr: Agreement) -> Agreement:
        self.agreements[agr.id] = agr
        return agr

    def get_agreement(self, aid: str) -> Optional[Agreement]:
        return self.agreements.get(aid)

    def list_agreements(self) -> List[Agreement]:
        return list(self.agreements.values())

    def update_agreement(self, aid: str, agr: Agreement) -> Optional[Agreement]:
        if aid not in self.agreements:
            return None
        self.agreements[aid] = agr
        return agr

    def add_split(self, sp: SplitDetail) -> SplitDetail:
        self.splits[sp.id] = sp
        return sp

    def get_split(self, sid: str) -> Optional[SplitDetail]:
        return self.splits.get(sid)

    def list_splits(self) -> List[SplitDetail]:
        return list(self.splits.values())

    def update_split(self, sid: str, sp: SplitDetail) -> Optional[SplitDetail]:
        if sid not in self.splits:
            return None
        self.splits[sid] = sp
        return sp

    def add_dropout(self, dr: DropoutRecord) -> DropoutRecord:
        self.dropouts[dr.id] = dr
        return dr

    def get_dropout(self, did: str) -> Optional[DropoutRecord]:
        return self.dropouts.get(did)

    def list_dropouts(self) -> List[DropoutRecord]:
        return list(self.dropouts.values())

    def add_history(self, entry: HistoryEntry) -> HistoryEntry:
        self.history.append(entry)
        return entry

    def query_history(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
    ) -> List[HistoryEntry]:
        results = self.history
        if entity_type:
            results = [h for h in results if h.entity_type == entity_type]
        if entity_id:
            results = [h for h in results if h.entity_id == entity_id]
        if action:
            results = [h for h in results if h.action == action]
        return results


store = MemoryStore()
