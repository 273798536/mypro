from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

from .models import Note, DetectionRecord


@dataclass
class IdempotencyGuard:
    _seen_signatures: Dict[str, str] = field(default_factory=dict)
    _last_record_signatures: List[str] = field(default_factory=list)

    def reset_from_record(self, record: Optional[DetectionRecord]) -> None:
        if record is None:
            return
        self._last_record_signatures = list(record.note_signatures_seen)
        for sig in record.note_signatures_seen:
            if sig not in self._seen_signatures:
                self._seen_signatures[sig] = record.record_id

    def filter_new_notes(
        self, notes: List[Note], record_id: str = ""
    ) -> Tuple[List[Note], List[str]]:
        fresh: List[Note] = []
        skipped_signatures: List[str] = []
        for n in notes:
            sig = n.signature()
            if sig in self._seen_signatures:
                skipped_signatures.append(sig)
                continue
            self._seen_signatures[sig] = record_id
            fresh.append(n)
        return fresh, skipped_signatures

    def is_signature_seen(self, sig: str) -> bool:
        return sig in self._seen_signatures

    def mark_scan(self, notes_seen: List[Note]) -> List[str]:
        sigs = [n.signature() for n in notes_seen]
        self._last_record_signatures = sigs
        return sigs

    def dedupe_note_count(self, notes: List[Note]) -> int:
        uniq = {n.signature() for n in notes}
        return len(uniq)

    def diff_since_last_scan(
        self, current_notes: List[Note]
    ) -> Tuple[List[Note], List[str]]:
        current_sigs = {n.signature(): n for n in current_notes}
        added: List[Note] = []
        for sig, note in current_sigs.items():
            if sig not in self._last_record_signatures:
                added.append(note)
        removed = [
            s for s in self._last_record_signatures if s not in current_sigs
        ]
        return added, removed
