import uuid
from collections import defaultdict
from typing import Dict, List, Tuple, Set
from models import (
    AuditDataset,
    AudioMaterial,
    ProjectUsage,
    AuditReport,
    Issue,
    IssueType,
    Severity,
)


class AuditChecker:
    def __init__(self, dataset: AuditDataset):
        self.dataset = dataset
        self.issues: List[Issue] = []

    def _gen_issue_id(self) -> str:
        return f"issue_{uuid.uuid4().hex[:8]}"

    def check_all(self) -> List[Issue]:
        self.check_tag_conflicts()
        self.check_material_duplicates()
        self.check_usage_mismatches()
        self.dataset.issues = self.issues
        return self.issues

    def check_tag_conflicts(self) -> List[Issue]:
        issues = []
        materials = self.dataset.materials
        reports = self.dataset.reports

        for mat_id, material in materials.items():
            all_tags = material.all_tags()
            merged_tags = set(material.merged_tags)

            source_vs_manual = set(material.source_tags) ^ set(material.manual_tags)
            if source_vs_manual and len(material.manual_tags) > 0:
                conflict_src = set(material.source_tags) - set(material.manual_tags)
                conflict_manual = set(material.manual_tags) - set(material.source_tags)
                if conflict_src and conflict_manual:
                    issue = Issue(
                        issue_id=self._gen_issue_id(),
                        issue_type=IssueType.TAG_CONFLICT,
                        severity=Severity.WARNING,
                        title=f"素材[{material.title}]源标签与人工标签冲突",
                        description=(
                            f"素材ID={mat_id} 的源标签与人工标注存在不一致。"
                            f"源标签独有: {sorted(conflict_src)}, "
                            f"人工标签独有: {sorted(conflict_manual)}"
                        ),
                        related_materials=[mat_id],
                        evidence={
                            "material_id": mat_id,
                            "material_title": material.title,
                            "source_tags": material.source_tags,
                            "manual_tags": material.manual_tags,
                            "conflict_source_only": sorted(conflict_src),
                            "conflict_manual_only": sorted(conflict_manual),
                        },
                        suggestions=[
                            "建议业务同事核对源标签和人工标签的差异",
                            "若源标签错误，联系素材提供方修正；若人工标签错误，调整人工标注",
                            "达成一致后更新标签归并规则",
                        ],
                    )
                    self.issues.append(issue)
                    issues.append(issue)

            mat_reports = [r for r in reports.values() if r.material_id == mat_id]
            for report in mat_reports:
                auditor_tags = set(report.auditor_tags)
                if auditor_tags:
                    report_vs_source = auditor_tags ^ set(material.source_tags)
                    report_vs_manual = auditor_tags ^ set(material.manual_tags)

                    if report_vs_source and len(material.source_tags) > 0:
                        report_only = sorted(auditor_tags - set(material.source_tags))
                        source_only = sorted(set(material.source_tags) - auditor_tags)
                        if report_only or source_only:
                            issue = Issue(
                                issue_id=self._gen_issue_id(),
                                issue_type=IssueType.TAG_CONFLICT,
                                severity=Severity.WARNING,
                                title=f"素材[{material.title}]审计标签与源标签冲突",
                                description=(
                                    f"素材ID={mat_id}, 报告ID={report.report_id}。"
                                    f"审计标签: {sorted(auditor_tags)}, 源标签: {material.source_tags}。"
                                    f"审计独有: {report_only}, 源标签独有: {source_only}"
                                ),
                                related_materials=[mat_id],
                                related_reports=[report.report_id],
                                evidence={
                                    "material_id": mat_id,
                                    "report_id": report.report_id,
                                    "auditor": report.auditor,
                                    "auditor_tags": sorted(auditor_tags),
                                    "source_tags": material.source_tags,
                                    "audit_only": report_only,
                                    "source_only": source_only,
                                    "auditor_comments": report.auditor_comments,
                                },
                                suggestions=[
                                    f"请审计员[{report.auditor}]与素材管理员核对标签差异",
                                    "确认哪一方的标签理解有误，不擅自修改口径",
                                    "将核对结果记录到审计备注中",
                                ],
                            )
                            self.issues.append(issue)
                            issues.append(issue)

                    if merged_tags and auditor_tags:
                        merge_vs_audit = merged_tags ^ auditor_tags
                        if merge_vs_audit:
                            merge_only = sorted(merged_tags - auditor_tags)
                            audit_only = sorted(auditor_tags - merged_tags)
                            issue = Issue(
                                issue_id=self._gen_issue_id(),
                                issue_type=IssueType.TAG_CONFLICT,
                                severity=Severity.CRITICAL,
                                title=f"素材[{material.title}]归并标签与审计标签冲突",
                                description=(
                                    f"素材ID={mat_id}, 报告ID={report.report_id}。"
                                    f"归并后标签: {sorted(merged_tags)}, 审计标签: {sorted(auditor_tags)}。"
                                    f"归并独有: {merge_only}, 审计独有: {audit_only}。"
                                    f"这可能导致后续用途错配！"
                                ),
                                related_materials=[mat_id],
                                related_reports=[report.report_id],
                                evidence={
                                    "material_id": mat_id,
                                    "report_id": report.report_id,
                                    "merged_tags": sorted(merged_tags),
                                    "auditor_tags": sorted(auditor_tags),
                                    "merge_only": merge_only,
                                    "audit_only": audit_only,
                                    "merge_history": material.merge_history,
                                },
                                suggestions=[
                                    "这是高风险冲突，立即暂停该素材的后续使用",
                                    "审核标签归并规则是否正确应用",
                                    "检查归并历史记录，确认何时出现偏差",
                                    "涉及用途错配风险，同步通知项目组",
                                ],
                            )
                            self.issues.append(issue)
                            issues.append(issue)

        return issues

    def check_material_duplicates(self) -> List[Issue]:
        issues = []
        materials = self.dataset.materials

        hash_groups: Dict[str, List[AudioMaterial]] = defaultdict(list)
        for mat in materials.values():
            if mat.file_hash:
                hash_groups[mat.file_hash].append(mat)

        for file_hash, group in hash_groups.items():
            if len(group) > 1:
                mat_ids = [m.material_id for m in group]
                mat_titles = [m.title for m in group]
                issue = Issue(
                    issue_id=self._gen_issue_id(),
                    issue_type=IssueType.MATERIAL_DUPLICATE,
                    severity=Severity.WARNING,
                    title=f"发现{len(group)}个重复音频素材",
                    description=(
                        f"文件哈希={file_hash} 对应 {len(group)} 个素材记录: "
                        f"{list(zip(mat_ids, mat_titles))}。"
                        f"可能导致标签维护不同步、归并结果不一致。"
                    ),
                    related_materials=mat_ids,
                    evidence={
                        "file_hash": file_hash,
                        "duplicate_count": len(group),
                        "materials": [
                            {
                                "material_id": m.material_id,
                                "title": m.title,
                                "source_tags": m.source_tags,
                                "manual_tags": m.manual_tags,
                                "merged_tags": m.merged_tags,
                                "source_file": m.source_file,
                            }
                            for m in group
                        ],
                    },
                    suggestions=[
                        f"确认这{len(group)}条记录是否为同一音频文件",
                        "如为重复录入，保留最完整的一条，其余标记为重复",
                        "如为不同文件但哈希碰撞，联系技术人员排查",
                        "重复素材的标签需保持一致，避免后续归并混乱",
                    ],
                )
                self.issues.append(issue)
                issues.append(issue)

        title_groups: Dict[str, List[AudioMaterial]] = defaultdict(list)
        for mat in materials.values():
            title_groups[mat.title.strip()].append(mat)

        for title, group in title_groups.items():
            if len(group) > 1:
                hashes = {m.file_hash for m in group if m.file_hash}
                if len(hashes) <= 1:
                    continue
                mat_ids = [m.material_id for m in group]
                issue = Issue(
                    issue_id=self._gen_issue_id(),
                    issue_type=IssueType.MATERIAL_DUPLICATE,
                    severity=Severity.INFO,
                    title=f"存在{len(group)}个同名素材[{title}]",
                    description=(
                        f"标题='{title}' 对应 {len(group)} 个不同素材: {mat_ids}。"
                        f"不同文件哈希={sorted(hashes)}。可能是系列素材或命名不规范。"
                    ),
                    related_materials=mat_ids,
                    evidence={
                        "title": title,
                        "material_count": len(group),
                        "material_ids": mat_ids,
                        "distinct_hashes": sorted(hashes),
                    },
                    suggestions=[
                        "如为系列素材，建议在标题中区分（如 Part1、Version2）",
                        "如为命名不规范，统一素材命名规则",
                        "检查这些素材的标签是否存在应归并但未归并的情况",
                    ],
                )
                self.issues.append(issue)
                issues.append(issue)

        return issues

    def check_usage_mismatches(self) -> List[Issue]:
        issues = []
        materials = self.dataset.materials
        usages = self.dataset.usages

        mood_tag_map = {
            "欢快": ["欢快", "愉悦", "开心", "快乐", "轻松", "活泼"],
            "悲伤": ["悲伤", "伤感", "难过", "忧郁", "压抑"],
            "紧张": ["紧张", "刺激", "悬疑", "惊悚", "焦虑"],
            "温馨": ["温馨", "温暖", "治愈", "舒缓", "平静"],
            "激昂": ["激昂", "振奋", "热血", "澎湃", "激情"],
            "神秘": ["神秘", "诡异", "空灵", "梦幻", "迷幻"],
        }

        def _mood_match(required_moods: List[str], material_tags: List[str]) -> Tuple[bool, List[str], List[str]]:
            all_material_tags = set(material_tags)
            matched = []
            unmatched = []

            for req_mood in required_moods:
                mood_variants = mood_tag_map.get(req_mood, [req_mood])
                found = False
                for variant in mood_variants:
                    for tag in all_material_tags:
                        if variant in tag or tag in variant:
                            found = True
                            matched.append(f"{req_mood}→{tag}")
                            break
                    if found:
                        break
                if not found:
                    unmatched.append(req_mood)

            return len(unmatched) == 0, matched, unmatched

        for usage_id, usage in usages.items():
            for mat_id in usage.assigned_material_ids:
                if mat_id not in materials:
                    issue = Issue(
                        issue_id=self._gen_issue_id(),
                        issue_type=IssueType.USAGE_MISMATCH,
                        severity=Severity.CRITICAL,
                        title=f"项目[{usage.project_name}]引用不存在的素材",
                        description=(
                            f"用途ID={usage_id}, 场景='{usage.scene_desc}'。"
                            f"分配的素材ID={mat_id} 在素材库中不存在。"
                        ),
                        related_materials=[mat_id],
                        related_usages=[usage_id],
                        evidence={
                            "usage_id": usage_id,
                            "project_name": usage.project_name,
                            "scene_desc": usage.scene_desc,
                            "missing_material_id": mat_id,
                            "assigned_material_ids": usage.assigned_material_ids,
                        },
                        suggestions=[
                            "检查素材ID是否录入错误",
                            "确认素材是否已被删除但未同步更新项目分配",
                            "如为新增素材尚未导入，先完成素材导入流程",
                        ],
                    )
                    self.issues.append(issue)
                    issues.append(issue)
                    continue

                material = materials[mat_id]
                tags_to_check = material.merged_tags if material.merged_tags else list(material.all_tags())

                is_match, matched, unmatched = _mood_match(usage.required_mood, tags_to_check)

                if not is_match:
                    issue = Issue(
                        issue_id=self._gen_issue_id(),
                        issue_type=IssueType.USAGE_MISMATCH,
                        severity=Severity.WARNING,
                        title=f"素材[{material.title}]情绪不匹配项目[{usage.project_name}]",
                        description=(
                            f"用途ID={usage_id}, 场景='{usage.scene_desc}'。"
                            f"项目要求情绪={usage.required_mood}, 素材标签={tags_to_check}。"
                            f"已匹配: {matched}, 未匹配: {unmatched}。"
                        ),
                        related_materials=[mat_id],
                        related_usages=[usage_id],
                        evidence={
                            "usage_id": usage_id,
                            "material_id": mat_id,
                            "project_name": usage.project_name,
                            "scene_desc": usage.scene_desc,
                            "usage_context": usage.usage_context,
                            "required_mood": usage.required_mood,
                            "material_tags": {
                                "source": material.source_tags,
                                "manual": material.manual_tags,
                                "merged": material.merged_tags,
                            },
                            "matched": matched,
                            "unmatched": unmatched,
                            "auditor_notes": usage.auditor_notes,
                        },
                        suggestions=[
                            f"核对场景'{usage.scene_desc}'的情绪要求是否准确",
                            f"检查素材[{material.title}]的标签是否完整准确",
                            "如为归并导致的标签丢失，追溯归并历史并修正归并规则",
                            "确需使用该素材时，由业务同事确认并在审计备注中说明理由",
                        ],
                    )
                    self.issues.append(issue)
                    issues.append(issue)

        return issues
