import os
import re
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
import fnmatch

from .models import (
    Material, Note, ProcessingSession, ProcessingState,
    MaterialType, NoteType, AuthStatus,
    AuthorizationInfo, StudentProgress, MaterialVersion
)
from .storage import StateStore


class MaterialProcessor:
    def __init__(self, store: StateStore):
        self.store = store

    def scan_directory(self, materials_dir: str, rescan: bool = False) -> ProcessingSession:
        session = self.store.create_session()
        materials_path = Path(materials_dir).resolve()

        if materials_path.exists():
            for root, _, files in os.walk(materials_path):
                for filename in files:
                    if filename.startswith('.'):
                        continue
                    file_path = os.path.join(root, filename)
                    self._process_file(file_path, session, rescan)

        materials = self.store.get_all_materials()
        self._link_late_attachments(materials, session)
        self._detect_authorization_status(materials)
        self._analyze_student_progress(materials)
        self._update_processing_states(materials)

        session.finished_at = datetime.now().isoformat()
        self.store.update_session(session)
        self.store.set_last_scan()

        return session

    def _process_file(self, file_path: str, session: ProcessingSession, rescan: bool) -> Optional[Material]:
        existing = self.store.find_material_by_path(file_path)

        if existing and not rescan:
            if existing.id not in session.material_ids:
                session.material_ids.append(existing.id)
            return existing

        try:
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
        except OSError:
            file_mtime = datetime.now()

        new_material = Material.from_file(file_path, received_at=file_mtime.isoformat())

        if existing and rescan:
            new_content_hash = hashlib.md5(new_material.content.encode('utf-8')).hexdigest()
            old_latest = existing.versions[-1] if existing.versions else None

            if old_latest and old_latest.content_hash != new_content_hash:
                new_version = MaterialVersion(
                    version=len(existing.versions) + 1,
                    timestamp=datetime.now().isoformat(),
                    content_hash=new_content_hash,
                    changes_summary="内容更新（重扫发现变化）"
                )
                existing.versions.append(new_version)
                existing.content = new_material.content
                existing.received_at = new_material.received_at
                existing.processing_state = ProcessingState.SCANNED
                self.store.update_material(existing)
                if existing.id not in session.material_ids:
                    session.material_ids.append(existing.id)
                return existing
            else:
                if existing.id not in session.material_ids:
                    session.material_ids.append(existing.id)
                return existing

        new_material.processing_state = ProcessingState.SCANNED
        self.store.add_material(new_material)
        session.material_ids.append(new_material.id)

        return new_material

    def _link_late_attachments(self, materials: List[Material], session: ProcessingSession) -> None:
        sorted_materials = sorted(materials, key=lambda m: m.received_at)

        conclusion_materials = [m for m in sorted_materials if m.is_conclusion or m.material_type == MaterialType.CONCLUSION]

        if not conclusion_materials and len(sorted_materials) > 1:
            last_mat = sorted_materials[-1]
            if not last_mat.is_conclusion and last_mat.material_type != MaterialType.CONCLUSION:
                for mat in sorted_materials[:-1]:
                    if mat.material_type in [MaterialType.SCREENSHOT, MaterialType.ATTACHMENT]:
                        last_mat.is_conclusion = True
                        last_mat.material_type = MaterialType.CONCLUSION
                        last_mat.tags.append("自动识别为结论")
                        self.store.update_material(last_mat)
                        conclusion_materials = [last_mat]
                        break

        if conclusion_materials:
            final_conclusion = conclusion_materials[-1]
            session.final_conclusion_material_id = final_conclusion.id

            if len(sorted_materials) >= 2:
                last_received = sorted_materials[-1]
                if last_received.id != final_conclusion.id and last_received.received_at > final_conclusion.received_at:
                    last_received.is_late_attachment = True
                    last_received.tags.append("晚到附件")
                    if final_conclusion.id not in last_received.linked_material_ids:
                        last_received.linked_material_ids.append(final_conclusion.id)
                    if last_received.id not in final_conclusion.linked_material_ids:
                        final_conclusion.linked_material_ids.append(last_received.id)
                    self.store.update_material(last_received)
                    self.store.update_material(final_conclusion)

                    if last_received.id not in session.late_attachment_ids:
                        session.late_attachment_ids.append(last_received.id)

            for mat in sorted_materials:
                if mat.id != final_conclusion.id and mat.material_type == MaterialType.ATTACHMENT:
                    time_diff = self._time_diff_hours(final_conclusion.received_at, mat.received_at)
                    if time_diff > 0 and mat.received_at > final_conclusion.received_at:
                        if not mat.is_late_attachment:
                            mat.is_late_attachment = True
                            mat.tags.append("晚到附件")
                        if final_conclusion.id not in mat.linked_material_ids:
                            mat.linked_material_ids.append(final_conclusion.id)
                        if mat.id not in final_conclusion.linked_material_ids:
                            final_conclusion.linked_material_ids.append(mat.id)
                        self.store.update_material(mat)
                        if mat.id not in session.late_attachment_ids:
                            session.late_attachment_ids.append(mat.id)

            self.store.update_material(final_conclusion)

    def _detect_authorization_status(self, materials: List[Material]) -> None:
        today = datetime.now()

        for mat in materials:
            if mat.material_type != MaterialType.AUTH_DOC:
                continue

            content = (mat.content or "").lower()
            file_name_lower = mat.file_name.lower()

            expire_date = None
            date_patterns = [
                r'到期日[：: ]*\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
                r'expir(?:e|ation)[：: ]*\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
                r'有效期至[：: ]*\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
                r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
            ]

            for pattern in date_patterns:
                match = re.search(pattern, content)
                if match:
                    expire_date = match.group(1)
                    break

            if not expire_date:
                match = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})', file_name_lower)
                if match:
                    expire_date = match.group(1)

            if expire_date:
                expire_date = expire_date.replace('/', '-')
                mat.authorization.expire_date = expire_date

                try:
                    expire_dt = datetime.strptime(expire_date, '%Y-%m-%d')
                    days_remaining = (expire_dt - today).days
                    mat.authorization.days_remaining = days_remaining

                    if days_remaining < 0:
                        mat.authorization.status = AuthStatus.EXPIRED
                        mat.authorization.marked = True
                        mat.tags.append("授权已过期")
                    elif days_remaining <= 30:
                        mat.authorization.status = AuthStatus.EXPIRING_SOON
                        mat.authorization.marked = True
                        mat.tags.append("授权即将到期")
                    else:
                        mat.authorization.status = AuthStatus.VALID

                    if "已过期" in content or "expired" in content:
                        mat.authorization.status = AuthStatus.EXPIRED
                        mat.authorization.marked = True
                except ValueError:
                    mat.authorization.status = AuthStatus.UNKNOWN

            if "到期" in content or "expir" in content or "license" in content:
                mat.authorization.marked = True

            if "授权" in mat.file_name or "auth" in file_name_lower or "license" in file_name_lower:
                mat.authorization.marked = True

            self.store.update_material(mat)

    def _analyze_student_progress(self, materials: List[Material]) -> None:
        student_names = ["学生A", "学生B", "学生C", "小明", "小红", "小李"]
        keywords = {
            "进步": ["进步", "提高", "变好", "稳定", "到位", "清晰", "准确"],
            "退步": ["退步", "下降", "不稳", "走调", "跑调", "忘词"],
            "技巧": ["高音", "低音", "节奏", "音准", "气息", "咬字", "发声"],
        }

        for mat in materials:
            content = mat.content or ""
            if not content:
                continue

            for student in student_names:
                if student not in content:
                    continue

                improvements = []
                for skill in keywords["技巧"]:
                    if skill in content:
                        for prog in keywords["进步"]:
                            if prog in content:
                                improvements.append(f"{skill}{prog}")
                                break

                if improvements:
                    sp = StudentProgress(
                        student_name=student,
                        improvements=improvements,
                        evidence_material_ids=[mat.id]
                    )
                    mat.student_progress.append(sp)
                    mat.tags.append(f"含{student}进步分析")
                    self.store.update_material(mat)

    def _update_processing_states(self, materials: List[Material]) -> None:
        for mat in materials:
            if mat.processing_state == ProcessingState.PENDING:
                mat.processing_state = ProcessingState.SCANNED

            if mat.content and mat.student_progress:
                mat.processing_state = ProcessingState.ANALYZED

            if mat.is_conclusion:
                mat.processing_state = ProcessingState.CONCLUDED

            if mat.note_ids:
                mat.processing_state = ProcessingState.REVIEWED

            self.store.update_material(mat)

    def _time_diff_hours(self, time1: str, time2: str) -> float:
        try:
            dt1 = datetime.fromisoformat(time1.replace('Z', '+00:00'))
            dt2 = datetime.fromisoformat(time2.replace('Z', '+00:00'))
            return (dt2 - dt1).total_seconds() / 3600
        except (ValueError, TypeError):
            return 0

    def filter_materials(self,
                       material_type: Optional[MaterialType] = None,
                       auth_marked: Optional[bool] = None,
                       has_notes: Optional[bool] = None,
                       late_only: bool = False,
                       conclusion_only: bool = False) -> List[Material]:
        materials = self.store.get_all_materials()

        if material_type:
            materials = [m for m in materials if m.material_type == material_type]

        if auth_marked is not None:
            materials = [m for m in materials if m.authorization.marked == auth_marked]

        if has_notes is not None:
            if has_notes:
                materials = [m for m in materials if m.note_ids]
            else:
                materials = [m for m in materials if not m.note_ids]

        if late_only:
            materials = [m for m in materials if m.is_late_attachment]

        if conclusion_only:
            materials = [m for m in materials if m.is_conclusion or m.material_type == MaterialType.CONCLUSION]

        return materials

    def get_material_detail(self, material_id: str) -> Dict[str, Any]:
        mat = self.store.get_material(material_id)
        if not mat:
            return {}

        notes = self.store.get_notes_for_material(material_id)
        linked_materials = [self.store.get_material(lid) for lid in mat.linked_material_ids
                           if self.store.get_material(lid)]

        return {
            "material": mat,
            "notes": notes,
            "linked_materials": linked_materials,
            "versions": mat.versions
        }

    def add_rehearsal_note(self, content: str, material_ids: Optional[List[str]] = None) -> Note:
        note = Note.create(content, NoteType.REHEARSAL, material_ids=material_ids)
        self.store.add_note(note)

        session = self.store.get_current_session()
        if session and note.id not in session.note_ids:
            session.note_ids.append(note.id)
            self.store.update_session(session)

        for mid in (material_ids or []):
            mat = self.store.get_material(mid)
            if mat:
                if note.id not in mat.note_ids:
                    mat.note_ids.append(note.id)
                self.store.update_material(mat)

        return note

    def add_authorization_note(self, content: str, material_ids: Optional[List[str]] = None) -> Note:
        note = Note.create(content, NoteType.AUTHORIZATION, material_ids=material_ids)
        self.store.add_note(note)

        session = self.store.get_current_session()
        if session and note.id not in session.note_ids:
            session.note_ids.append(note.id)
            self.store.update_session(session)

        for mid in (material_ids or []):
            mat = self.store.get_material(mid)
            if mat:
                mat.authorization.marked = True
                if note.id not in mat.note_ids:
                    mat.note_ids.append(note.id)
                self.store.update_material(mat)

        return note

    def add_general_note(self, content: str, material_ids: Optional[List[str]] = None) -> Note:
        note = Note.create(content, NoteType.GENERAL, material_ids=material_ids)
        self.store.add_note(note)

        session = self.store.get_current_session()
        if session and note.id not in session.note_ids:
            session.note_ids.append(note.id)
            self.store.update_session(session)

        for mid in (material_ids or []):
            mat = self.store.get_material(mid)
            if mat:
                if note.id not in mat.note_ids:
                    mat.note_ids.append(note.id)
                self.store.update_material(mat)

        return note

    def get_alignment_status(self) -> Dict[str, Any]:
        materials = self.store.get_all_materials()
        notes = self.store.get_all_notes()

        aligned_count = 0
        unaligned_count = 0
        alignment_issues = []

        for mat in materials:
            notes_for_mat = self.store.get_notes_for_material(mat.id)
            has_version_notes = any(n for n in notes_for_mat if n.material_ids and mat.id in n.material_ids)

            if mat.versions and notes_for_mat and has_version_notes:
                aligned_count += 1
            elif mat.versions or notes_for_mat:
                unaligned_count += 1
                if not mat.versions:
                    alignment_issues.append(f"{mat.file_name}: 缺少版本记录")
                if not notes_for_mat:
                    alignment_issues.append(f"{mat.file_name}: 缺少备注")

        return {
            "total_materials": len(materials),
            "aligned": aligned_count,
            "unaligned": unaligned_count,
            "alignment_rate": f"{aligned_count / len(materials) * 100:.1f}%" if materials else "0%",
            "issues": alignment_issues
        }
