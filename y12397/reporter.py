import json
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from collections import defaultdict
from models import (
    AuditDataset,
    Issue,
    IssueType,
    Severity,
)


class AuditReporter:
    def __init__(self, dataset: AuditDataset):
        self.dataset = dataset

    def export_issue_list_json(self, output_path: str, unresolved_only: bool = False) -> str:
        issues = self.dataset.issues
        if unresolved_only:
            issues = [i for i in issues if not i.resolved]

        data = {
            "export_time": datetime.now().isoformat(),
            "total_issues": len(issues),
            "summary": self._build_summary(issues),
            "issues": [self._issue_to_dict(i) for i in issues],
        }

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return str(path)

    def export_issue_list_csv(self, output_path: str, unresolved_only: bool = False) -> str:
        issues = self.dataset.issues
        if unresolved_only:
            issues = [i for i in issues if not i.resolved]

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "问题ID", "问题类型", "严重程度", "标题", "描述",
                "相关素材ID", "相关用途ID", "相关报告ID",
                "证据摘要", "处理建议", "发现时间", "是否已解决"
            ])

            for issue in issues:
                writer.writerow([
                    issue.issue_id,
                    issue.issue_type.value,
                    issue.severity.value,
                    issue.title,
                    issue.description,
                    "|".join(issue.related_materials),
                    "|".join(issue.related_usages),
                    "|".join(issue.related_reports),
                    self._evidence_to_text(issue.evidence),
                    "；".join(issue.suggestions),
                    issue.discovered_at.isoformat(),
                    "是" if issue.resolved else "否",
                ])

        return str(path)

    def export_audit_report_markdown(self, output_path: str) -> str:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        issues = self.dataset.issues
        summary = self._build_summary(issues)

        lines = []
        lines.append("# 配乐情绪标签审计报告")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        lines.append("## 一、审计概览")
        lines.append("")
        lines.append("### 1.1 审计数据统计")
        lines.append("")
        lines.append("| 数据类型 | 数量 |")
        lines.append("|---------|------|")
        lines.append(f"| 音频素材 | {len(self.dataset.materials)} |")
        lines.append(f"| 项目用途 | {len(self.dataset.usages)} |")
        lines.append(f"| 审计报告 | {len(self.dataset.reports)} |")
        lines.append(f"| 标签相似关系 | {len(self.dataset.tag_similarities)} |")
        lines.append(f"| 归并反馈记录 | {len(self.dataset.merge_feedbacks)} |")
        lines.append("")

        lines.append("### 1.2 问题汇总")
        lines.append("")
        lines.append("| 问题类型 | 严重 | 警告 | 提示 | 总计 |")
        lines.append("|---------|------|------|------|------|")
        for issue_type in IssueType:
            type_data = summary["by_type"].get(issue_type.value, {"by_severity": {}})
            sev = type_data["by_severity"]
            lines.append(
                f"| {self._type_label(issue_type.value)} | "
                f"{sev.get('critical', 0)} | "
                f"{sev.get('warning', 0)} | "
                f"{sev.get('info', 0)} | "
                f"{type_data.get('total', 0)} |"
            )
        lines.append(f"| **合计** | **{summary['by_severity'].get('critical', 0)}** | **{summary['by_severity'].get('warning', 0)}** | **{summary['by_severity'].get('info', 0)}** | **{summary['total']}** |")
        lines.append("")

        if issues:
            lines.append("## 二、问题清单")
            lines.append("")

            for issue_type in IssueType:
                type_issues = [i for i in issues if i.issue_type == issue_type]
                if not type_issues:
                    continue

                lines.append(f"### 2.{list(IssueType).index(issue_type) + 1} {self._type_label(issue_type.value)}")
                lines.append("")

                for idx, issue in enumerate(type_issues, 1):
                    sev_label = self._severity_label(issue.severity.value)
                    sev_md = f"**{sev_label}**" if issue.severity == Severity.CRITICAL else sev_label

                    lines.append(f"#### {idx}. [{sev_md}] {issue.title}")
                    lines.append("")
                    lines.append(f"- **问题ID**: {issue.issue_id}")
                    lines.append(f"- **描述**: {issue.description}")

                    if issue.related_materials:
                        lines.append(f"- **相关素材**: {', '.join(issue.related_materials)}")
                    if issue.related_usages:
                        lines.append(f"- **相关用途**: {', '.join(issue.related_usages)}")
                    if issue.related_reports:
                        lines.append(f"- **相关报告**: {', '.join(issue.related_reports)}")

                    lines.append("")
                    lines.append("**证据**:")
                    lines.append("")
                    lines.append("```json")
                    lines.append(json.dumps(issue.evidence, ensure_ascii=False, indent=2))
                    lines.append("```")
                    lines.append("")

                    lines.append("**处理建议**:")
                    lines.append("")
                    for sug in issue.suggestions:
                        lines.append(f"- {sug}")
                    lines.append("")

        lines.append("## 三、标签相似关系")
        lines.append("")
        if self.dataset.tag_similarities:
            lines.append("| 标签A | 标签B | 相似度 |")
            lines.append("|-------|-------|--------|")
            for sim in sorted(self.dataset.tag_similarities, key=lambda s: -s.similarity_score):
                lines.append(f"| {sim.tag_a} | {sim.tag_b} | {sim.similarity_score:.2%} |")
        else:
            lines.append("暂无标签相似关系数据。")
        lines.append("")

        if self.dataset.merge_feedbacks:
            lines.append("## 四、归并反馈追踪")
            lines.append("")
            lines.append("| 反馈ID | 素材ID | 原标签 | 建议标签 | 接受 | 异常样本 | 反馈时间 |")
            lines.append("|--------|--------|--------|----------|------|----------|----------|")
            for fb in sorted(self.dataset.merge_feedbacks, key=lambda f: f.feedback_time, reverse=True):
                lines.append(
                    f"| {fb.feedback_id} | {fb.material_id} | "
                    f"{', '.join(fb.original_tags)} | {', '.join(fb.suggested_tags)} | "
                    f"{'是' if fb.accepted else '否'} | {'是' if fb.anomaly_sample else '否'} | "
                    f"{fb.feedback_time.strftime('%Y-%m-%d %H:%M')} |"
                )
            lines.append("")

        lines.append("## 五、使用说明")
        lines.append("")
        lines.append("### 标签冲突")
        lines.append("- 源标签与人工标签冲突：素材提供方的标签与内部人工标注不一致，需业务同事核对确认后再修改。")
        lines.append("- 审计标签与源标签冲突：审计员标注与源标签存在差异，由审计员与素材管理员核对，**不擅自修改口径**。")
        lines.append("- 归并标签与审计标签冲突：高风险问题，可能导致用途错配，需立即暂停该素材使用并复核。")
        lines.append("")
        lines.append("### 素材重复")
        lines.append("- 基于文件哈希判断重复，重复素材的标签维护容易不同步，需统一处理。")
        lines.append("- 同名不同物提示命名不规范问题，建议完善命名规则。")
        lines.append("")
        lines.append("### 用途错配")
        lines.append("- 检查项目要求的情绪标签与素材实际标签是否匹配。")
        lines.append("- 归并导致的标签丢失需追溯归并历史，修正归并规则。")
        lines.append("")
        lines.append("### 标签归并")
        lines.append("- 归并非一次性判断，相似检索规则变化后会自动标记历史异常样本。")
        lines.append("- 归并结果完全替换时触发严重警告，防止误归并导致连锁问题。")

        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return str(path)

    def export_full_dataset(self, output_path: str) -> str:
        data = {
            "export_time": datetime.now().isoformat(),
            "materials": [
                {
                    "material_id": m.material_id,
                    "title": m.title,
                    "duration": m.duration,
                    "source_tags": m.source_tags,
                    "manual_tags": m.manual_tags,
                    "merged_tags": m.merged_tags,
                    "file_hash": m.file_hash,
                    "source_file": m.source_file,
                    "import_time": m.import_time.isoformat(),
                    "merge_history": m.merge_history,
                }
                for m in self.dataset.materials.values()
            ],
            "usages": [
                {
                    "usage_id": u.usage_id,
                    "project_name": u.project_name,
                    "scene_desc": u.scene_desc,
                    "required_mood": u.required_mood,
                    "assigned_material_ids": u.assigned_material_ids,
                    "usage_context": u.usage_context,
                    "assigned_time": u.assigned_time.isoformat(),
                    "auditor_notes": u.auditor_notes,
                }
                for u in self.dataset.usages.values()
            ],
            "reports": [
                {
                    "report_id": r.report_id,
                    "material_id": r.material_id,
                    "auditor_tags": r.auditor_tags,
                    "auditor_comments": r.auditor_comments,
                    "audit_time": r.audit_time.isoformat(),
                    "auditor": r.auditor,
                    "merge_suggestions": r.merge_suggestions,
                }
                for r in self.dataset.reports.values()
            ],
            "tag_similarities": [
                {
                    "tag_a": s.tag_a,
                    "tag_b": s.tag_b,
                    "similarity_score": s.similarity_score,
                    "merge_rule_id": s.merge_rule_id,
                    "manual_override": s.manual_override,
                }
                for s in self.dataset.tag_similarities
            ],
            "merge_feedbacks": [
                {
                    "feedback_id": f.feedback_id,
                    "material_id": f.material_id,
                    "original_tags": f.original_tags,
                    "suggested_tags": f.suggested_tags,
                    "accepted": f.accepted,
                    "feedback_text": f.feedback_text,
                    "feedback_time": f.feedback_time.isoformat(),
                    "anomaly_sample": f.anomaly_sample,
                }
                for f in self.dataset.merge_feedbacks
            ],
            "issues": [self._issue_to_dict(i) for i in self.dataset.issues],
        }

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return str(path)

    def _build_summary(self, issues: List[Issue]) -> Dict:
        summary = {
            "total": len(issues),
            "by_severity": defaultdict(int),
            "by_type": defaultdict(lambda: {"total": 0, "by_severity": defaultdict(int)}),
        }

        for issue in issues:
            summary["by_severity"][issue.severity.value] += 1
            type_data = summary["by_type"][issue.issue_type.value]
            type_data["total"] += 1
            type_data["by_severity"][issue.severity.value] += 1

        summary["by_severity"] = dict(summary["by_severity"])
        for k in summary["by_type"]:
            summary["by_type"][k]["by_severity"] = dict(summary["by_type"][k]["by_severity"])
        summary["by_type"] = dict(summary["by_type"])

        return summary

    def _issue_to_dict(self, issue: Issue) -> Dict:
        return {
            "issue_id": issue.issue_id,
            "issue_type": issue.issue_type.value,
            "severity": issue.severity.value,
            "title": issue.title,
            "description": issue.description,
            "related_materials": issue.related_materials,
            "related_usages": issue.related_usages,
            "related_reports": issue.related_reports,
            "evidence": issue.evidence,
            "suggestions": issue.suggestions,
            "discovered_at": issue.discovered_at.isoformat(),
            "resolved": issue.resolved,
        }

    def _evidence_to_text(self, evidence: Dict) -> str:
        parts = []
        for k, v in evidence.items():
            if isinstance(v, list):
                parts.append(f"{k}={','.join(map(str, v))}")
            elif isinstance(v, dict):
                parts.append(f"{k}={json.dumps(v, ensure_ascii=False)}")
            else:
                parts.append(f"{k}={v}")
        return "; ".join(parts)

    def _type_label(self, type_value: str) -> str:
        labels = {
            "tag_conflict": "标签冲突",
            "material_duplicate": "素材重复",
            "usage_mismatch": "用途错配",
            "merge_anomaly": "归并异常",
        }
        return labels.get(type_value, type_value)

    def _severity_label(self, sev_value: str) -> str:
        labels = {
            "critical": "严重",
            "warning": "警告",
            "info": "提示",
        }
        return labels.get(sev_value, sev_value)
