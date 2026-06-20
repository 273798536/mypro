import os
import sys
import tempfile
import unittest
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from training_queue_snapshot.models import (
    FeatureRow, RowStatus, GrayFlag, ModificationType,
    ProcessingStats, SnapshotVersion, SnapshotThreshold, Snapshot
)
from training_queue_snapshot.processor import SnapshotProcessor
from training_queue_snapshot.diff import VersionComparator
from training_queue_snapshot.exporter import SnapshotExporter


class TestModels(unittest.TestCase):
    def test_feature_row_to_from_dict(self):
        row = FeatureRow(
            sample_id="test_001",
            features={"f1": 1.0, "f2": 2.0},
            label=1.0,
            status=RowStatus.PROCESSED,
            gray_flag=GrayFlag.GRAY_CANDIDATE,
            gray_ratio=0.3,
            modification_type=ModificationType.MANUAL_CORRECTION,
            modification_note="测试修正",
            is_boundary=True,
        )

        data = row.to_dict()
        self.assertEqual(data["sample_id"], "test_001")
        self.assertEqual(data["status"], "processed")
        self.assertEqual(data["gray_flag"], "gray_candidate")
        self.assertEqual(data["modification_type"], "manual_correction")
        self.assertTrue(data["is_boundary"])

        row2 = FeatureRow.from_dict(data)
        self.assertEqual(row2.sample_id, row.sample_id)
        self.assertEqual(row2.status, row.status)
        self.assertEqual(row2.gray_flag, row.gray_flag)
        self.assertEqual(row2.features, row.features)

    def test_processing_stats_rates(self):
        stats = ProcessingStats(total=100, processed=80, bad=10, skipped=10)
        self.assertAlmostEqual(stats.processed_rate, 0.8)
        self.assertAlmostEqual(stats.bad_rate, 0.1)

    def test_processing_stats_gray_rate(self):
        stats = ProcessingStats(total=100, gray_candidate=15, gray_enabled=10)
        self.assertAlmostEqual(stats.gray_rate, 0.25)


