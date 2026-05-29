"""
错误记录与资产标签追踪模块
"""

import os
import pandas as pd
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ErrorRecord:
    error_type: str
    source: str
    message: str
    asset_name: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AssetTagRecord:
    asset_name: str
    original_sources: List[str]
    original_order_in_source: Dict[str, int]
    current_order: int
    notes: str = ""


class ErrorTracker:
    def __init__(self):
        self.errors: List[ErrorRecord] = []
        self.asset_tags: Dict[str, AssetTagRecord] = {}
        self.source_files: List[str] = []

    def add_error(self, error_type: str, source: str, message: str,
                  asset_name: Optional[str] = None, **kwargs):
        error = ErrorRecord(
            error_type=error_type,
            source=source,
            message=message,
            asset_name=asset_name,
            details=kwargs
        )
        self.errors.append(error)

    def add_source_file(self, file_path: str):
        file_name = os.path.basename(file_path)
        if file_name not in self.source_files:
            self.source_files.append(file_name)

    def register_asset(self, asset_name: str, source: str, order_in_source: int):
        if asset_name not in self.asset_tags:
            self.asset_tags[asset_name] = AssetTagRecord(
                asset_name=asset_name,
                original_sources=[],
                original_order_in_source={},
                current_order=0
            )
        
        if source not in self.asset_tags[asset_name].original_sources:
            self.asset_tags[asset_name].original_sources.append(source)
        
        self.asset_tags[asset_name].original_order_in_source[source] = order_in_source

    def update_current_order(self, asset_order: List[str]):
        for idx, asset in enumerate(asset_order):
            if asset in self.asset_tags:
                self.asset_tags[asset].current_order = idx + 1

    def get_errors_by_type(self, error_type: str) -> List[ErrorRecord]:
        return [e for e in self.errors if e.error_type == error_type]

    def get_errors_by_source(self, source: str) -> List[ErrorRecord]:
        return [e for e in self.errors if e.source == source]

    def get_errors_by_asset(self, asset_name: str) -> List[ErrorRecord]:
        return [e for e in self.errors if e.asset_name == asset_name]

    def get_error_summary(self) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for error in self.errors:
            summary[error.error_type] = summary.get(error.error_type, 0) + 1
        return summary

    def get_asset_source_info(self, asset_name: str) -> Optional[AssetTagRecord]:
        return self.asset_tags.get(asset_name)

    def export_errors_to_dataframe(self) -> pd.DataFrame:
        data = []
        for error in self.errors:
            row = {
                '时间戳': error.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                '错误类型': error.error_type,
                '来源': error.source,
                '关联资产': error.asset_name or '',
                '错误信息': error.message
            }
            for key, value in error.details.items():
                row[f'详情_{key}'] = str(value)
            data.append(row)
        return pd.DataFrame(data)

    def export_asset_tags_to_dataframe(self) -> pd.DataFrame:
        data = []
        for asset_name, tag in self.asset_tags.items():
            row = {
                '资产名称': asset_name,
                '来源文件': ', '.join(tag.original_sources),
                '当前顺序': tag.current_order,
                '备注': tag.notes
            }
            for source, order in tag.original_order_in_source.items():
                row[f'原始顺序_{source}'] = order
            data.append(row)
        return pd.DataFrame(data)

    def save_errors_to_csv(self, output_path: str):
        df = self.export_errors_to_dataframe()
        df.to_csv(output_path, index=False, encoding='utf-8-sig')

    def save_asset_tags_to_csv(self, output_path: str):
        df = self.export_asset_tags_to_dataframe()
        df.to_csv(output_path, index=False, encoding='utf-8-sig')

    def get_readable_error_report(self) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("错误记录汇总报告")
        lines.append("=" * 60)
        
        summary = self.get_error_summary()
        if summary:
            lines.append("错误类型统计:")
            for err_type, count in summary.items():
                lines.append(f"  {err_type}: {count} 个")
            lines.append("")
        else:
            lines.append("无错误记录")
            lines.append("")
        
        if self.errors:
            lines.append("错误详情:")
            lines.append("-" * 60)
            for i, error in enumerate(self.errors, 1):
                lines.append(f"[{i}] {error.error_type}")
                lines.append(f"    来源: {error.source}")
                if error.asset_name:
                    lines.append(f"    资产: {error.asset_name}")
                lines.append(f"    信息: {error.message}")
                if error.details:
                    lines.append(f"    详情: {error.details}")
                lines.append("")
        
        return "\n".join(lines)

    def get_asset_tracking_report(self) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("资产标签追踪报告")
        lines.append("=" * 60)
        lines.append(f"总资产数: {len(self.asset_tags)}")
        lines.append(f"来源文件: {', '.join(self.source_files)}")
        lines.append("")
        
        lines.append("资产来源明细:")
        lines.append("-" * 60)
        for asset_name, tag in sorted(self.asset_tags.items(), key=lambda x: x[1].current_order):
            lines.append(f"{tag.current_order}. {asset_name}")
            lines.append(f"   来源: {', '.join(tag.original_sources)}")
            if tag.notes:
                lines.append(f"   备注: {tag.notes}")
            lines.append("")
        
        return "\n".join(lines)
