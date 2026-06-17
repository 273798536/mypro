"""报告生成模块。"""
from .side_by_side import ReportGenerator, generate_snapshot_report, generate_migration_status_report

__all__ = [
    "ReportGenerator",
    "generate_snapshot_report",
    "generate_migration_status_report",
]
