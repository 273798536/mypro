import os
import json
import tempfile
import shutil
import unittest

from train_gatekeeper.core import (
    Sample,
    SampleSource,
    GateParams,
    GateEngine,
    GateDecision,
    StateManager,
    ReportGenerator,
    NoteType,
)


class TestGateParams(unittest.TestCase):
    def test_default_params_validate_pass(self):
        params = GateParams()
        errors = params.validate()
        self.assertEqual(len(errors), 0)

    def test_invalid_gray_ratio(self):
        params = GateParams(gray_ratio=1.5)
        errors = params.validate()
        self.assertTrue(any("gray_ratio" in e for e in errors))
        self.assertTrue(any("下一步" in e for e in errors))

    def test_invalid_gray_ratio_zero(self):
        params = GateParams(gray_ratio=0)
        errors = params.validate()
        self.assertTrue(any("gray_ratio" in e for e in errors))

    def test_pass_less_than_fail(self):
        params = GateParams(pass_threshold=0.5, fail_threshold=0.7)
        errors = params.validate()
        self.assertTrue(any("pass_threshold" in e for e in errors))

    def test_fingerprint_consistent(self):
        p1 = GateParams(gray_ratio=0.5, version="v1")
        p2 = GateParams(gray_ratio=0.5, version="v1")
        self.assertEqual(p1.fingerprint(), p2.fingerprint())

    def test_fingerprint_changes(self):
        p1 = GateParams(gray_ratio=0.5)
        p2 = GateParams(gray_ratio=0.6)
        self.assertNotEqual(p1.fingerprint(), p2.fingerprint())


class TestSample(unittest.TestCase):
    def test_is_correct_true(self):
        s = Sample(
            sample_id="s1",
            content="test",
            expected_label="A",
            predicted_label="A",
        )
        self.assertTrue(s.is_correct())

    def test_is_correct_false(self):
        s = Sample(
            sample_id="s1",
            content="test",
            expected_label="A",
            predicted_label="B",
        )
        self.assertFalse(s.is_correct())

    def test_is_correct_none(self):
        s = Sample(
            sample_id="s1",
            content="test",
            expected_label="A",
        )
        self.assertIsNone(s.is_correct())


def make_samples():
    samples = []
    for i in range(8):
        samples.append(Sample(
            sample_id=f"s{i:03d}",
            content=f"测试样本{i}",
            expected_label="positive",
            predicted_label="positive",
            score=0.9,
            source=SampleSource.CURRENT,
        ))
    samples.append(Sample(
        sample_id="old001",
        content="旧版失败样本",
        expected_label="positive",
        predicted_label="negative",
        score=0.4,
        source=SampleSource.OLD_QUEUE,
        version="old_v1",
    ))
    samples.append(Sample(
        sample_id="bound001",
        content="边界样本",
        expected_label="positive",
        predicted_label="negative",
        score=0.5,
        source=SampleSource.BOUNDARY,
        is_boundary=True,
    ))
    samples.append(Sample(
        sample_id="mis001",
        content="误判样本",
        expected_label="positive",
        predicted_label="positive",
        score=0.85,
        source=SampleSource.MISJUDGE,
        metadata={"old_predicted_label": "negative", "old_score": 0.45},
    ))
    return samples


