import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
import pandas as pd
import numpy as np
from src.power_calc import (
    sample_size_proportion,
    power_proportion,
    sample_size_mean,
    power_mean,
    cohen_h,
    cohen_d,
)
from src.data_processor import (
    parse_student_dataframe,
    process_records,
    stable_sort_records,
    records_to_dataframe,
)
from src.exporter import (
    REPRODUCIBLE_EXAMPLES,
    get_examples_dataframe,
    build_narration_text,
    build_text_narration,
    export_to_excel,
    plot_summary_power_curves,
    make_run_label,
)
from src.history import (
    save_run_history,
    load_run_history,
    find_history_for_question,
    update_editor_note,
)


class TestPowerCalc(unittest.TestCase):
    def test_proportion_basic(self):
        r = sample_size_proportion(p1=0.5, p2=0.6, alpha=0.05, power=0.8)
        self.assertIsNotNone(r.sample_size)
        self.assertTrue(np.isfinite(r.sample_size))
        self.assertGreater(r.sample_size, 0)
        self.assertAlmostEqual(r.power, 0.8)
        self.assertEqual(r.test_type, "proportion")
        self.assertTrue(r.notes)

    def test_mean_basic(self):
        r = sample_size_mean(delta=0.5, sd=1.0, alpha=0.05, power=0.8)
        self.assertTrue(np.isfinite(r.sample_size))
        self.assertGreater(r.sample_size, 0)

    def test_power_proportion(self):
        r = power_proportion(p1=0.5, p2=0.7, n1=50, n2=50)
        self.assertIsNotNone(r.power)
        self.assertGreaterEqual(r.power, 0.0)
        self.assertLessEqual(r.power, 1.0)

    def test_power_mean(self):
        r = power_mean(delta=0.5, sd=1.0, n1=50)
        self.assertGreaterEqual(r.power, 0.0)
        self.assertLessEqual(r.power, 1.0)

    def test_extrapolation_p2_too_low(self):
        r = sample_size_proportion(p1=0.5, p2=0.00001)
        self.assertTrue(any("越界" in w for w in r.warnings))

    def test_equal_proportions_warning(self):
        r = sample_size_proportion(p1=0.5, p2=0.5)
        self.assertTrue(any("相等" in w or "发散" in w or "无穷" in w for w in r.warnings))

    def test_cohen_h(self):
        h = cohen_h(0.5, 0.5)
        self.assertAlmostEqual(h, 0.0)
        h2 = cohen_h(0.3, 0.7)
        self.assertNotEqual(h2, 0.0)

    def test_cohen_d_zero_sd(self):
        d = cohen_d(1.0, 0.0, 0.0)
        self.assertEqual(d, 0.0)

    def test_invalid_alpha_raises(self):
        with self.assertRaises(ValueError):
            sample_size_proportion(0.5, 0.6, alpha=1.5)


class TestDataProcessor(unittest.TestCase):
    def _make_df(self):
        return pd.DataFrame([
            {"record_id": "A", "student_id": "S1", "question_id": "Q1",
             "test_type": "proportion", "p1": 0.5, "p2": 0.6, "sort_key": 2},
            {"record_id": "B", "student_id": "S2", "question_id": "Q2",
             "test_type": "proportion", "p1": 0.5, "p2": 0.0001, "sort_key": 1},
            {"record_id": "C", "student_id": "S3", "question_id": "Q3",
             "test_type": "mean", "delta": 0.5, "sd": 1.0, "sort_key": 3},
        ])

    def test_parse_and_process(self):
        df = self._make_df()
        records, gaps = parse_student_dataframe(df)
        self.assertEqual(len(records), 3)
        self.assertEqual(len(gaps), 0)
        records = process_records(records)
        self.assertTrue(all(r.status in ("success", "warning") for r in records))

    def test_sort_stability(self):
        df = self._make_df()
        records, _ = parse_student_dataframe(df)
        records = process_records(records)
        for _ in range(5):
            sorted_recs = stable_sort_records(list(records))
            ids = [r.record_id for r in sorted_recs]
            self.assertEqual(ids, ["B", "A", "C"])

    def test_missing_data_does_not_batch_fail(self):
        df = pd.DataFrame([
            {"record_id": "OK", "student_id": "S1", "question_id": "Q1",
             "test_type": "proportion", "p1": 0.5, "p2": 0.6},
            {"record_id": "BAD1", "student_id": "S2", "question_id": "Q2",
             "test_type": "proportion", "p1": None, "p2": 0.6},
            {"record_id": "BAD2", "student_id": "S3", "question_id": "Q3",
             "test_type": "mean", "delta": 0.5},
            {"record_id": "OK2", "student_id": "S4", "question_id": "Q4",
             "test_type": "mean", "delta": 0.5, "sd": 2.0},
        ])
        records, gaps = parse_student_dataframe(df)
        self.assertEqual(len(gaps), 2)
        records = process_records(records)
        statuses = {r.record_id: r.status for r in records}
        self.assertEqual(statuses["OK"], "success")
        self.assertEqual(statuses["OK2"], "success")
        self.assertEqual(statuses["BAD1"], "missing_data")
        self.assertEqual(statuses["BAD2"], "missing_data")

    def test_extrapolation_flag(self):
        df = pd.DataFrame([
            {"record_id": "E1", "student_id": "S1", "question_id": "Q1",
             "test_type": "proportion", "p1": 0.5, "p2": 0.00001},
        ])
        records, _ = parse_student_dataframe(df)
        records = process_records(records)
        self.assertTrue(records[0].extrapolation_warning)
        self.assertIn("p2", records[0].extrapolation_warning)

    def test_records_to_dataframe(self):
        df = self._make_df()
        records, _ = parse_student_dataframe(df)
        records = process_records(records)
        out = records_to_dataframe(records)
        self.assertEqual(len(out), 3)
        self.assertIn("sample_size_n1", out.columns)
        self.assertIn("power", out.columns)


