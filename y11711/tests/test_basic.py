#!/usr/bin/env python3
"""基础测试脚本"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from projectile_analysis.core.models import (
    DataPoint, TrajectoryPoint, DataSource, Status
)
from projectile_analysis.core.physics import ProjectilePhysics
from projectile_analysis.core.fitting import ProjectileAnalyzer, TrajectoryFitter
from projectile_analysis.core.anomaly import AnomalyDetector
from projectile_analysis.io.loader import DataLoader
from projectile_analysis.io.reporter import ReportGenerator


def test_physics():
    print("测试1: 抛体运动物理计算")
    from projectile_analysis.core.models import ProjectileParams

    params = ProjectileParams(
        v0=10.0,
        angle_deg=45.0,
        release_height=1.8,
        g=9.81,
        air_resistance_enabled=False
    )

    trajectory = ProjectilePhysics.ideal_trajectory(params)
    print(f"  轨迹点数: {len(trajectory)}")
    print(f"  落点: {trajectory[-1]['x']:.2f} m")
    print(f"  飞行时间: {trajectory[-1]['t']:.2f} s")

    x_landing, t_flight = ProjectilePhysics.compute_landing(params)
    print(f"  计算落点: {x_landing:.2f} m")
    print(f"  计算飞行时间: {t_flight:.2f} s")

    max_h = ProjectilePhysics.compute_max_height(params)
    print(f"  最大高度: {max_h:.2f} m")

    assert len(trajectory) > 0
    assert abs(x_landing - trajectory[-1]["x"]) < 0.1
    print("  ✓ 通过")


def test_data_loading():
    print("\n测试2: 数据加载")
    input_data = DataLoader.create_sample(
        v0=12.0, angle_deg=40.0, h=1.8, frame_rate=30, noise=0.0
    )
    print(f"  轨迹点数: {len(input_data.trajectory)}")
    print(f"  帧率: {input_data.frame_rate.value}")
    print(f"  比例尺: {input_data.scale.value}")
    print(f"  出手高度: {input_data.release_height.value}")
    assert len(input_data.trajectory) > 0
    print("  ✓ 通过")


def test_fitting():
    print("\n测试3: 轨迹拟合")
    input_data = DataLoader.create_sample(
        v0=12.0, angle_deg=40.0, h=1.8, frame_rate=30, noise=0.01
    )

    result = ProjectileAnalyzer.analyze(input_data, air_resistance_enabled=False)
    print(f"  拟合初速度: {result.params.v0:.2f} m/s (真实: 12.0)")
    print(f"  拟合角度: {result.params.angle_deg:.1f}° (真实: 40.0)")
    print(f"  落点: {result.landing_position:.2f} m")
    print(f"  v0置信度: {result.params_confidence['v0']:.2f}")
    print(f"  R² (X): {result.params_confidence['r_squared_x']:.4f}")
    print(f"  R² (Y): {result.params_confidence['r_squared_y']:.4f}")

    assert abs(result.params.v0 - 12.0) < 1.0
    assert abs(result.params.angle_deg - 40.0) < 5.0
    print("  ✓ 通过")


def test_anomaly_detection():
    print("\n测试4: 异常检测")
    input_data = DataLoader.create_sample(
        v0=12.0, angle_deg=40.0, h=1.8, frame_rate=30, noise=0.0
    )

    input_data.frame_rate.value = 23.98
    anomalies = AnomalyDetector.detect_all(input_data)
    print(f"  检测到异常数: {len(anomalies)}")
    for a in anomalies[:3]:
        print(f"    [{a.severity}] {a.category}: {a.message}")
    print("  ✓ 通过")


def test_report_generation():
    print("\n测试5: 报告生成")
    input_data = DataLoader.create_sample(
        v0=12.0, angle_deg=40.0, h=1.8, frame_rate=30, noise=0.01
    )
    result = ProjectileAnalyzer.analyze(input_data, air_resistance_enabled=False)

    report_text = ReportGenerator.generate(result, format="text")
    lines = report_text.split("\n")
    print(f"  文本报告行数: {len(lines)}")

    report_json = ReportGenerator.generate(result, format="json")
    import json
    data = json.loads(report_json)
    print(f"  JSON报告包含参数: {list(data['parameters'].keys())}")

    report_csv = ReportGenerator.generate(result, format="csv")
    print(f"  CSV报告行数: {len(report_csv.split(chr(10)))}")
    print("  ✓ 通过")


def test_data_point_correction():
    print("\n测试6: 数据修正追踪")
    dp = DataPoint(value=30, source=DataSource.FRAME_RATE, confidence=0.9)
    print(f"  原始值: {dp.value}, 状态: {dp.status}")

    dp.correct(
        new_value=29.97,
        correction_type="frame_rate_adjustment",
        reason="NTSC标准帧率",
        source=DataSource.AUTO_CORRECTION
    )
    print(f"  修正后: {dp.value}, 状态: {dp.status}")
    print(f"  修正历史: {len(dp.correction_history)} 条")
    print(f"  原始值保留: {dp.raw_value}")

    assert dp.value == 29.97
    assert dp.raw_value == 30
    assert dp.status == Status.CORRECTED
    assert len(dp.correction_history) == 1
    print("  ✓ 通过")


def test_outlier_detection():
    print("\n测试7: 离群点检测")
    input_data = DataLoader.create_sample(
        v0=12.0, angle_deg=40.0, h=1.8, frame_rate=30, noise=0.0
    )

    input_data.trajectory[5].x += 2.0
    input_data.trajectory[5].y += 2.0

    trajectory = TrajectoryFitter.detect_outliers(input_data.trajectory)
    outliers = sum(1 for p in trajectory if p.is_outlier)
    print(f"  离群点数: {outliers}")
    assert outliers >= 1
    print("  ✓ 通过")


if __name__ == "__main__":
    print("=" * 50)
    print("抛体运动参数复盘系统 - 基础测试")
    print("=" * 50)

    try:
        test_physics()
        test_data_loading()
        test_fitting()
        test_anomaly_detection()
        test_report_generation()
        test_data_point_correction()
        test_outlier_detection()

        print("\n" + "=" * 50)
        print("✓ 所有测试通过!")
        print("=" * 50)
    except Exception as e:
        print(f"\n✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
