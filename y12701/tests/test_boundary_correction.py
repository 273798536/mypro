import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from boundary_correction import (
    ParameterTable,
    BoundarySampleSet,
    BoundaryCorrectionEngine,
    ErrorAnalyzer,
    CorrectionStatus,
    SampleQuality,
)


def test_parameter_table():
    pt = ParameterTable.default()
    assert pt.material == "TC4钛合金"
    assert len(pt.segments) == 3
    assert pt.get_segment_at(1.0).seg_id == "S1"
    assert pt.get_segment_at(3.0).seg_id == "S2"
    assert pt.get_segment_at(7.0).seg_id == "S3"
    assert pt.boundary_points() == [0.0, 2.0, 5.0, 10.0]
    print("✓ ParameterTable tests passed")


def test_boundary_samples():
    sset = BoundarySampleSet.default()
    assert len(sset.samples) == 7
    assert len(sset.good_samples()) == 6
    conflicts = [s for s in sset.samples if s.quality == SampleQuality.CONFLICT]
    assert len(conflicts) >= 2
    at_2 = sset.at_boundary(2.0)
    assert len(at_2) >= 2
    missing = sset.missing_boundaries([0.0, 2.0, 5.0, 10.0])
    assert 5.0 in missing
    print("✓ BoundarySampleSet tests passed")


def test_correction_engine_basic():
    pt = ParameterTable.default()
    sset = BoundarySampleSet.default()
    engine = BoundaryCorrectionEngine(pt, sset)

    r0 = engine.correct_boundary(0.0)
    assert r0.status in (CorrectionStatus.OK, CorrectionStatus.REVIEW)
    assert r0.y_corrected is not None

    r2 = engine.correct_boundary(2.0)
    assert r2.status in (CorrectionStatus.REVIEW, CorrectionStatus.CONFLICT)
    assert len(r2.violations) > 0
    assert r2.delta is not None
    print("✓ BoundaryCorrectionEngine basic tests passed")


def test_correction_engine_missing_data():
    pt = ParameterTable.default()
    sset = BoundarySampleSet.default()
    engine = BoundaryCorrectionEngine(pt, sset)

    r5 = engine.correct_boundary(5.0)
    assert r5.status == CorrectionStatus.MISSING
    assert "需数据分析员补测" in r5.review_note

    all_results = engine.correct_all()
    statuses = [r.status for r in all_results]
    assert CorrectionStatus.MISSING in statuses
    assert CorrectionStatus.OK in statuses or CorrectionStatus.REVIEW in statuses

    missing = engine.missing_boundary_report()
    assert len(missing) >= 1
    print("✓ Missing data tolerance tests passed")


def test_correction_engine_conflict_changes_result():
    pt = ParameterTable.default()
    sset = BoundarySampleSet.default()
    engine = BoundaryCorrectionEngine(pt, sset)

    r_weighted = engine.correct_boundary(2.0, conflict_strategy="weighted")
    r_conservative = engine.correct_boundary(2.0, conflict_strategy="conservative")

    assert r_weighted.y_corrected is not None
    assert r_conservative.y_corrected is not None
    assert r_weighted.y_corrected != r_conservative.y_corrected, (
        "冲突策略不同时结果应不同"
    )
    print(f"    weighted={r_weighted.y_corrected:.6f} vs conservative={r_conservative.y_corrected:.6f}")
    print("✓ Conflict strategies change result tests passed")


def test_correction_engine_update_sample():
    pt = ParameterTable.default()
    sset = BoundarySampleSet.default()
    engine = BoundaryCorrectionEngine(pt, sset)

    r_before = engine.correct_boundary(2.0)
    r_after = engine.update_sample_and_recheck("SP002", 2.95)
    assert r_after is not None
    assert r_after.y_corrected is not None
    print(f"    before={r_before.y_corrected:.6f} after update={r_after.y_corrected:.6f}")
    print("✓ Sample update and recheck tests passed")


def test_error_analysis():
    pt = ParameterTable.default()
    sset = BoundarySampleSet.default()
    engine = BoundaryCorrectionEngine(pt, sset)

    analyzer = ErrorAnalyzer(engine)
    report = analyzer.analyze(conflict_strategy="weighted")

    assert len(report.metrics) == 4
    assert report.summary["total_boundaries"] == 4
    assert report.summary["conflict_count"] >= 1
    assert report.summary["review_count"] >= 1
    assert len(report.missing) >= 1

    improvements = [m.improvement for m in report.metrics if m.improvement is not None]
    assert len(improvements) > 0

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
        json_path = f.name
    try:
        report.to_json(json_path)
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "summary" in data
        assert "metrics" in data
        print(f"    report JSON saved and loaded OK ({os.path.getsize(json_path)} bytes)")
    finally:
        os.unlink(json_path)

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
        chart_path = f.name
    try:
        chart = analyzer.export_chart_data(chart_path)
        assert "curve_before" in chart
        assert "curve_after" in chart
        assert "boundary_points" in chart
        with open(chart_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert len(data["curve_before"]) == 101
        print(f"    chart JSON saved and loaded OK ({os.path.getsize(chart_path)} bytes)")
    finally:
        os.unlink(chart_path)

    print("✓ ErrorAnalyzer tests passed")


def test_cli_help():
    from boundary_correction.cli import build_parser
    parser = build_parser()
    help_text = parser.format_help()
    assert "分段函数边界批改" in help_text
    assert "run" in help_text
    assert "review" in help_text
    assert "check" in help_text
    assert "samples" in help_text
    print("✓ CLI parser tests passed")


def run_all_tests():
    print("分段函数边界批改 - 运行验证\n")
    test_parameter_table()
    test_boundary_samples()
    test_correction_engine_basic()
    test_correction_engine_missing_data()
    test_correction_engine_conflict_changes_result()
    test_correction_engine_update_sample()
    test_error_analysis()
    test_cli_help()
    print("\n全部测试通过 ✓")


if __name__ == "__main__":
    run_all_tests()
