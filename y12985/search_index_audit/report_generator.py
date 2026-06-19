"""统一报表导出 - 图表、明细、下载来自同一批数据"""

import json
import csv
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any

from .models import (
    AuditReport,
    IndexSuggestion,
    PermissionAuditRecord,
    SlowQueryRecord,
    BackupRecord,
    AuditStatus,
)
from .storage import AuditStorage


class ReportGenerator:
    """报表生成器 - 图表、明细和下载结果来自同一批数据"""

    def __init__(self, storage: AuditStorage):
        self.storage = storage

    def generate_report(
        self,
        name: str,
        batch_id: str,
        description: str = "",
    ) -> AuditReport:
        """
        生成审计报告 - 基于同一批数据

        Args:
            name: 报告名称
            batch_id: 数据批次 ID
            description: 报告描述

        Returns:
            审计报告
        """
        index_suggestions = self.storage.get_index_suggestions(batch_id)
        permissions = self.storage.get_permission_audits(batch_id)
        slow_queries = self.storage.get_slow_queries(batch_id)
        backups = self.storage.get_backup_records(batch_id)

        report = AuditReport(
            id=str(uuid.uuid4()),
            name=name,
            generated_at=datetime.now(),
            data_batch_id=batch_id,
            index_suggestion_count=len(index_suggestions),
            index_suggestion_passed=sum(1 for s in index_suggestions if s.status == AuditStatus.PASSED),
            permission_audit_count=len(permissions),
            permission_audit_needs_review=sum(
                1 for p in permissions if p.status == AuditStatus.NEEDS_REVIEW
            ),
            slow_query_count=len(slow_queries),
            backup_count=len(backups),
            backup_can_use_directly=sum(1 for b in backups if b.can_use_directly),
        )

        self.storage.add_report(report)
        return report

    def export_report_json(
        self,
        report_id: str,
        output_path: str,
    ) -> str:
        """
        导出报告为 JSON 格式 - 包含图表数据、明细、溯源链接

        Args:
            report_id: 报告 ID
            output_path: 输出文件路径

        Returns:
            输出文件路径
        """
        report = self._get_report(report_id)
        if not report:
            raise ValueError(f"报告 {report_id} 不存在")

        batch_id = report.data_batch_id
        index_suggestions = self.storage.get_index_suggestions(batch_id)
        permissions = self.storage.get_permission_audits(batch_id)
        slow_queries = self.storage.get_slow_queries(batch_id)
        backups = self.storage.get_backup_records(batch_id)

        report_data = {
            "report": report.to_dict(),
            "summary": self._build_summary(index_suggestions, permissions, slow_queries, backups),
            "chart_data": self._build_chart_data(index_suggestions, permissions, slow_queries, backups),
            "details": {
                "index_suggestions": [s.to_dict() for s in index_suggestions],
                "permission_audits": [p.to_dict() for p in permissions],
                "slow_queries": [q.to_dict() for q in slow_queries],
                "backups": [b.to_dict() for b in backups],
            },
            "trace_back_links": self._build_trace_links(index_suggestions, permissions, slow_queries, backups),
            "generated_at": datetime.now().isoformat(),
            "data_batch_id": batch_id,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)

        return output_path

    def export_report_csv(
        self,
        report_id: str,
        output_dir: str,
    ) -> Dict[str, str]:
        """
        导出报告为 CSV 格式 - 分多个文件，同一批数据

        Args:
            report_id: 报告 ID
            output_dir: 输出目录

        Returns:
            各文件路径字典
        """
        report = self._get_report(report_id)
        if not report:
            raise ValueError(f"报告 {report_id} 不存在")

        batch_id = report.data_batch_id
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        files = {}

        index_suggestions = self.storage.get_index_suggestions(batch_id)
        files["index_suggestions"] = self._write_csv(
            f"{output_dir}/index_suggestions.csv",
            ["ID", "表名", "列名", "索引类型", "建议原因", "预期提升", "状态", "来源数量"],
            [[
                s.id,
                s.table_name,
                ", ".join(s.column_names),
                s.index_type.value,
                s.suggestion_reason,
                f"{s.expected_improvement:.1f}x",
                s.status.value,
                len(s.sources),
            ] for s in index_suggestions],
        )

        permissions = self.storage.get_permission_audits(batch_id)
        files["permission_audits"] = self._write_csv(
            f"{output_dir}/permission_audits.csv",
            ["ID", "用户", "表名", "权限级别", "风险等级", "风险原因", "状态"],
            [[
                p.id,
                p.user_name,
                p.table_name,
                p.permission_level.value,
                p.risk_level,
                p.risk_reason or "",
                p.status.value,
            ] for p in permissions],
        )

        slow_queries = self.storage.get_slow_queries(batch_id)
        files["slow_queries"] = self._write_csv(
            f"{output_dir}/slow_queries.csv",
            ["ID", "SQL摘要", "执行时间(ms)", "扫描行数", "返回行数", "归因", "关联索引建议"],
            [[
                q.id,
                q.query_sql[:80] + "..." if len(q.query_sql) > 80 else q.query_sql,
                f"{q.execution_time_ms:.1f}",
                q.rows_examined,
                q.rows_sent,
                q.attribution or "",
                q.related_index_suggestion_id or "",
            ] for q in slow_queries],
        )

        backups = self.storage.get_backup_records(batch_id)
        files["backups"] = self._write_csv(
            f"{output_dir}/backups.csv",
            ["ID", "备份名", "时间", "大小(MB)", "来源库", "可直接使用", "状态", "复核原因"],
            [[
                b.id,
                b.backup_name,
                b.backup_time.isoformat(),
                f"{b.backup_size_bytes / 1024 / 1024:.2f}",
                b.source_db,
                "是" if b.can_use_directly else "否",
                b.status.value,
                b.review_reason or "",
            ] for b in backups],
        )

        files["summary"] = self._write_summary_csv(output_dir, report, index_suggestions, permissions, slow_queries, backups)

        return files

    def _write_csv(self, path: str, headers: List[str], rows: List[List[Any]]) -> str:
        """写入 CSV 文件"""
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
        return path

    def _write_summary_csv(
        self,
        output_dir: str,
        report: AuditReport,
        index_suggestions: List[IndexSuggestion],
        permissions: List[PermissionAuditRecord],
        slow_queries: List[SlowQueryRecord],
        backups: List[BackupRecord],
    ) -> str:
        """写入汇总 CSV"""
        path = f"{output_dir}/summary.csv"
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["指标", "数值", "说明"])
            writer.writerow(["报告名称", report.name, ""])
            writer.writerow(["数据批次", report.data_batch_id, "图表、明细、下载均来自此批次"])
            writer.writerow(["生成时间", report.generated_at.isoformat(), ""])
            writer.writerow(["索引建议总数", report.index_suggestion_count, ""])
            writer.writerow(["索引建议已通过", report.index_suggestion_passed, ""])
            writer.writerow(["权限审计总数", report.permission_audit_count, ""])
            writer.writerow(["权限需复核", report.permission_audit_needs_review, ""])
            writer.writerow(["慢查询总数", report.slow_query_count, ""])
            writer.writerow(["备份总数", report.backup_count, ""])
            writer.writerow(["备份可直接使用", report.backup_can_use_directly, ""])
        return path

    def _get_report(self, report_id: str) -> Optional[AuditReport]:
        reports = self.storage.get_reports()
        for r in reports:
            if r.id == report_id:
                return r
        return None

    def _build_summary(
        self,
        index_suggestions: List[IndexSuggestion],
        permissions: List[PermissionAuditRecord],
        slow_queries: List[SlowQueryRecord],
        backups: List[BackupRecord],
    ) -> Dict[str, Any]:
        """构建汇总数据"""
        return {
            "index_suggestions": {
                "total": len(index_suggestions),
                "by_status": self._count_by_status(index_suggestions),
                "by_table": self._count_by_field(index_suggestions, "table_name"),
            },
            "permissions": {
                "total": len(permissions),
                "by_risk": self._count_by_field(permissions, "risk_level"),
                "by_status": self._count_by_status(permissions),
            },
            "slow_queries": {
                "total": len(slow_queries),
                "by_table": self._count_by_field(slow_queries, "table_name"),
                "total_time_ms": sum(q.execution_time_ms for q in slow_queries),
                "avg_time_ms": sum(q.execution_time_ms for q in slow_queries) / max(len(slow_queries), 1),
            },
            "backups": {
                "total": len(backups),
                "can_use_directly": sum(1 for b in backups if b.can_use_directly),
                "needs_review": sum(1 for b in backups if not b.can_use_directly),
            },
        }

    def _build_chart_data(
        self,
        index_suggestions: List[IndexSuggestion],
        permissions: List[PermissionAuditRecord],
        slow_queries: List[SlowQueryRecord],
        backups: List[BackupRecord],
    ) -> Dict[str, Any]:
        """构建图表数据 - 用于看板展示"""
        return {
            "index_status_pie": [
                {"name": "已通过", "value": sum(1 for s in index_suggestions if s.status == AuditStatus.PASSED)},
                {"name": "待处理", "value": sum(1 for s in index_suggestions if s.status == AuditStatus.PENDING)},
                {"name": "需复核", "value": sum(1 for s in index_suggestions if s.status == AuditStatus.NEEDS_REVIEW)},
            ],
            "permission_risk_bar": [
                {"name": "低风险", "value": sum(1 for p in permissions if p.risk_level == "low")},
                {"name": "中风险", "value": sum(1 for p in permissions if p.risk_level == "medium")},
                {"name": "高风险", "value": sum(1 for p in permissions if p.risk_level == "high")},
                {"name": "严重", "value": sum(1 for p in permissions if p.risk_level == "critical")},
            ],
            "slow_query_top_tables": sorted(
                self._count_by_field(slow_queries, "table_name").items(),
                key=lambda x: x[1],
                reverse=True,
            )[:10],
            "backup_status_donut": [
                {"name": "可直接使用", "value": sum(1 for b in backups if b.can_use_directly)},
                {"name": "需复核", "value": sum(1 for b in backups if not b.can_use_directly and b.status == AuditStatus.NEEDS_REVIEW)},
                {"name": "不通过", "value": sum(1 for b in backups if b.status == AuditStatus.FAILED)},
            ],
        }

    def _build_trace_links(
        self,
        index_suggestions: List[IndexSuggestion],
        permissions: List[PermissionAuditRecord],
        slow_queries: List[SlowQueryRecord],
        backups: List[BackupRecord],
    ) -> Dict[str, List[Dict[str, Any]]]:
        """构建溯源链接 - 报表和结论之间能点回去"""
        return {
            "index_suggestions": [
                {
                    "id": s.id,
                    "trace_path": f"/audit/index-suggestions/{s.id}",
                    "source_count": len(s.sources),
                    "source_types": list({src.source_type.value for src in s.sources}),
                }
                for s in index_suggestions
            ],
            "permissions": [
                {
                    "id": p.id,
                    "trace_path": f"/audit/permissions/{p.id}",
                    "source_count": len(p.sources),
                    "source_types": list({src.source_type.value for src in p.sources}),
                }
                for p in permissions
            ],
            "slow_queries": [
                {
                    "id": q.id,
                    "trace_path": f"/audit/slow-queries/{q.id}",
                    "source_count": len(q.sources),
                    "related_suggestion_id": q.related_index_suggestion_id,
                }
                for q in slow_queries
            ],
            "backups": [
                {
                    "id": b.id,
                    "trace_path": f"/audit/backups/{b.id}",
                    "source_count": len(b.sources),
                }
                for b in backups
            ],
        }

    def _count_by_status(self, records: List[Any]) -> Dict[str, int]:
        result = {}
        for r in records:
            status = r.status.value
            result[status] = result.get(status, 0) + 1
        return result

    def _count_by_field(self, records: List[Any], field_name: str) -> Dict[str, int]:
        result = {}
        for r in records:
            value = getattr(r, field_name, None)
            if value:
                result[str(value)] = result.get(str(value), 0) + 1
        return result

    def list_reports(self) -> List[AuditReport]:
        """列出所有报告"""
        return self.storage.get_reports()

    def get_report_detail(self, report_id: str) -> Optional[Dict[str, Any]]:
        """获取报告详情，含同一批数据的所有内容"""
        report = self._get_report(report_id)
        if not report:
            return None

        batch_id = report.data_batch_id
        return {
            "report": report,
            "batch_id": batch_id,
            "index_suggestions": self.storage.get_index_suggestions(batch_id),
            "permissions": self.storage.get_permission_audits(batch_id),
            "slow_queries": self.storage.get_slow_queries(batch_id),
            "backups": self.storage.get_backup_records(batch_id),
        }
