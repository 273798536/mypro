from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from prompt_impact import cli
from prompt_impact import diff as diff_mod
from prompt_impact import errors as E
from prompt_impact import parsing
from prompt_impact import report as report_mod
from prompt_impact import store as store_mod
from prompt_impact import trace as trace_mod
from prompt_impact.models import Finding, SourceRef


def _write(root, rel, content):
    p = Path(root) / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


def _j(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)


def _jl(rows):
    return "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n"


PROMPT_V1 = {
    "prompt_id": "math_solver",
    "version": "v1",
    "system": "s",
    "template": "t1",
    "created_at": "2026-04-01T00:00:00Z",
}
PROMPT_V2 = {
    "prompt_id": "math_solver",
    "version": "v2",
    "parent_version": "math_solver@v1",
    "changed_fields": ["template"],
    "system": "s",
    "template": "t2",
    "created_at": "2026-05-01T00:00:00Z",
}


def build_sample_materials(root, with_backfill_s200=False, s400_pass=False):
    _write(root, "prompts/math_solver/v1.json", _j(PROMPT_V1))
    _write(root, "prompts/math_solver/v2.json", _j(PROMPT_V2))
    _write(root, "model_logs/run_42.jsonl", _jl([
        {"run_id": "run_42", "prompt_version": "math_solver@v2", "sample_id": "s_100", "split": "train", "score": 1.0},
        {"run_id": "run_42", "prompt_version": "math_solver@v2", "sample_id": "s_101", "split": "train", "score": 0.9},
    ]))
    annots = [
        {"annotation_id": "ann_001", "sample_id": "s_100", "split": "train", "label": "correct", "batch": "b1"},
        {"annotation_id": "ann_002", "sample_id": "s_101", "split": "train", "label": "correct", "batch": "b1"},
    ]
    if with_backfill_s200:
        annots.append({"annotation_id": "ann_010", "sample_id": "s_200", "split": "train", "label": "correct", "batch": "b2"})
    _write(root, "annotations/batch_001.jsonl", _jl(annots))
    _write(root, "runs/eval_2026_04/meta.json", _j({
        "eval_run_id": "eval_2026_04", "prompt_version": "math_solver@v1", "dataset": "val", "train_run_id": "run_11",
    }))
    _write(root, "runs/eval_2026_04/results.jsonl", _jl([
        {"sample_id": "s_300", "score": 1.0, "label": "correct", "expected": "42", "got": "42"},
    ]))
    v2_results = [
        {"sample_id": "s_100", "score": 1.0, "label": "correct", "expected": "42", "got": "42"},
        {"sample_id": "s_101", "score": 1.0, "label": "correct", "expected": "3", "got": "3"},
        {"sample_id": "s_300", "score": 0.0, "label": "wrong", "expected": "42", "got": "4 2"},
        {"sample_id": "s_400", "score": 1.0 if s400_pass else None, "label": "correct" if s400_pass else "", "expected": "9", "got": "9" if s400_pass else ""},
    ]
    if with_backfill_s200:
        v2_results.append({"sample_id": "s_200", "score": 1.0, "label": "correct", "expected": "5", "got": "5"})
    _write(root, "runs/eval_2026_05/meta.json", _j({
        "eval_run_id": "eval_2026_05", "prompt_version": "math_solver@v2", "dataset": "val", "train_run_id": "run_42",
    }))
    _write(root, "runs/eval_2026_05/results.jsonl", _jl(v2_results))


class IdempotencyTests(unittest.TestCase):
    def test_rerun_produces_no_churn(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root)
            r1, s1, _ = cli._run_pipeline(root, out)
            r2, s2, _ = cli._run_pipeline(root, out)
            self.assertEqual(r2.summary["new_findings"], 0)
            self.assertEqual(r2.summary["changed_findings"], 0)
            self.assertEqual(r2.summary["resolved_findings"], 0)
            self.assertEqual(len(s2.findings), len(s1.findings))
            self.assertEqual(len(s2.history), len(s1.history))

    def test_finding_ids_stable_across_runs(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root)
            _, s1, _ = cli._run_pipeline(root, out)
            _, s2, _ = cli._run_pipeline(root, out)
            self.assertEqual(set(s1.findings.keys()), set(s2.findings.keys()))


