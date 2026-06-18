from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from seed_bench.config import SeedBenchConfig, SafetyRulesConfig
from seed_bench.dedup import Deduplicator
from seed_bench.errors import (
    DuplicateRecordError,
    InconsistentSummaryError,
    SafetyRuleMissingError,
    TrainValLeakError,
)
from seed_bench.exporter import Exporter
from seed_bench.gray_diff import GrayDiffReporter
from seed_bench.leak_detector import LeakDetector
from seed_bench.models import (
    DataRecord,
    ModelLogEntry,
    ReviewStatus,
    SafetyRule,
    ShuffleResult,
    SplitType,
    ToolCallParams,
    compute_content_hash,
    generate_id,
)
from seed_bench.reviewer import Reviewer
from seed_bench.sample_data import SampleDataGenerator
from seed_bench.shuffle import Shuffler
from seed_bench.storage import FileSystemStorage


class TestDeterministic(unittest.TestCase):
    """确定性：同一批材料重复跑不能越跑越乱"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(prefix="seedbench_")
        self.cfg = SeedBenchConfig()
        self.cfg.storage.data_dir = self.tmpdir

    def _make_sample_input(self, path: str, seed: int = 42):
        gen = SampleDataGenerator(seed=seed)
        df = gen.generate_training_samples(100)
        Path(path).mkdir(parents=True, exist_ok=True)
        df.to_csv(Path(path) / "train.csv", index=False, encoding="utf-8")

    def test_dedup_deterministic(self):
        path = os.path.join(self.tmpdir, "input")
        self._make_sample_input(path)

        storage = FileSystemStorage(self.cfg.storage.data_dir)
        records = storage.read_input_files(path, self.cfg.hash_algorithm)
        dedup = Deduplicator(self.cfg.hash_algorithm)

        result1 = dedup.run(records)
        result2 = dedup.run(records)

        self.assertEqual(result1["summary"]["total_after_dedup"],
                         result2["summary"]["total_after_dedup"])
        kept_ids_1 = sorted(r.record_id for r in result1["kept_records"])
        kept_ids_2 = sorted(r.record_id for r in result2["kept_records"])
        self.assertEqual(kept_ids_1, kept_ids_2)

    def test_shuffle_deterministic(self):
        path = os.path.join(self.tmpdir, "input")
        self._make_sample_input(path)
        storage = FileSystemStorage(self.cfg.storage.data_dir)
        records = storage.read_input_files(path, self.cfg.hash_algorithm)

        shuffler1 = Shuffler(seed=42, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15)
        shuffler2 = Shuffler(seed=42, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15)
        r1 = shuffler1.run(records, batch_id="b1")
        r2 = shuffler2.run(records, batch_id="b1")
        self.assertEqual(r1.record_ids_train, r2.record_ids_train)
        self.assertEqual(r1.record_ids_val, r2.record_ids_val)

    def test_shuffle_different_seed_gives_different_split(self):
        # 构造足够多的 UNASSIGNED 记录，避免巧合
        records = [
            DataRecord(
                record_id=f"r{i:05d}",
                content_hash=f"h{i}",
                raw_content={"text": f"t{i}"},
                split_type=SplitType.UNASSIGNED,
                user_id=f"u{i % 100:04d}",
                source_file="x.csv",
                line_number=i,
            )
            for i in range(500)
        ]
        r_a = Shuffler(seed=42).run(records, batch_id="a")
        r_b = Shuffler(seed=43).run(records, batch_id="b")
        # 不同 seed 下 train 的 ID 集合应当不同
        self.assertNotEqual(
            set(r_a.record_ids_train), set(r_b.record_ids_train),
            "不同 seed 应该给出不同的划分",
        )


class TestIdempotentStorage(unittest.TestCase):
    """幂等写入 + 重复导入不乱"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(prefix="seedbench_idem_")
        self.storage = FileSystemStorage(self.tmpdir)

    def _rec(self, rid, text, split=SplitType.UNASSIGNED):
        raw = {"text": text, "label": "neutral"}
        return DataRecord(
            record_id=rid,
            content_hash=compute_content_hash(raw),
            raw_content=raw,
            split_type=split,
            source_file="x.csv",
            line_number=1,
        )

    def test_same_version_is_idempotent(self):
        batch = "b001"
        recs = [self._rec("r1", "hello"), self._rec("r2", "world")]
        written1 = self.storage.save_records(batch, recs, version="v1")
        written2 = self.storage.save_records(batch, recs, version="v1")
        self.assertEqual(written1, 2)
        self.assertEqual(written2, 0)  # 幂等，不再重复写

    def test_version_conflict_raises(self):
        batch = "b002"
        self.storage.save_records(batch, [self._rec("r1", "hello")], version="v1")
        with self.assertRaises(DuplicateRecordError) as ctx:
            self.storage.save_records(batch, [self._rec("r1", "hello")], version="v2")
        # 必须给出可操作的建议，而不是只抛内部错误
        self.assertTrue(
            bool(ctx.exception.suggestion) and len(ctx.exception.suggestion) > 5,
            "异常应该附带可操作的建议",
        )

    def test_force_overwrite(self):
        batch = "b003"
        self.storage.save_records(batch, [self._rec("r1", "a")], version="v1")
        new = [self._rec("r1", "b")]
        written = self.storage.save_records(batch, new, version="v2", force_overwrite=True)
        self.assertEqual(written, 1)
        loaded = self.storage.load_records(batch)
        self.assertEqual(len(loaded), 1)
        self.assertEqual(loaded[0].raw_content["text"], "b")

    def test_update_records_fields_idempotent(self):
        batch = "b004"
        recs = [self._rec("r1", "a", SplitType.UNASSIGNED),
                self._rec("r2", "b", SplitType.UNASSIGNED)]
        self.storage.save_records(batch, recs, version="v1")

        # 第一次更新
        updates = {"r1": {"split_type": SplitType.TRAIN},
                   "r2": {"split_type": SplitType.VAL}}
        n = self.storage.update_records_fields(batch, updates, "v1", "v2")
        self.assertEqual(n, 2)
        loaded = self.storage.load_records(batch)
        self.assertEqual(loaded[0].split_type if loaded[0].record_id == "r1" else loaded[1].split_type,
                         SplitType.TRAIN)

        # 第二次相同更新：幂等，返回 0
        n2 = self.storage.update_records_fields(batch, updates, "v1", "v2")
        self.assertEqual(n2, 0)

    def test_update_records_fields_version_check(self):
        batch = "b005"
        self.storage.save_records(batch, [self._rec("r1", "a")], version="v1")
        # 期望源版本是 v2，但实际是 v1，应该报错
        with self.assertRaises(DuplicateRecordError):
            self.storage.update_records_fields(
                batch, {"r1": {"split_type": SplitType.TRAIN}},
                source_version="v2", target_version="v3",
            )
        # force 就能过
        n = self.storage.update_records_fields(
            batch, {"r1": {"split_type": SplitType.TRAIN}},
            source_version="v2", target_version="v3", force_overwrite=True,
        )
        self.assertEqual(n, 1)
        loaded = self.storage.load_records(batch)
        self.assertEqual(loaded[0].split_type, SplitType.TRAIN)