class TestExporter(unittest.TestCase):
    def _make_records(self):
        df = pd.DataFrame([
            {"record_id": "A", "student_id": "S1", "question_id": "Q1",
             "test_type": "proportion", "p1": 0.5, "p2": 0.6},
            {"record_id": "B", "student_id": "S2", "question_id": "Q2",
             "test_type": "proportion", "p1": 0.5, "p2": 0.0001},
            {"record_id": "C", "student_id": "S3", "question_id": "Q3",
             "test_type": "proportion", "p1": None, "p2": 0.6},
        ])
        records, gaps = parse_student_dataframe(df)
        records = process_records(records)
        return records, gaps

    def test_narration_coverage(self):
        records, gaps = self._make_records()
        narration = build_narration_text(records, gaps)
        self.assertIn("S1", narration)
        self.assertIn("Q2", narration)
        self.assertIn("待补充数据", narration)
        self.assertIn("外推越界", narration)

    def test_text_and_result_consistency(self):
        records, _ = self._make_records()
        r = records[0]
        text = build_text_narration(r)
        if r.result and r.result.n1 is not None:
            self.assertIn(f"{int(np.ceil(r.result.n1))}", text)

    def test_plot_and_export(self):
        records, gaps = self._make_records()
        figs = plot_summary_power_curves(records)
        self.assertGreater(len(figs), 0)
        narration = build_narration_text(records, gaps)
        excel_bytes = export_to_excel(records, gaps, narration, figs)
        self.assertGreater(len(excel_bytes), 100)

    def test_examples_dataframe(self):
        df = get_examples_dataframe()
        self.assertEqual(len(df), len(REPRODUCIBLE_EXAMPLES))
        self.assertIn("example_id", df.columns)

    def test_run_label_distinct(self):
        a = make_run_label()
        b = make_run_label()
        self.assertNotEqual(a, b)
        self.assertRegex(a, r"^\d{8}_\d{6}_[0-9a-f]+$")


class TestHistory(unittest.TestCase):
    def _make_records(self):
        df = pd.DataFrame([
            {"record_id": "H1", "student_id": "SH1", "question_id": "QHIST",
             "test_type": "proportion", "p1": 0.5, "p2": 0.65},
        ])
        records, _ = parse_student_dataframe(df)
        return process_records(records)

    def test_save_and_load(self):
        records = self._make_records()
        label = make_run_label()
        path = save_run_history(label, records)
        self.assertTrue(os.path.exists(path))
        loaded = load_run_history(label)
        self.assertEqual(len(loaded), 1)
        self.assertEqual(loaded[0].question_id, "QHIST")

    def test_find_history(self):
        records = self._make_records()
        label = make_run_label()
        save_run_history(label, records)
        hist = find_history_for_question("QHIST", "SH1")
        self.assertGreaterEqual(len(hist), 1)

    def test_update_note(self):
        records = self._make_records()
        label = make_run_label()
        save_run_history(label, records)
        ok = update_editor_note(label, "QHIST_SH1", "需要补充样本量计算过程", "approved")
        self.assertTrue(ok)
        loaded = load_run_history(label)
        self.assertEqual(loaded[0].editor_note, "需要补充样本量计算过程")
        self.assertEqual(loaded[0].resolution, "approved")


if __name__ == "__main__":
    unittest.main(verbosity=2)