class DedupAndBackfillTests(unittest.TestCase):
    def test_no_duplicate_conclusion_for_same_finding(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root)
            cli._run_pipeline(root, out)
            cli._run_pipeline(root, out)
            store = store_mod.Store.load(out)
            ids = [f.id for f in store.findings_list()]
            self.assertEqual(len(ids), len(set(ids)))
            result = diff_mod.diff(store, None)
            self.assertEqual(result.duplicate_conclusions, [])

    def test_backfill_adds_evidence_without_duplicate_conclusion(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root, with_backfill_s200=False)
            r1, s1, _ = cli._run_pipeline(root, out)
            leakage_ids_1 = [f.id for f in s1.findings_list() if f.kind == "training_validation_leakage"]
            build_sample_materials(root, with_backfill_s200=True)
            r2, s2, _ = cli._run_pipeline(root, out)
            leakage_ids_2 = [f.id for f in s2.findings_list() if f.kind == "training_validation_leakage"]
            self.assertTrue(set(leakage_ids_1).issubset(set(leakage_ids_2)))
            self.assertIn(r2.summary["new_findings"] >= 1, (True,))
            s100 = [f for f in s2.findings_list() if f.sample_key == "s_100" and f.kind == "training_validation_leakage"][0]
            ev_paths = {e.path for e in s100.evidence}
            self.assertIn("annotations/batch_001.jsonl", ev_paths)
            self.assertIn("runs/eval_2026_05/results.jsonl", ev_paths)
            for f in s2.findings_list():
                if f.kind == "training_validation_leakage" and f.sample_key == "s_100":
                    self.assertEqual(f.status, "fail")
            store = store_mod.Store.load(out)
            self.assertEqual(diff_mod.diff(store, None).duplicate_conclusions, [])


class TraceabilityTests(unittest.TestCase):
    def test_leakage_trace_reaches_sources_and_processing(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root)
            cli._run_pipeline(root, out)
            store = store_mod.Store.load(out)
            leakage = [f for f in store.findings_list() if f.kind == "training_validation_leakage"][0]
            rec = trace_mod.trace_for(store, leakage.id)
            self.assertIsNotNone(rec)
            self.assertTrue(rec.complete)
            paths = {s.path for s in rec.sources}
            self.assertIn("annotations/batch_001.jsonl", paths)
            self.assertIn("runs/eval_2026_05/results.jsonl", paths)
            self.assertTrue(any(p.step == "analyze" for p in rec.processing))

    def test_untraceable_leakage_produces_actionable_error(self):
        store = store_mod.Store.load(Path(tempfile.mkdtemp()))
        fid = "fnd_test_untraceable"
        store.findings[fid] = Finding(
            id=fid, kind="training_validation_leakage", status="fail", severity="blocker",
            prompt_version="p@v", eval_run_id="e", sample_key="s_x",
            summary="x", conclusion="x",
            evidence=[SourceRef(path="runs/eval_x/results.jsonl", line_start=1, material_key="mat_a")],
        )
        errs = trace_mod.detect_untraceable(store)
        self.assertEqual(len(errs), 1)
        self.assertEqual(errs[0].code, E.LEAKAGE_UNTRACEABLE)
        self.assertTrue(errs[0].remediation)


