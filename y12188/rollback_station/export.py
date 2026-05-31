import json
from datetime import datetime
from .models import CheckIssue, ExportEntry, IssueType, SampleClass


class ExportManager:
    def __init__(self):
        self._entries: list = []

    def add_from_issues(self, issues: list, timestamp: str = ""):
        ts = timestamp or datetime.now().strftime("%Y-%m-%d")
        for issue in issues:
            self._entries.append(ExportEntry(
                version_id=issue.version_ref,
                issue_type=issue.issue_type,
                track_name=issue.track_name,
                sample_class=issue.sample_class,
                detail=issue.detail,
                timestamp=ts,
            ))

    def mark_resolved(self, track_name: str, version_ref: str) -> bool:
        for e in self._entries:
            if e.track_name == track_name and e.version_id == version_ref and not e.resolved:
                e.resolved = True
                return True
        return False

    def export_list(self) -> list:
        return list(self._entries)

    def export_json(self) -> str:
        data = [
            {
                "version": e.version_id,
                "type": e.issue_type.value,
                "track": e.track_name,
                "class": e.sample_class.value,
                "detail": e.detail,
                "timestamp": e.timestamp,
                "resolved": e.resolved,
            }
            for e in self._entries
        ]
        return json.dumps(data, ensure_ascii=False, indent=2)

    def monthly_review(self, year: int, month: int) -> dict:
        matching = [
            e for e in self._entries
            if e.timestamp.startswith(f"{year}-{month:02d}")
        ]
        if not matching:
            return {"year": year, "month": month, "total": 0, "items": []}

        by_type = {}
        for e in matching:
            key = e.issue_type.value
            if key not in by_type:
                by_type[key] = {"total": 0, "resolved": 0, "unresolved": 0}
            by_type[key]["total"] += 1
            if e.resolved:
                by_type[key]["resolved"] += 1
            else:
                by_type[key]["unresolved"] += 1

        by_class = {}
        for e in matching:
            key = e.sample_class.value
            by_class[key] = by_class.get(key, 0) + 1

        return {
            "year": year,
            "month": month,
            "total": len(matching),
            "resolved": len([e for e in matching if e.resolved]),
            "unresolved": len([e for e in matching if not e.resolved]),
            "by_type": by_type,
            "by_class": by_class,
            "items": [
                {
                    "version": e.version_id,
                    "type": e.issue_type.value,
                    "track": e.track_name,
                    "class": e.sample_class.value,
                    "detail": e.detail,
                    "resolved": e.resolved,
                }
                for e in matching
            ],
        }

    def monthly_review_report(self, year: int, month: int) -> str:
        review = self.monthly_review(year, month)
        if review["total"] == 0:
            return f"# {year}年{month}月 复盘报告\n\n本月无检查记录。"

        lines = [
            f"# {year}年{month}月 编曲版本回滚台 — 复盘报告",
            "",
            "## 总体情况",
            f"- 本月共检出 **{review['total']}** 条问题",
            f"- 已解决: {review['resolved']} 条",
            f"- 未解决: {review['unresolved']} 条",
            "",
            "## 按问题类型",
            "",
        ]
        for type_name, counts in review["by_type"].items():
            status = "✅" if counts["unresolved"] == 0 else "⚠️"
            lines.append(
                f"- {status} {type_name}: 共{counts['total']}条, "
                f"已解决{counts['resolved']}条, 未解决{counts['unresolved']}条"
            )

        lines.append("")
        lines.append("## 按样本分类")
        lines.append("")
        for class_name, count in review["by_class"].items():
            lines.append(f"- {class_name}: {count}条")

        lines.append("")
        lines.append("## 未解决问题清单")
        lines.append("")
        unresolved = [item for item in review["items"] if not item["resolved"]]
        if not unresolved:
            lines.append("全部已解决 🎉")
        else:
            for idx, item in enumerate(unresolved, 1):
                lines.append(
                    f"{idx}. [{item['class']}] {item['type']} — "
                    f"轨道'{item['track']}' ({item['version']})"
                )
        return "\n".join(lines)