class TestProcessor(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.test_file = os.path.join(self.test_dir, "test_data.csv")

        with open(self.test_file, "w") as f:
            f.write("sample_id,feature1,feature2,label,note,modification_note\n")
            f.write("sample_001,1.0,2.0,1.0,,\n")
            f.write("sample_002,2.0,3.0,0.0,,\n")
            f.write("sample_003,,4.0,1.0,,缺失值测试\n")
            f.write("skip_sample,1.0,2.0,0.0,,\n")
            f.write("sample_005,1.0,2.0,1.0,skip,\n")
            f.write("sample_006,999.0,999.0,0.0,,\n")

        version = SnapshotVersion(
            name="test_v1",
            thresholds={
                "feature1": SnapshotThreshold("feature1", min_value=0, max_value=100),
                "feature2": SnapshotThreshold("feature2", min_value=0, max_value=100),
            },
            gray_ratio_config=0.3,
        )
        self.processor = SnapshotProcessor(version=version, bad_row_threshold=0.5)

    def test_process(self):
        snapshot = self.processor.process(
            self.test_file,
            feature_cols=["feature1", "feature2"],
            label_col="label",
            sample_id_col="sample_id",
        )

        self.assertEqual(snapshot.stats.total, 6)
        self.assertGreater(snapshot.stats.skipped, 0)
        self.assertGreater(snapshot.stats.bad, 0)
        self.assertGreater(snapshot.stats.processed, 0)

        bad_rows = [r for r in snapshot.rows if r.status == RowStatus.BAD]
        self.assertTrue(any("高于阈值上限" in (r.error_message or "") for r in bad_rows))

        skipped_rows = [r for r in snapshot.rows if r.status == RowStatus.SKIPPED]
        self.assertGreaterEqual(len(skipped_rows), 2)

        gray_rows = [r for r in snapshot.rows if r.gray_flag != GrayFlag.NORMAL]
        self.assertGreater(len(gray_rows), 0)

    def test_filter_rows(self):
        snapshot = self.processor.process(
            self.test_file,
            feature_cols=["feature1", "feature2"],
            label_col="label",
            sample_id_col="sample_id",
        )

        bad_only = self.processor.filter_rows(snapshot, status_filter=[RowStatus.BAD])
        self.assertEqual(len(bad_only), snapshot.stats.bad)

        skipped_only = self.processor.filter_rows(snapshot, status_filter=[RowStatus.SKIPPED])
        self.assertEqual(len(skipped_only), snapshot.stats.skipped)

        gray_only = self.processor.filter_rows(snapshot, gray_filter=[GrayFlag.GRAY_CANDIDATE])
        self.assertEqual(len(gray_only), snapshot.stats.gray_candidate)

    def test_detect_boundary(self):
        version = SnapshotVersion()
        processor = SnapshotProcessor(version=version, boundary_threshold=0.01)

        test_file = os.path.join(self.test_dir, "boundary_test.csv")
        with open(test_file, "w") as f:
            f.write("sample_id,feature1\n")
            for i in range(100):
                f.write(f"sample_{i:03d},{10.0 + i * 0.1}\n")

        snapshot = processor.process(test_file, feature_cols=["feature1"])
        self.assertGreater(snapshot.stats.boundary, 0)


class TestDiff(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()

        self.v1_file = os.path.join(self.test_dir, "v1.csv")
        with open(self.v1_file, "w") as f:
            f.write("sample_id,feature1,feature2,label\n")
            f.write("sample_001,1.0,2.0,1.0\n")
            f.write("sample_002,2.0,3.0,0.0\n")
            f.write("sample_003,3.0,4.0,1.0\n")

        self.v2_file = os.path.join(self.test_dir, "v2.csv")
        with open(self.v2_file, "w") as f:
            f.write("sample_id,feature1,feature2,label,modification_note,feature1_original\n")
            f.write("sample_001,1.5,2.0,1.0,人工修正,1.0\n")
            f.write("sample_002,2.0,3.0,0.0,,\n")
            f.write("sample_004,4.0,5.0,1.0,,\n")

        v1_version = SnapshotVersion(name="v1", gray_ratio_config=0.2)
        v2_version = SnapshotVersion(name="v2", gray_ratio_config=0.3, parent_version=v1_version.version_id)

        self.p1 = SnapshotProcessor(version=v1_version)
        self.p2 = SnapshotProcessor(version=v2_version)

        self.s1 = self.p1.process(self.v1_file, label_col="label")
        self.s2 = self.p2.process(self.v2_file, label_col="label")

    def test_compare(self):
        comparator = VersionComparator()
        diff = comparator.compare(self.s1, self.s2)

        self.assertEqual(diff.old_version_id, self.s1.version.version_id)
        self.assertEqual(diff.new_version_id, self.s2.version.version_id)

        sample_ids = {c["sample_id"] for c in diff.sample_changes}
        self.assertIn("sample_001", sample_ids)
        self.assertIn("sample_003", sample_ids)
        self.assertIn("sample_004", sample_ids)

        modified = [c for c in diff.sample_changes if c["change_type"] == "modified"]
        self.assertTrue(any(c["modification_changed"] for c in modified))

        self.assertIn("gray_ratio_config", diff.gray_changes)
        self.assertIn("gray_samples", diff.gray_changes)

        self.assertGreater(len(diff.manual_corrections), 0)


class TestExporter(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.output_dir = os.path.join(self.test_dir, "output")
        self.exporter = SnapshotExporter(output_dir=self.output_dir)

        self.snapshot = Snapshot(
            version=SnapshotVersion(name="test", gray_ratio_config=0.3),
            rows=[
                FeatureRow(
                    sample_id="s1",
                    features={"f1": 1.0, "f2": 2.0},
                    status=RowStatus.PROCESSED,
                    gray_flag=GrayFlag.GRAY_CANDIDATE,
                    gray_ratio=0.3,
                ),
                FeatureRow(
                    sample_id="s2",
                    features={"f1": None, "f2": None},
                    status=RowStatus.BAD,
                    error_message="缺失值过多",
                ),
            ],
        )
        self.snapshot.stats.total = 2
        self.snapshot.stats.processed = 1
        self.snapshot.stats.bad = 1
        self.snapshot.stats.gray_candidate = 1

    def test_export_json(self):
        path = self.exporter.export_json(self.snapshot)
        self.assertTrue(os.path.exists(path))

        loaded = self.exporter.load_snapshot(path)
        self.assertEqual(loaded.snapshot_id, self.snapshot.snapshot_id)
        self.assertEqual(len(loaded.rows), 2)
        self.assertEqual(loaded.stats.bad, 1)
        self.assertEqual(loaded.rows[1].error_message, "缺失值过多")

        with open(path, "r") as f:
            import json
            data = json.load(f)
            self.assertIn("_export_meta", data)
            self.assertIn("status_display_mapping", data["_export_meta"])
            self.assertEqual(data["_export_meta"]["status_display_mapping"]["bad"], "坏行")

    def test_export_csv(self):
        path = self.exporter.export_csv(self.snapshot)
        self.assertTrue(os.path.exists(path))

        import pandas as pd
        df = pd.read_csv(path)
        self.assertEqual(len(df), 2)
        self.assertIn("状态显示", df.columns)
        self.assertIn("灰度标记", df.columns)
        self.assertIn("是否边界样本", df.columns)

    def test_export_report(self):
        path = self.exporter.export_report(self.snapshot)
        self.assertTrue(os.path.exists(path))

        with open(path, "r") as f:
            content = f.read()
            self.assertIn("坏行", content)
            self.assertIn("已处理", content)
            self.assertIn("灰度候选", content)
            self.assertIn("s2", content)


if __name__ == "__main__":
    unittest.main()