class ConsistencyTests(unittest.TestCase):
    def test_pending_does_not_become_pass(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root, s400_pass=False)
            report, _, _ = cli._run_pipeline(root, out)
            self.assertNotEqual(report.gate_decision, report_mod.GATE_PASS)
            self.assertIn(report.gate_decision, (report_mod.GATE_PENDING, report_mod.GATE_FAIL))
            md = report_mod.to_markdown(report)
            term = report_mod.to_terminal_summary(report)
            self.assertIn("待确认", md)
            self.assertIn("待确认", term)
            report_mod.assert_consistent(report, md, term)

    def test_export_matches_summary_gate(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root)
            report, _, _ = cli._run_pipeline(root, out)
            md = report_mod.to_markdown(report)
            term = report_mod.to_terminal_summary(report)
            gate_label = {"PASS": "通过 ✅", "PENDING": "待确认 ⚠", "FAIL": "不通过 ❌"}[report.gate_decision]
            self.assertIn(gate_label, md)
            self.assertIn(gate_label, term)
            report_mod.assert_consistent(report, md, term)

    def test_clean_scenario_gate_pass(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            _write(root, "prompts/p/v1.json", _j({"prompt_id": "p", "version": "v1", "template": "t"}))
            _write(root, "runs/e1/meta.json", _j({"eval_run_id": "e1", "prompt_version": "p@v1", "train_run_id": "r1"}))
            _write(root, "model_logs/r1.jsonl", _jl([{"run_id": "r1", "prompt_version": "p@v1", "sample_id": "s1", "split": "train"}]))
            _write(root, "runs/e1/results.jsonl", _jl([{"sample_id": "s9", "score": 1.0, "label": "correct"}]))
            report, _, _ = cli._run_pipeline(root, out)
            self.assertEqual(report.gate_decision, report_mod.GATE_PASS)


class ActionableErrorTests(unittest.TestCase):
    def test_missing_model_log_is_actionable(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            _write(root, "prompts/p/v1.json", _j({"prompt_id": "p", "version": "v1", "template": "t"}))
            _write(root, "runs/e1/meta.json", _j({"eval_run_id": "e1", "prompt_version": "p@v1", "train_run_id": "run_MISSING"}))
            _write(root, "runs/e1/results.jsonl", _jl([{"sample_id": "s1", "score": 1.0, "label": "correct"}]))
            parsed = parsing.parse_inputs(root, "now")
            codes = [e.code for e in parsed.errors]
            self.assertIn(E.MISSING_MODEL_LOG, codes)
            err = next(e for e in parsed.errors if e.code == E.MISSING_MODEL_LOG)
            self.assertEqual(err.missing_artifact, "model_logs/run_MISSING.jsonl")
            self.assertIn("run_MISSING", err.message)
            self.assertTrue(err.remediation)

    def test_missing_prompt_definition(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            _write(root, "model_logs/r1.jsonl", _jl([{"run_id": "r1", "prompt_version": "p@v9", "sample_id": "s1", "split": "train"}]))
            parsed = parsing.parse_inputs(root, "now")
            codes = [e.code for e in parsed.errors]
            self.assertIn(E.MISSING_PROMPT_DEFINITION, codes)

    def test_missing_eval_run(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            _write(root, "runs/e1/meta.json", _j({"eval_run_id": "e1", "prompt_version": "p@v1"}))
            parsed = parsing.parse_inputs(root, "now")
            codes = [e.code for e in parsed.errors]
            self.assertIn(E.MISSING_EVAL_RUN, codes)

    def test_unparseable_record(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            _write(root, "model_logs/r1.jsonl", "{not json}\n{\"run_id\":\"r1\",\"sample_id\":\"s1\",\"split\":\"train\"}\n")
            parsed = parsing.parse_inputs(root, "now")
            codes = [e.code for e in parsed.errors]
            self.assertIn(E.UNPARSEABLE_RECORD, codes)


class DetectionTests(unittest.TestCase):
    def test_leakage_and_regression_detected(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root)
            _, store, _ = cli._run_pipeline(root, out)
            kinds = [f.kind for f in store.findings_list()]
            self.assertIn("training_validation_leakage", kinds)
            self.assertIn("prompt_regression", kinds)
            blockers = [f for f in store.findings_list() if f.severity == "blocker"]
            self.assertTrue(all(f.kind == "training_validation_leakage" for f in blockers))


class DiffTests(unittest.TestCase):
    def test_diff_clean_against_self(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root)
            cli._run_pipeline(root, out)
            store = store_mod.Store.load(out)
            baseline = diff_mod.load_baseline_report(out)
            result = diff_mod.diff(store, baseline)
            self.assertEqual(result.verdict, "clean")
            self.assertEqual(result.added, [])
            self.assertEqual(result.changed, [])

    def test_diff_detects_changed_conclusion(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root, s400_pass=False)
            cli._run_pipeline(root, out)
            baseline = diff_mod.load_baseline_report(out)
            build_sample_materials(root, s400_pass=True)
            cli._run_pipeline(root, out)
            store = store_mod.Store.load(out)
            result = diff_mod.diff(store, baseline)
            self.assertEqual(result.verdict, "changed")
            self.assertTrue(len(result.changed) >= 1)


class CLIExitCodeTests(unittest.TestCase):
    def test_run_exit_nonzero_on_fail(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            build_sample_materials(root)
            rc = cli.main(["run", "--input", str(root), "--output", str(out)])
            self.assertEqual(rc, 1)

    def test_run_exit_zero_on_pass(self):
        with tempfile.TemporaryDirectory() as t:
            root, out = Path(t) / "in", Path(t) / "out"
            _write(root, "prompts/p/v1.json", _j({"prompt_id": "p", "version": "v1", "template": "t"}))
            _write(root, "runs/e1/meta.json", _j({"eval_run_id": "e1", "prompt_version": "p@v1", "train_run_id": "r1"}))
            _write(root, "model_logs/r1.jsonl", _jl([{"run_id": "r1", "prompt_version": "p@v1", "sample_id": "s1", "split": "train"}]))
            _write(root, "runs/e1/results.jsonl", _jl([{"sample_id": "s9", "score": 1.0, "label": "correct"}]))
            rc = cli.main(["run", "--input", str(root), "--output", str(out)])
            self.assertEqual(rc, 0)


if __name__ == "__main__":
    unittest.main()
