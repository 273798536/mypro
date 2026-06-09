"""测试：覆盖重复运行、补录、人工确认三种场景。"""
from __future__ import annotations

import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

from shortest_path_inspector.pipeline import InspectionPipeline
from shortest_path_inspector.solver import compute_shortest_path
from shortest_path_inspector.models import GraphData, Edge


EXAMPLES_DIR = Path(__file__).parent.parent / "examples"


class TestSolverBasics(unittest.TestCase):
    """核心求解器的基本测试（含边界）。"""

    def test_empty_graph(self):
        g = GraphData(graph_id="empty", nodes=[], edges=[])
        r = compute_shortest_path(g)
        self.assertFalse(r.success)
        self.assertIn("空", r.error or "")

    def test_single_node_source_eq_target(self):
        g = GraphData(
            graph_id="single",
            nodes=["A"],
            edges=[],
            source="A",
            target="A",
        )
        r = compute_shortest_path(g)
        self.assertTrue(r.success)
        self.assertEqual(r.distance, 0.0)
        self.assertEqual(r.path, ["A"])

    def test_disconnected(self):
        g = GraphData(
            graph_id="disconn",
            nodes=["A", "B", "C", "D"],
            edges=[Edge("A", "B", 1), Edge("C", "D", 1)],
            source="A",
            target="D",
        )
        r = compute_shortest_path(g)
        self.assertFalse(r.success)
        self.assertIn("不存在", r.error or "")

    def test_campus_basic(self):
        with open(EXAMPLES_DIR / "basic" / "campus_route.json", encoding="utf-8") as f:
            g = GraphData.from_dict(json.load(f))
        r = compute_shortest_path(g)
        self.assertTrue(r.success)
        self.assertEqual(r.distance, 9.0)
        self.assertEqual(r.path, ["东门", "图书馆", "教学楼A", "食堂", "西门"])

    def test_typo_route_detects_error(self):
        with open(EXAMPLES_DIR / "error" / "typo_route.json", encoding="utf-8") as f:
            g = GraphData.from_dict(json.load(f))
        r = compute_shortest_path(g)
        self.assertTrue(r.success)
        # 正确距离是 5+2+2+4 = 13，不是 10.5
        self.assertEqual(r.distance, 13.0)
        self.assertNotEqual(r.distance, g.expected_distance)


