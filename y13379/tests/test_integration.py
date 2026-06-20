from __future__ import annotations

import unittest
from datetime import datetime

from neg_gate.models import GateStatus, GrayscaleResult, TimelineEventType
from neg_gate.normalizer import FieldNormalizer
from neg_gate.timeline import TimelineManager
from neg_gate.gatekeeper import NegSamplingGatekeeper
from neg_gate.report import GateReportGenerator


class TestFieldNormalizer(unittest.TestCase):
    def setUp(self):
        self.normalizer = FieldNormalizer()

    def test_normalize_chinese_field_names(self):
        row = {
            "样本id": "s001",
            "版本": "v2.1",
            "负采样比例": 0.3,
            "阈值": 0.5,
            "灰度比例": 0.1,
            "时间": "2026-06-20T10:00:00",
        }
        entry = self.normalizer.normalize_row(row, source_line=1)
        self.assertEqual(entry.sample_id, "s001")
        self.assertEqual(entry.version, "v2.1")
        self.assertAlmostEqual(entry.neg_sample_ratio, 0.3)
        self.assertAlmostEqual(entry.threshold, 0.5)
        self.assertAlmostEqual(entry.grayscale_ratio, 0.1)
        self.assertEqual(entry.processing_status, "normalized")

    def test_normalize_english_aliases(self):
        row = {
            "sid": "s002",
            "model_ver": "v1.0",
            "neg_ratio": 0.25,
            "thresh": 0.6,
            "gray_ratio": 0.05,
        }
        entry = self.normalizer.normalize_row(row)
        self.assertEqual(entry.sample_id, "s002")
        self.assertEqual(entry.version, "v1.0")
        self.assertAlmostEqual(entry.neg_sample_ratio, 0.25)

    def test_preserve_source_info(self):
        row = {"样本id": "s003", "负采样率": 0.4}
        entry = self.normalizer.normalize_row(row, source_file="train.csv", source_line=42)
        si = entry.source_info.get("sample_id")
        self.assertIsNotNone(si)
        self.assertEqual(si.original_field_name, "样本id")
        self.assertEqual(si.normalized_field_name, "sample_id")
        self.assertEqual(si.source_file, "train.csv")
        self.assertEqual(si.source_line, 42)

    def test_preserve_raw_fields(self):
        row = {"sid": "s004", "custom_col": "extra_value", "neg_ratio": 0.1}
        entry = self.normalizer.normalize_row(row)
        self.assertIn("custom_col", entry.raw_fields)
        self.assertEqual(entry.raw_fields["custom_col"], "extra_value")

    def test_extra_aliases(self):
        normalizer = FieldNormalizer(extra_aliases={"version": ["release_ver"]})
        row = {"release_ver": "v3.0"}
        entry = normalizer.normalize_row(row)
        self.assertEqual(entry.version, "v3.0")

    def test_normalize_rows_batch(self):
        rows = [
            {"sid": "s01", "neg_ratio": 0.1},
            {"sample_id": "s02", "neg_sample_ratio": 0.2},
        ]
        entries = self.normalizer.normalize_rows(rows)
        self.assertEqual(len(entries), 2)
        self.assertEqual(entries[0].sample_id, "s01")
        self.assertEqual(entries[1].sample_id, "s02")


