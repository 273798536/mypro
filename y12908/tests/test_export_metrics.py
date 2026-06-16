import pytest
import json
import csv
from io import StringIO
from app.services.export_service import ExportService
from app.services.metrics_service import MetricsService
from app.services.deduplication_service import DeduplicationService
from app.services.diagnosis_service import DiagnosisService
from app.models.models import Sample, DiagnosisResult, GroupMetric, GrayComparison


class TestExportService:

    def test_export_samples_consistency(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='export_test',
                created_by='test'
            )
            batch_id = import_result['batch_id']

            DiagnosisService.diagnose_batch(batch_id)

            ui_summary = ExportService.get_diagnosis_summary_for_ui(batch_id)

            filename, output, mimetype = ExportService.export_samples(
                batch_id=batch_id,
                format='csv',
                include_content=True
            )

            content = output.getvalue()
            reader = csv.DictReader(StringIO(content))
            rows = list(reader)

            assert len(rows) == 2
            assert '诊断状态' in rows[0]
            assert '诊断摘要' in rows[0]
            assert '置信度' in rows[0]
            assert '严重程度' in rows[0]

            for row in rows:
                assert row['诊断状态'] in ['通过', '失败', '待诊断', '未诊断']
                assert row['置信度'] is not None

            status_counts_export = {}
            for row in rows:
                status = row['诊断状态']
                status_counts_export[status] = status_counts_export.get(status, 0) + 1

            for status, count in ui_summary['status_counts'].items():
                if status in status_counts_export:
                    assert status_counts_export[status] == count

    def test_export_diagnosis_report(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='report_test',
                created_by='test'
            )
            batch_id = import_result['batch_id']

            DiagnosisService.diagnose_batch(batch_id)

            filename, output, mimetype = ExportService.export_diagnosis_report(
                batch_id=batch_id,
                format='csv'
            )

            content = output.getvalue()
            reader = csv.DictReader(StringIO(content))
            rows = list(reader)

            assert len(rows) >= 1
            assert rows[0]['样本ID'] == 'SUMMARY'

            if len(rows) > 1:
                for row in rows[1:]:
                    assert row['样本状态'] in ['脏样本', '泄漏样本']

    def test_export_corrections(self, app, sample_test_data):
        with app.app_context():
            from app.services.correction_service import CorrectionService

            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='corr_export_test',
                created_by='test'
            )
            sample = Sample.query.first()

            CorrectionService.create_correction(
                sample_id=sample.id,
                correction_type='status',
                old_value={'status': 'PENDING'},
                new_value={'status': 'CLEAN'},
                correction_reason='测试修正',
                corrected_by='pm_user',
                auto_create_version=False
            )

            filename, output, mimetype = ExportService.export_corrections(
                batch_id=import_result['batch_id'],
                format='csv'
            )

            content = output.getvalue()
            reader = csv.DictReader(StringIO(content))
            rows = list(reader)

            assert len(rows) >= 1
            assert '修正ID' in rows[0]
            assert '修正类型' in rows[0]
            assert '修正原因' in rows[0]
            assert '修正人' in rows[0]
            assert rows[0]['修正人'] == 'pm_user'

    def test_export_json_format(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='json_export_test',
                created_by='test'
            )

            filename, output, mimetype = ExportService.export_samples(
                batch_id=import_result['batch_id'],
                format='json'
            )

            data = json.loads(output.getvalue())
            assert isinstance(data, list)
            assert len(data) == 2
            assert '样本ID' in data[0]
            assert '诊断状态' in data[0]

    def test_export_jsonl_format(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='jsonl_export_test',
                created_by='test'
            )

            filename, output, mimetype = ExportService.export_samples(
                batch_id=import_result['batch_id'],
                format='jsonl'
            )

            lines = output.getvalue().strip().split('\n')
            assert len(lines) == 2
            for line in lines:
                obj = json.loads(line)
                assert '样本ID' in obj

    def test_ui_summary_and_export_consistency(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='consistency_test',
                created_by='test'
            )
            batch_id = import_result['batch_id']

            DiagnosisService.diagnose_batch(batch_id)

            ui_summary = ExportService.get_diagnosis_summary_for_ui(batch_id)

            diag_results = DiagnosisResult.query \
                .join(Sample) \
                .filter(Sample.batch_id == batch_id, DiagnosisResult.is_latest == True) \
                .all()

            export_status_map = {}
            for dr in diag_results:
                status_cn = ExportService.STATUS_CN_MAP.get(dr.status.name, dr.status.name)
                export_status_map[status_cn] = export_status_map.get(status_cn, 0) + 1

            assert export_status_map == ui_summary['status_counts']


