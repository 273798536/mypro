from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import hashlib
from app import db
from app.models.models import (
    Sample,
    DiagnosisResult,
    GroupMetric,
    GrayComparison,
    SAMPLE_STATUS,
    DIAGNOSIS_STATUS,
    DIAGNOSIS_TYPE,
)


class MetricsService:

    @staticmethod
    def _generate_metric_key(metric_name: str, group_key: str,
                             batch_id: Optional[str] = None,
                             period: Optional[str] = None) -> str:
        key_parts = [metric_name, group_key]
        if batch_id:
            key_parts.append(batch_id)
        if period:
            key_parts.append(period)
        return hashlib.md5('_'.join(key_parts).encode('utf-8')).hexdigest()

    @staticmethod
    def _generate_comparison_key(batch_a_id: str, batch_b_id: str,
                                 metric_name: str) -> str:
        sorted_batches = sorted([batch_a_id, batch_b_id])
        key_str = f"{sorted_batches[0]}_{sorted_batches[1]}_{metric_name}"
        return hashlib.md5(key_str.encode('utf-8')).hexdigest()

    @staticmethod
    def calculate_batch_metrics(batch_id: str) -> List[GroupMetric]:
        samples = Sample.query.filter_by(batch_id=batch_id).all()
        if not samples:
            return []

        results = []
        total = len(samples)

        status_counts = {}
        for sample in samples:
            status = sample.status.name
            status_counts[status] = status_counts.get(status, 0) + 1

        for status, count in status_counts.items():
            metric_key = MetricsService._generate_metric_key(
                'sample_status_count', status, batch_id
            )
            metric = GroupMetric(
                metric_key=metric_key,
                group_key=status,
                batch_id=batch_id,
                metric_name='sample_status_count',
                metric_value=count,
                sample_count=total,
            )
            results.append(metric)

        for status, count in status_counts.items():
            metric_key = MetricsService._generate_metric_key(
                'sample_status_ratio', status, batch_id
            )
            metric = GroupMetric(
                metric_key=metric_key,
                group_key=status,
                batch_id=batch_id,
                metric_name='sample_status_ratio',
                metric_value=count / total,
                sample_count=total,
            )
            results.append(metric)

        diagnosis_results = DiagnosisResult.query \
            .join(Sample) \
            .filter(Sample.batch_id == batch_id, DiagnosisResult.is_latest == True) \
            .all()

        diag_status_counts = {}
        diag_type_counts = {}
        for dr in diagnosis_results:
            status = dr.status.name
            diag_status_counts[status] = diag_status_counts.get(status, 0) + 1
            dtype = dr.diagnosis_type.name
            diag_type_counts[dtype] = diag_type_counts.get(dtype, 0) + 1

        for status, count in diag_status_counts.items():
            metric_key = MetricsService._generate_metric_key(
                'diagnosis_status_count', status, batch_id
            )
            metric = GroupMetric(
                metric_key=metric_key,
                group_key=status,
                batch_id=batch_id,
                metric_name='diagnosis_status_count',
                metric_value=count,
                sample_count=len(diagnosis_results),
            )
            results.append(metric)

        turn_distribution = {}
        for sample in samples:
            turn_count = sample.turn_count
            if turn_count < 3:
                bucket = '1-2'
            elif turn_count < 5:
                bucket = '3-4'
            elif turn_count < 10:
                bucket = '5-9'
            else:
                bucket = '10+'
            turn_distribution[bucket] = turn_distribution.get(bucket, 0) + 1

        for bucket, count in turn_distribution.items():
            metric_key = MetricsService._generate_metric_key(
                'turn_distribution', bucket, batch_id
            )
            metric = GroupMetric(
                metric_key=metric_key,
                group_key=bucket,
                batch_id=batch_id,
                metric_name='turn_distribution',
                metric_value=count,
                sample_count=total,
            )
            results.append(metric)

        for metric in results:
            existing = GroupMetric.query.filter_by(
                metric_key=metric.metric_key,
                group_key=metric.group_key,
                batch_id=metric.batch_id,
            ).first()
            if existing:
                existing.metric_value = metric.metric_value
                existing.sample_count = metric.sample_count
                existing.created_at = datetime.now()
            else:
                db.session.add(metric)

        db.session.commit()
        return results

    @staticmethod
    def get_batch_metrics(batch_id: str, metric_names: Optional[List[str]] = None) -> List[Dict]:
        query = GroupMetric.query.filter_by(batch_id=batch_id)
        if metric_names:
            query = query.filter(GroupMetric.metric_name.in_(metric_names))
        metrics = query.all()
        return [m.to_dict() for m in metrics]

    @staticmethod
    def compare_batches(batch_a_id: str, batch_b_id: str,
                        metric_name: str = 'sample_status_ratio',
                        group_key: Optional[str] = None,
                        created_by: str = 'system') -> List[GrayComparison]:

        batch_a_name = Sample.query.filter_by(batch_id=batch_a_id).first()
        batch_b_name = Sample.query.filter_by(batch_id=batch_b_id).first()

        batch_a_name = batch_a_name.batch_name if batch_a_name else batch_a_id
        batch_b_name = batch_b_name.batch_name if batch_b_name else batch_b_id

        query_a = GroupMetric.query.filter_by(
            batch_id=batch_a_id,
            metric_name=metric_name
        )
        query_b = GroupMetric.query.filter_by(
            batch_id=batch_b_id,
            metric_name=metric_name
        )

        if group_key:
            query_a = query_a.filter_by(group_key=group_key)
            query_b = query_b.filter_by(group_key=group_key)

        metrics_a = {m.group_key: m for m in query_a.all()}
        metrics_b = {m.group_key: m for m in query_b.all()}

        all_groups = set(metrics_a.keys()) | set(metrics_b.keys())
        results = []

        for group in sorted(all_groups):
            ma = metrics_a.get(group)
            mb = metrics_b.get(group)
            va = ma.metric_value if ma else 0.0
            vb = mb.metric_value if mb else 0.0

            diff_value = vb - va
            diff_percent = ((vb - va) / va * 100) if va != 0 else (100 if vb > 0 else 0)
            is_significant = abs(diff_percent) >= 5.0

            comparison_key = MetricsService._generate_comparison_key(
                batch_a_id, batch_b_id, f"{metric_name}_{group}"
            )

            notes = []
            if is_significant:
                direction = '上升' if diff_value > 0 else '下降'
                notes.append(f'{group} 指标{direction} {abs(diff_percent):.2f}%，差异显著')
                if group == 'DIRTY' and diff_value > 0:
                    notes.append('脏样本比例上升，建议检查样本质量')
                if group == 'LEAKAGE' and diff_value > 0:
                    notes.append('泄漏样本比例上升，需立即排查训练验证划分')

            comparison = GrayComparison(
                comparison_key=comparison_key,
                batch_a_id=batch_a_id,
                batch_b_id=batch_b_id,
                batch_a_name=batch_a_name,
                batch_b_name=batch_b_name,
                metric_name=f'{metric_name}:{group}',
                value_a=va,
                value_b=vb,
                diff_value=diff_value,
                diff_percent=diff_percent,
                is_significant=is_significant,
                analysis_notes='\n'.join(notes) if notes else None,
                created_by=created_by,
            )

            existing = GrayComparison.query.filter_by(comparison_key=comparison_key).first()
            if existing:
                existing.value_a = va
                existing.value_b = vb
                existing.diff_value = diff_value
                existing.diff_percent = diff_percent
                existing.is_significant = is_significant
                existing.analysis_notes = '\n'.join(notes) if notes else None
                existing.created_at = datetime.now()
                results.append(existing)
            else:
                db.session.add(comparison)
                results.append(comparison)

        db.session.commit()
        return results

    @staticmethod
    def get_comparisons(batch_a_id: Optional[str] = None,
                        batch_b_id: Optional[str] = None,
                        is_significant: Optional[bool] = None,
                        limit: int = 100) -> List[GrayComparison]:
        query = GrayComparison.query
        if batch_a_id:
            query = query.filter(
                (GrayComparison.batch_a_id == batch_a_id) |
                (GrayComparison.batch_b_id == batch_a_id)
            )
        if batch_b_id:
            query = query.filter(
                (GrayComparison.batch_a_id == batch_b_id) |
                (GrayComparison.batch_b_id == batch_b_id)
            )
        if is_significant is not None:
            query = query.filter_by(is_significant=is_significant)
        return query.order_by(GrayComparison.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_period_metrics(period: str = 'monthly',
                           start_date: Optional[datetime] = None,
                           end_date: Optional[datetime] = None) -> List[GroupMetric]:
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            if period == 'weekly':
                start_date = end_date - timedelta(weeks=4)
            else:
                start_date = end_date - timedelta(days=90)

        query = GroupMetric.query.filter(
            GroupMetric.created_at >= start_date,
            GroupMetric.created_at <= end_date,
        )
        return query.all()