class TestGateEngine(unittest.TestCase):
    def test_evaluate_pass(self):
        params = GateParams(pass_threshold=0.7, fail_threshold=0.5, min_total_samples=3)
        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)

        total = len(samples)
        correct = sum(1 for s in samples if s.is_correct())
        self.assertEqual(result.total_samples, total)
        self.assertEqual(result.correct_samples, correct)
        self.assertAlmostEqual(result.accuracy, correct / total)

    def test_evaluate_fail_due_to_threshold(self):
        params = GateParams(pass_threshold=0.99, fail_threshold=0.98, min_total_samples=3)
        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        self.assertEqual(result.decision, GateDecision.FAIL)

    def test_gray_ratio(self):
        params = GateParams(gray_ratio=0.5, min_total_samples=3, pass_threshold=0.8, fail_threshold=0.6)
        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        expected_count = max(1, int(len(samples) * 0.5))
        self.assertEqual(result.total_samples, expected_count)

    def test_min_samples_warning(self):
        params = GateParams(min_total_samples=100)
        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        self.assertEqual(result.decision, GateDecision.WARNING)
        self.assertTrue(any("样本数量不足" in s for s in result.next_steps))

    def test_attribution_has_factors(self):
        params = GateParams(min_total_samples=3)
        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        self.assertGreater(len(result.attributions), 0)
        factors = [a.factor for a in result.attributions]
        self.assertIn("old_queue", factors)
        self.assertIn("boundary", factors)
        self.assertIn("misjudge", factors)

    def test_misjudge_explanation(self):
        params = GateParams(min_total_samples=3)
        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        self.assertEqual(len(result.misjudge_explanations), 1)
        exp = result.misjudge_explanations[0]
        self.assertEqual(exp.sample_id, "mis001")
        self.assertTrue(exp.changed_correct)
        self.assertIn("改判原因", exp.reason)

    def test_param_errors_in_result(self):
        params = GateParams(gray_ratio=2.0)
        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        self.assertTrue(result.param_errors)
        self.assertEqual(result.decision, GateDecision.FAIL)
        self.assertTrue(any("下一步" in s for s in result.param_errors))
        self.assertGreater(len(result.next_steps), 0)

    def test_next_steps_not_empty(self):
        params = GateParams(min_total_samples=3)
        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        self.assertGreater(len(result.next_steps), 0)