class TestIdempotentRepeatRun(unittest.TestCase):
    """场景 1：重复运行不越跑越乱（幂等性）。"""

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.input_dir = self.tmpdir / "input"
        self.output_dir = self.tmpdir / "output"
        shutil.copytree(EXAMPLES_DIR / "basic", self.input_dir)
        os.makedirs(self.input_dir / "drafts", exist_ok=True)
        shutil.copy(
            EXAMPLES_DIR / "basic" / "drafts" / "campus_route_draft.json",
            self.input_dir / "drafts" / "campus_route_draft.json",
        )

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_twice_same_batch_id(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        r1 = pipe.run()
        r2 = pipe.run()
        self.assertEqual(r1.batch_id, r2.batch_id, "同输入应产生稳定 batch_id")

    def test_results_file_stable(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        pipe.run()
        p = self.output_dir / "results" / "campus_route.json"
        with open(p, encoding="utf-8") as f:
            before = f.read()
        pipe.run()
        with open(p, encoding="utf-8") as f:
            after = f.read()
        # 内容应除时间戳外基本一致；至少 graph_id 和计算结果相同
        self.assertIn('"graph_id": "campus_route"', after)
        self.assertIn('"distance": 9.0', after)

    def test_history_accumulates_not_overwrites(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        pipe.run()
        first = list((self.output_dir / "history").glob("*.json"))
        pipe.run()
        second = list((self.output_dir / "history").glob("*.json"))
        self.assertEqual(len(second), len(first) + 1, "每次运行都应归档一条历史记录")

    def test_history_comparison_shows_no_change(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        pipe.run()
        report = pipe.run()
        campus = report.results["campus_route"]
        hist_item = next((v for v in campus.validations if v.name == "历史对比"), None)
        self.assertIsNotNone(hist_item)
        self.assertTrue(hist_item.passed, "同输入重复跑，历史对比应一致")


class TestSupplementFlow(unittest.TestCase):
    """场景 2：草稿缺失后补录，再重跑。"""

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.input_dir = self.tmpdir / "input"
        self.output_dir = self.tmpdir / "output"
        shutil.copytree(EXAMPLES_DIR / "missing_draft", self.input_dir)

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_missing_draft_does_not_fail_batch(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        report = pipe.run()
        # 批次不整体失败，有计算结果
        self.assertEqual(report.total, 1)
        self.assertEqual(report.computed, 1)
        self.assertIn("no_draft_route", report.missing_draft_graphs)
        r = report.results["no_draft_route"]
        self.assertTrue(r.computation.success, "缺草稿也要先把能算的算完")
        self.assertEqual(r.computation.distance, 6.0)
        # 校验项里不应该出现"草稿一致性校验"通过（因为没草稿所以没有这项，或者不会影响）
        self.assertIn("no_draft_route", report.missing_draft_graphs)
        # missing_drafts.txt 应该生成
        self.assertTrue((self.output_dir / "missing_drafts.txt").exists())

    def test_supplement_draft_then_rerun(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        pipe.run()
        # 补录草稿
        drafts_dir = self.input_dir / "drafts"
        drafts_dir.mkdir(exist_ok=True)
        with open(drafts_dir / "no_draft_route_draft.json", "w", encoding="utf-8") as f:
            json.dump(
                {"distance": 6, "path": ["A", "B", "C", "D"]},
                f,
                ensure_ascii=False,
            )
        # 重跑
        report2 = pipe.run()
        self.assertNotIn(
            "no_draft_route",
            report2.missing_draft_graphs,
            "补录草稿后应从缺失清单移除",
        )
        r = report2.results["no_draft_route"]
        draft_item = next(
            (v for v in r.validations if v.name == "草稿一致性校验"), None
        )
        self.assertIsNotNone(draft_item)
        self.assertTrue(draft_item.passed, "补录正确草稿后应通过校验")


class TestManualConfirmation(unittest.TestCase):
    """场景 3：人工确认流程。"""

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.input_dir = self.tmpdir / "input"
        self.output_dir = self.tmpdir / "output"
        shutil.copytree(EXAMPLES_DIR / "error", self.input_dir)

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_typo_marks_needs_confirmation(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        report = pipe.run()
        self.assertIn("typo_route", report.needs_confirmation_graphs)
        self.assertTrue(report.results["typo_route"].needs_confirmation)
        # list 接口能返回
        pending = pipe.list_confirmations_needed()
        self.assertIn("typo_route", pending)

    def test_approve_and_reject(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        pipe.run()
        # 批准
        ok = pipe.confirm("typo_route", approved=True, operator="张老师", comment="确实是材料里手滑写错了")
        self.assertIsNotNone(ok)
        self.assertTrue(ok.confirmed)
        self.assertEqual(ok.confirmed_by, "张老师")
        self.assertIsNotNone(ok.confirmed_at)
        # 驳回
        rej = pipe.confirm("typo_route", approved=False, operator="李主任", comment="必须重算")
        self.assertIsNotNone(rej)
        self.assertFalse(rej.confirmed)
        self.assertEqual(rej.confirmed_by, "李主任")

    def test_confirm_nonexistent_graph(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        pipe.run()
        r = pipe.confirm("ghost", approved=True)
        self.assertIsNone(r, "对不存在的 graph_id 应返回 None")


class TestMixedBatch(unittest.TestCase):
    """混合批次：同时包含正常、边界、错误、缺草稿。"""

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.input_dir = self.tmpdir / "input"
        self.output_dir = self.tmpdir / "output"
        self.input_dir.mkdir()
        (self.input_dir / "drafts").mkdir()
        # 拷入各类样例
        shutil.copy(
            EXAMPLES_DIR / "basic" / "campus_route.json",
            self.input_dir / "campus_route.json",
        )
        shutil.copy(
            EXAMPLES_DIR / "basic" / "drafts" / "campus_route_draft.json",
            self.input_dir / "drafts" / "campus_route_draft.json",
        )
        shutil.copy(
            EXAMPLES_DIR / "boundary" / "empty_graph.json",
            self.input_dir / "empty_graph.json",
        )
        shutil.copy(
            EXAMPLES_DIR / "boundary" / "single_node.json",
            self.input_dir / "single_node.json",
        )
        shutil.copy(
            EXAMPLES_DIR / "boundary" / "disconnected_campus.json",
            self.input_dir / "disconnected_campus.json",
        )
        shutil.copy(
            EXAMPLES_DIR / "error" / "typo_route.json",
            self.input_dir / "typo_route.json",
        )
        shutil.copy(
            EXAMPLES_DIR / "missing_draft" / "no_draft_route.json",
            self.input_dir / "no_draft_route.json",
        )

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_all_boundaries_produce_different_results(self):
        pipe = InspectionPipeline(str(self.input_dir), str(self.output_dir))
        report = pipe.run()
        # 每个边界样例的计算结果都不同
        r_empty = report.results["empty_graph"].computation
        r_single = report.results["single_node"].computation
        r_disconn = report.results["disconnected_campus"].computation
        # empty: 失败
        self.assertFalse(r_empty.success)
        # single_node: 成功，距离 0
        self.assertTrue(r_single.success)
        self.assertEqual(r_single.distance, 0.0)
        # disconnected: 失败（不可达）
        self.assertFalse(r_disconn.success)
        self.assertIn("不存在", r_disconn.error or "")
        # 三个确实是不同结果
        self.assertNotEqual(r_empty.success, r_single.success)
        # 缺草稿的图仍计算出距离 6
        self.assertEqual(report.results["no_draft_route"].computation.distance, 6.0)
        # 误差样例被标记为待确认
        self.assertIn("typo_route", report.needs_confirmation_graphs)


if __name__ == "__main__":
    unittest.main()