class TestLeakDetection(unittest.TestCase):
    """训练验证泄漏 + 友好错误提示"""

    def _mk(self, rid, ch, split, user=None):
        return DataRecord(
            record_id=rid, content_hash=ch, raw_content={"text": ch},
            split_type=split, user_id=user, source_file="t.csv", line_number=1,
        )

    def test_exact_leak_detection(self):
        records = [
            self._mk("t1", "h1", SplitType.TRAIN),
            self._mk("t2", "h2", SplitType.TRAIN),
            self._mk("v1", "h1", SplitType.VAL),  # 泄漏
            self._mk("v2", "h3", SplitType.VAL),
        ]
        detector = LeakDetector(SafetyRulesConfig(max_leak_ratio=0.01, min_val_size=1))
        result = detector.run(records)
        self.assertEqual(result.status, ReviewStatus.REJECTED)
        self.assertGreater(result.leak_count, 0)

    def test_user_cross_leak(self):
        records = [
            self._mk("t1", "h1", SplitType.TRAIN, user="u1"),
            self._mk("v1", "h2", SplitType.VAL, user="u1"),
            self._mk("v2", "h3", SplitType.VAL, user="u2"),
            self._mk("v3", "h4", SplitType.VAL, user="u3"),
            self._mk("v4", "h5", SplitType.VAL, user="u4"),
        ]
        detector = LeakDetector(SafetyRulesConfig(
            forbid_user_cross=True, min_val_size=1, max_leak_ratio=0.5,
            require_train_val_split=True,
        ))
        result = detector.run(records)
        self.assertIn("rule_forbid_user_cross", result.leak_type or "none")

    def test_raise_on_leak_gives_actionable_msg(self):
        records = [
            self._mk("t1", "h1", SplitType.TRAIN),
            self._mk("t2", "h2", SplitType.TRAIN),
            self._mk("v1", "h1", SplitType.VAL),
        ]
        detector = LeakDetector(SafetyRulesConfig(max_leak_ratio=0.001, min_val_size=1))
        with self.assertRaises(TrainValLeakError) as ctx:
            detector.run(records, raise_on_leak=True)
        self.assertIn("建议操作", str(ctx.exception))
        self.assertIn("'dedup'", str(ctx.exception))
        self.assertIn("'review'", str(ctx.exception))

    def test_safety_rule_missing_is_actionable(self):
        # 给一个未启用 require_train_val_split 的配置，但手动让数据缺少划分
        records = [self._mk("t1", "h1", SplitType.UNASSIGNED)]
        detector = LeakDetector(SafetyRulesConfig(
            require_train_val_split=True, min_val_size=50, max_leak_ratio=0.001,
        ))
        # 不 raise 的情况下应当标记 missing
        result = detector.run(records, raise_on_leak=False)
        # 这里 UNASSIGNED 情况下 train/val 都为空
        self.assertEqual(result.status, ReviewStatus.REJECTED)


