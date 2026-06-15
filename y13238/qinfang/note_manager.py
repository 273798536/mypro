from datetime import datetime, timezone
from typing import Dict, List, Optional
from . import Material, Note, MaterialStatus
from .state_manager import StateManager


class NoteManager:
    def __init__(self, state_manager: StateManager):
        self.sm = state_manager

    def _load(self):
        self.sm.load()
        return self.sm.state

    def add_note(self, material_id: str, content: str, note_type: str = "general", author: str = "operator") -> Optional[Material]:
        state = self._load()
        mat = next((m for m in state.materials if m.id == material_id), None)
        if mat is None:
            return None
        note = Note(content=content, note_type=note_type, author=author)
        mat.notes.append(note)
        mat.updated_at = datetime.now(timezone.utc).isoformat()
        self.sm.save()
        return mat

    def add_alias(self, material_id: str, alias: str) -> Optional[Material]:
        state = self._load()
        mat = next((m for m in state.materials if m.id == material_id), None)
        if mat is None:
            return None
        if alias not in mat.aliases:
            mat.aliases.append(alias)
        mat.updated_at = datetime.now(timezone.utc).isoformat()
        self.sm.save()
        return mat

    def set_canonical_name(self, material_id: str, canonical_name: str) -> Optional[Material]:
        state = self._load()
        mat = next((m for m in state.materials if m.id == material_id), None)
        if mat is None:
            return None
        old_name = mat.canonical_name
        mat.canonical_name = canonical_name
        if old_name not in mat.aliases:
            mat.aliases.append(old_name)
        mat.status = MaterialStatus.SUPPLEMENTED.value
        mat.updated_at = datetime.now(timezone.utc).isoformat()
        self.sm.save()
        return mat

    def set_version(self, material_id: str, version: int) -> Optional[Material]:
        state = self._load()
        mat = next((m for m in state.materials if m.id == material_id), None)
        if mat is None:
            return None
        mat.version = version
        mat.status = MaterialStatus.SUPPLEMENTED.value
        mat.updated_at = datetime.now(timezone.utc).isoformat()
        self.sm.save()
        return mat

    def list_notes(self, material_id: str) -> List[Note]:
        state = self._load()
        mat = next((m for m in state.materials if m.id == material_id), None)
        if mat is None:
            return []
        return mat.notes

    def get_delivery_list(self) -> List[Dict]:
        state = self._load()
        result = []
        for mat in state.materials:
            notes_summary = [
                {"type": n.note_type, "content": n.content, "author": n.author, "created_at": n.created_at}
                for n in mat.notes
            ]
            result.append({
                "id": mat.id,
                "filename": mat.filename,
                "canonical_name": mat.canonical_name,
                "aliases": mat.aliases,
                "version": mat.version,
                "status": mat.status,
                "notes": notes_summary,
                "created_at": mat.created_at,
                "updated_at": mat.updated_at,
            })
        return result
