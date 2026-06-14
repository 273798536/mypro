import os
import json
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from .models import (
    Material, Note, ProcessingSession, ProcessingState,
    MaterialType, NoteType, StudentProgress
)


class StateStore:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir).resolve()
        self.state_file = self.data_dir / "state.json"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._state = self._load()

    def _load(self) -> Dict[str, Any]:
        if self.state_file.exists():
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return self._get_empty_state()

    def _get_empty_state(self) -> Dict[str, Any]:
        return {
            "materials": {},
            "notes": {},
            "sessions": [],
            "current_session_id": None,
            "last_scan_at": None,
            "last_report_at": None,
            "metadata": {
                "project_name": "巡演耳返分账对齐",
                "created_at": datetime.now().isoformat()
            }
        }

    def save(self) -> None:
        self._state["last_updated_at"] = datetime.now().isoformat()
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(self._state, f, ensure_ascii=False, indent=2)

    def reload(self) -> None:
        self._state = self._load()

    def add_material(self, material: Material) -> None:
        self._state["materials"][material.id] = material.to_dict()
        self.save()

    def update_material(self, material: Material) -> None:
        if material.id in self._state["materials"]:
            self._state["materials"][material.id] = material.to_dict()
            self.save()

    def get_material(self, material_id: str) -> Optional[Material]:
        data = self._state["materials"].get(material_id)
        return Material.from_dict(data) if data else None

    def get_all_materials(self) -> List[Material]:
        return [Material.from_dict(d) for d in self._state["materials"].values()]

    def find_material_by_path(self, file_path: str) -> Optional[Material]:
        for mat in self.get_all_materials():
            if mat.file_path == file_path:
                return mat
        return None

    def find_materials_by_type(self, material_type: MaterialType) -> List[Material]:
        return [
            m for m in self.get_all_materials()
            if m.material_type == material_type
        ]

    def find_materials_with_auth_mark(self) -> List[Material]:
        return [
            m for m in self.get_all_materials()
            if m.authorization.marked
        ]

    def find_late_attachments(self) -> List[Material]:
        return [
            m for m in self.get_all_materials()
            if m.is_late_attachment
        ]

    def add_note(self, note: Note) -> None:
        self._state["notes"][note.id] = note.to_dict()
        for mat_id in note.material_ids:
            mat = self.get_material(mat_id)
            if mat and note.id not in mat.note_ids:
                mat.note_ids.append(note.id)
                self.update_material(mat)
        self.save()

    def get_note(self, note_id: str) -> Optional[Note]:
        data = self._state["notes"].get(note_id)
        return Note.from_dict(data) if data else None

    def get_all_notes(self) -> List[Note]:
        return [Note.from_dict(d) for d in self._state["notes"].values()]

    def get_notes_by_type(self, note_type: NoteType) -> List[Note]:
        return [
            n for n in self.get_all_notes()
            if n.note_type == note_type
        ]

    def get_notes_for_material(self, material_id: str) -> List[Note]:
        mat = self.get_material(material_id)
        if not mat:
            return []
        return [self.get_note(nid) for nid in mat.note_ids if self.get_note(nid)]

    def create_session(self) -> ProcessingSession:
        session = ProcessingSession.create()
        self._state["sessions"].append(session.to_dict())
        self._state["current_session_id"] = session.session_id
        self.save()
        return session

    def update_session(self, session: ProcessingSession) -> None:
        for i, s in enumerate(self._state["sessions"]):
            if s["session_id"] == session.session_id:
                self._state["sessions"][i] = session.to_dict()
                break
        self.save()

    def get_current_session(self) -> Optional[ProcessingSession]:
        sid = self._state.get("current_session_id")
        if not sid:
            sessions = self.get_all_sessions()
            return sessions[-1] if sessions else None
        return self.get_session(sid)

    def get_session(self, session_id: str) -> Optional[ProcessingSession]:
        for s in self._state["sessions"]:
            if s["session_id"] == session_id:
                return ProcessingSession.from_dict(s)
        return None

    def get_all_sessions(self) -> List[ProcessingSession]:
        return [ProcessingSession.from_dict(s) for s in self._state["sessions"]]

    def set_last_scan(self) -> None:
        self._state["last_scan_at"] = datetime.now().isoformat()
        self.save()

    def set_last_report(self) -> None:
        self._state["last_report_at"] = datetime.now().isoformat()
        self.save()

    def get_last_scan_at(self) -> Optional[str]:
        return self._state.get("last_scan_at")

    def get_last_report_at(self) -> Optional[str]:
        return self._state.get("last_report_at")

    def get_student_progress_all(self) -> List[StudentProgress]:
        all_progress = []
        seen_students = {}
        for mat in self.get_all_materials():
            for sp in mat.student_progress:
                if sp.student_name in seen_students:
                    existing = seen_students[sp.student_name]
                    existing.improvements.extend(sp.improvements)
                    existing.evidence_material_ids.extend(sp.evidence_material_ids)
                    if sp.current_level:
                        existing.current_level = sp.current_level
                else:
                    seen_students[sp.student_name] = sp
        return list(seen_students.values())

    def clear_all(self) -> None:
        self._state = self._get_empty_state()
        self.save()

    def get_processing_state(self) -> Dict[str, Any]:
        current_session = self.get_current_session()
        materials = self.get_all_materials()
        notes = self.get_all_notes()

        state_counts = {}
        for mat in materials:
            state = mat.processing_state.value
            state_counts[state] = state_counts.get(state, 0) + 1

        type_counts = {}
        for mat in materials:
            t = mat.material_type.value
            type_counts[t] = type_counts.get(t, 0) + 1

        return {
            "current_session_id": self._state.get("current_session_id"),
            "last_scan_at": self._state.get("last_scan_at"),
            "last_report_at": self._state.get("last_report_at"),
            "total_materials": len(materials),
            "total_notes": len(notes),
            "total_sessions": len(self._state["sessions"]),
            "materials_by_state": state_counts,
            "materials_by_type": type_counts,
            "auth_marked_count": len(self.find_materials_with_auth_mark()),
            "late_attachment_count": len(self.find_late_attachments()),
            "current_session": current_session.to_dict() if current_session else None
        }

    def export_for_delivery(self, export_dir: str) -> Path:
        export_path = Path(export_dir).resolve()
        export_path.mkdir(parents=True, exist_ok=True)

        materials_dir = export_path / "materials"
        materials_dir.mkdir(exist_ok=True)

        for mat in self.get_all_materials():
            if os.path.exists(mat.file_path):
                dest_name = mat.get_display_name()
                dest_path = materials_dir / dest_name
                try:
                    shutil.copy2(mat.file_path, dest_path)
                except Exception:
                    with open(dest_path, "w", encoding="utf-8") as f:
                        f.write(f"# {mat.get_display_name()}\n\n")
                        f.write(f"原文件路径: {mat.file_path}\n")
                        f.write(f"接收时间: {mat.received_at}\n")
                        f.write(f"材料类型: {mat.material_type.value}\n")
                        if mat.content:
                            f.write(f"\n---\n{mat.content}\n")

        with open(export_path / "状态摘要.json", "w", encoding="utf-8") as f:
            json.dump(self.get_processing_state(), f, ensure_ascii=False, indent=2)

        with open(export_path / "历史备注.md", "w", encoding="utf-8") as f:
            f.write("# 历史备注\n\n")
            for note in sorted(self.get_all_notes(), key=lambda n: n.timestamp):
                f.write(f"## [{note.note_type.value}] {note.timestamp}\n")
                f.write(f"**作者**: {note.author}\n")
                f.write(f"**内容**: {note.content}\n")
                if note.material_ids:
                    mat_names = [self.get_material(mid).file_name if self.get_material(mid) else mid
                                 for mid in note.material_ids]
                    f.write(f"**关联材料**: {', '.join(mat_names)}\n")
                f.write("\n")

        with open(export_path / "交付清单.md", "w", encoding="utf-8") as f:
            f.write("# 交付清单\n\n")
            f.write(f"生成时间: {datetime.now().isoformat()}\n\n")
            f.write("## 材料清单\n\n")
            f.write("| 文件名 | 类型 | 状态 | 授权标记 | 备注 |\n")
            f.write("|--------|------|------|----------|------|\n")
            for mat in sorted(self.get_all_materials(), key=lambda m: m.received_at):
                auth_mark = "⚠️ 是" if mat.authorization.marked else "否"
                late_mark = "晚到附件" if mat.is_late_attachment else ""
                concl_mark = "最终结论" if mat.is_conclusion else ""
                notes_count = len(mat.note_ids)
                note_str = f"{notes_count}条备注"
                extras = [m for m in [late_mark, concl_mark] if m]
                if extras:
                    note_str += f" ({', '.join(extras)})"
                f.write(f"| {mat.get_display_name()} | {mat.material_type.value} | "
                        f"{mat.processing_state.value} | {auth_mark} | {note_str} |\n")

            f.write("\n## 版本追踪\n\n")
            for mat in sorted(self.get_all_materials(), key=lambda m: m.received_at):
                if len(mat.versions) > 1:
                    f.write(f"### {mat.file_name}\n\n")
                    for v in mat.versions:
                        f.write(f"- v{v.version}: {v.timestamp}")
                        if v.changes_summary:
                            f.write(f" - {v.changes_summary}")
                        f.write("\n")
                    f.write("\n")

        return export_path
