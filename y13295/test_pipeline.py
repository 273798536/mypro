#!/usr/bin/env python3
import unittest
import os
import sys
import tempfile
import shutil
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import (
    RawPointRecord,
    MergedPointGroup,
    DataSource,
    MergeStatus,
    ComplaintStatus,
    FilterCriteria,
    Statistics,
)
from data_loader import DataLoader
from merge_engine import PointMergeEngine, LocationNormalizer, TextSimilarity, GeoCalculator
from output_generator import OutputGenerator
from status_tracker import StatusTracker


class TestLocationNormalizer(unittest.TestCase):
    def setUp(self):
        self.normalizer = LocationNormalizer()

    def test_normalize_basic(self):
        result = self.normalizer.normalize("人民公园东门出口处")
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)

    def test_normalize_removes_noise(self):
        result1 = self.normalizer.normalize("在人民公园的东门位置")
        result2 = self.normalizer.normalize("人民公园东门")
        self.assertEqual(result1, result2)

    def test_normalize_cn_numbers(self):
        result = self.normalizer.normalize("第三号路口")
        self.assertIn("3", result)

    def test_extract_key_terms(self):
        terms = self.normalizer.extract_key_terms("建设路与光明路交叉口口袋公园")
        self.assertTrue(any("公园" in t for t in terms))
        self.assertTrue(any("路" in t for t in terms))


class TestTextSimilarity(unittest.TestCase):
    def test_char_overlap_ratio_identical(self):
        score = TextSimilarity.char_overlap_ratio("人民公园东门", "人民公园东门")
        self.assertAlmostEqual(score, 1.0, places=2)

    def test_char_overlap_ratio_similar(self):
        score = TextSimilarity.char_overlap_ratio("人民公园东门", "人民公园东门口")
        self.assertGreater(score, 0.7)

    def test_char_overlap_ratio_different(self):
        score = TextSimilarity.char_overlap_ratio("人民公园东门", "文化广场西南角")
        self.assertLess(score, 0.5)

    def test_lcs_similarity(self):
        score = TextSimilarity.lcs_similarity("建设大道光明路口袋公园", "建设路光明路口绿地")
        self.assertGreater(score, 0.5)


class TestGeoCalculator(unittest.TestCase):
    def test_haversine_distance_same_point(self):
        dist = GeoCalculator.haversine_distance(39.904989, 116.405285, 39.904989, 116.405285)
        self.assertAlmostEqual(dist, 0.0, places=1)

    def test_haversine_distance_known(self):
        dist = GeoCalculator.haversine_distance(39.904989, 116.405285, 39.904995, 116.405300)
        self.assertLess(dist, 100.0)
        self.assertGreater(dist, 0.0)


class TestDataLoader(unittest.TestCase):
    def setUp(self):
        self.loader = DataLoader()
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_load_csv(self):
        csv_path = os.path.join(self.test_dir, "test审批台账.csv")
        with open(csv_path, "w", encoding="utf-8-sig") as f:
            f.write("record_id,位置,投诉内容,投诉时间,投诉人,审批编号,经度,纬度\n")
            f.write('T001,人民公园东门,座椅损坏,2024-05-12 09:30:00,张三,SP001,116.405285,39.904989\n')

        records = self.loader.load_from_csv(csv_path, DataSource.APPROVAL_LEDGER)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].original_location_text, "人民公园东门")
        self.assertEqual(records[0].source, DataSource.APPROVAL_LEDGER)
        self.assertIsNotNone(records[0].complaint_time)
        self.assertEqual(records[0].raw_data["record_id"], "T001")

    def test_load_json(self):
        json_path = os.path.join(self.test_dir, "test投诉.json")
        import json
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump([
                {"record_id": "J001", "位置": "幸福小游园", "投诉内容": "座椅不够",
                 "投诉时间": "2024-05-11 08:30:00", "投诉人": "李四"}
            ], f, ensure_ascii=False)

        records = self.loader.load_from_json(json_path, DataSource.COMPLAINT_RECORD)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].original_location_text, "幸福小游园")
        self.assertEqual(records[0].complaint_content, "座椅不够")

    def test_parse_datetime(self):
        dt = DataLoader._parse_datetime("2024-05-12 09:30:00")
        self.assertIsNotNone(dt)
        self.assertEqual(dt.year, 2024)
        self.assertEqual(dt.month, 5)
        self.assertEqual(dt.day, 12)

    def test_safe_float(self):
        self.assertEqual(DataLoader._safe_float("116.405285"), 116.405285)
        self.assertIsNone(DataLoader._safe_float(""))
        self.assertIsNone(DataLoader._safe_float("无效"))


