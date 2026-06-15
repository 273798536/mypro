from datetime import datetime, timezone
from typing import Dict, List, Optional
from . import ExceptionItem, ExceptionStatus, Note
from .state_manager import StateManager


class ExceptionQueue:
    def __init__(self, state_manager: StateManager):
        self.sm = state_manager

    def _load(self):
        self.sm.load()
        return self.sm.state

    def list_all(self, status_filter: Optional[str] = None) -> List[ExceptionItem]:
        state = self._load()
        items = state.exception_queue
        if status_filter:
            items = [i for i in items if i.status == status_filter]
        return items

    def list_pending(self) -> List[ExceptionItem]:
        return self.list_all(ExceptionStatus.PENDING.value)

    def list_resolved(self) -> List[ExceptionItem]:
        return self.list_all(ExceptionStatus.RESOLVED.value)

    def list_manual_override(self) -> List[ExceptionItem]:
        return self.list_all(ExceptionStatus.MANUAL_OVERRIDE.value)

    def resolve(self, item_id: str, resolved_by: str = "operator", note: str = "") -> Optional[ExceptionItem]:
        state = self._load()
        item = next((i for i in state.exception_queue if i.id == item_id), None)
        if item is None:
            return None
        item.status = ExceptionStatus.RESOLVED.value
        item.resolved_by = resolved_by
        item.resolved_at = datetime.now(timezone.utc).isoformat()
        if note:
            item.notes.append(Note(content=note, note_type="resolution", author=resolved_by))

        mat = next((m for m in state.materials if m.id == item.material_id), None)
        if mat:
            from . import MaterialStatus
            mat.status = MaterialStatus.NORMAL.value
            mat.updated_at = datetime.now(timezone.utc).isoformat()

        self.sm.save()
        return item

    def manual_override(self, item_id: str, resolved_by: str = "operator", reason: str = "", note: str = "") -> Optional[ExceptionItem]:
        state = self._load()
        item = next((i for i in state.exception_queue if i.id == item_id), None)
        if item is None:
            return None
        item.status = ExceptionStatus.MANUAL_OVERRIDE.value
        item.resolved_by = resolved_by
        item.resolved_at = datetime.now(timezone.utc).isoformat()
        if reason:
            item.notes.append(Note(content=reason, note_type="manual_override_reason", author=resolved_by))
        if note:
            item.notes.append(Note(content=note, note_type="manual_override_note", author=resolved_by))

        mat = next((m for m in state.materials if m.id == item.material_id), None)
        if mat:
            from . import MaterialStatus
            mat.status = MaterialStatus.SUPPLEMENTED.value
            mat.updated_at = datetime.now(timezone.utc).isoformat()

        self.sm.save()
        return item

    def get_summary(self) -> Dict:
        state = self._load()
        pending = [i for i in state.exception_queue if i.status == ExceptionStatus.PENDING.value]
        resolved = [i for i in state.exception_queue if i.status == ExceptionStatus.RESOLVED.value]
        manual = [i for i in state.exception_queue if i.status == ExceptionStatus.MANUAL_OVERRIDE.value]
        return {
            "total": len(state.exception_queue),
            "pending": len(pending),
            "resolved": len(resolved),
            "manual_override": len(manual),
            "pending_items": [
                {
                    "id": i.id,
                    "filename": i.material_filename,
                    "type": i.exception_type,
                    "reason": i.reason,
                    "next_step": i.next_step,
                }
                for i in pending
            ],
            "resolved_items": [
                {
                    "id": i.id,
                    "filename": i.material_filename,
                    "type": i.exception_type,
                    "resolved_by": i.resolved_by,
                    "resolved_at": i.resolved_at,
                }
                for i in resolved
            ],
            "manual_override_items": [
                {
                    "id": i.id,
                    "filename": i.material_filename,
                    "type": i.exception_type,
                    "resolved_by": i.resolved_by,
                    "reason": next(
                        (n.content for n in i.notes if n.note_type == "manual_override_reason"),
                        "",
                    ),
                }
                for i in manual
            ],
        }
