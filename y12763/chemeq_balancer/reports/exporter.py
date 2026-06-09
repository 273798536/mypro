"""
报告导出器
==========

重要不变量:
    导出文件中的 summary 与界面显示的 summary 必须完全一致,
    两者都由 BatchReport.compute_summary() 实时计算,
    杜绝"界面显示通过、导出文件写待确认"的不一致问题。

支持格式:
    - JSON: 完整数据 (批次 + 反应 + 审计 + 复测), 可再导入
    - CSV:  反应记录列表 (便于 Excel 查看)
    - TXT:  人可读文本报告 (月底/课前汇报用)
"""

import csv
import json
from enum import Enum
from io import StringIO
from pathlib import Path
from typing import Dict, List, Optional

from ..models import (
    AuditAction,
    BatchReport,
    ReactionStatus,
)
from ..storage import StorageBackend, get_default_storage


class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    TXT = "txt"


REQUIRED_SUMMARY_FIELDS = [
    "batch_id", "title", "total_reactions", "blank_count",
    "verified_count", "pending_count", "rejected_count",
    "needs_retest_count", "has_blank_control", "duplicate_conflicts",
    "all_consistent", "last_updated",
]


class Exporter:
    """报告导出器"""

    def __init__(self, storage: Optional[StorageBackend] = None):
        self.storage = storage or get_default_storage()

    def export_batch(
        self,
        batch: BatchReport,
        fmt: ExportFormat = ExportFormat.JSON,
    ) -> str:
        """导出单个批次为指定格式的字符串"""
        if fmt == ExportFormat.JSON:
            return self._export_json(batch)
        elif fmt == ExportFormat.CSV:
            return self._export_csv(batch)
        else:
            return self._export_txt(batch)

    def _build_consistent_payload(self, batch: BatchReport) -> Dict:
        """
        构建导出 payload。
        核心: summary 由 compute_summary() 生成, 与 CLI 显示使用同一来源。
        """
        summary = batch.compute_summary()
        reactions_summary = [r.summary_line() for r in batch.reactions]
        retest_list = [
            {
                "id": s.id,
                "reaction_id": s.reaction_id,
                "priority": s.priority.value,
                "priority_display": s.priority.display_name,
                "reason": s.reason,
                "recommendation": s.recommendation,
                "resolved": s.resolved,
                "created_at": s.created_at,
            }
            for s in batch.retest_suggestions
        ]
        return {
            "tool": "chemeq-balancer",
            "tool_version": "1.0.0",
            "exported_at": batch.updated_at,
            "summary": summary.model_dump(),
            "summary_display": summary.to_display_dict(),
            "reactions": reactions_summary,
            "reactions_full": [r.model_dump() for r in batch.reactions],
            "retest_suggestions": retest_list,
            "audit_trail_count": len(batch.audit_trail),
            "audit_trail": [
                {
                    "id": e.id,
                    "action": e.action.value,
                    "reaction_id": e.reaction_id,
                    "operator": e.operator,
                    "timestamp": e.timestamp,
                    "comment": e.comment,
                }
                for e in batch.audit_trail
            ],
        }

    def _export_json(self, batch: BatchReport) -> str:
        payload = self._build_consistent_payload(batch)
        return json.dumps(payload, ensure_ascii=False, indent=2)

    def _export_csv(self, batch: BatchReport) -> str:
        payload = self._build_consistent_payload(batch)
        buf = StringIO()
        summary = payload["summary"]
        buf.write(f"# 批次摘要\n")
        for k in REQUIRED_SUMMARY_FIELDS:
            buf.write(f"# {k}: {summary[k]}\n")
        buf.write(f"# approval_rate: {payload['summary_display']['approval_rate_display']}\n")
        buf.write(f"# status_overview: {payload['summary_display']['status_overview']}\n")
        buf.write("\n")

        fieldnames = [
            "id", "experiment_id", "equation", "status", "status_display",
            "is_blank", "operator", "updated_at",
        ]
        writer = csv.DictWriter(buf, fieldnames=fieldnames)
        writer.writeheader()
        for r in payload["reactions"]:
            writer.writerow({k: r.get(k, "") for k in fieldnames})
        return buf.getvalue()

    def _export_txt(self, batch: BatchReport) -> str:
        payload = self._build_consistent_payload(batch)
        summary = payload["summary"]
        disp = payload["summary_display"]
        lines: List[str] = []
        lines.append("=" * 72)
        lines.append("化学方程式配平批次报告")
        lines.append("=" * 72)
        lines.append(f"批次ID:    {summary['batch_id']}")
        lines.append(f"批次名称:  {summary['title']}")
        lines.append(f"最后更新:  {summary['last_updated']}")
        lines.append(f"合格率:    {disp['approval_rate_display']}")
        lines.append(f"状态总览:  {disp['status_overview']}")
        lines.append("")
        lines.append("-" * 72)
        lines.append("质控项:")
        lines.append(f"  · 空白对照:       {'✓ 已包含' if summary['has_blank_control'] else '✗ 缺失 (紧急)'}")
        lines.append(f"  · 指纹冲突:       {'✗ 存在' + str(summary['duplicate_conflicts']) + '组' if summary['duplicate_conflicts'] else '✓ 无'}")
        lines.append(f"  · 数据一致性:     {'✓ 完全一致' if summary['all_consistent'] else '✗ 待处理'}")
        lines.append("")
        lines.append("-" * 72)
        lines.append("反应记录列表:")
        for r in payload["reactions"]:
            blank_mark = " [空白]" if r["is_blank"] else ""
            lines.append(f"  [{r['status_display']}]{blank_mark} {r['experiment_id'] or r['id']}")
            lines.append(f"      方程式: {r['equation']}")
            lines.append(f"      操作员: {r['operator'] or '未填'} | 更新: {r['updated_at'][:19]}")
        unresolved = [s for s in payload["retest_suggestions"] if not s["resolved"]]
        if unresolved:
            lines.append("")
            lines.append("-" * 72)
            lines.append(f"待处理复测建议 ({len(unresolved)} 条):")
            for s in unresolved:
                lines.append(f"  [{s['priority_display']}] {s['reason']}")
                if s["recommendation"]:
                    lines.append(f"      建议: {s['recommendation']}")
        lines.append("")
        lines.append("-" * 72)
        lines.append(f"审计追踪共 {payload['audit_trail_count']} 条记录")
        lines.append("=" * 72)
        return "\n".join(lines) + "\n"

    def save_to_file(self, batch: BatchReport, out_path: str, fmt: Optional[ExportFormat] = None) -> str:
        if fmt is None:
            suffix = Path(out_path).suffix.lower().lstrip(".")
            try:
                fmt = ExportFormat(suffix)
            except ValueError:
                fmt = ExportFormat.TXT
        content = self.export_batch(batch, fmt)
        path = Path(out_path).expanduser().resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return str(path)


def export_batch(batch: BatchReport, fmt: ExportFormat = ExportFormat.JSON) -> str:
    """便捷函数: 导出批次"""
    return Exporter().export_batch(batch, fmt)
