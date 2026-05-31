import json
from datetime import datetime
from .models import CheckIssue, MergeConflict, IssueType, SampleClass, ExportEntry


class ReportGenerator:
    def __init__(self, project_name: str):
        self.project_name = project_name

    def generate(self, issues: list, conflicts: list = None) -> str:
        sections = []
        sections.append(self._header())
        sections.append(self._summary(issues, conflicts or []))
        sections.append(self._bad_section(issues))
        sections.append(self._boundary_section(issues))
        sections.append(self._normal_section(issues))
        sections.append(self._conflict_section(conflicts or []))
        sections.append(self._overwrite_deep_dive(issues))
        sections.append(self._footer())
        return "\n\n".join(sections)

    def _header(self) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        return (
            f"# 编曲版本回滚台 — 检查报告\n"
            f"项目: {self.project_name}\n"
            f"生成时间: {now}\n"
            f"---\n"
            f"本报告由回滚台自动生成，按「正常 / 边界 / 坏样本」三类分开列出。\n"
            f"所有问题都附有人话说明，无需技术背景也能看懂。"
        )

    def _summary(self, issues: list, conflicts: list) -> str:
        bad = [i for i in issues if i.sample_class == SampleClass.BAD]
        boundary = [i for i in issues if i.sample_class == SampleClass.BOUNDARY]
        normal = [i for i in issues if i.sample_class == SampleClass.NORMAL]
        overwrite = [i for i in issues if i.issue_type == IssueType.SAME_NAME_OVERWRITE]
        missing = [i for i in issues if i.issue_type == IssueType.TRACK_MISSING]
        wrong_fb = [i for i in issues if i.issue_type == IssueType.WRONG_VERSION_FEEDBACK]
        lines = [
            "## 总览",
            f"- 共检查出 **{len(issues)}** 条问题，**{len(conflicts)}** 条合并冲突",
            f"- 🔴 明显坏样本: **{len(bad)}** 条 — 必须处理",
            f"- 🟡 边界样本: **{len(boundary)}** 条 — 建议确认",
            f"- 🟢 正常样本: **{len(normal)}** 条 — 大概率没问题",
            "",
            "按类型分:",
            f"- 同名覆盖: {len(overwrite)} 条",
            f"- 轨道缺失: {len(missing)} 条",
            f"- 反馈错版: {len(wrong_fb)} 条",
            f"- 合并冲突: {len(conflicts)} 条",
        ]
        return "\n".join(lines)

    def _bad_section(self, issues: list) -> str:
        bad = [i for i in issues if i.sample_class == SampleClass.BAD]
        if not bad:
            return "## 🔴 明显坏样本\n无"
        lines = ["## 🔴 明显坏样本（必须处理）", ""]
        for idx, issue in enumerate(bad, 1):
            lines.append(f"### {idx}. [{issue.issue_type.value}] {issue.track_name}")
            lines.append(f"- 版本: {issue.version_ref}")
            if issue.record_pointer:
                lines.append(f"- 记录指向: {issue.record_pointer}")
            lines.append(f"- 技术详情: {issue.detail}")
            lines.append(f"- **人话说明**: {issue.plain_explanation}")
            lines.append("")
        return "\n".join(lines)

    def _boundary_section(self, issues: list) -> str:
        boundary = [i for i in issues if i.sample_class == SampleClass.BOUNDARY]
        if not boundary:
            return "## 🟡 边界样本\n无"
        lines = ["## 🟡 边界样本（建议确认）", ""]
        for idx, issue in enumerate(boundary, 1):
            lines.append(f"### {idx}. [{issue.issue_type.value}] {issue.track_name}")
            lines.append(f"- 版本: {issue.version_ref}")
            if issue.record_pointer:
                lines.append(f"- 记录指向: {issue.record_pointer}")
            lines.append(f"- 技术详情: {issue.detail}")
            lines.append(f"- **人话说明**: {issue.plain_explanation}")
            lines.append("")
        return "\n".join(lines)

    def _normal_section(self, issues: list) -> str:
        normal = [i for i in issues if i.sample_class == SampleClass.NORMAL]
        if not normal:
            return "## 🟢 正常样本\n无"
        lines = ["## 🟢 正常样本", ""]
        for idx, issue in enumerate(normal, 1):
            lines.append(f"{idx}. [{issue.issue_type.value}] {issue.track_name} — {issue.plain_explanation}")
        return "\n".join(lines)

    def _conflict_section(self, conflicts: list) -> str:
        if not conflicts:
            return "## ⚠️ 合并冲突\n无"
        lines = [
            "## ⚠️ 合并冲突（工程 vs 参数，两边改动同时出现）",
            "",
            "以下冲突是工程版本和轨道参数分别由不同人修改造成的，"
            "系统不会自动选择一边——需要相关人当面确认。",
            "",
        ]
        for idx, c in enumerate(conflicts, 1):
            lines.append(f"### 冲突 {idx}: {c.track_name}")
            lines.append(f"- 工程修改者: {c.engineer_author} → {c.engineering_change}")
            lines.append(f"- 参数修改者: {c.param_author} → {c.param_change}")
            lines.append(f"- 版本: {c.engineering_version} -> {c.param_version}")
            lines.append(f"- **处理建议**: 请{c.engineer_author}和{c.param_author}确认，"
                         f"以谁为准，或者两边都保留。不要直接合并，选错了会返工。")
            lines.append("")
        return "\n".join(lines)

    def _overwrite_deep_dive(self, issues: list) -> str:
        overwrite = [i for i in issues if i.issue_type == IssueType.SAME_NAME_OVERWRITE]
        if not overwrite:
            return "## 🔍 同名覆盖专题\n本次检查未发现同名覆盖问题。"
        lines = [
            "## 🔍 同名覆盖专题",
            "",
            "同名覆盖是最容易混进正常记录的问题——文件名一样但内容被换了，"
            "表面看起来一切正常，实际上已经是不同的东西了。",
            "下面逐条解释为什么没过：",
            "",
        ]
        for idx, issue in enumerate(overwrite, 1):
            lines.append(f"### 覆盖 {idx}: {issue.track_name}")
            lines.append(f"- 分类: {issue.sample_class.value}")
            lines.append(f"- **为什么没过**: {issue.plain_explanation}")
            if issue.record_pointer:
                lines.append(f"- 对应记录: {issue.record_pointer}")
            lines.append("")
        return "\n".join(lines)

    def _footer(self) -> str:
        return (
            "---\n"
            "本报告由编曲版本回滚台自动生成。\n"
            "如有疑问，请参照报告中的「记录指向」定位到具体版本快照和回滚记录。\n"
            "月底复盘时，可使用导出清单功能汇总当月全部问题。"
        )

    def generate_json(self, issues: list, conflicts: list = None) -> str:
        data = {
            "project": self.project_name,
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_issues": len(issues),
                "total_conflicts": len(conflicts or []),
                "by_class": {
                    "bad": len([i for i in issues if i.sample_class == SampleClass.BAD]),
                    "boundary": len([i for i in issues if i.sample_class == SampleClass.BOUNDARY]),
                    "normal": len([i for i in issues if i.sample_class == SampleClass.NORMAL]),
                },
                "by_type": {
                    t.value: len([i for i in issues if i.issue_type == t])
                    for t in IssueType
                },
            },
            "issues": [
                {
                    "type": i.issue_type.value,
                    "class": i.sample_class.value,
                    "track": i.track_name,
                    "version": i.version_ref,
                    "detail": i.detail,
                    "record_pointer": i.record_pointer,
                    "explanation": i.plain_explanation,
                }
                for i in issues
            ],
            "conflicts": [
                {
                    "track": c.track_name,
                    "engineering_author": c.engineer_author,
                    "param_author": c.param_author,
                    "engineering_change": c.engineering_change,
                    "param_change": c.param_change,
                }
                for c in (conflicts or [])
            ],
        }
        return json.dumps(data, ensure_ascii=False, indent=2)
