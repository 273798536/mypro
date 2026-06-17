# -*- coding: utf-8 -*-
"""训练任务成本分摊 —— 覆盖 重复运行 / 补录 / 人工确认 / 回滚保留 / 导出人话 的单测。

跑法（项目根目录）：
    python3 -m unittest tests.test_costalloc -v
"""
from __future__ import annotations

import csv
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from costalloc.allocator import allocate
from costalloc.loader import load_feedback, load_rules, load_tasks, validate_feedback
from costalloc.models import parse_hours, parse_money
from costalloc.report import export, truncate
from costalloc.state import State

ROOT = Path(__file__).resolve().parent.parent
TASKS_CSV = ROOT / "data" / "sample_tasks.csv"
RULES_CSV = ROOT / "data" / "allocation_rules.csv"
FEEDBACK_CSV = ROOT / "data" / "feedback.csv"


def _fresh_state() -> tuple[State, tempfile.TemporaryDirectory]:
    d = tempfile.TemporaryDirectory()
    st = State(Path(d.name) / "state.json")
    st.seed(TASKS_CSV, RULES_CSV, FEEDBACK_CSV)
    return st, d


def _alloc_by_id(run, task_id: str) -> dict:
    for a in run.result.get("allocations", []):
        if a.get("task_id") == task_id:
            return a
    raise AssertionError(f"找不到任务 {task_id}")


class TestTolerantParsing(unittest.TestCase):
    """样例里旧表/补录/漏填单位混在一起，解析必须足够宽容。"""

    def test_money_with_comma_and_currency(self):
        m = parse_money("1,234.5 美元")
        self.assertTrue(m.ok)
        self.assertEqual(m.amount, Decimal("1234.5"))
        self.assertEqual(m.currency, "USD")

    def test_money_missing_unit(self):
        # 漏填币种：金额能解析出来，但标记为需人工再看一眼
        m = parse_money("560.0")
        self.assertEqual(m.amount, Decimal("560.0"))
        self.assertIsNone(m.currency)
        self.assertFalse(m.ok)
        self.assertIn("没写币种", m.problem)

    def test_approx_wan_no_currency(self):
        # '约2.3万' 既估算是又没币种：金额解析出来，但标记需人工确认
        m = parse_money("约2.3万")
        self.assertEqual(m.amount, Decimal("23000"))
        self.assertIsNone(m.currency)
        self.assertFalse(m.ok)
        self.assertIn("约", m.problem)

    def test_hours(self):
        h = parse_hours("8h")
        self.assertTrue(h.ok)
        self.assertEqual(h.amount, Decimal("8"))


class TestSeedLoadsMessySample(unittest.TestCase):
    def test_loads_all_eleven_tasks(self):
        tasks = load_tasks(TASKS_CSV)
        by_id = {t.task_id: t for t in tasks}
        self.assertEqual(len(tasks), 11)
        self.assertEqual(by_id["T-1003"].cost, Decimal("1234.5"))
        self.assertEqual(by_id["T-1003"].currency, "USD")
        self.assertEqual(by_id["T-1006"].cost, Decimal("560.0"))
        self.assertEqual(by_id["T-1011"].status, "rolled_back")
        self.assertEqual(by_id["T-1012"].status, "rolled_back")

    def test_late_security_rules_flagged(self):
        rules = {r.rule_id: r for r in load_rules(RULES_CSV)}
        self.assertTrue(rules["R-02"].arrived_late)
        self.assertTrue(rules["R-06"].arrived_late)
        self.assertFalse(rules["R-01"].arrived_late)


class TestBeforeAfterJudgment(unittest.TestCase):
    """分布统计改变判断时，前后差别必须在结果里能看到。"""

    def setUp(self):
        self.st, self.dir = _fresh_state()
        self.run = self.st.run_allocate(note="ut")

    def tearDown(self):
        self.dir.cleanup()

    def test_t1001_changes_to_anomaly(self):
        a = _alloc_by_id(self.run, "T-1001")
        self.assertTrue(a["judgment_changed"])
        self.assertNotEqual(a["judgment_before"], a["judgment_after"])

    def test_t1009_changes_back_to_normal(self):
        a = _alloc_by_id(self.run, "T-1009")
        self.assertTrue(a["judgment_changed"])
        self.assertEqual(a["judgment_after"], "正常")

    def test_before_after_summary_records_them(self):
        joined = " ".join(self.run.result["before_after_summary"])
        self.assertIn("T-1001", joined)
        self.assertIn("T-1009", joined)