class TestGatekeeperCore(unittest.TestCase):
    def setUp(self):
        self.timeline = TimelineManager()
        self.normalizer = FieldNormalizer()
        self.gate = NegSamplingGatekeeper(
            timeline_manager=self.timeline,
            normalizer=self.normalizer,
            grayscale_min=0.01,
            grayscale_max=1.0,
        )

    def test_normal_entry_approved(self):
        row = {
            "sample_id": "s001",
            "version": "v1",
            "neg_sample_ratio": 0.3,
            "threshold": 0.5,
            "grayscale_ratio": 0.1,
            "timestamp": "2026-06-20T10:00:00",
        }
        record = self.gate.ingest_log(row)
        self.assertEqual(record.status, GateStatus.APPROVED)

    def test_missing_grayscale_suspended(self):
        row = {
            "sample_id": "s002",
            "neg_sample_ratio": 0.3,
            "threshold": 0.5,
        }
        record = self.gate.ingest_log(row)
        self.assertEqual(record.status, GateStatus.SUSPENDED)
        self.assertIn("missing", record.suspended_reason.lower())

    def test_grayscale_out_of_range_suspended(self):
        row = {
            "sample_id": "s003",
            "grayscale_ratio": 1.5,
            "neg_sample_ratio": 0.3,
        }
        record = self.gate.ingest_log(row)
        self.assertEqual(record.status, GateStatus.SUSPENDED)
        self.assertIn("out of valid range", record.suspended_reason)
        self.assertIn("Suspended for person-in-charge confirmation", record.suspended_reason)

    def test_grayscale_nan_suspended(self):
        row = {
            "sample_id": "s004",
            "grayscale_ratio": "not_a_number",
        }
        record = self.gate.ingest_log(row)
        self.assertEqual(record.status, GateStatus.SUSPENDED)

    def test_bad_data_detected(self):
        row = {
            "sample_id": "s005",
            "neg_sample_ratio": 2.5,
            "grayscale_ratio": 0.1,
        }
        record = self.gate.ingest_log(row)
        self.assertTrue(len(record.bad_data_refs) > 0)
        self.assertIn("neg_sample_ratio", record.bad_data_refs[0])

    def test_confirm_suspended_approve(self):
        row = {
            "sample_id": "s006",
            "neg_sample_ratio": 0.3,
        }
        record = self.gate.ingest_log(row)
        self.assertEqual(record.status, GateStatus.SUSPENDED)
        confirmed = self.gate.confirm_suspended(record.record_id, "小林", action="approve")
        self.assertEqual(confirmed.status, GateStatus.APPROVED)
        self.assertEqual(confirmed.confirmed_by, "小林")

    def test_confirm_suspended_reject(self):
        row = {
            "sample_id": "s007",
            "neg_sample_ratio": 0.3,
        }
        record = self.gate.ingest_log(row)
        confirmed = self.gate.confirm_suspended(record.record_id, "小林", action="reject")
        self.assertEqual(confirmed.status, GateStatus.REJECTED)

    def test_confirm_non_suspended_raises(self):
        row = {
            "sample_id": "s008",
            "neg_sample_ratio": 0.3,
            "grayscale_ratio": 0.1,
        }
        record = self.gate.ingest_log(row)
        with self.assertRaises(ValueError):
            self.gate.confirm_suspended(record.record_id, "小林")

    def test_grayscale_result_breakdown(self):
        row = {
            "sample_id": "s009",
            "neg_sample_ratio": 0.3,
            "grayscale_ratio": 0.2,
            "threshold": 0.5,
        }
        record = self.gate.ingest_log(row)
        self.assertEqual(record.status, GateStatus.APPROVED)
        result = self.gate.build_grayscale_result(
            record,
            sample_count_before=1000,
            sample_count_after=1200,
            threshold_before=0.45,
            threshold_after=0.5,
            metric_before=0.85,
            metric_after=0.88,
            manual_overrides=["override_threshold_by_小林"],
        )
        bd = result.breakdown()
        self.assertEqual(bd["sample_change"]["delta"], 200)
        self.assertAlmostEqual(bd["threshold_change"]["delta"], 0.05)
        self.assertAlmostEqual(bd["metric_change"]["delta"], 0.03)
        self.assertIn("override_threshold_by_小林", bd["manual_overrides"])


