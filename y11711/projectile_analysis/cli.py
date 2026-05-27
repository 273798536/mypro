#!/usr/bin/env python3
"""抛体运动参数复盘系统 - CLI接口"""

import argparse
import sys
import os
from typing import Optional

from .core.models import (
    InputData, AnomalySeverity, CorrectionType,
    DataSource
)
from .core.fitting import ProjectileAnalyzer
from .core.anomaly import AnomalyDetector
from .io.loader import DataLoader
from .io.reporter import ReportGenerator


def main():
    parser = argparse.ArgumentParser(
        description="抛体运动参数复盘系统 - 从视频标记点分析铅球训练",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 使用示例数据进行分析
  python -m projectile_analysis.cli --sample

  # 从JSON文件加载数据
  python -m projectile_analysis.cli --input data.json --report report.txt

  # 带空气阻力分析并生成对比图
  python -m projectile_analysis.cli --input data.json --air-resistance --plot trajectory.png

  # 生成JSON格式报告
  python -m projectile_analysis.cli --input data.json --format json --report report.json
        """
    )

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--input", "-i", type=str,
                              help="输入数据文件 (JSON格式)")
    input_group.add_argument("--sample", action="store_true",
                              help="使用示例数据进行演示")

    parser.add_argument("--report", "-r", type=str,
                         help="报告输出文件路径")
    parser.add_argument("--format", "-f", choices=["text", "json", "csv"],
                         default="text", help="报告格式 (默认: text)")
    parser.add_argument("--air-resistance", "-a", action="store_true",
                         help="考虑空气阻力进行分析")
    parser.add_argument("--compare-air-resistance", "-c", action="store_true",
                         help="对比有/无空气阻力的结果")
    parser.add_argument("--plot", "-p", type=str,
                         help="生成对比图并保存到指定路径")
    parser.add_argument("--residuals", type=str,
                         help="生成残差图并保存到指定路径")
    parser.add_argument("--verbose", "-v", action="store_true",
                         help="显示详细处理过程")

    args = parser.parse_args()

    try:
        if args.sample:
            input_data = DataLoader.create_sample(
                v0=12.5, angle_deg=38.0, h=1.85, frame_rate=30, noise=0.03
            )
            print("→ 使用示例数据: v0=12.5m/s, 角度=38°, 出手高度=1.85m")
        else:
            input_data = DataLoader.from_json(args.input)
            print(f"→ 已加载数据: {args.input}")

        print(f"→ 轨迹点数: {len(input_data.trajectory)}")
        print(f"→ 帧率: {input_data.frame_rate.value} fps")
        print(f"→ 比例尺: {input_data.scale.value} m/像素")
        print(f"→ 出手高度: {input_data.release_height.value} m")

        anomalies = AnomalyDetector.detect_all(input_data)
        quality_score = AnomalyDetector.check_data_quality(input_data)
        print(f"→ 数据质量评分: {quality_score:.2f}/1.0")

        if anomalies:
            print(f"→ 检测到 {len(anomalies)} 个异常:")
            for a in anomalies:
                severity_tag = {
                    AnomalySeverity.CRITICAL: "[严重]",
                    AnomalySeverity.ERROR: "[错误]",
                    AnomalySeverity.WARNING: "[警告]",
                    AnomalySeverity.INFO: "[信息]"
                }[a.severity]
                print(f"  {severity_tag} {a.message}")

        has_critical = any(a.severity == AnomalySeverity.CRITICAL for a in anomalies)
        if has_critical:
            print("\n✗ 存在严重错误，无法继续分析")
            sys.exit(1)

        print("\n正在进行分析...")

        if args.compare_air_resistance:
            results = ProjectileAnalyzer.analyze_with_air_resistance_comparison(
                input_data,
                drag_coefficient=0.47,
                mass=7.26,
                cross_sectional_area=0.0113
            )

            result_ideal = results["ideal"]
            result_air = results.get("with_air_resistance")

            print("\n=== 对比分析结果 ===")
            print(f"理想模型:  v0={result_ideal.params.v0:.2f}m/s, "
                  f"角度={result_ideal.params.angle_deg:.1f}°, "
                  f"落点={result_ideal.landing_position:.2f}m")

            if result_air:
                print(f"考虑阻力:  v0={result_air.params.v0:.2f}m/s, "
                      f"角度={result_air.params.angle_deg:.1f}°, "
                      f"落点={result_air.landing_position:.2f}m")
                diff = result_ideal.landing_position - result_air.landing_position
                print(f"落点差异:  {diff:.2f}m (阻力使落点减少 {diff/result_ideal.landing_position*100:.1f}%)")

            result = result_ideal
        elif args.air_resistance:
            result = ProjectileAnalyzer.analyze(
                input_data,
                air_resistance_enabled=True,
                drag_coefficient=0.47,
                mass=7.26,
                cross_sectional_area=0.0113
            )
        else:
            result = ProjectileAnalyzer.analyze(input_data, air_resistance_enabled=False)

        print(f"\n✓ 分析完成")
        print(f"  初速度: {result.params.v0:.2f} ± {result.params_confidence.get('v0', 0)*100:.0f}% m/s")
        print(f"  角度:   {result.params.angle_deg:.1f} ± {result.params_confidence.get('angle', 0)*100:.0f}% °")
        print(f"  落点:   {result.landing_position:.2f} m")
        print(f"  飞行时间: {result.flight_time:.2f} s")
        print(f"  最大高度: {result.max_height:.2f} m")

        if args.plot:
            try:
                from .visualization.plotter import TrajectoryPlotter
                air_result = None
                if args.compare_air_resistance:
                    air_result = results.get("with_air_resistance")
                TrajectoryPlotter.plot_comparison(
                    result, input_data, save_path=args.plot,
                    show_air_resistance=args.air_resistance or args.compare_air_resistance,
                    air_resistance_result=air_result
                )
                print(f"\n✓ 对比图已保存: {args.plot}")
            except ImportError:
                print("\n✗ 无法生成图表: 需要安装 matplotlib")
            except Exception as e:
                print(f"\n✗ 图表生成失败: {str(e)}")

        if args.residuals:
            try:
                from .visualization.plotter import TrajectoryPlotter
                TrajectoryPlotter.plot_residuals(result, input_data, save_path=args.residuals)
                print(f"✓ 残差图已保存: {args.residuals}")
            except ImportError:
                print("✗ 无法生成残差图: 需要安装 matplotlib")
            except Exception as e:
                print(f"✗ 残差图生成失败: {str(e)}")

        if args.report:
            ReportGenerator.save_report(result, args.report, format=args.format)
            print(f"\n✓ 报告已保存: {args.report}")
        else:
            print("\n" + "=" * 60)
            print(ReportGenerator.generate(result, format=args.format))

    except Exception as e:
        print(f"\n✗ 分析失败: {str(e)}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
