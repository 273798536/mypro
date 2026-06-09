import math
import tempfile
from pathlib import Path

import pytest

from geo_projection_check import (
    ChartDiff,
    MaterialLoader,
    ProjectionChecker,
    ReportGenerator,
)
from geo_projection_check.models import (
    ChartSnapshot,
    ProjectionParams,
    ProjectionType,
    QuestionItem,
    ScoreRecord,
    Severity,
)


def test_params_validation():
    p = ProjectionParams(projection_type=ProjectionType.PERSPECTIVE)
    problems = p.validate()
    assert any("focal_length" in pr for pr in problems)

    p2 = ProjectionParams(scale_factor=-1)
    assert any("scale_factor" in pr for pr in p2.validate())


def test_question_and_score_roundtrip():
    q = QuestionItem(item_id="T1", content="test", expected_projection=(1.0, 2.0))
    assert q.item_id == "T1"


def test_loader_csv_io():
    with tempfile.TemporaryDirectory() as d:
        base = Path(d)
        params_yaml = base / "params.yaml"
        params_yaml.write_text(
            "projection_type: orthographic\ntolerance_px: 2.0\n"
        )
        questions_csv = base / "q.csv"
        questions_csv.write_text(
            "item_id,content,expected,legacy_note\n"
            "Q1,Test Q1,\"(10,20\",旧备注\n"
            "Q2,Test Q2,,\n"
        )
        scores_csv = base / "s.csv"
        scores_csv.write_text(
            "item_id,scorer,projected,score\n"
            "Q1,张三,\"(10.1,20.2)\",0.9\n"
            "Q1,李四,\"(11,22)\",0.5\n"
        )
        loader = MaterialLoader()
        bundle = loader.load_bundle(
            params_path=params_yaml,
            questions_path=questions_csv,
            scores_path=scores_csv,
            allow_empty=False,
        )
        assert bundle.params is not None
        assert len(bundle.questions) == 2
        assert len(bundle.scores) == 2
        # noinspection PyUnresolvedReferences
        assert bundle.questions[0].legacy_note == "旧备注"


def test_projection_checker_partial_success():
    loader = MaterialLoader()
    bundle = loader.load_bundle(label="t")
    bundle.questions = [
        QuestionItem(item_id="A", content="边界样例", legacy_note="边界", expected_projection=(0.0, 0.0)),
        QuestionItem(item_id="B", content="normal", expected_projection=(10.0, 10.0)),
        QuestionItem(item_id="C", content="占位", is_placeholder=True),
    ]
    bundle.scores = [
        ScoreRecord(item_id="B", scorer="x", projected_point=(10.5, 10.0), score=0.9),
    ]
    bundle.params = ProjectionParams(tolerance_px=1.0)
    checker = ProjectionChecker(partial_success=True)
    result = checker.run(bundle)
    # A 是边界缺口，被记为缺口；B 正常；C 无评分但被标记为占位，不应为缺口
    assert "A" in result.boundary_gaps
    assert "C" not in result.boundary_gaps
    assert any(e.item_id == "B" for e in result.errors)


def test_chart_diff():
    a = ChartSnapshot(name="before", points={"Q1": (0.0, 0.0), "Q2": (1.0, 1.0)})
    b = ChartSnapshot(name="after", points={"Q1": (0.0, 0.0), "Q2": (2.0, 1.0), "Q3": (5.0, 5.0)})
    cmp = ChartDiff.compare(a, b)
    assert cmp["compared"]
    assert "Q3" in cmp["added_keys"]
    assert "Q2" in cmp["common_keys"]
    delta = ChartDiff.delta_for_item(cmp, "Q2")
    assert delta is not None
    assert abs(delta[0] - 1.0) < 1e-6


def test_conflict_detection_scores_disagree():
    loader = MaterialLoader()
    bundle = loader.load_bundle(label="t")
    bundle.questions = [
        QuestionItem(item_id="X", content="t", expected_projection=(100.0, 100.0)),
    ]
    bundle.scores = [
        ScoreRecord(item_id="X", scorer="A", projected_point=(100.0, 100.0), score=0.95),
        ScoreRecord(item_id="X", scorer="B", projected_point=(115.0, 100.0), score=0.9),
    ]
    bundle.params = ProjectionParams()
    checker = ProjectionChecker()
    result = checker.run(bundle)
    # 两评分员给出差 15px > 10px 阈值 -> 冲突
    assert any(c.item_ids and c.item_ids[0] == "X" for c in result.conflicts)


def test_report_generators():
    loader = MaterialLoader()
    bundle = loader.load_bundle(label="demo")
    bundle.questions = [QuestionItem(item_id="Q", content="demo", expected_projection=(0, 0))]
    bundle.scores = [ScoreRecord(item_id="Q", scorer="x", projected_point=(0.5, 0.0), score=0.9)]
    bundle.params = ProjectionParams(tolerance_px=1.0)
    result = ProjectionChecker().run(bundle)
    summary = ReportGenerator.terminal_summary(result)
    assert "几何投影误差校验" in summary
    md = ReportGenerator.committee_report(result)
    assert "# 几何投影误差校验" in md
    j = ReportGenerator.to_json(result)
    assert j["summary"]["total_errors"] == 1


if __name__ == "__main__":
    test_params_validation()
    test_question_and_score_roundtrip()
    test_loader_csv_io()
    test_projection_checker_partial_success()
    test_chart_diff()
    test_conflict_detection_scores_disagree()
    test_report_generators()
    print("All tests passed.")