class TestTimelineManager(unittest.TestCase):
    def setUp(self):
        self.timeline = TimelineManager()

    def test_add_and_retrieve_event(self):
        evt = self.timeline.add_event(
            event_type=TimelineEventType.SAMPLE_CHANGE,
            record_id="r001",
            description="Sample changed",
        )
        events = self.timeline.get_events_for_record("r001")
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].event_id, evt.event_id)

    def test_filter_by_type(self):
        self.timeline.add_event(
            event_type=TimelineEventType.SAMPLE_CHANGE,
            record_id="r001",
            description="s1",
        )
        self.timeline.add_event(
            event_type=TimelineEventType.THRESHOLD_CHANGE,
            record_id="r001",
            description="t1",
        )
        sample_events = self.timeline.get_events_by_type(TimelineEventType.SAMPLE_CHANGE)
        self.assertEqual(len(sample_events), 1)

    def test_sample_history(self):
        self.timeline.add_event(
            event_type=TimelineEventType.SAMPLE_CHANGE,
            record_id="r001",
            description="Sample s001 observed",
            details={"sample_id": "s001"},
        )
        history = self.timeline.get_sample_history("s001")
        self.assertEqual(len(history), 1)

    def test_version_history(self):
        self.timeline.add_event(
            event_type=TimelineEventType.VERSION_CHANGE,
            record_id="r001",
            description="Version v2.1 observed",
            details={"version": "v2.1"},
        )
        history = self.timeline.get_version_history("v2.1")
        self.assertEqual(len(history), 1)

    def test_summarize(self):
        self.timeline.add_event(
            event_type=TimelineEventType.SAMPLE_CHANGE,
            record_id="r001",
            description="s",
        )
        self.timeline.add_event(
            event_type=TimelineEventType.MANUAL_OVERRIDE,
            record_id="r001",
            description="m",
        )
        summary = self.timeline.summarize()
        self.assertEqual(summary["total_events"], 2)
        self.assertEqual(summary["records_tracked"], 1)


class TestGateReportGenerator(unittest.TestCase):
    def setUp(self):
        self.timeline = TimelineManager()
        self.normalizer = FieldNormalizer()
        self.gate = NegSamplingGatekeeper(
            timeline_manager=self.timeline,
            normalizer=self.normalizer,
            grayscale_min=0.01,
            grayscale_max=1.0,
        )
        self.reporter = GateReportGenerator(self.gate)

    def test_report_text_format(self):
        row = {
            "sample_id": "s001",
            "neg_sample_ratio": 0.3,
            "grayscale_ratio": 0.1,
            "threshold": 0.5,
        }
        self.gate.ingest_log(row)
        text = self.reporter.generate_text_report()
        self.assertIn("负采样上线守门", text)
        self.assertIn("approved", text)

    def test_report_json_format(self):
        row = {
            "sample_id": "s001",
            "neg_sample_ratio": 0.3,
            "grayscale_ratio": 0.1,
        }
        self.gate.ingest_log(row)
        report = self.reporter.generate_report()
        self.assertEqual(report["total_records"], 1)
        self.assertIn("summary", report)

    def test_grayscale_breakdown_in_report(self):
        row = {
            "sample_id": "s010",
            "neg_sample_ratio": 0.3,
            "grayscale_ratio": 0.2,
        }
        record = self.gate.ingest_log(row)
        self.gate.build_grayscale_result(
            record,
            sample_count_before=500,
            sample_count_after=600,
            threshold_before=0.4,
            threshold_after=0.5,
            manual_overrides=["人工改判_阈值"],
        )
        report = self.reporter.generate_report()
        self.assertIn("grayscale_breakdown", report)
        bd = report["grayscale_breakdown"][0]
        self.assertEqual(bd["sample_change"]["delta"], 100)
        self.assertAlmostEqual(bd["threshold_change"]["delta"], 0.1)
        self.assertIn("人工改判_阈值", bd["manual_overrides"])

    def test_suspended_records_in_report(self):
        row = {"sample_id": "s011", "neg_sample_ratio": 0.3}
        self.gate.ingest_log(row)
        report = self.reporter.generate_report()
        self.assertTrue(len(report["suspended_records"]) > 0)
        self.assertIn("reason", report["suspended_records"][0])

    def test_bad_data_in_report(self):
        row = {"sample_id": "s012", "neg_sample_ratio": 5.0, "grayscale_ratio": 0.1}
        self.gate.ingest_log(row)
        report = self.reporter.generate_report()
        self.assertIn("bad_data_alerts", report)
        self.assertTrue(len(report["bad_data_alerts"]) > 0)