class TestStateManager(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_initial_state(self):
        mgr = StateManager(self.tmpdir)
        state = mgr.load_state()
        self.assertIsNotNone(state.state_id)
        self.assertIsNone(state.current_result)
        self.assertEqual(len(state.param_history), 0)
        self.assertEqual(len(state.notes), 0)

    def test_update_params_creates_snapshot(self):
        mgr = StateManager(self.tmpdir)
        params = GateParams(gray_ratio=0.8)
        snapshot = mgr.update_params(params, reason="测试更新")
        self.assertEqual(snapshot.params.gray_ratio, 0.8)
        self.assertEqual(snapshot.reason, "测试更新")

        state = mgr.load_state()
        self.assertEqual(len(state.param_history), 1)
        self.assertEqual(state.current_params.gray_ratio, 0.8)

    def test_update_same_params_no_new_snapshot(self):
        mgr = StateManager(self.tmpdir)
        p1 = GateParams(gray_ratio=0.8)
        mgr.update_params(p1)
        p2 = GateParams(gray_ratio=0.8)
        mgr.update_params(p2)
        state = mgr.load_state()
        self.assertEqual(len(state.param_history), 1)

    def test_record_and_get_run(self):
        mgr = StateManager(self.tmpdir)
        from train_gatekeeper.core.models import EvalResult
        result = EvalResult()
        result.decision = GateDecision.PASS
        result.total_samples = 10
        result.accuracy = 0.9
        mgr.record_run(result)

        state = mgr.load_state()
        self.assertIsNotNone(state.current_result)
        self.assertEqual(state.current_result.run_id, result.run_id)

        fetched = mgr.get_run(result.run_id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.decision, GateDecision.PASS)

    def test_add_note(self):
        mgr = StateManager(self.tmpdir)
        note = mgr.add_note(
            content="测试备注",
            note_type=NoteType.VERBAL,
            author="tester",
            related_sample_ids=["s001"],
        )
        self.assertEqual(note.content, "测试备注")
        state = mgr.load_state()
        self.assertEqual(len(state.notes), 1)
        self.assertEqual(state.notes[0].author, "tester")

    def test_verify_consistency_clean(self):
        mgr = StateManager(self.tmpdir)
        result = mgr.verify_consistency()
        self.assertTrue(result["consistent"])

    def test_persistence_after_reload(self):
        mgr1 = StateManager(self.tmpdir)
        mgr1.update_params(GateParams(gray_ratio=0.5), reason="第一次")
        mgr1.add_note(content="备注1", author="a1")

        mgr2 = StateManager(self.tmpdir)
        state = mgr2.load_state()
        self.assertEqual(len(state.param_history), 1)
        self.assertEqual(state.current_params.gray_ratio, 0.5)
        self.assertEqual(len(state.notes), 1)
        self.assertEqual(state.notes[0].content, "备注1")

    def test_compare_params(self):
        mgr = StateManager(self.tmpdir)
        s1 = mgr.update_params(GateParams(gray_ratio=0.5, pass_threshold=0.8), reason="v1")
        s2 = mgr.update_params(GateParams(gray_ratio=0.6, pass_threshold=0.8), reason="v2")

        cmp = mgr.compare_params(s1.snapshot_id, s2.snapshot_id)
        self.assertTrue(cmp["found"])
        self.assertEqual(len(cmp["changes"]), 1)
        self.assertEqual(cmp["changes"][0]["param"], "gray_ratio")
        self.assertEqual(cmp["changes"][0]["old"], 0.5)
        self.assertEqual(cmp["changes"][0]["new"], 0.6)


class TestReportGenerator(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.data_dir = os.path.join(self.tmpdir, "data")
        os.makedirs(self.data_dir)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_generate_json_report(self):
        mgr = StateManager(self.data_dir)
        params = GateParams(gray_ratio=0.9)
        snapshot = mgr.update_params(params, reason="初始化")

        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        result.param_snapshot_id = snapshot.snapshot_id
        mgr.record_run(result)

        reporter = ReportGenerator(self.data_dir)
        state = mgr.load_state()
        path = reporter.generate_report(result, state, samples, format="json")

        self.assertTrue(os.path.exists(path))
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data["summary"]["decision"], result.decision.value)
        self.assertIn("param_changes", data)
        self.assertIn("attribution", data)
        self.assertIn("next_steps", data)
        self.assertIn("misjudge_explanations", data)

    def test_generate_txt_report(self):
        mgr = StateManager(self.data_dir)
        params = GateParams()
        snapshot = mgr.update_params(params)

        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        result.param_snapshot_id = snapshot.snapshot_id
        mgr.record_run(result)

        reporter = ReportGenerator(self.data_dir)
        state = mgr.load_state()
        path = reporter.generate_report(result, state, samples, format="txt")

        self.assertTrue(os.path.exists(path))
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("训练队列上线守门", content)
        self.assertIn("评测结论", content)
        self.assertIn("下一步操作", content)

    def test_generate_html_report(self):
        mgr = StateManager(self.data_dir)
        params = GateParams()
        snapshot = mgr.update_params(params)

        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        result.param_snapshot_id = snapshot.snapshot_id
        mgr.record_run(result)

        reporter = ReportGenerator(self.data_dir)
        state = mgr.load_state()
        path = reporter.generate_report(result, state, samples, format="html")

        self.assertTrue(os.path.exists(path))
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("<!DOCTYPE html>", content)
        self.assertIn("训练队列上线守门", content)

    def test_fail_samples_exported(self):
        mgr = StateManager(self.data_dir)
        params = GateParams(min_total_samples=3)
        snapshot = mgr.update_params(params)

        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        result.param_snapshot_id = snapshot.snapshot_id
        mgr.record_run(result)

        reporter = ReportGenerator(self.data_dir)
        state = mgr.load_state()
        reporter.generate_report(result, state, samples, format="json")

        fail_path = os.path.join(self.data_dir, "exceptions", "fail_samples.json")
        self.assertTrue(os.path.exists(fail_path))
        with open(fail_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertGreater(data["total_fail"], 0)

    def test_latest_report_symlink(self):
        mgr = StateManager(self.data_dir)
        params = GateParams()
        snapshot = mgr.update_params(params)

        engine = GateEngine(params)
        samples = make_samples()
        result = engine.evaluate(samples)
        result.param_snapshot_id = snapshot.snapshot_id
        mgr.record_run(result)

        reporter = ReportGenerator(self.data_dir)
        state = mgr.load_state()
        reporter.generate_report(result, state, samples, format="json")

        latest_path = os.path.join(self.data_dir, "exports", "latest_report.json")
        self.assertTrue(os.path.exists(latest_path))


if __name__ == "__main__":
    unittest.main()