class TestExporterSync(unittest.TestCase):
    """导出内容与界面摘要一致性"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(prefix="seedbench_exp_")

    def test_csv_summary_sync(self):
        recs = [
            DataRecord(
                record_id=f"r{i}", content_hash=f"h{i}",
                raw_content={"text": f"t{i}"},
                split_type=(SplitType.TRAIN if i % 2 == 0 else SplitType.VAL),
                user_id=f"u{i % 3}", source_file="x.csv", line_number=i,
            )
            for i in range(20)
        ]
        exp = Exporter(sync_summary_with_file=True)
        out = os.path.join(self.tmpdir, "recs.csv")
        summary = exp.export_records(recs, out, "csv")
        self.assertEqual(summary["record_count"], 20)
        self.assertGreater(summary["split_train"], 0)

    def test_review_summary_consistency(self):
        from seed_bench.models import ReviewRecord, LeakDetectionResult
        from seed_bench.reviewer import Reviewer
        records = [
            DataRecord(record_id=f"r{i}", content_hash=f"h{i}", raw_content={},
                       split_type=SplitType.TRAIN, source_file="x.csv", line_number=1)
            for i in range(3)
        ]
        rev = Reviewer()
        leak = LeakDetectionResult(
            status=ReviewStatus.APPROVED, leak_count=0, total_count=3,
            leak_ratio=0.0, safety_rules_applied=["rule_a"],
            message="all good",
        )
        review = rev.create_review(
            batch_id="bx",
            records=records,
            safety_rules=[SafetyRule(rule_id="r1", name="n", description="d")],
            safety_rule_violations=[],
            model_logs=[ModelLogEntry(module="m", message="ok")],
            tool_params=ToolCallParams(
                command="leak-check", input_dir="/a", output_dir="/b", seed=42, params={},
            ),
            leak_result=leak,
            dedup_summary={"total_input": 3},
            shuffle_summary={"train_count": 3},
            status=ReviewStatus.APPROVED,
            comment="通过",
        )
        exp = Exporter(sync_summary_with_file=True)
        json_path = os.path.join(self.tmpdir, "r.json")
        md_path = os.path.join(self.tmpdir, "r.md")
        s1 = exp.export_review(review, json_path, "json")
        s2 = exp.export_review(review, md_path, "markdown")
        self.assertEqual(s1["status"], "通过")
        self.assertEqual(s2["status"], "通过")
        self.assertEqual(s1["material_fingerprint"], s2["material_fingerprint"])


class TestGrayDiff(unittest.TestCase):
    """灰度对比：旧新结果要能说清楚"""

    def test_shuffle_compare(self):
        r1 = ShuffleResult(
            batch_id="a", seed=42, total_records=10, train_count=7, val_count=2, test_count=1,
            record_ids_train=[f"t{i}" for i in range(7)],
            record_ids_val=[f"v{i}" for i in range(2)],
            record_ids_test=["x0"],
        )
        # 构造不稳定的新结果
        r2 = ShuffleResult(
            batch_id="b", seed=42, total_records=10, train_count=7, val_count=2, test_count=1,
            record_ids_train=[f"t{i}" for i in range(6)] + ["v0"],  # v0 从 val 移到 train
            record_ids_val=["t6"] + ["v1"],  # t6 从 train 移到 val
            record_ids_test=["x0"],
        )
        rep = GrayDiffReporter()
        cmp = rep.compare_shuffle(r1, r2)
        self.assertTrue(cmp["expected_stable"])
        self.assertFalse(cmp["is_stable"])
        self.assertGreater(cmp["count_moved_train_to_val"], 0)


class TestSampleGenerator(unittest.TestCase):
    """示例数据生成：首次打开不用先造表"""

    def test_generates_reasonable_samples(self):
        gen = SampleDataGenerator(seed=1)
        df = gen.generate_training_samples(100)
        self.assertGreaterEqual(len(df), 100)  # 含注入的重复+泄漏
        self.assertIn("record_id", df.columns)
        self.assertIn("split_type", df.columns)
        self.assertIn("user_id", df.columns)
        # 确定性
        df2 = gen.generate_training_samples(100)
        pd.testing.assert_frame_equal(df, df2)


class TestReviewPipelineEndToEnd(unittest.TestCase):
    """端到端：日常入口 dedup → shuffle → leak-check → review → export"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(prefix="seedbench_e2e_")
        input_dir = os.path.join(self.tmpdir, "input")
        SampleDataGenerator(seed=7).write_all_to_dir(input_dir)
        self.input_dir = input_dir
        self.cfg = SeedBenchConfig()
        self.cfg.storage.data_dir = os.path.join(self.tmpdir, "data")
        self.batch_id = "e2e_batch_001"
        self.storage = FileSystemStorage(self.cfg.storage.data_dir)

    def test_full_pipeline(self):
        # 1) 读输入 + 去重 + 写入存储
        records = self.storage.read_input_files(self.input_dir, self.cfg.hash_algorithm)
        dedup = Deduplicator(self.cfg.hash_algorithm)
        dres = dedup.run(records)
        kept = dres["kept_records"]
        self.storage.save_records(self.batch_id, kept, version="v1")
        self.storage.save_dedup_results(self.batch_id, dres["results"])
        self.assertGreater(dres["summary"]["total_input"], 0)

        # 验证：去重后存储中的记录都是 UNASSIGNED
        stored_after_dedup = self.storage.load_records(self.batch_id)
        self.assertEqual(len(stored_after_dedup), len(kept))
        self.assertTrue(
            all(r.split_type == SplitType.UNASSIGNED for r in stored_after_dedup),
            "去重刚写入时 split_type 应该都是 UNASSIGNED",
        )

        # 2) 混洗 + 回写 split_type 到 records（模拟 CLI shuffle 行为）
        shuffle = Shuffler(seed=self.cfg.default_seed)
        sres = shuffle.run(stored_after_dedup, batch_id=self.batch_id)
        self.storage.save_shuffle_result(self.batch_id, sres)
        self.assertGreater(sres.train_count, 0)
        self.assertGreater(sres.val_count, 0)

        # 关键：回写 split_type 到 records.jsonl（模拟 CLI shuffle 命令）
        updates: dict[str, dict[str, Any]] = {}
        for rid in sres.record_ids_train:
            updates[rid] = {"split_type": SplitType.TRAIN}
        for rid in sres.record_ids_val:
            updates[rid] = {"split_type": SplitType.VAL}
        for rid in sres.record_ids_test:
            updates[rid] = {"split_type": SplitType.TEST}
        updated = self.storage.update_records_fields(
            self.batch_id, updates, source_version="v1", target_version="shuffle_seed42",
        )
        self.assertEqual(updated, len(stored_after_dedup),
                         "应该把所有记录的 split_type 都回写")

        # 验证：从存储重新读取，split_type 分布应与 shuffle_result 一致
        stored_after_shuffle = self.storage.load_records(self.batch_id)
        train_cnt = sum(1 for r in stored_after_shuffle if r.split_type == SplitType.TRAIN)
        val_cnt = sum(1 for r in stored_after_shuffle if r.split_type == SplitType.VAL)
        test_cnt = sum(1 for r in stored_after_shuffle if r.split_type == SplitType.TEST)
        self.assertEqual(train_cnt, sres.train_count,
                         "存储中 train 数应等于 shuffle_result.train_count")
        self.assertEqual(val_cnt, sres.val_count)
        self.assertEqual(test_cnt, sres.test_count)

        # 3) 泄漏检测：从存储读取 records（模拟 CLI leak-check 行为，不是直接用内存 kept）
        detector = LeakDetector(self.cfg.safety_rules)
        records_for_leak = self.storage.load_records(self.batch_id)
        lres = detector.run(records_for_leak, raise_on_leak=False)

        # 关键验证：能检测到故意注入的用户跨集泄漏（说明 split_type 被正确读取）
        self.assertIn("rule_forbid_user_cross", lres.leak_type or "",
                      "从存储读取带 split_type 的记录，应能检测到用户跨集泄漏")
        self.assertGreater(lres.leak_count, 0)

        # 4) 统一复核
        reviewer = Reviewer(self.cfg.review)
        review = reviewer.create_review(
            batch_id=self.batch_id,
            records=records_for_leak,
            safety_rules=detector._build_default_safety_rules(),
            safety_rule_violations=[],
            model_logs=[ModelLogEntry(module="pipeline", message="end-to-end run")],
            tool_params=ToolCallParams(
                command="pipeline", input_dir=self.input_dir,
                output_dir=self.cfg.storage.data_dir, seed=self.cfg.default_seed,
            ),
            leak_result=lres,
            dedup_summary={k: v for k, v in dres["summary"].items()},
            shuffle_summary=sres.to_summary_dict(),
            status=lres.status,
        )
        self.storage.save_review(self.batch_id, review)
        self.assertTrue(review.material_fingerprint)  # 指纹非空
        self.assertTrue(review.safety_rules)
        self.assertTrue(review.model_logs)
        self.assertIsNotNone(review.tool_params)

        # 5) 导出
        out_dir = os.path.join(self.tmpdir, "export")
        exp = Exporter(self.cfg.export.sync_summary_with_file)
        summary_records = exp.export_records(
            kept, os.path.join(out_dir, "records.csv"), "csv"
        )
        summary_shuffle = exp.export_shuffle(
            sres, os.path.join(out_dir, "shuffle.csv"), "csv"
        )
        summary_review = exp.export_review(
            review, os.path.join(out_dir, "review.json"), "json"
        )
        self.assertGreater(summary_records["record_count"], 0)
        self.assertEqual(summary_review["batch_id"], self.batch_id)


if __name__ == "__main__":
    unittest.main()
