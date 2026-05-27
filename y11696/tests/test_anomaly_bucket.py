from __future__ import annotations

import csv
import tempfile
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path

from src.anomaly_bucket.analyzer import MetricAnalyzer
from src.anomaly_bucket.bucket import BucketAssigner
from src.anomaly_bucket.models import (
    AnomalyLevel,
    BucketCategory,
    HolidayRecord,
    MetricRecord,
    QuantileConfig,
    SeasonalConfig,
    TagConfig,
    WarningType,
)
from src.anomaly_bucket.reporter import ReportGenerator
from src.anomaly_bucket.validator import InputValidator


class TestValidator(unittest.TestCase):

    def setUp(self):
        self.tag_config = TagConfig(
            tag_groups={'risk': ['alert', 'review']},
            conflict_tags=['high_risk', 'low_risk'],
        )

    def test_empty_records(self):
        validator = InputValidator()
        issues = validator.validate([])
        self.assertTrue(validator.has_blocking_issues())
        self.assertEqual(issues[0].warning_type, WarningType.MISSING_DATA)

    def test_short_series(self):
        validator = InputValidator(min_series_length=14)
        records = [
            MetricRecord(
                date=date(2026, 4, i + 1),
                metric_name='test_metric',
                value=100.0,
            )
            for i in range(5)
        ]
        issues = validator.validate(records)
        self.assertTrue(any(
            i.warning_type == WarningType.SHORT_SERIES for i in issues
        ))

    def test_very_short_series_error(self):
        validator = InputValidator(min_series_length=14)
        records = [
            MetricRecord(
                date=date(2026, 4, i + 1),
                metric_name='test_metric',
                value=100.0,
            )
            for i in range(5)
        ]
        issues = validator.validate(records)
        self.assertTrue(any(i.severity == 'error' for i in issues))

    def test_tag_conflict(self):
        validator = InputValidator(tag_config=self.tag_config)
        records = [
            MetricRecord(
                date=date(2026, 4, 1),
                metric_name='test_metric',
                value=100.0,
                tags=['high_risk', 'low_risk'],
            )
        ]
        issues = validator.validate(records)
        self.assertTrue(any(
            i.warning_type == WarningType.TAG_CONFLICT for i in issues
        ))

    def test_holiday_overlap(self):
        validator = InputValidator()
        records = [
            MetricRecord(
                date=date(2026, 4, 5),
                metric_name='test_metric',
                value=100.0,
            )
        ]
        holidays = [
            HolidayRecord(date=date(2026, 4, 5), name='清明节', impact='high'),
        ]
        issues = validator.validate(records, holidays)
        self.assertTrue(any(
            i.warning_type == WarningType.HOLIDAY_FP for i in issues
        ))

    def test_duplicate_dates(self):
        validator = InputValidator()
        records = [
            MetricRecord(
                date=date(2026, 4, 1),
                metric_name='test_metric',
                value=100.0,
            ),
            MetricRecord(
                date=date(2026, 4, 1),
                metric_name='test_metric',
                value=200.0,
            ),
        ]
        issues = validator.validate(records)
        self.assertTrue(any(
            '重复' in i.message for i in issues
        ))


