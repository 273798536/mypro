from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from pathlib import Path
from typing import Iterable

from .bucket import BucketAssigner
from .models import (
    AnomalyLevel,
    BucketAssignment,
    BucketCategory,
    CorrectionTrace,
    MetricRecord,
    ValidationIssue,
)
from .validator import InputValidator


class ReportGenerator:
    def __init__(
        self,
        validator: InputValidator,
        assigner: BucketAssigner,
    ):
        self.validator = validator
        self.assigner = assigner

    def generate_summary(self) -> str:
        lines = ['=== 统计异常分桶报告 ===', '']

        lines.append('【校验信息】')
        lines.append(self.validator.summary())
        lines.append('')

        assignments = self.assigner.get_assignments()
        corrections = self.assigner.get_corrections()

        lines.append('【分桶统计】')
        lines.append(f'异常记录总数: {len(assignments)}')
        grouped = self.assigner.group_by_category()
        for cat, items in grouped.items():
            lines.append(f'  {cat.value}: {len(items)} 条')
            for bucket, bitems in self._group_by_bucket_name(items).items():
                lines.append(f'    - {bucket}: {len(bitems)} 条')
        lines.append('')

        lines.append('【异常等级分布】')
        for level in AnomalyLevel:
            count = sum(1 for a in assignments if a.level == level)
            lines.append(f'  {level.value}: {count} 条')
        lines.append('')

        if corrections:
            lines.append('【修正记录】')
            for c in corrections:
                lines.append(
                    f'  [{c.timestamp.strftime("%Y-%m-%d %H:%M")}] '
                    f'{c.operator}: {c.field} {c.old_value} → {c.new_value} '
                    f'({c.reason or "无说明"})'
                )
            lines.append('')

        return '\n'.join(lines)

    def generate_detail_report(
        self,
        records: Iterable[MetricRecord],
    ) -> str:
        records = list(records)
        lines = [self.generate_summary(), '']

        lines.append('【异常明细】')
        assignments = self.assigner.get_assignments()
        for i, a in enumerate(assignments):
            lines.append(f'  #{i + 1} {a.record_date.isoformat()} [{a.metric_name}]')
            lines.append(f'    分桶: {a.category.value}/{a.bucket_name}')
            lines.append(f'    分数: {a.score:.3f} | 等级: {a.level.value}')
            if a.reasons:
                lines.append(f'    原因: {"; ".join(a.reasons)}')
            if a.source_traces:
                lines.append(f'    来源: {"; ".join(a.source_traces)}')
            lines.append('')

        return '\n'.join(lines)

    def export_csv(
        self,
        output_path: str | Path,
        include_normal: bool = False,
    ) -> Path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        assignments = self.assigner.get_assignments()
        corrections = self.assigner.get_corrections()

        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)

            writer.writerow(['=== 分桶报告明细 ==='])
            writer.writerow([
                '日期', '指标名称', '分桶类别', '分桶名称',
                '异常分数', '异常等级', '原因', '来源追溯',
            ])

            for a in assignments:
                writer.writerow([
                    a.record_date.isoformat(),
                    a.metric_name,
                    a.category.value,
                    a.bucket_name,
                    f'{a.score:.4f}',
                    a.level.value,
                    '; '.join(a.reasons),
                    '; '.join(a.source_traces),
                ])

            writer.writerow([])
            writer.writerow(['=== 校验信息 ==='])
            for issue in self.validator.issues:
                writer.writerow([
                    issue.warning_type.value,
                    issue.severity,
                    issue.message,
                    '; '.join(issue.affected_records),
                ])

            if corrections:
                writer.writerow([])
                writer.writerow(['=== 修正记录 ==='])
                writer.writerow([
                    '时间戳', '字段', '原值', '新值', '原因', '操作人',
                ])
                for c in corrections:
                    writer.writerow([
                        c.timestamp.isoformat(),
                        c.field,
                        c.old_value,
                        c.new_value,
                        c.reason,
                        c.operator,
                    ])

        return output_path

    def export_json(
        self,
        output_path: str | Path,
    ) -> Path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        assignments = self.assigner.get_assignments()
        corrections = self.assigner.get_corrections()

        data = {
            'generated_at': datetime.now().isoformat(),
            'validation': {
                'issues': [
                    {
                        'type': i.warning_type.value,
                        'severity': i.severity,
                        'message': i.message,
                        'affected': i.affected_records,
                    }
                    for i in self.validator.issues
                ],
                'has_blocking': self.validator.has_blocking_issues(),
            },
            'bucket_assignments': [
                {
                    'date': a.record_date.isoformat(),
                    'metric': a.metric_name,
                    'category': a.category.value,
                    'bucket': a.bucket_name,
                    'score': a.score,
                    'level': a.level.value,
                    'reasons': a.reasons,
                    'sources': a.source_traces,
                }
                for a in assignments
            ],
            'corrections': [
                {
                    'timestamp': c.timestamp.isoformat(),
                    'field': c.field,
                    'old_value': c.old_value,
                    'new_value': c.new_value,
                    'reason': c.reason,
                    'operator': c.operator,
                }
                for c in corrections
            ],
            'summary': {
                'total_anomalies': len(assignments),
                'by_category': {
                    cat.value: len(items)
                    for cat, items in self.assigner.group_by_category().items()
                },
                'by_level': {
                    level.value: sum(1 for a in assignments if a.level == level)
                    for level in AnomalyLevel
                },
                'total_corrections': len(corrections),
            },
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return output_path

    def build_explanation_text(
        self,
        assignment: BucketAssignment,
    ) -> str:
        parts = [
            f'日期: {assignment.record_date.isoformat()}',
            f'指标: {assignment.metric_name}',
            f'分桶: {assignment.category.value}/{assignment.bucket_name}',
            f'分数: {assignment.score:.3f}',
            f'等级: {assignment.level.value}',
        ]
        if assignment.reasons:
            parts.append(f'原因: {"; ".join(assignment.reasons)}')
        if assignment.source_traces:
            parts.append(f'来源: {"; ".join(assignment.source_traces)}')
        return ' | '.join(parts)

    def _group_by_bucket_name(
        self,
        items: list[BucketAssignment],
    ) -> dict[str, list[BucketAssignment]]:
        grouped: dict[str, list[BucketAssignment]] = {}
        for item in items:
            grouped.setdefault(item.bucket_name, []).append(item)
        return grouped