class TestPointMergeEngine(unittest.TestCase):
    def setUp(self):
        self.engine = PointMergeEngine()
        self.records = [
            RawPointRecord(
                record_id="R001", source=DataSource.APPROVAL_LEDGER,
                original_location_text="人民公园东门出口处",
                longitude=116.405285, latitude=39.904989,
                complaint_content="座椅损坏", complaint_time=datetime(2024, 5, 12, 9, 30),
                complainant="张三", approval_number="SP001", raw_data={}
            ),
            RawPointRecord(
                record_id="R002", source=DataSource.APPROVAL_LEDGER,
                original_location_text="人民公园东门",
                longitude=116.405300, latitude=39.904995,
                complaint_content="座椅缺失", complaint_time=datetime(2024, 5, 13, 14, 20),
                complainant="李四", approval_number="SP002", raw_data={}
            ),
            RawPointRecord(
                record_id="R003", source=DataSource.CHAT_RECORD,
                original_location_text="人民路东端口袋公园旁",
                longitude=116.405100, latitude=39.904800,
                complaint_content="没有座椅老人休息难", complaint_time=datetime(2024, 5, 14, 10, 15),
                complainant="王五", raw_data={}
            ),
            RawPointRecord(
                record_id="R004", source=DataSource.APPROVAL_LEDGER,
                original_location_text="文化广场西南角",
                longitude=116.420000, latitude=39.915000,
                complaint_content="座椅不够用", complaint_time=datetime(2024, 5, 8, 14, 0),
                complainant="陈十一", approval_number="SP005", raw_data={}
            ),
        ]

    def test_normalize_records(self):
        normalized = self.engine._normalize_records(self.records)
        for r in normalized:
            self.assertIsNotNone(r.normalized_location)
            self.assertTrue(len(r.normalized_location) > 0)

    def test_merge_score(self):
        score, evidence = self.engine._compute_merge_score(self.records[0], self.records[1])
        self.assertGreater(score, 0.5)
        self.assertTrue(len(evidence) > 0)

    def test_should_merge_same_location(self):
        should, score, evidence = self.engine._should_merge(self.records[0], self.records[1])
        self.assertTrue(should)

    def test_should_merge_different_location(self):
        should, score, evidence = self.engine._should_merge(self.records[0], self.records[3])
        self.assertFalse(should)

    def test_cluster_records(self):
        groups = self.engine._cluster_records(self.records)
        self.assertGreater(len(groups), 0)
        multi_record_groups = [g for g in groups if g.record_count > 1]
        self.assertGreater(len(multi_record_groups), 0)

    def test_full_merge_pipeline(self):
        result = self.engine.merge(self.records)
        self.assertIsNotNone(result)
        self.assertEqual(len(result.raw_records), 4)
        self.assertGreater(len(result.merged_groups), 0)
        self.assertIsNotNone(result.statistics)
        self.assertEqual(result.statistics.total_raw_records, 4)

    def test_analyze_complaints(self):
        groups = self.engine._cluster_records(self.records)
        self.engine._analyze_complaints(groups)
        for g in groups:
            self.assertIsInstance(g.complaint_status, ComplaintStatus)

    def test_generate_next_steps(self):
        groups = self.engine._cluster_records(self.records)
        self.engine._analyze_complaints(groups)
        self.engine._generate_next_steps(groups)
        for g in groups:
            self.assertIsNotNone(g.next_step_hint)
            self.assertTrue(len(g.next_step_hint) > 0)

    def test_filter_by_source(self):
        criteria = FilterCriteria(data_sources=[DataSource.APPROVAL_LEDGER])
        result = self.engine.merge(self.records, criteria)
        self.assertTrue(all(r.source == DataSource.APPROVAL_LEDGER for r in result.raw_records))


class TestOutputGenerator(unittest.TestCase):
    def setUp(self):
        self.output_dir = tempfile.mkdtemp()
        self.generator = OutputGenerator(self.output_dir)
        self.engine = PointMergeEngine()
        self.records = [
            RawPointRecord(
                record_id="R001", source=DataSource.APPROVAL_LEDGER,
                original_location_text="人民公园东门",
                longitude=116.405285, latitude=39.904989,
                complaint_content="座椅损坏", complaint_time=datetime(2024, 5, 12),
                complainant="张三", approval_number="SP001", raw_data={}
            ),
            RawPointRecord(
                record_id="R002", source=DataSource.CHAT_RECORD,
                original_location_text="人民公园东门口",
                longitude=116.405300, latitude=39.904995,
                complaint_content="座椅缺失", complaint_time=datetime(2024, 5, 13),
                complainant="李四", raw_data={}
            ),
        ]
        self.result = self.engine.merge(self.records)

    def tearDown(self):
        shutil.rmtree(self.output_dir)

    def test_generate_filter_criteria_text(self):
        text = self.generator.generate_filter_criteria_text(self.result)
        self.assertIn("筛选条件", text)
        self.assertIn("生成时间", text)

    def test_generate_statistics_text(self):
        text = self.generator.generate_statistics_text(self.result)
        self.assertIn("统计数字", text)
        self.assertIn("总原始记录数", text)

    def test_generate_summary_table_text(self):
        text = self.generator.generate_summary_table_text(self.result)
        self.assertIn("明细表", text)
        self.assertIn("归并组ID", text)

    def test_generate_detail_csv(self):
        path = self.generator.generate_detail_csv(self.result)
        self.assertTrue(os.path.exists(path))
        with open(path, "r", encoding="utf-8-sig") as f:
            content = f.read()
            self.assertIn("归并组ID", content)
            self.assertIn("人民公园东门", content)

    def test_generate_groups_csv(self):
        path = self.generator.generate_groups_csv(self.result)
        self.assertTrue(os.path.exists(path))

    def test_generate_records_csv(self):
        path = self.generator.generate_records_csv(self.result)
        self.assertTrue(os.path.exists(path))

    def test_generate_full_json(self):
        path = self.generator.generate_full_json(self.result)
        self.assertTrue(os.path.exists(path))

    def test_generate_handler_view(self):
        text = self.generator.generate_handler_view_text(self.result)
        self.assertIn("算法值班人视图", text)

    def test_generate_handoff_report(self):
        text = self.generator.generate_handoff_report(self.result)
        self.assertIn("交接报告", text)
        self.assertIn("市政设计老曹", text)

    def test_generate_all(self):
        outputs = self.generator.generate_all(self.result)
        self.assertEqual(len(outputs), 9)
        for name, path in outputs.items():
            self.assertTrue(os.path.exists(path) or name.endswith("_text"),
                            f"Output {name} should exist or be text")


