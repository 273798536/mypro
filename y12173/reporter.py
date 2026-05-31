"""报告输出模块 - 整合押韵检测、修正记录、版本信息"""

import json
from pathlib import Path
from datetime import datetime


class Reporter:
    def __init__(self):
        self.reports_dir = Path("reports")
        self.reports_dir.mkdir(exist_ok=True)

    def generate(self):
        from version_manager import VersionManager
        from segment_manager import SegmentManager
        from rhyme_checker import RhymeChecker

        vm = VersionManager()
        version = vm.get_latest()
        if not version:
            return {"error": "没有可用版本"}

        sm = SegmentManager()
        checker = RhymeChecker()

        segments = sm.get_segments(version["id"])
        results = checker.check_version(version, segments)
        fixes = checker.get_fixes(version["id"])
        history = vm.get_history()

        report = {
            "generated_at": datetime.now().isoformat(),
            "version": {
                "id": version["id"],
                "name": version["name"],
                "timestamp": version["timestamp"],
                "line_count": version["line_count"],
                "source": version.get("source", "")
            },
            "history": history,
            "segments": results["segments"],
            "fixes": fixes,
            "summary": results["summary"],
            "issues": self._collect_issues(results, fixes)
        }

        return report

    def _collect_issues(self, results, fixes):
        issues = []

        for seg_id, seg_data in results["segments"].items():
            for line in seg_data["lines"]:
                if line.get("is_ambiguous"):
                    issues.append({
                        "type": "多音字歧义",
                        "severity": "warning",
                        "segment": seg_id,
                        "line_num": line["line_num"],
                        "text": line["text"],
                        "detail": f"'{line['last_char']}' 有多个读音: {line['pinyin_note']}",
                        "fixed": any(f["line_num"] == line["line_num"] for f in fixes)
                    })

                if line.get("has_english"):
                    issues.append({
                        "type": "英文混入",
                        "severity": "notice",
                        "segment": seg_id,
                        "line_num": line["line_num"],
                        "text": line["text"],
                        "detail": "包含英文字符，可能影响押韵检测",
                        "fixed": False
                    })

                if not line["rhyme_match"] and seg_data.get("expected_rhyme"):
                    issues.append({
                        "type": "押韵不匹配",
                        "severity": "error",
                        "segment": seg_id,
                        "line_num": line["line_num"],
                        "text": line["text"],
                        "detail": f"韵脚 '{line['rhyme']}' 与期望 '{seg_data['expected_rhyme']}' 不匹配",
                        "fixed": any(f["line_num"] == line["line_num"] for f in fixes)
                    })

        for dup in results["summary"]["duplicates"]:
            issues.append({
                "type": "重复行",
                "severity": "notice",
                "line_num": dup["lines"][0],
                "text": dup["text"],
                "detail": f"在第 {', '.join(map(str, dup['lines']))} 行重复出现",
                "fixed": False
            })

        return issues

    def format_console(self, report):
        if "error" in report:
            return f"❌ {report['error']}"

        lines = [
            "=" * 60,
            f"📋 歌词押韵分析报告",
            f"   生成时间: {report['generated_at']}",
            "=" * 60,
            "",
            f"📄 当前版本: {report['version']['name']} ({report['version']['id']})",
            f"   创建时间: {report['version']['timestamp']}",
            f"   有效行数: {report['version']['line_count']}",
            ""
        ]

        lines.extend([
            "📊 检测结果摘要:",
            f"   ✅ 押韵匹配: {report['summary']['matched']}/{report['summary']['total']}",
            f"   ⚠️  歧义多音字: {report['summary']['ambiguous']}",
            f"   🌐 英文混入: {report['summary']['english']}",
            f"   🔄 重复行: {len(report['summary']['duplicates'])}",
            ""
        ])

        if report["fixes"]:
            lines.append("🔧 人工修正记录:")
            for f in report["fixes"]:
                lines.append(f"   L{f['line_num']}: {f['pinyin']}")
                if f.get("note"):
                    lines.append(f"      说明: {f['note']}")
            lines.append("")

        if report["issues"]:
            lines.append("❗ 问题清单:")
            for issue in report["issues"]:
                status = "✅" if issue.get("fixed") else "❌"
                lines.append(f"   {status} [{issue['type']}] L{issue['line_num']}")
                lines.append(f"      原文: {issue['text']}")
                lines.append(f"      说明: {issue['detail']}")

        lines.extend([
            "",
            "=" * 60,
            f"📚 历史版本: {len(report['history'])} 个",
            "=" * 60
        ])

        return "\n".join(lines)

    def save(self, report, output_path):
        output = Path(output_path)
        if output.suffix == ".json":
            output.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        elif output.suffix == ".md":
            output.write_text(self._format_markdown(report))
        else:
            output.write_text(self.format_console(report))

    def _format_markdown(self, report):
        lines = [
            "# 歌词押韵分析报告",
            "",
            f"**生成时间**: {report['generated_at']}",
            "",
            "## 当前版本",
            "",
            f"- 名称: {report['version']['name']}",
            f"- ID: {report['version']['id']}",
            f"- 创建时间: {report['version']['timestamp']}",
            f"- 有效行数: {report['version']['line_count']}",
            "",
            "## 检测摘要",
            "",
            f"- 押韵匹配: {report['summary']['matched']}/{report['summary']['total']}",
            f"- 歧义多音字: {report['summary']['ambiguous']}",
            f"- 英文混入: {report['summary']['english']}",
            f"- 重复行: {len(report['summary']['duplicates'])}",
            "",
            "## 问题清单",
            ""
        ]

        if report["issues"]:
            for issue in report["issues"]:
                status = "✅ 已修正" if issue.get("fixed") else "❌ 待处理"
                lines.extend([
                    f"### [{issue['type']}] 第 {issue['line_num']} 行 {status}",
                    "",
                    f"> {issue['text']}",
                    "",
                    f"{issue['detail']}",
                    ""
                ])
        else:
            lines.append("暂无问题。")

        if report["fixes"]:
            lines.extend([
                "## 人工修正记录",
                ""
            ])
            for f in report["fixes"]:
                lines.append(f"- 第 {f['line_num']} 行: `{f['pinyin']}`")
                if f.get("note"):
                    lines.append(f"  - 说明: {f['note']}")

        lines.extend([
            "",
            "## 历史版本",
            "",
            "| ID | 名称 | 创建时间 | 行数 | 修正数 |",
            "|----|------|----------|------|--------|"
        ])
        for v in report["history"]:
            lines.append(f"| {v['id']} | {v['name']} | {v['timestamp']} | {v['line_count']} | {v.get('fix_count', 0)} |")

        return "\n".join(lines)