class TestAnalyzer(unittest.TestCase):

    def setUp(self):
        self.records = []
        base = date(2026, 4, 1)
        for i in range(30):
            self.records.append(MetricRecord(
                date=base + timedelta(days=i),
                metric_name='test_metric',
                value=100.0 + (i % 7) * 5,
                tags=['normal'],
                source='test',
            ))
        self.records[25] = MetricRecord(
            date=base + timedelta(days=25),
            metric_name='test_metric',
            value=300.0,
            tags=['alert'],
            source='test',
        )
        self.records[10] = MetricRecord(
            date=base + timedelta(days=10),
            metric_name='test_metric',
            value=20.0,
            tags=['normal'],
            source='test',
        )

    def test_analyze_produces_scores(self):
        analyzer = MetricAnalyzer()
        results = analyzer.analyze(self.records)
        self.assertIn('test_metric', results)
        self.assertEqual(len(results['test_metric']), 30)

    def test_extreme_value_detected(self):
        analyzer = MetricAnalyzer()
        results = analyzer.analyze(self.records)
        scored = results['test_metric']

        extreme_record = scored[25]
        self.assertGreater(extreme_record[1].quantile_score, 0.5)
        self.assertIn(
            extreme_record[1].level,
            [AnomalyLevel.MODERATE, AnomalyLevel.SEVERE],
        )

    def test_holiday_discount(self):
        holidays = [
            HolidayRecord(date=date(2026, 4, 26), name='测试节', impact='high'),
        ]
        analyzer = MetricAnalyzer(holidays=holidays)
        results = analyzer.analyze(self.records)
        scored = results['test_metric']

        holiday_score = scored[25][1]
        analyzer_no_holiday = MetricAnalyzer()
        results_no_h = analyzer_no_holiday.analyze(self.records)
        normal_score = results_no_h['test_metric'][25][1]

        self.assertLess(holiday_score.composite_score, normal_score.composite_score)

    def test_seasonal_detection(self):
        config = SeasonalConfig(window=7, threshold=2.0)
        analyzer = MetricAnalyzer(seasonal_config=config)
        results = analyzer.analyze(self.records)

        low_record = results['test_metric'][10]
        self.assertGreater(low_record[1].seasonal_score, 0.1)

    def test_tag_scoring(self):
        tag_config = TagConfig(
            tag_groups={'risk_events': ['alert', 'review']},
            conflict_tags=['high_risk'],
        )
        analyzer = MetricAnalyzer(tag_config=tag_config)
        results = analyzer.analyze(self.records)

        alert_record = results['test_metric'][25]
        self.assertGreater(alert_record[1].tag_score, 0.0)

    def test_explanation_building(self):
        analyzer = MetricAnalyzer()
        results = analyzer.analyze(self.records)
        rec, score = results['test_metric'][25]

        explanations = analyzer.build_explanation(rec, score)
        self.assertIsInstance(explanations, list)
        self.assertGreater(len(explanations), 0)

    def test_short_series_handling(self):
        analyzer = MetricAnalyzer()
        short_records = self.records[:5]
        results = analyzer.analyze(short_records)
        self.assertEqual(len(results['test_metric']), 5)


class TestBucketAssigner(unittest.TestCase):

    def setUp(self):
        self.records = []
        base = date(2026, 4, 1)
        for i in range(30):
            self.records.append(MetricRecord(
                date=base + timedelta(days=i),
                metric_name='test_metric',
                value=100.0 + (i % 7) * 5,
                tags=['normal'],
                source='test',
            ))
        self.records[25] = MetricRecord(
            date=base + timedelta(days=25),
            metric_name='test_metric',
            value=300.0,
            tags=['alert'],
            source='test',
            remark='异常高点',
        )

    def test_assignments_created(self):
        analyzer = MetricAnalyzer()
        results = analyzer.analyze(self.records)
        assigner = BucketAssigner()

        all_scored = []
        for scored in results.values():
            all_scored.extend(scored)

        assignments = assigner.assign(all_scored, analyzer)
        self.assertGreater(len(assignments), 0)

    def test_categories_present(self):
        analyzer = MetricAnalyzer()
        results = analyzer.analyze(self.records)
        assigner = BucketAssigner()

        all_scored = []
        for scored in results.values():
            all_scored.extend(scored)

        assigner.assign(all_scored, analyzer)
        grouped = assigner.group_by_category()

        self.assertIn(BucketCategory.QUANTILE, grouped)

    def test_source_traces(self):
        analyzer = MetricAnalyzer()
        results = analyzer.analyze(self.records)
        assigner = BucketAssigner()

        all_scored = []
        for scored in results.values():
            all_scored.extend(scored)

        assignments = assigner.assign(all_scored, analyzer)

        for a in assignments:
            self.assertIsInstance(a.source_traces, list)
            if a.record_date == self.records[25].date:
                self.assertTrue(any('异常高点' in s for s in a.source_traces))

    def test_correction_application(self):
        analyzer = MetricAnalyzer()
        results = analyzer.analyze(self.records)
        assigner = BucketAssigner()

        all_scored = []
        for scored in results.values():
            all_scored.extend(scored)

        assignments = assigner.assign(all_scored, analyzer)

        if assignments:
            old_name = assignments[0].bucket_name
            trace = assigner.apply_correction(
                index=0,
                field='bucket_name',
                old_value=old_name,
                new_value='手动修正',
                reason='分析师判定',
                operator='analyst_01',
            )

            self.assertEqual(trace.old_value, old_name)
            self.assertEqual(trace.new_value, '手动修正')
            self.assertEqual(trace.operator, 'analyst_01')

            corrections = assigner.get_corrections()
            self.assertEqual(len(corrections), 1)

            updated = assigner.get_assignments()
            self.assertEqual(updated[0].bucket_name, '手动修正')


