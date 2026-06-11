"""
快速验证脚本 - 用于检查各模块基本功能是否正常
不依赖完整数据生成流程
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.traceability import DataTracker, DataStatus, TrackedRecord
from src.tide_engine import TideCalculator
from src.risk_layer import RiskAssessor, RiskLevel


def test_traceability():
    print("[1/4] 测试数据追溯模块...")
    tracker = DataTracker()
    r1 = tracker.track_record(
        source_row=5,
        source_file="测试.xlsx",
        source_note="原件第2页",
        data_status=DataStatus.AVAILABLE,
    )
    r2 = tracker.track_record(
        source_row=8,
        source_file="测试.xlsx",
        source_note="原件第3页",
        data_status=DataStatus.RECOLLECT,
        issue_type="潮位时区错",
        issue_description="时区标记为UTC实为北京时间",
        next_action="请改口径，将时区修正为Asia/Shanghai",
    )
    assert len(tracker.to_dataframe()) == 2
    assert len(tracker.get_records_by_status(DataStatus.RECOLLECT)) == 1
    report = tracker.generate_review_report()
    assert "潮位时区错" in report
    assert "行5" in report
    brief = tracker.generate_fleet_brief()
    assert "直接可用" in brief
    print("  OK - 追溯模块通过")


def test_tide_engine():
    print("[2/4] 测试潮汐计算引擎...")
    import pandas as pd
    test_data = pd.DataFrame([
        {
            "source_row": 2,
            "station_id": "T001",
            "station_name": "测试站",
            "obs_time_str": "2024-06-15 02:30",
            "reported_timezone": "Asia/Shanghai",
            "tide_level_cm": 250,
            "is_high_tide": 1,
            "source_file": "test.xlsx",
            "source_note": "测试备注1",
        },
        {
            "source_row": 3,
            "station_id": "T001",
            "station_name": "测试站",
            "obs_time_str": "2024-06-15 08:45",
            "reported_timezone": "Asia/Shanghai",
            "tide_level_cm": 60,
            "is_high_tide": 0,
            "source_file": "test.xlsx",
            "source_note": "测试备注2",
        },
        {
            "source_row": 4,
            "station_id": "T001",
            "station_name": "测试站",
            "obs_time_str": "2024-06-15 18:20",
            "reported_timezone": "UTC",
            "tide_level_cm": 220,
            "is_high_tide": 1,
            "source_file": "test.xlsx",
            "source_note": "测试时区异常 - 实为北京时间 2024-06-16 02:20（高潮典型时段）",
        },
    ])
    calc = TideCalculator()
    recs = calc.process_tide_table(test_data)
    assert len(recs) == 3
    tracker = calc.get_tracker()
    recollect = tracker.get_records_by_status(DataStatus.RECOLLECT)
    assert len(recollect) >= 1, f"应检测到至少1条时区异常，实际 {len(recollect)}"
    df = calc.get_dataframe()
    assert "obs_time_utc" in df.columns
    assert "obs_time_local" in df.columns
    print("  OK - 潮汐引擎通过（时区异常检测有效）")


def test_risk_assessor():
    print("[3/4] 测试风险分层系统...")
    import pandas as pd
    from datetime import datetime

    calc = TideCalculator()
    tide_data = pd.DataFrame([
        {"source_row": 2, "station_id": "T001", "station_name": "东港一号站",
         "obs_time_str": "2024-06-15 02:30", "reported_timezone": "Asia/Shanghai",
         "tide_level_cm": 260, "is_high_tide": 1,
         "source_file": "t.xlsx", "source_note": "t1"},
        {"source_row": 3, "station_id": "T001", "station_name": "东港一号站",
         "obs_time_str": "2024-06-15 08:45", "reported_timezone": "Asia/Shanghai",
         "tide_level_cm": 55, "is_high_tide": 0,
         "source_file": "t.xlsx", "source_note": "t2"},
    ])
    calc.process_tide_table(tide_data)

    ship_data = pd.DataFrame([
        {"source_row": 2, "ship_id": "S001", "ship_name": "测试船",
         "record_time": "2024-06-15 08:30",
         "longitude": 121.955, "latitude": 29.290,
         "speed_kn": 5.0, "heading_deg": 90, "water_depth_m": 3.0,
         "source_file": "ais.csv", "source_note": "测试"},
    ])
    assessor = RiskAssessor(calc)
    results = assessor.assess_trajectory(ship_data)
    assert len(results) == 1
    assert results[0].risk_level in list(RiskLevel)
    assert results[0].suggestion is not None
    df = assessor.get_dataframe()
    assert "risk_level" in df.columns
    assert "suggestion" in df.columns
    print("  OK - 风险分层通过")


def test_visualizer():
    print("[4/4] 测试可视化模块...")
    import pandas as pd
    from src.visualization import TideVisualizer
    import tempfile

    calc = TideCalculator()
    tide_data = pd.DataFrame([
        {"source_row": 2, "station_id": "T001", "station_name": "东港一号站",
         "obs_time_str": "2024-06-15 02:30", "reported_timezone": "Asia/Shanghai",
         "tide_level_cm": 260, "is_high_tide": 1,
         "source_file": "t.xlsx", "source_note": "t1"},
        {"source_row": 3, "station_id": "T001", "station_name": "东港一号站",
         "obs_time_str": "2024-06-15 08:45", "reported_timezone": "Asia/Shanghai",
         "tide_level_cm": 55, "is_high_tide": 0,
         "source_file": "t.xlsx", "source_note": "t2"},
    ])
    calc.process_tide_table(tide_data)

    ship_data = pd.DataFrame([
        {"source_row": 2, "ship_id": "S001", "ship_name": "测试船",
         "record_time": "2024-06-15 08:30",
         "longitude": 121.955, "latitude": 29.290,
         "speed_kn": 5.0, "heading_deg": 90, "water_depth_m": 3.0,
         "source_file": "ais.csv", "source_note": "测试"},
    ])
    assessor = RiskAssessor(calc)
    assessor.assess_trajectory(ship_data)

    with tempfile.TemporaryDirectory() as tmpdir:
        viz = TideVisualizer(tmpdir)
        r1 = viz.plot_tide_curve(calc)
        assert os.path.exists(r1["path"])
        r2 = viz.plot_data_status_pie(calc.get_tracker())
        assert os.path.exists(r2["path"])
        r3 = viz.plot_risk_distribution(assessor)
        assert os.path.exists(r3["path"])
        r4 = viz.create_risk_map(assessor, calc)
        assert os.path.exists(r4["path"])
        report_path = viz.generate_summary_text(calc.get_tracker(), assessor)
        assert os.path.exists(report_path)
    print("  OK - 可视化模块通过")


if __name__ == "__main__":
    print("=" * 60)
    print("  潮汐赶海安全助手 - 模块快速自检")
    print("=" * 60)
    try:
        test_traceability()
        test_tide_engine()
        test_risk_assessor()
        test_visualizer()
        print("=" * 60)
        print("  全部自检通过！")
        print("=" * 60)
    except Exception as e:
        print(f"\n 自检失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