class TestStatusTracker(unittest.TestCase):
    def setUp(self):
        self.tracking_file = tempfile.mktemp(suffix=".json")
        self.tracker = StatusTracker(self.tracking_file)
        self.engine = PointMergeEngine()
        self.records = [
            RawPointRecord(
                record_id="R001", source=DataSource.APPROVAL_LEDGER,
                original_location_text="人民公园东门",
                complaint_content="座椅损坏", raw_data={}
            ),
        ]
        self.result = self.engine.merge(self.records)

    def tearDown(self):
        if os.path.exists(self.tracking_file):
            os.remove(self.tracking_file)

    def test_update_status(self):
        group = self.result.merged_groups[0]
        log = self.tracker.update_status(group, MergeStatus.MERGED, "测试员", "测试备注")
        self.assertEqual(log.new_status, MergeStatus.MERGED)
        self.assertEqual(group.merge_status, MergeStatus.MERGED)

    def test_mark_as_merged(self):
        group = self.result.merged_groups[0]
        self.tracker.mark_as_merged(group, "测试员", "现场照片已上传")
        self.assertEqual(group.merge_status, MergeStatus.MERGED)

    def test_mark_as_needs_evidence(self):
        group = self.result.merged_groups[0]
        self.tracker.mark_as_needs_evidence(group, "测试员", "缺少审批编号")
        self.assertEqual(group.merge_status, MergeStatus.NEEDS_EVIDENCE)

    def test_get_pending_groups(self):
        pending = self.tracker.get_pending_groups(self.result)
        self.assertEqual(len(pending), len(self.result.merged_groups))

    def test_get_completed_groups(self):
        group = self.result.merged_groups[0]
        self.tracker.mark_as_reviewed(group, "测试员")
        completed = self.tracker.get_completed_groups(self.result)
        self.assertGreater(len(completed), 0)

    def test_get_todo_summary(self):
        summary = self.tracker.get_todo_summary(self.result)
        self.assertIn("total_groups", summary)
        self.assertIn("completion_rate", summary)

    def test_generate_status_report(self):
        text = self.tracker.generate_status_report(self.result)
        self.assertIn("处理状态跟踪", text)

    def test_add_handler_note(self):
        group = self.result.merged_groups[0]
        self.tracker.add_handler_note(group, "已联系投诉人", "测试员")
        self.assertIsNotNone(group.handler_notes)
        self.assertIn("已联系投诉人", group.handler_notes)

    def test_persistence(self):
        group = self.result.merged_groups[0]
        self.tracker.mark_as_merged(group, "测试员", "第一次处理")

        tracker2 = StatusTracker(self.tracking_file)
        self.assertIn(group.group_id, tracker2.group_handlers)


class TestEndToEnd(unittest.TestCase):
    def test_full_pipeline_with_sample_data(self):
        sample_dir = os.path.join(os.path.dirname(__file__), "sample_data")
        if not os.path.exists(sample_dir):
            self.skipTest("sample_data directory not found")

        loader = DataLoader()
        records = loader.load_all_from_directory(sample_dir)
        self.assertGreater(len(records), 0)

        engine = PointMergeEngine()
        result = engine.merge(records)
        self.assertGreater(len(result.merged_groups), 0)

        output_dir = tempfile.mkdtemp()
        try:
            generator = OutputGenerator(output_dir)
            outputs = generator.generate_all(result)
            for name, path in outputs.items():
                self.assertTrue(os.path.exists(path) or name.endswith("_text"))
        finally:
            shutil.rmtree(output_dir)


if __name__ == "__main__":
    unittest.main(verbosity=2)
