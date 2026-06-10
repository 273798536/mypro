import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Optional
from datetime import datetime
from collections import defaultdict
from .models import (
    ReagentBatch, Sample, SequencingResult, PedigreeMember,
    ValidationResult, ConflictRecord, ImportRecord, ValidationStatus
)
from .database import db

class DashboardData:
    def __init__(self, db_session=None):
        self.db = db_session or db.session

    def get_batch_summary(self, batch_id: int = None) -> Dict:
        query = ReagentBatch.query.order_by(ReagentBatch.created_at.desc())
        if batch_id:
            query = query.filter_by(id=batch_id)
        batches = query.all()

        summary = []
        for batch in batches:
            sample_count = Sample.query.filter_by(batch_id=batch.id).count()
            seq_count = SequencingResult.query.join(
                Sample, SequencingResult.sample_id == Sample.id
            ).filter(Sample.batch_id == batch.id).count()
            conflict_count = ConflictRecord.query.filter_by(
                batch_id=batch.id, status='open'
            ).count()
            critical_count = sum(
                1 for c in ConflictRecord.query.filter_by(batch_id=batch.id, status='open').all()
                if c.is_critical
            )
            validation_results = ValidationResult.query.filter_by(batch_id=batch.id).all()
            pass_count = sum(1 for v in validation_results if v.status == ValidationStatus.PASS)
            fail_count = sum(1 for v in validation_results if v.status == ValidationStatus.FAIL)
            review_count = sum(1 for v in validation_results if v.status == ValidationStatus.REVIEW)

            if pass_count + fail_count + review_count > 0:
                overall_status = 'pass' if fail_count == 0 and review_count == 0 else (
                    'review' if fail_count == 0 else 'fail'
                )
            else:
                overall_status = 'pending'

            summary.append({
                'batch_id': batch.id,
                'batch_number': batch.batch_number,
                'name': batch.name,
                'created_at': batch.created_at.isoformat() if batch.created_at else None,
                'sample_count': sample_count,
                'sequencing_count': seq_count,
                'conflict_count': conflict_count,
                'critical_count': critical_count,
                'validation_pass': pass_count,
                'validation_fail': fail_count,
                'validation_review': review_count,
                'overall_status': overall_status,
                'usability': 'ready' if critical_count == 0 and fail_count == 0 else (
                    'review' if fail_count == 0 else 'not_ready'
                )
            })

        return {
            'batches': summary,
            'total_batches': len(summary),
            'batches_ready': sum(1 for b in summary if b['usability'] == 'ready'),
            'batches_review': sum(1 for b in summary if b['usability'] == 'review'),
            'batches_not_ready': sum(1 for b in summary if b['usability'] == 'not_ready')
        }

    def get_batch_details(self, batch_id: int) -> Dict:
        batch = ReagentBatch.query.get(batch_id)
        if not batch:
            return {'success': False, 'error': '批次不存在'}

        samples = Sample.query.filter_by(batch_id=batch_id).all()
        sequencing_results = SequencingResult.query.join(
            Sample, SequencingResult.sample_id == Sample.id
        ).filter(Sample.batch_id == batch_id).all()
        pedigree_members = PedigreeMember.query.all()
        batch_sample_ids = {s.id for s in samples}
        batch_pedigree = [p for p in pedigree_members if p.sample_id in batch_sample_ids]
        conflicts = ConflictRecord.query.filter_by(batch_id=batch_id, status='open').all()
        validations = ValidationResult.query.filter_by(batch_id=batch_id).all()
        imports = ImportRecord.query.filter_by(batch_number=batch.batch_number).all()

        return {
            'batch': {
                'id': batch.id,
                'batch_number': batch.batch_number,
                'name': batch.name,
                'description': batch.description,
                'created_at': batch.created_at.isoformat() if batch.created_at else None,
                'created_by': batch.created_by,
                'source_file': batch.source_file
            },
            'samples': [
                {
                    'id': s.id,
                    'sample_id': s.sample_id,
                    'name': s.name,
                    'gender': s.gender,
                    'sample_type': s.sample_type,
                    'original_row_number': s.original_row_number,
                    'source_file': s.source_file,
                    'source_sheet': s.source_sheet,
                    'sequencing_count': sum(1 for sr in sequencing_results if sr.sample_id == s.id)
                } for s in samples
            ],
            'sequencing': [
                {
                    'id': sr.id,
                    'sample_id': samples[0].sample_id if samples else '',
                    'sequencing_id': sr.sequencing_id,
                    'gene': sr.gene,
                    'variant': sr.variant,
                    'genotype': sr.genotype,
                    'quality_score': sr.quality_score,
                    'depth': sr.depth,
                    'original_row_number': sr.original_row_number,
                    'source_file': sr.source_file
                } for sr in sequencing_results
            ],
            'pedigree': [
                {
                    'id': p.id,
                    'family_id': p.family_id,
                    'individual_id': p.individual_id,
                    'father_id': p.father_id,
                    'mother_id': p.mother_id,
                    'gender': p.gender,
                    'affection_status': p.affection_status,
                    'relationship': p.relationship,
                    'generation': p.generation,
                    'original_row_number': p.original_row_number,
                    'source_file': p.source_file
                } for p in batch_pedigree
            ],
            'conflicts': [
                {
                    'id': c.id,
                    'conflict_type': c.conflict_type,
                    'severity': c.severity,
                    'priority': c.priority,
                    'message': c.message,
                    'expected_value': c.expected_value,
                    'actual_value': c.actual_value,
                    'source_records': c.source_records,
                    'is_critical': c.is_critical
                } for c in conflicts
            ],
            'validations': [
                {
                    'id': v.id,
                    'validation_type': v.validation_type,
                    'status': v.status,
                    'severity': v.severity,
                    'message': v.message,
                    'expected_value': v.expected_value,
                    'actual_value': v.actual_value,
                    'source_records': v.source_records
                } for v in validations
            ],
            'imports': [
                {
                    'id': imp.id,
                    'file_name': imp.file_name,
                    'import_type': imp.import_type,
                    'import_time': imp.import_time.isoformat() if imp.import_time else None,
                    'total_rows': imp.total_rows,
                    'imported_rows': imp.imported_rows,
                    'skipped_rows': imp.skipped_rows,
                    'duplicate_rows': imp.duplicate_rows,
                    'status': imp.status
                } for imp in imports
            ],
            'summary': {
                'sample_count': len(samples),
                'sequencing_count': len(sequencing_results),
                'pedigree_count': len(batch_pedigree),
                'conflict_count': len(conflicts),
                'critical_conflicts': sum(1 for c in conflicts if c.is_critical),
                'import_count': len(imports)
            }
        }

    def get_validation_charts(self, batch_id: int) -> Dict:
        validations = ValidationResult.query.filter_by(batch_id=batch_id).all()

        status_counts = defaultdict(int)
        type_counts = defaultdict(int)
        for v in validations:
            status_counts[v.status] += 1
            type_counts[v.validation_type] += 1

        fig1 = go.Figure(data=[
            go.Bar(
                x=list(status_counts.keys()),
                y=list(status_counts.values()),
                marker_color=['#22c55e' if k == 'pass' else '#ef4444' if k == 'fail' else '#f59e0b' 
                              for k in status_counts.keys()]
            )
        ])
        fig1.update_layout(title='校验结果统计', showlegend=False)

        fig2 = go.Figure(data=[
            go.Pie(
                labels=list(type_counts.keys()),
                values=list(type_counts.values()),
                hole=0.4
            )
        ])
        fig2.update_layout(title='校验类型分布')

        return {
            'status_chart': fig1.to_dict(),
            'type_chart': fig2.to_dict(),
            'status_data': dict(status_counts),
            'type_data': dict(type_counts)
        }

    def get_conflict_charts(self, batch_id: int = None) -> Dict:
        query = ConflictRecord.query
        if batch_id:
            query = query.filter_by(batch_id=batch_id)
        conflicts = query.all()

        severity_counts = defaultdict(int)
        type_counts = defaultdict(int)
        for c in conflicts:
            severity_counts[c.severity] += 1
            type_counts[c.conflict_type] += 1

        fig1 = go.Figure(data=[
            go.Bar(
                x=list(severity_counts.keys()),
                y=list(severity_counts.values()),
                marker_color=['#dc2626' if k == 'critical' else '#ef4444' if k == 'error' 
                              else '#f59e0b' if k == 'warning' else '#3b82f6'
                              for k in severity_counts.keys()]
            )
        ])
        fig1.update_layout(title='冲突严重程度分布', showlegend=False)

        fig2 = go.Figure(data=[
            go.Pie(
                labels=list(type_counts.keys()),
                values=list(type_counts.values()),
                hole=0.4
            )
        ])
        fig2.update_layout(title='冲突类型分布')

        return {
            'severity_chart': fig1.to_dict(),
            'type_chart': fig2.to_dict(),
            'severity_data': dict(severity_counts),
            'type_data': dict(type_counts),
            'total_conflicts': len(conflicts),
            'open_conflicts': sum(1 for c in conflicts if c.status == 'open'),
            'critical_conflicts': sum(1 for c in conflicts if c.is_critical and c.status == 'open')
        }

    def get_sample_distribution_chart(self, batch_id: int) -> Dict:
        samples = Sample.query.filter_by(batch_id=batch_id).all()

        gender_counts = defaultdict(int)
        type_counts = defaultdict(int)
        for s in samples:
            if s.gender:
                gender_counts[s.gender] += 1
            if s.sample_type:
                type_counts[s.sample_type] += 1

        fig1 = go.Figure(data=[
            go.Pie(
                labels=list(gender_counts.keys()),
                values=list(gender_counts.values()),
                marker_colors=['#3b82f6', '#ec4899', '#6b7280']
            )
        ])
        fig1.update_layout(title='样本性别分布')

        fig2 = go.Figure(data=[
            go.Bar(
                x=list(type_counts.keys()),
                y=list(type_counts.values())
            )
        ])
        fig2.update_layout(title='样本类型分布')

        return {
            'gender_chart': fig1.to_dict(),
            'type_chart': fig2.to_dict(),
            'gender_data': dict(gender_counts),
            'type_data': dict(type_counts)
        }

    def get_usability_assessment(self, batch_id: int) -> Dict:
        details = self.get_batch_details(batch_id)
        if not details.get('batch'):
            return details

        conflicts = details['conflicts']
        validations = details['validations']

        critical_conflicts = [c for c in conflicts if c['is_critical']]
        validation_failures = [v for v in validations if v['status'] == ValidationStatus.FAIL]
        review_required = [v for v in validations if v['status'] == ValidationStatus.REVIEW]

        if critical_conflicts or validation_failures:
            overall_assessment = 'not_ready'
            primary_issue = '存在严重冲突或校验失败，需要先解决问题'
        elif review_required:
            overall_assessment = 'review'
            primary_issue = '部分数据需要人工复核'
        else:
            overall_assessment = 'ready'
            primary_issue = '所有校验通过，可以直接使用'

        return {
            'batch_id': batch_id,
            'batch_number': details['batch']['batch_number'],
            'assessment': overall_assessment,
            'assessment_label': {
                'ready': '✅ 可以直接使用',
                'review': '⚠️ 需要复核',
                'not_ready': '❌ 不能使用'
            }[overall_assessment],
            'primary_issue': primary_issue,
            'critical_count': len(critical_conflicts),
            'validation_fail_count': len(validation_failures),
            'review_count': len(review_required),
            'details': {
                'ready_samples': [
                    {
                        'sample_id': s['sample_id'],
                        'name': s['name'],
                        'gender': s['gender'],
                        'source': f"{s['source_file']} 行{s['original_row_number']}"
                    }
                    for s in details['samples']
                    if not any(c for c in conflicts if c.get('message') and s['sample_id'] in c['message'])
                ],
                'needs_review_samples': [
                    {
                        'sample_id': s['sample_id'],
                        'name': s['name'],
                        'gender': s['gender'],
                        'source': f"{s['source_file']} 行{s['original_row_number']}",
                        'issues': [c['message'] for c in conflicts 
                                   if c.get('message') and s['sample_id'] in c['message'] 
                                   and c['severity'] == 'warning']
                    }
                    for s in details['samples']
                    if any(c for c in conflicts 
                           if c.get('message') and s['sample_id'] in c['message'] 
                           and c['severity'] == 'warning')
                ],
                'not_usable_samples': [
                    {
                        'sample_id': s['sample_id'],
                        'name': s['name'],
                        'gender': s['gender'],
                        'source': f"{s['source_file']} 行{s['original_row_number']}",
                        'issues': [c['message'] for c in conflicts 
                                   if c.get('message') and s['sample_id'] in c['message']
                                   and (c['is_critical'] or c['severity'] == 'error')]
                    }
                    for s in details['samples']
                    if any(c for c in conflicts 
                           if c.get('message') and s['sample_id'] in c['message']
                           and (c['is_critical'] or c['severity'] == 'error'))
                ]
            }
        }

    def get_import_history_chart(self) -> Dict:
        imports = ImportRecord.query.order_by(ImportRecord.import_time).all()

        import_dates = defaultdict(lambda: {'count': 0, 'rows': 0})
        for imp in imports:
            if imp.import_time:
                date_key = imp.import_time.strftime('%Y-%m-%d')
                import_dates[date_key]['count'] += 1
                import_dates[date_key]['rows'] += imp.imported_rows or 0

        sorted_dates = sorted(import_dates.keys())
        counts = [import_dates[d]['count'] for d in sorted_dates]
        rows = [import_dates[d]['rows'] for d in sorted_dates]

        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=sorted_dates,
            y=counts,
            name='导入次数',
            yaxis='y'
        ))
        fig.add_trace(go.Scatter(
            x=sorted_dates,
            y=rows,
            name='导入行数',
            yaxis='y2',
            mode='lines+markers'
        ))

        fig.update_layout(
            title='导入历史趋势',
            yaxis=dict(title='导入次数'),
            yaxis2=dict(title='导入行数', overlaying='y', side='right')
        )

        return {
            'chart': fig.to_dict(),
            'total_imports': len(imports),
            'total_rows': sum(imp.imported_rows or 0 for imp in imports),
            'import_data': [
                {
                    'date': d,
                    'count': import_dates[d]['count'],
                    'rows': import_dates[d]['rows']
                } for d in sorted_dates
            ]
        }