class TestRolledBackPreserved(unittest.TestCase):
    """版本回滚丢记录但不能直接丢掉：保留可查、不计入合计。"""

    def setUp(self):
        self.st, self.dir = _fresh_state()
        self.run = self.st.run_allocate(note="ut")

    def tearDown(self):
        self.dir.cleanup()

    def test_rolled_back_records_present(self):
        ids = {a["task_id"] for a in self.run.result["allocations"]}
        self.assertIn("T-1011", ids)
        self.assertIn("T-1012", ids)

    def test_rolled_back_flagged_and_excluded_from_totals(self):
        for a in self.run.result["allocations"]:
            if a["task_id"] in ("T-1011", "T-1012"):
                self.assertTrue(a["rolled_back_preserved"])
        for team, vals in self.run.result["team_totals"].items():
            self.assertGreater(Decimal(vals["cny"]), Decimal("0"))


class TestBadFeedback(unittest.TestCase):
    """人工反馈线里那条够真实的坏数据要被识别出来。"""

    def test_fb03_flagged_with_human_reason(self):
        tasks = load_tasks(TASKS_CSV)
        feedback = load_feedback(FEEDBACK_CSV)
        validate_feedback(feedback, tasks)
        bad = [r for r in feedback if r.fb_id == "FB-03"]
        self.assertEqual(len(bad), 1)
        self.assertFalse(bad[0].ok)
        problem = bad[0].problem or ""
        self.assertIn("约", problem)
        self.assertIn("找不到", problem)


class TestSupplementIdempotentAndEffect(unittest.TestCase):
    """补录：重复运行不重复计数，且对成本生效。"""

    def setUp(self):
        self.st, self.dir = _fresh_state()

    def tearDown(self):
        self.dir.cleanup()

    def test_supplement_dedups_by_task_value_remark(self):
        r1, created1 = self.st.add_supplement("T-1007", "8h", "CNY", "alice", "补录一轮8h")
        r2, created2 = self.st.add_supplement("T-1007", "8h", "CNY", "alice", "补录一轮8h")
        self.assertTrue(created1)
        self.assertFalse(created2)
        self.assertEqual(r1.fb_id, r2.fb_id)

    def test_supplement_changes_cost_and_is_counted_once(self):
        run_before = self.st.run_allocate(note="before")
        before = _alloc_by_id(run_before, "T-1007")["resolved_cost"]

        self.st.add_supplement("T-1007", "8h", "CNY", "alice", "补录一轮8h")
        run_after1 = self.st.run_allocate(note="after1")
        after1 = _alloc_by_id(run_after1, "T-1007")["resolved_cost"]
        run_after2 = self.st.run_allocate(note="after2")
        after2 = _alloc_by_id(run_after2, "T-1007")["resolved_cost"]

        self.assertGreater(Decimal(after1), Decimal(before))
        self.assertEqual(Decimal(after1), Decimal(after2))
        src = _alloc_by_id(run_after1, "T-1007")["sources_note"]
        self.assertIn("补录额外运行 8h", src)


class TestConfirmIdempotent(unittest.TestCase):
    """人工确认：按 任务+审核人 去重，重复确认不重复计数。"""

    def setUp(self):
        self.st, self.dir = _fresh_state()

    def tearDown(self):
        self.dir.cleanup()

    def test_confirm_dedups_by_task_reviewer(self):
        r1, c1 = self.st.add_confirm("T-1004", "bob", "ok", "", "", "核对无误")
        r2, c2 = self.st.add_confirm("T-1004", "bob", "ok", "", "", "核对无误")
        self.assertTrue(c1)
        self.assertFalse(c2)
        self.assertEqual(r1.fb_id, r2.fb_id)

    def test_confirm_marks_task_confirmed(self):
        self.st.add_confirm("T-1004", "bob", "ok", "", "", "核对无误")
        run = self.st.run_allocate(note="ut")
        a = _alloc_by_id(run, "T-1004")
        self.assertTrue(a["confirmed"])


class TestRepeatRunIdempotent(unittest.TestCase):
    """重复运行：数据没变时，两次分摊结果一致。"""

    def setUp(self):
        self.st, self.dir = _fresh_state()

    def tearDown(self):
        self.dir.cleanup()

    def test_two_runs_same_content(self):
        run1 = self.st.run_allocate(note="v1")
        run2 = self.st.run_allocate(note="v2")
        k = lambda a: (a["task_id"], a["resolved_cost"], a["judgment_after"],
                       a["sources_note"])
        self.assertEqual([k(a) for a in run1.result["allocations"]],
                         [k(a) for a in run2.result["allocations"]])
        self.assertEqual(run1.result["currency_totals"],
                         run2.result["currency_totals"])


