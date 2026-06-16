import json
import csv
import os
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from collections import Counter
from models import (
    VersionRecord,
    CheckReport,
    CheckResult,
    SampleStatus,
    CheckType,
)
from version_tracker import VersionTracker


class ReportGenerator:
    def __init__(self, output_dir: str = "./reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _generate_plain_language_explanation(
        self,
        summary: Dict[str, Any],
        version: VersionRecord,
    ) -> str:
        total = summary["total"]
        pass_count = summary["by_status"]["通过"]
        pending_count = summary["by_status"]["待确认"]
        fail_count = summary["by_status"]["不通过"]

        by_issue_type = summary["by_issue_type"]
        missing_image = by_issue_type.get("缺图检查", 0)
        dataset_bias = by_issue_type.get("评测集偏科检查", 0)
        bad_data = by_issue_type.get("坏数据检查", 0)

        lines = []
        lines.append("【多模态样本缺图检查结果说明】")
        lines.append("")
        lines.append(
            f"本次共检查 {total} 条多模态样本，检查时间：{version.timestamp}"
        )
        lines.append(f"版本号：{version.version_id}")
        if version.description:
            lines.append(f"版本说明：{version.description}")
        lines.append("")

        lines.append("一、整体情况：")
        lines.append(
            f"  ✅ 通过检查：{pass_count} 条（{pass_count/total*100:.1f}%）"
        )
        if pending_count > 0:
            lines.append(
                f"  ⚠️  待确认：{pending_count} 条（{pending_count/total*100:.1f}%）"
            )
        if fail_count > 0:
            lines.append(
                f"  ❌ 不通过：{fail_count} 条（{fail_count/total*100:.1f}%）"
            )
        lines.append("")

        lines.append("二、问题分类说明：")
        if missing_image > 0:
            lines.append(
                f"  • 缺图问题：{missing_image} 条。多模态样本需要图文配对，"
                "这些样本缺少对应的图片资源，需要补充图片后才能用于训练。"
            )
        if dataset_bias > 0:
            lines.append(
                f"  • 评测集偏科：{dataset_bias} 条。这是指评测集中某些类别的样本"
                "数量过多或过少，分布不均匀。如果用偏科的评测集来测试模型，"
                "测试结果会不准确，模型可能在数量多的类别上表现好，"
                "在数量少的类别上表现差，但我们无法真实判断模型的整体能力。"
                "需要补充数量少的类别的样本，让各类别分布更均匀。"
            )
        if bad_data > 0:
            lines.append(
                f"  • 坏数据：{bad_data} 条。这些样本的关键字段缺失或格式错误，"
                "例如没有样本ID、没有文本内容、类别或来源为空等，"
                "无法用于模型训练，需要修正或删除。"
            )
        if missing_image == 0 and dataset_bias == 0 and bad_data == 0:
            lines.append("  • 本次检查未发现问题，所有样本均符合要求。")
        lines.append("")

        lines.append("三、建议处理方式：")
        if fail_count > 0:
            lines.append(f"  1. 先处理 {fail_count} 条不通过的坏数据，" "修正或删除这些样本。")
        if missing_image > 0:
            lines.append(f"  2. 为 {missing_image} 条缺图样本补充对应的图片资源。")
        if dataset_bias > 0:
            lines.append(
                f"  3. 针对评测集偏科问题，查看各类别分布情况，"
                "为样本量少的类别补充数据，使各类别占比尽量均衡。"
            )
        if pending_count > 0:
            lines.append(
                f"  4. {pending_count} 条待确认的记录需要人工复核，"
                "确认问题是否属实以及如何处理。"
            )
        if pass_count == total:
            lines.append("  所有样本均通过检查，可以进入下一步流程。")
        lines.append("")

        lines.append("四、人工备注说明：")
        has_notes = False
        for res in version.check_results.values():
            if res.manual_note:
                has_notes = True
                break
        if has_notes:
            lines.append("  以下记录包含人工备注，已原样保留：")
            for sample_id, res in version.check_results.items():
                if res.manual_note:
                    lines.append(f"  - 样本 {sample_id}：{res.manual_note}")
        else:
            lines.append("  本次检查的样本暂无人工备注。")
        lines.append("")

        lines.append("—— 以上内容可直接复制转发给同事参考 ——")

        return "\n".join(lines)

    def _build_summary(
        self, check_results: Dict[str, CheckResult]
    ) -> Dict[str, Any]:
        total = len(check_results)

        by_status = Counter()
        by_issue_type = Counter()
        by_severity = Counter()
        by_category = Counter()

        issue_types_seen = set()

        for res in check_results.values():
            by_status[res.status.value] += 1

            for issue in res.issues:
                key = (res.sample_id, issue.check_type.value)
                if key not in issue_types_seen:
                    issue_types_seen.add(key)
                    by_issue_type[issue.check_type.value] += 1
                by_severity[issue.severity] += 1

        for status in ["通过", "待确认", "不通过"]:
            if status not in by_status:
                by_status[status] = 0

        return {
            "total": total,
            "by_status": dict(by_status),
            "by_issue_type": dict(by_issue_type),
            "by_severity": dict(by_severity),
            "pass_rate": (
                by_status["通过"] / total * 100 if total > 0 else 0
            ),
        }

    def _build_details(
        self,
        version: VersionRecord,
        samples_by_id: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        details = []
        for sample_id in sorted(version.sample_ids):
            res = version.check_results[sample_id]

            detail = {
                "sample_id": sample_id,
                "status": res.status.value,
                "checked_at": res.checked_at,
                "manual_note": res.manual_note,
                "issues": [
                    {
                        "check_type": issue.check_type.value,
                        "severity": issue.severity,
                        "message": issue.message,
                        "details": issue.details,
                    }
                    for issue in res.issues
                ],
            }

            if samples_by_id and sample_id in samples_by_id:
                sample = samples_by_id[sample_id]
                detail.update(
                    {
                        "text_content": sample.text_content,
                        "category": sample.category,
                        "source": sample.source,
                        "image_count": len(sample.image_paths),
                        "image_paths": sample.image_paths,
                    }
                )

            details.append(detail)
        return details

    def _build_chart_data(
        self, summary: Dict[str, Any], details: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        status_chart = {
            "type": "pie",
            "title": "样本状态分布",
            "data": [
                {"name": status, "value": count}
                for status, count in summary["by_status"].items()
                if count > 0
            ],
        }

        issue_type_chart = {
            "type": "bar",
            "title": "问题类型分布",
            "categories": list(summary["by_issue_type"].keys()),
            "values": list(summary["by_issue_type"].values()),
        }

        category_bias_data = {}
        for detail in details:
            category = detail.get("category", "未分类")
            if category not in category_bias_data:
                category_bias_data[category] = {"total": 0, "has_issue": 0}
            category_bias_data[category]["total"] += 1
            if detail["status"] != "通过":
                category_bias_data[category]["has_issue"] += 1

        category_chart = {
            "type": "bar",
            "title": "各类别问题分布",
            "categories": list(category_bias_data.keys()),
            "series": [
                {
                    "name": "样本总数",
                    "data": [v["total"] for v in category_bias_data.values()],
                },
                {
                    "name": "有问题数",
                    "data": [v["has_issue"] for v in category_bias_data.values()],
                },
            ],
        }

        return {
            "status_distribution": status_chart,
            "issue_type_distribution": issue_type_chart,
            "category_distribution": category_chart,
        }

    def generate_report(
        self,
        version: VersionRecord,
        tracker: VersionTracker,
        samples_by_id: Optional[Dict[str, Any]] = None,
    ) -> CheckReport:
        data_signature = tracker.compute_data_signature(version.check_results)

        summary = self._build_summary(version.check_results)
        details = self._build_details(version, samples_by_id)
        chart_data = self._build_chart_data(summary, details)
        plain_language = self._generate_plain_language_explanation(
            summary, version
        )

        summary["charts"] = chart_data

        report = CheckReport(
            report_id=f"report_{uuid.uuid4().hex[:12]}",
            generated_at=datetime.now().isoformat(),
            version_id=version.version_id,
            summary=summary,
            details=details,
            plain_language_explanation=plain_language,
            data_signature=data_signature,
        )

        return report

    def save_report_json(self, report: CheckReport) -> str:
        filepath = os.path.join(
            self.output_dir, f"{report.report_id}.json"
        )
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report.to_dict(), f, ensure_ascii=False, indent=2)
        return filepath

    def save_report_csv(self, report: CheckReport) -> str:
        filepath = os.path.join(
            self.output_dir, f"{report.report_id}.csv"
        )

        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)

            writer.writerow(
                [
                    "【多模态样本缺图检查报告】",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
            )
            writer.writerow(
                [
                    f"报告ID：{report.report_id}",
                    f"生成时间：{report.generated_at}",
                    f"版本号：{report.version_id}",
                    f"数据签名：{report.data_signature}",
                    "",
                    "",
                ]
            )
            writer.writerow([])

            writer.writerow(
                [
                    "【汇总统计】",
                    f"总数：{report.summary['total']}",
                    f"通过：{report.summary['by_status']['通过']}",
                    f"待确认：{report.summary['by_status']['待确认']}",
                    f"不通过：{report.summary['by_status']['不通过']}",
                    f"通过率：{report.summary['pass_rate']:.1f}%",
                ]
            )
            writer.writerow([])

            writer.writerow(
                [
                    "样本ID",
                    "状态",
                    "检查时间",
                    "问题类型",
                    "严重程度",
                    "问题描述",
                    "详细说明",
                    "人工备注",
                ]
            )

            for detail in report.details:
                if not detail["issues"]:
                    writer.writerow(
                        [
                            detail["sample_id"],
                            detail["status"],
                            detail["checked_at"],
                            "",
                            "",
                            "",
                            "",
                            detail.get("manual_note", ""),
                        ]
                    )
                else:
                    for i, issue in enumerate(detail["issues"]):
                        explanation = issue["details"].get(
                            "explanation", ""
                        )
                        writer.writerow(
                            [
                                detail["sample_id"] if i == 0 else "",
                                detail["status"] if i == 0 else "",
                                detail["checked_at"] if i == 0 else "",
                                issue["check_type"],
                                issue["severity"],
                                issue["message"],
                                explanation,
                                detail.get("manual_note", "") if i == 0 else "",
                            ]
                        )

            writer.writerow([])
            writer.writerow(["【普通话解释】"])
            for line in report.plain_language_explanation.split("\n"):
                writer.writerow([line])

        return filepath

    def save_report_markdown(self, report: CheckReport) -> str:
        filepath = os.path.join(
            self.output_dir, f"{report.report_id}.md"
        )

        lines = []
        lines.append("# 多模态样本缺图检查报告")
        lines.append("")
        lines.append(f"- **报告ID**：{report.report_id}")
        lines.append(f"- **生成时间**：{report.generated_at}")
        lines.append(f"- **版本号**：{report.version_id}")
        lines.append(f"- **数据签名**：{report.data_signature}")
        lines.append("")

        lines.append("## 一、汇总统计")
        lines.append("")
        lines.append(
            f"| 总数 | 通过 | 待确认 | 不通过 | 通过率 |"
        )
        lines.append(
            f"|------|------|--------|--------|--------|"
        )
        s = report.summary
        lines.append(
            f"| {s['total']} | {s['by_status']['通过']} | "
            f"{s['by_status']['待确认']} | {s['by_status']['不通过']} | "
            f"{s['pass_rate']:.1f}% |"
        )
        lines.append("")

        lines.append("## 二、明细数据")
        lines.append("")
        lines.append(
            "| 样本ID | 状态 | 问题类型 | 严重程度 | 问题描述 | 人工备注 |"
        )
        lines.append(
            "|--------|------|----------|----------|----------|----------|"
        )

        for detail in report.details:
            sample_id = detail["sample_id"]
            status = detail["status"]
            manual_note = detail.get("manual_note", "") or ""

            if not detail["issues"]:
                lines.append(
                    f"| {sample_id} | {status} | - | - | - | {manual_note} |"
                )
            else:
                for i, issue in enumerate(detail["issues"]):
                    lines.append(
                        f"| {sample_id if i == 0 else ''} | "
                        f"{status if i == 0 else ''} | "
                        f"{issue['check_type']} | {issue['severity']} | "
                        f"{issue['message']} | "
                        f"{manual_note if i == 0 else ''} |"
                    )
        lines.append("")

        lines.append("## 三、普通话解释")
        lines.append("")
        lines.append("```")
        lines.append(report.plain_language_explanation)
        lines.append("```")
        lines.append("")

        lines.append("---")
        lines.append(
            f"> 注：本报告的图表、明细、下载文件均基于同一批数据（数据签名：{report.data_signature}），"
            "确保数据一致性。"
        )

        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filepath

    def export_all_formats(
        self,
        version: VersionRecord,
        tracker: VersionTracker,
        samples_by_id: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, str]:
        report = self.generate_report(version, tracker, samples_by_id)

        paths = {
            "report": report,
            "json": self.save_report_json(report),
            "csv": self.save_report_csv(report),
            "markdown": self.save_report_markdown(report),
        }

        return paths
