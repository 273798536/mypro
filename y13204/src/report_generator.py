import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from .models import Material, Note, StudentProgress, AuthStatus
from .storage import StateStore


class MarkdownReportGenerator:
    def __init__(self, store: StateStore, reports_dir: str = "./reports"):
        self.store = store
        self.reports_dir = Path(reports_dir).resolve()
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def generate_all_reports(self) -> List[str]:
        reports = []
        reports.append(self.generate_alignment_report())
        reports.append(self.generate_student_progress_report())
        self.store.set_last_report()
        return reports

    def generate_alignment_report(self) -> str:
        materials = self.store.get_all_materials()
        notes = self.store.get_all_notes()
        session = self.store.get_current_session()
        auth_marked = self.store.find_materials_with_auth_mark()
        late_attachments = self.store.find_late_attachments()
        alignment = self._get_alignment_data()

        report_path = self.reports_dir / "分账对齐报告.md"

        with open(report_path, "w", encoding="utf-8") as f:
            f.write("# 巡演耳返分账对齐报告\n\n")
            f.write(f"**生成时间**: {datetime.now().isoformat()}\n\n")

            if session:
                f.write(f"**处理会话**: {session.session_id}\n")
                f.write(f"**开始时间**: {session.started_at}\n")
                if session.finished_at:
                    f.write(f"**完成时间**: {session.finished_at}\n")
                f.write("\n")

            f.write("## 一、处理概览\n\n")
            f.write(f"- 材料总数: {len(materials)}\n")
            f.write(f"- 备注总数: {len(notes)}\n")
            f.write(f"- 授权标记数: {len(auth_marked)}\n")
            f.write(f"- 晚到附件数: {len(late_attachments)}\n")
            f.write(f"- 对齐率: {alignment['alignment_rate']}\n\n")

            f.write("## 二、材料清单（按接收时间）\n\n")
            f.write("| 序号 | 文件名 | 类型 | 状态 | 授权标记 | 晚到 | 备注数 |\n")
            f.write("|------|--------|------|------|----------|------|--------|\n")

            for i, mat in enumerate(sorted(materials, key=lambda m: m.received_at), 1):
                auth_mark = "⚠️ 是" if mat.authorization.marked else "否"
                late_mark = "是" if mat.is_late_attachment else "否"
                concl_marker = " [结论]" if mat.is_conclusion else ""
                f.write(f"| {i} | {mat.file_name}{concl_marker} | "
                        f"{mat.material_type.value} | {mat.processing_state.value} | "
                        f"{auth_mark} | {late_mark} | {len(mat.note_ids)} |\n")

            f.write("\n## 三、授权到期标记\n\n")
            if auth_marked:
                for mat in sorted(auth_marked, key=lambda m: m.authorization.days_remaining or 9999):
                    f.write(f"### {mat.get_display_name()}\n\n")
                    f.write(f"- 状态: **{mat.authorization.status.value}**\n")
                    if mat.authorization.expire_date:
                        f.write(f"- 到期日: {mat.authorization.expire_date}\n")
                    if mat.authorization.days_remaining is not None:
                        if mat.authorization.days_remaining >= 0:
                            f.write(f"- 剩余天数: {mat.authorization.days_remaining} 天\n")
                        else:
                            f.write(f"- 已过期: {abs(mat.authorization.days_remaining)} 天\n")
                    if mat.tags:
                        f.write(f"- 标签: {', '.join(mat.tags)}\n")
                    f.write("\n")
            else:
                f.write("> 暂无授权到期标记的材料\n\n")

            f.write("## 四、晚到附件关联\n\n")
            if late_attachments:
                for mat in late_attachments:
                    f.write(f"### {mat.get_display_name()}\n\n")
                    f.write(f"- 接收时间: {mat.received_at}\n")
                    if mat.linked_material_ids:
                        linked_names = [self.store.get_material(lid).file_name
                                       for lid in mat.linked_material_ids
                                       if self.store.get_material(lid)]
                        f.write(f"- 关联结论: {', '.join(linked_names)}\n")
                    f.write("\n")
            else:
                f.write("> 暂无晚到附件\n\n")

            f.write("## 五、版本追踪\n\n")
            has_versions = any(len(m.versions) > 1 for m in materials)
            if has_versions:
                for mat in materials:
                    if len(mat.versions) > 1:
                        f.write(f"### {mat.file_name}\n\n")
                        for v in mat.versions:
                            f.write(f"- **v{v.version}**: {v.timestamp}")
                            if v.changes_summary:
                                f.write(f" - {v.changes_summary}")
                            if v.note_ids:
                                note_contents = [self.store.get_note(nid).content[:30] + "..."
                                                for nid in v.note_ids
                                                if self.store.get_note(nid)]
                                if note_contents:
                                    f.write(f" (备注: {', '.join(note_contents)})")
                            f.write("\n")
                        f.write("\n")
            else:
                f.write("> 所有材料均为单一版本\n\n")

            f.write("## 六、对齐状态\n\n")
            f.write(f"- 对齐率: {alignment['alignment_rate']} ({alignment['aligned']}/{alignment['total_materials']} 份)\n")
            f.write(f"- 严格对齐率（双向引用）: {alignment['strict_alignment_rate']} ({alignment['strict_aligned']} 份)\n")
            f.write(f"- 待处理: {alignment['unaligned']} 项\n")
            if alignment.get('aligned_materials'):
                f.write("\n**已对齐材料:**\n\n")
                for name in alignment['aligned_materials']:
                    f.write(f"- ✅ {name}\n")
            if alignment['issues']:
                f.write("\n**存在的问题:**\n\n")
                for issue in alignment['issues']:
                    f.write(f"- ⚠️ {issue}\n")
            f.write("\n")

            f.write("## 七、历史备注\n\n")
            if notes:
                for note in sorted(notes, key=lambda n: n.timestamp):
                    f.write(f"### [{note.note_type.value}] {note.timestamp}\n\n")
                    f.write(f"**作者**: {note.author}\n\n")
                    f.write(f"{note.content}\n\n")
                    if note.material_ids:
                        mat_names = [self.store.get_material(mid).file_name
                                    for mid in note.material_ids
                                    if self.store.get_material(mid)]
                        f.write(f"*关联材料: {', '.join(mat_names)}*\n\n")
            else:
                f.write("> 暂无历史备注\n\n")

        return str(report_path)

    def generate_student_progress_report(self) -> str:
        all_progress = self.store.get_student_progress_all()
        materials = self.store.get_all_materials()
        notes = self.store.get_all_notes()

        report_path = self.reports_dir / "学生进步分析.md"

        with open(report_path, "w", encoding="utf-8") as f:
            f.write("# 学生进步分析报告\n\n")
            f.write(f"**生成时间**: {datetime.now().isoformat()}\n\n")

            f.write("## 一、进步总览\n\n")
            f.write(f"- 学生总数: {len(all_progress)}\n")
            f.write(f"- 分析材料数: {len([m for m in materials if m.student_progress])}\n\n")

            if all_progress:
                f.write("## 二、学生进步详情\n\n")

                for sp in all_progress:
                    f.write(f"### {sp.student_name}\n\n")

                    if sp.previous_level:
                        f.write(f"- **之前水平**: {sp.previous_level}\n")
                    if sp.current_level:
                        f.write(f"- **当前水平**: {sp.current_level}\n")

                    unique_improvements = list(dict.fromkeys(sp.improvements))
                    f.write(f"\n**进步点** ({len(unique_improvements)}项): \n\n")
                    for imp in unique_improvements:
                        f.write(f"- ✅ {imp}\n")

                    if sp.evidence_snippets:
                        unique_snippets = list(dict.fromkeys(sp.evidence_snippets))
                        f.write(f"\n**证据原文** ({len(unique_snippets)}条):\n\n")
                        for i, snippet in enumerate(unique_snippets, 1):
                            f.write(f"> {i}. {snippet}\n\n")

                    if sp.evidence_material_ids:
                        unique_mids = list(dict.fromkeys(sp.evidence_material_ids))
                        f.write(f"\n**证据材料** ({len(unique_mids)}份): \n\n")
                        for mid in unique_mids:
                            mat = self.store.get_material(mid)
                            if mat:
                                f.write(f"- 📄 [{mat.get_display_name()}]({mat.file_path}) — 接收时间: {mat.received_at}\n")

                    related_notes = [n for n in notes if sp.student_name in n.content]
                    if related_notes:
                        seen_notes = []
                        for n in related_notes:
                            if n.id not in [x.id for x in seen_notes]:
                                seen_notes.append(n)
                        f.write(f"\n**相关备注** ({len(seen_notes)}条): \n\n")
                        for note in seen_notes[:8]:
                            f.write(f"- 📝 [{note.note_type.value}] {note.timestamp}: {note.content[:100]}\n")

                    f.write("\n---\n\n")
            else:
                f.write("> 暂无学生进步分析数据\n\n")

            f.write("## 三、排练备注时间线\n\n")
            rehearsal_notes = [n for n in notes if n.note_type.value == "rehearsal"]
            if rehearsal_notes:
                for note in sorted(rehearsal_notes, key=lambda n: n.timestamp):
                    f.write(f"### {note.timestamp}\n\n")
                    f.write(f"{note.content}\n\n")
                    if note.material_ids:
                        mat_names = [self.store.get_material(mid).file_name
                                    for mid in note.material_ids
                                    if self.store.get_material(mid)]
                        f.write(f"*关联材料: {', '.join(mat_names)}*\n\n")
            else:
                f.write("> 暂无排练备注\n\n")

        return str(report_path)

    def _get_alignment_data(self) -> Dict[str, Any]:
        materials = self.store.get_all_materials()
        notes = self.store.get_all_notes()

        aligned_count = 0
        strict_aligned_count = 0
        unaligned_count = 0
        alignment_issues = []
        aligned_materials = []

        for mat in materials:
            notes_for_mat = self.store.get_notes_for_material(mat.id)
            has_bidirectional = any(
                n for n in notes_for_mat
                if n.material_ids and mat.id in n.material_ids
            )

            has_any_notes = len(notes_for_mat) > 0
            has_versions = len(mat.versions) > 0

            aligned = has_versions and has_any_notes
            strict_aligned = aligned and has_bidirectional

            if aligned:
                aligned_count += 1
                aligned_materials.append(mat.file_name)
                if strict_aligned:
                    strict_aligned_count += 1
            else:
                if not has_versions:
                    unaligned_count += 1
                    alignment_issues.append(f"{mat.file_name}: 缺少版本记录")
                if not has_any_notes:
                    unaligned_count += 1
                    alignment_issues.append(f"{mat.file_name}: 缺少人工批注")

        return {
            "total_materials": len(materials),
            "aligned": aligned_count,
            "strict_aligned": strict_aligned_count,
            "unaligned": unaligned_count,
            "alignment_rate": f"{aligned_count / len(materials) * 100:.1f}%" if materials else "0%",
            "strict_alignment_rate": f"{strict_aligned_count / len(materials) * 100:.1f}%" if materials else "0%",
            "aligned_materials": aligned_materials,
            "issues": alignment_issues
        }

    def get_last_report_paths(self) -> List[str]:
        report_files = list(self.reports_dir.glob("*.md"))
        return sorted([str(f) for f in report_files], key=lambda x: os.path.getmtime(x), reverse=True)