class TestRollbackPreserves(unittest.TestCase):
    """回滚：版本标记为已回滚但保留，latest 回到上一版。"""

    def setUp(self):
        self.st, self.dir = _fresh_state()

    def tearDown(self):
        self.dir.cleanup()

    def test_rollback_keeps_record(self):
        run1 = self.st.run_allocate(note="v1")
        run2 = self.st.run_allocate(note="v2")
        self.st.rollback(run2.version)
        self.assertEqual(self.st.data["latest_version"], run1.version)
        rolled = {r.version for r in self.st.rolled_back_runs()}
        self.assertIn(run2.version, rolled)
        self.assertNotIn(run1.version, rolled)


class TestExportHumanReadable(unittest.TestCase):
    """导出要给不懂代码的人看：前后差别可见、长文本截断原因说人话。"""

    def setUp(self):
        self.st, self.dir = _fresh_state()
        self.run = self.st.run_allocate(note="ut")
        self.out = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.dir.cleanup()
        self.out.cleanup()

    def test_exports_both_files(self):
        paths = export(self.run, self.out.name, fmt="both")
        names = {p.name for p in paths}
        self.assertIn(f"分摊报告_v{self.run.version}.csv", names)
        self.assertIn(f"分摊报告_v{self.run.version}.txt", names)

    def test_txt_shows_before_after_and_human_truncation(self):
        paths = export(self.run, self.out.name, fmt="txt")
        txt = paths[0].read_text(encoding="utf-8")
        self.assertIn("调整前 → 调整后", txt)
        self.assertIn("T-1001", txt)
        self.assertIn("T-1009", txt)
        self.assertIn("备注比较长，这里只显示前 60 个字", txt)

    def test_csv_has_bom_and_human_headers_and_truncation_reason(self):
        paths = export(self.run, self.out.name, fmt="csv")
        raw = paths[0].read_bytes()
        self.assertTrue(raw.startswith(b"\xef\xbb\xbf"))
        text = raw.decode("utf-8-sig")
        rows = list(csv.reader(text.splitlines()))
        self.assertIn("截断原因", rows[0])
        self.assertIn("判断(调整前)", rows[0])
        self.assertIn("判断(调整后)", rows[0])
        t1009 = next(r for r in rows if r and r[0] == "T-1009")
        reason_col = rows[0].index("截断原因")
        self.assertNotEqual(t1009[reason_col].strip(), "")

    def test_truncate_reason_is_not_field_name(self):
        _, reason = truncate("x" * 200, 60)
        self.assertIsNotNone(reason)
        for token in ("remark", "REMARK", "字段", "field", "col"):
            self.assertNotIn(token, reason.lower())


class TestCLISmoke(unittest.TestCase):
    """端到端：通过命令行跑一遍 三件事（重复运行/补录/人工确认）。"""

    def test_cli_three_things(self):
        import sys
        from costalloc import cli

        with tempfile.TemporaryDirectory() as d:
            state_path = Path(d) / "state.json"
            out_dir = Path(d) / "out"
            orig = sys.argv

            def run(argv):
                sys.argv = ["main.py", "--state", str(state_path)] + argv
                try:
                    cli.main()
                finally:
                    sys.argv = orig

            run(["seed"])
            run(["allocate", "--note", "第一次"])
            run(["supplement", "--task-id", "T-1007", "--value", "8h",
                 "--unit", "CNY", "--reviewer", "alice", "--remark", "补录一轮8h"])
            run(["supplement", "--task-id", "T-1007", "--value", "8h",
                 "--unit", "CNY", "--reviewer", "alice", "--remark", "补录一轮8h"])
            run(["confirm", "--task-id", "T-1004", "--reviewer", "bob",
                 "--note", "核对无误"])
            run(["confirm", "--task-id", "T-1004", "--reviewer", "bob",
                 "--note", "核对无误"])
            run(["allocate", "--note", "第二次"])
            run(["export", "--version", "2", "--format", "both",
                 "--out", str(out_dir)])

            files = list(out_dir.glob("*"))
            self.assertTrue(any(f.suffix == ".csv" for f in files))
            self.assertTrue(any(f.suffix == ".txt" for f in files))

            st = State(state_path)
            runs = {r.version: r for r in st.list_runs()}
            self.assertIn(1, runs)
            self.assertIn(2, runs)


if __name__ == "__main__":
    unittest.main()
