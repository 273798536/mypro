"""
潮汐赶海安全助手 - 主流程脚本

可复现样例流程：
1. 生成模拟数据（潮汐表含时区异常、船舶轨迹）
2. 潮汐计算引擎处理：时区标准化、异常检测、数据追溯
3. 风险分层评估：结合潮位、水深、航速、数据质量
4. 可视化输出：图表+地图+文字报告，三者数据完全对应
5. 导出CSV表格 + 综合报告

运行方式：
    cd /Users/mac/pro/solo/workspaces/y12850
    python3 run_pipeline.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data.mock_data_generator import generate_tide_table, generate_ship_trajectory
from src.traceability import DataTracker
from src.tide_engine import TideCalculator
from src.risk_layer import RiskAssessor
from src.visualization import TideVisualizer


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    output_dir = os.path.join(base_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 70)
    print("  潮汐赶海安全助手 - 可复现样例运行")
    print("=" * 70)

    # ========== Step 1: 生成模拟数据 ==========
    print("\n[Step 1/5] 生成模拟数据...")
    tide_csv = os.path.join(data_dir, "tide_table_sample.csv")
    ship_csv = os.path.join(data_dir, "ship_trajectory_sample.csv")

    if not (os.path.exists(tide_csv) and os.path.exists(ship_csv)):
        generate_tide_table(tide_csv)
        generate_ship_trajectory(ship_csv)
    else:
        print(f"  复用已有数据文件: {tide_csv}, {ship_csv}")

    import pandas as pd
    df_tide_raw = pd.read_csv(tide_csv)
    df_ship = pd.read_csv(ship_csv)
    print(f"  潮汐表: {len(df_tide_raw)} 条, 船舶轨迹: {len(df_ship)} 条")
    tz_errors = df_tide_raw[df_tide_raw["has_timezone_error"] == 1]
    print(f"  其中含预设时区异常 {len(tz_errors)} 条（用于验证检测能力）")

    # ========== Step 2: 潮汐计算与异常检测 ==========
    print("\n[Step 2/5] 潮汐计算引擎处理（时区标准化+异常检测）...")
    tracker = DataTracker()
    tide_calc = TideCalculator(tracker=tracker)
    tide_records = tide_calc.process_tide_table(df_tide_raw)
    df_tide = tide_calc.get_dataframe()
    print(f"  处理完成，输出 {len(df_tide)} 条标准化潮汐记录")
    detected = tracker.get_records_by_status(tracker.get_records_by_status.__class__.__mro__[0].__subclasses__()[0]) if False else None
    from src.traceability import DataStatus
    recollect = tracker.get_records_by_status(DataStatus.RECOLLECT)
    pending = tracker.get_records_by_status(DataStatus.PENDING)
    available = tracker.get_records_by_status(DataStatus.AVAILABLE)
    print(f"    可用: {len(available)}, 暂缓: {len(pending)}, 需重新采集: {len(recollect)}")

    # ========== Step 3: 风险分层评估 ==========
    print("\n[Step 3/5] 风险分层评估（潮位+水深+航速+数据质量）...")
    risk_tracker = DataTracker()
    assessor = RiskAssessor(tide_calc, tracker=risk_tracker)
    risk_results = assessor.assess_trajectory(df_ship)
    df_risk = assessor.get_dataframe()
    print(f"  评估完成，共 {len(df_risk)} 条轨迹点")
    summary = assessor.summary()
    for lvl, cnt in summary["counts"].items():
        if cnt > 0:
            print(f"    [{lvl}] {cnt} 条")

    # ========== Step 4: 导出数据表格 ==========
    print("\n[Step 4/5] 导出数据表格...")
    df_tide_out = os.path.join(output_dir, "tide_processed.csv")
    df_risk_out = os.path.join(output_dir, "risk_results.csv")
    df_track_out = os.path.join(output_dir, "tracking_records.csv")

    df_tide.to_csv(df_tide_out, index=False, encoding="utf-8-sig")
    df_risk.to_csv(df_risk_out, index=False, encoding="utf-8-sig")
    tracker.to_dataframe().to_csv(df_track_out, index=False, encoding="utf-8-sig")
    print(f"  {df_tide_out}")
    print(f"  {df_risk_out}")
    print(f"  {df_track_out}")

    # ========== Step 5: 可视化输出 ==========
    print("\n[Step 5/5] 生成可视化图表与地图...")
    viz = TideVisualizer(output_dir)

    r1 = viz.plot_tide_curve(tide_calc, "tide_curve.png")
    print(f"  潮位曲线: {r1['path']} (异常 {r1.get('abnormal_count', 0)} 条)")

    r2 = viz.plot_data_status_pie(tracker, "data_status_pie.png")
    print(f"  数据状态饼图: {r2['path']}")

    r3 = viz.plot_risk_distribution(assessor, "risk_distribution.png")
    print(f"  风险分层柱状图: {r3['path']}")

    r4 = viz.plot_risk_timeline(assessor, "risk_timeline.png")
    print(f"  风险时间线: {r4['path']}")

    r5 = viz.create_risk_map(assessor, tide_calc, "risk_map.html")
    print(f"  风险地图: {r5['path']}")

    report_path = viz.generate_summary_text(tracker, assessor, "summary_report.txt")
    print(f"  综合报告: {report_path}")

    # ========== 完成 ==========
    print("\n" + "=" * 70)
    print("  运行完成！所有输出位于 output/ 目录")
    print("=" * 70)
    print("\n输出文件清单（图文表一一对应）：")
    for f in sorted(os.listdir(output_dir)):
        fpath = os.path.join(output_dir, f)
        size_kb = os.path.getsize(fpath) / 1024
        print(f"  - {f}  ({size_kb:.1f} KB)")
    print("\n下一步：")
    print("  1. 打开 output/summary_report.txt 查看综合复核报告")
    print("  2. 打开 output/risk_map.html 浏览器查看交互式风险地图")
    print("  3. 运行 notebooks/demo.ipynb 查看交互式演示")
    print()


if __name__ == "__main__":
    main()