class TestMetricsService:

    def test_calculate_batch_metrics(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='metrics_test',
                created_by='test'
            )
            batch_id = import_result['batch_id']

            DiagnosisService.diagnose_batch(batch_id)

            metrics = MetricsService.calculate_batch_metrics(batch_id)

            assert len(metrics) >= 4

            metric_names = {m.metric_name for m in metrics}
            assert 'sample_status_count' in metric_names
            assert 'sample_status_ratio' in metric_names

            status_ratio_metrics = [m for m in metrics if m.metric_name == 'sample_status_ratio']
            total_ratio = sum(m.metric_value for m in status_ratio_metrics)
            assert abs(total_ratio - 1.0) < 0.01

            existing_metrics = GroupMetric.query.filter_by(batch_id=batch_id).all()
            assert len(existing_metrics) >= 4

    def test_get_batch_metrics(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='get_metrics_test',
                created_by='test'
            )
            batch_id = import_result['batch_id']

            MetricsService.calculate_batch_metrics(batch_id)

            all_metrics = MetricsService.get_batch_metrics(batch_id)
            assert len(all_metrics) >= 4

            filtered = MetricsService.get_batch_metrics(
                batch_id,
                metric_names=['sample_status_ratio']
            )
            assert all(m['metric_name'] == 'sample_status_ratio' for m in filtered)

    def test_compare_batches(self, app, sample_test_data):
        with app.app_context():
            result_a = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='batch_A',
                created_by='test'
            )
            result_b = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='batch_B',
                created_by='test'
            )

            MetricsService.calculate_batch_metrics(result_a['batch_id'])
            MetricsService.calculate_batch_metrics(result_b['batch_id'])

            comparisons = MetricsService.compare_batches(
                batch_a_id=result_a['batch_id'],
                batch_b_id=result_b['batch_id'],
                metric_name='sample_status_ratio',
                created_by='test'
            )

            assert len(comparisons) >= 1

            for comp in comparisons:
                assert comp.batch_a_id == result_a['batch_id']
                assert comp.batch_b_id == result_b['batch_id']
                assert comp.diff_percent == 0
                assert comp.is_significant == False

            existing_comps = GrayComparison.query.all()
            assert len(existing_comps) >= len(comparisons)

    def test_compare_batches_significant_diff(self, app, sample_test_data):
        with app.app_context():
            from app.models.models import SAMPLE_STATUS

            result_a = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='batch_signif_A',
                created_by='test'
            )
            result_b = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='batch_signif_B',
                created_by='test'
            )

            samples_a = Sample.query.filter_by(batch_id=result_a['batch_id']).all()
            for sample in samples_a:
                sample.status = SAMPLE_STATUS.CLEAN
            samples_b = Sample.query.filter_by(batch_id=result_b['batch_id']).all()
            samples_b[0].status = SAMPLE_STATUS.DIRTY
            from app import db
            db.session.commit()

            MetricsService.calculate_batch_metrics(result_a['batch_id'])
            MetricsService.calculate_batch_metrics(result_b['batch_id'])

            comparisons = MetricsService.compare_batches(
                batch_a_id=result_a['batch_id'],
                batch_b_id=result_b['batch_id'],
                metric_name='sample_status_ratio',
                created_by='test'
            )

            dirty_comps = [c for c in comparisons if 'DIRTY' in c.metric_name]
            if dirty_comps:
                assert dirty_comps[0].diff_percent > 0
                assert dirty_comps[0].is_significant == True

    def test_get_comparisons(self, app, sample_test_data):
        with app.app_context():
            result_a = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='comp_list_A',
                created_by='test'
            )
            result_b = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='comp_list_B',
                created_by='test'
            )

            MetricsService.calculate_batch_metrics(result_a['batch_id'])
            MetricsService.calculate_batch_metrics(result_b['batch_id'])
            MetricsService.compare_batches(
                batch_a_id=result_a['batch_id'],
                batch_b_id=result_b['batch_id'],
                created_by='test'
            )

            all_comps = MetricsService.get_comparisons()
            assert len(all_comps) >= 1

            filtered_comps = MetricsService.get_comparisons(
                batch_a_id=result_a['batch_id']
            )
            assert len(filtered_comps) >= 1

            significant_comps = MetricsService.get_comparisons(is_significant=False)
            assert len(significant_comps) >= 1

    def test_metric_upsert(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='upsert_test',
                created_by='test'
            )
            batch_id = import_result['batch_id']

            metrics1 = MetricsService.calculate_batch_metrics(batch_id)
            count1 = GroupMetric.query.filter_by(batch_id=batch_id).count()

            metrics2 = MetricsService.calculate_batch_metrics(batch_id)
            count2 = GroupMetric.query.filter_by(batch_id=batch_id).count()

            assert count1 == count2
            assert len(metrics1) == len(metrics2)