class TestReportGenerator(unittest.TestCase):

    def setUp(self):
        self.records = []
        base = date(2026, 4, 1)
        for i in range(30):
            self.records.append(MetricRecord(
                date=base + timedelta(days=i),
                metric_name='test_metric',
                value=100.0 + (i % 7) * 5,
                tags=['normal'],
                source='test',
            ))
        self.records[25] = MetricRecord(
            date=base + timedelta(days=25),
            metric_name='test_metric',
            value=300.0,
            tags=['alert'],
            source='test',
        )

    def _setup_pipeline(self):
        validator = InputValidator()
        validator.validate(self.records)

        analyzer = MetricAnalyzer()
        results = analyzer.analyze(self.records)

        assigner = BucketAssigner()
        all_scored = []
        for scored in results.values():
            all_scored.extend(scored)
        assigner.assign(all_scored, analyzer)

        return validator, assigner

    def test_summary_generation(self):
        validator, assigner = self._setup_pipeline()
        reporter = ReportGenerator(validator, assigner)

        summary = reporter.generate_summary()
        self.assertIn('统计异常分桶报告', summary)
        self.assertIn('分桶统计', summary)

    def test_csv_export(self):
        validator, assigner = self._setup_pipeline()
        reporter = ReportGenerator(validator, assigner)

        with tempfile.TemporaryDirectory() as tmpdir:
            output = Path(tmpdir) / 'test_report.csv'
            reporter.export_csv(output)

            self.assertTrue(output.exists())
            content = output.read_text(encoding='utf-8-sig')
            self.assertIn('分桶报告明细', content)

    def test_json_export(self):
        validator, assigner = self._setup_pipeline()
        reporter = ReportGenerator(validator, assigner)

        with tempfile.TemporaryDirectory() as tmpdir:
            output = Path(tmpdir) / 'test_report.json'
            reporter.export_json(output)

            self.assertTrue(output.exists())
            import json
            data = json.loads(output.read_text(encoding='utf-8'))
            self.assertIn('bucket_assignments', data)
            self.assertIn('summary', data)
            self.assertIn('validation', data)

    def test_detail_report(self):
        validator, assigner = self._setup_pipeline()
        reporter = ReportGenerator(validator, assigner)

        detail = reporter.generate_detail_report(self.records)
        self.assertIn('异常明细', detail)


class TestEndToEnd(unittest.TestCase):

    def test_full_pipeline(self):
        records = []
        base = date(2026, 4, 1)
        for i in range(60):
            records.append(MetricRecord(
                date=base + timedelta(days=i),
                metric_name='tx_volume',
                value=5000.0 + (i % 7) * 200,
                tags=['friday_peak'] if (base + timedelta(days=i)).weekday() == 4 else [],
                source='prod_system',
            ))

        records[30] = MetricRecord(
            date=base + timedelta(days=30),
            metric_name='tx_volume',
            value=15000.0,
            tags=['alert', 'friday_peak'],
            source='prod_system',
            remark='突然激增',
        )

        records[45] = MetricRecord(
            date=base + timedelta(days=45),
            metric_name='tx_volume',
            value=1000.0,
            tags=['manual_review'],
            source='prod_system',
        )

        holidays = [
            HolidayRecord(
                date=date(2026, 5, 1),
                name='劳动节',
                impact='high',
            ),
        ]

        validator = InputValidator(min_series_length=14)
        issues = validator.validate(records, holidays)

        analyzer = MetricAnalyzer(
            quantile_config=QuantileConfig(upper=0.95, lower=0.05),
            seasonal_config=SeasonalConfig(window=7),
            tag_config=TagConfig(
                tag_groups={'risk': ['alert', 'manual_review']},
                conflict_tags=['high_risk', 'low_risk'],
            ),
            holidays=holidays,
        )
        results = analyzer.analyze(records)

        assigner = BucketAssigner(holidays=holidays)
        all_scored = []
        for scored in results.values():
            all_scored.extend(scored)
        assignments = assigner.assign(all_scored, analyzer)

        self.assertGreater(len(assignments), 0)

        assigner.apply_correction(
            index=0,
            field='level',
            old_value=assignments[0].level.value,
            new_value='moderate',
            reason='分析师降级',
            operator='analyst',
        )

        reporter = ReportGenerator(validator, assigner)
        with tempfile.TemporaryDirectory() as tmpdir:
            reporter.export_csv(Path(tmpdir) / 'report.csv')
            reporter.export_json(Path(tmpdir) / 'report.json')

        summary = reporter.generate_summary()
        self.assertIn('异常记录总数', summary)


if __name__ == '__main__':
    unittest.main()