class TestHandoverWorkflow(unittest.TestCase):
    def test_full_handover_scenario(self):
        timeline = TimelineManager()
        normalizer = FieldNormalizer()
        gate = NegSamplingGatekeeper(
            timeline_manager=timeline,
            normalizer=normalizer,
            grayscale_min=0.01,
            grayscale_max=1.0,
        )

        row1 = {
            "样本id": "s_h1",
            "版本": "v1.0",
            "负采样比例": 0.3,
            "阈值": 0.5,
            "灰度比例": 0.1,
            "时间": "2026-06-20T10:00:00",
        }
        rec1 = gate.ingest_log(row1, source_file="train_log.csv", source_line=1)
        self.assertEqual(rec1.status, GateStatus.APPROVED)

        row2 = {
            "样本ID": "s_h2",
            "模型版本": "v1.1",
            "负样本比例": 0.4,
            "判定阈值": 0.55,
        }
        rec2 = gate.ingest_log(row2, source_file="train_log.csv", source_line=2)
        self.assertEqual(rec2.status, GateStatus.SUSPENDED)

        confirmed = gate.confirm_suspended(rec2.record_id, "小林", action="approve")
        self.assertEqual(confirmed.status, GateStatus.APPROVED)

        gate.build_grayscale_result(
            rec1,
            sample_count_before=1000,
            sample_count_after=1200,
            threshold_before=0.45,
            threshold_after=0.5,
            manual_overrides=["小林确认灰度比例"],
        )

        original = gate.find_original_log("s_h1")
        self.assertIsNotNone(original)
        self.assertEqual(original.sample_id, "s_h1")
        si_sample = original.source_info.get("sample_id")
        self.assertEqual(si_sample.original_field_name, "样本id")

        explanation = gate.explain_processing(rec2.record_id)
        self.assertEqual(explanation["status"], "approved")
        self.assertIn("timeline", explanation)
        manual_events = [
            e for e in explanation["timeline"]
            if e["event_type"] == "manual_override"
        ]
        self.assertTrue(len(manual_events) > 0)

        reporter = GateReportGenerator(gate)
        text_report = reporter.generate_text_report()
        self.assertIn("样本变化", text_report)
        self.assertIn("阈值变化", text_report)
        self.assertIn("人工改判", text_report)

        json_report = reporter.generate_report()
        self.assertEqual(json_report["total_records"], 2)
        self.assertIn("grayscale_breakdown", json_report)

        sample_history = timeline.get_sample_history("s_h1")
        self.assertTrue(len(sample_history) > 0)

        version_history = timeline.get_version_history("v1.0")
        self.assertTrue(len(version_history) > 0)

        override_history = timeline.get_manual_override_history()
        self.assertTrue(len(override_history) > 0)

    def test_bad_data_does_not_affect_gate_decision(self):
        timeline = TimelineManager()
        normalizer = FieldNormalizer()
        gate = NegSamplingGatekeeper(
            timeline_manager=timeline,
            normalizer=normalizer,
            grayscale_min=0.01,
            grayscale_max=1.0,
        )

        row = {
            "sample_id": "s_bad1",
            "neg_sample_ratio": -0.5,
            "grayscale_ratio": 0.1,
        }
        record = gate.ingest_log(row)
        self.assertTrue(len(record.bad_data_refs) > 0)
        self.assertIn("neg_sample_ratio", record.bad_data_refs[0])

        explanation = gate.explain_processing(record.record_id)
        self.assertTrue(len(explanation["bad_data_refs"]) > 0)

        original_entry = gate.find_original_log("s_bad1")
        self.assertIsNotNone(original_entry)
        self.assertEqual(original_entry.quality_flag, "bad_data")


if __name__ == "__main__":
    unittest.main()
