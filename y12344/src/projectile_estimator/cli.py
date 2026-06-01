"""CLI 命令行接口"""

import click
import os
import sys
from typing import List

from .data_loader import AnalysisWorkflow
from .report_generator import ReportGenerator
from .models import BoundsConfig, ProjectileParams
from . import __version__


@click.group()
@click.version_option(version=__version__, prog_name="pest")
def cli():
    """抛体运动风阻估计分析工具 (Projectile Estimator)

    用于分析航模抛体运动数据，检测异常，拟合轨迹，估计风阻系数。
    """
    pass


@cli.command()
@click.option("--trajectory", "-t", type=click.Path(exists=True), help="轨迹点CSV文件路径")
@click.option("--angle", "-a", type=click.Path(exists=True), help="角度记录CSV文件路径")
@click.option("--wind", "-w", type=click.Path(exists=True), help="风速记录CSV文件路径")
@click.option("--config", "-c", type=click.Path(exists=True), help="配置JSON文件路径")
@click.option("--v0", type=float, help="初速度 (m/s)，默认从轨迹首点计算")
@click.option("--theta0", type=float, help="初始抛射角 (deg)，默认从轨迹首点计算")
@click.option("--fit-method", type=click.Choice(["physics", "polynomial"]), default="physics", help="拟合方法")
@click.option("--poly-degree", type=int, default=2, help="多项式拟合阶数")
@click.option("--format", "-f", "formats", multiple=True, type=click.Choice(["txt", "json", "html", "csv"]), default=["txt", "json"], help="报告输出格式")
@click.option("--output-dir", "-o", type=click.Path(), default="./reports", help="报告输出目录")
@click.option("--mass", type=float, help="抛体质量 (kg)")
@click.option("--area", type=float, help="横截面积 (m^2)")
@click.option("--angle-min", type=float, help="角度下限 (deg)")
@click.option("--angle-max", type=float, help="角度上限 (deg)")
def analyze(
    trajectory, angle, wind, config, v0, theta0,
    fit_method, poly_degree, formats, output_dir,
    mass, area, angle_min, angle_max
):
    """执行完整分析流程"""
    click.echo("🚀 抛体运动风阻估计分析")
    click.echo("=" * 50)

    bounds = BoundsConfig()
    projectile_params = ProjectileParams(mass=0.1, cross_section_area=0.001)

    if angle_min is not None:
        bounds.angle_min_deg = angle_min
    if angle_max is not None:
        bounds.angle_max_deg = angle_max
    if mass is not None:
        projectile_params.mass = mass
    if area is not None:
        projectile_params.cross_section_area = area

    workflow = AnalysisWorkflow(bounds=bounds, projectile_params=projectile_params)

    click.echo("📂 加载数据...")
    if trajectory:
        click.echo(f"   轨迹文件: {trajectory}")
    if angle:
        click.echo(f"   角度文件: {angle}")
    if wind:
        click.echo(f"   风速文件: {wind}")
    if config:
        click.echo(f"   配置文件: {config}")

    try:
        report = workflow.run_full_analysis(
            trajectory_file=trajectory,
            angle_file=angle,
            wind_file=wind,
            config_file=config,
            v0=v0,
            theta0_deg=theta0,
            fit_method=fit_method,
            poly_degree=poly_degree,
        )
    except Exception as e:
        click.echo(f"❌ 分析失败: {e}", err=True)
        sys.exit(1)

    click.echo("")
    click.echo(f"✅ 分析完成，检测到 {len(report.anomalies)} 个异常")
    click.echo(f"   事件数: {len(report.events)}")

    if report.fitting_result:
        click.echo(f"   拟合R²: {report.fitting_result.r_squared:.6f}")
        click.echo(f"   拟合RMSE: {report.fitting_result.rmse:.6f} m")
        if report.fitting_result.estimated_drag_coeff is not None:
            click.echo(f"   估计风阻系数 C_d: {report.fitting_result.estimated_drag_coeff:.6f}")

    if report.anomalies:
        click.echo("")
        click.echo("⚠️  异常汇总:")
        type_counts = {}
        for a in report.anomalies:
            type_counts[a.anomaly_type] = type_counts.get(a.anomaly_type, 0) + 1
        for atype, count in type_counts.items():
            severity = "error" if any(
                a.severity == "error" for a in report.anomalies if a.anomaly_type == atype
            ) else "warning"
            icon = "🔴" if severity == "error" else "🟡"
            click.echo(f"   {icon} {atype}: {count} 个")

    click.echo("")
    click.echo("📄 生成报告...")
    generator = ReportGenerator(output_dir=output_dir)
    output_files = generator.generate_all(report, formats=list(formats))

    for fmt, fpath in output_files.items():
        if isinstance(fpath, dict):
            for subfmt, subpath in fpath.items():
                click.echo(f"   ✅ {fmt}/{subfmt}: {subpath}")
        else:
            click.echo(f"   ✅ {fmt}: {fpath}")

    click.echo("")
    click.echo("🎉 分析完成！")

    if report.anomalies:
        click.echo("")
        click.echo("👇 下一步建议:")
        for i, anomaly in enumerate(report.anomalies[:3], 1):
            click.echo(f"   {i}. [{anomaly.anomaly_type}] t={anomaly.t:.2f}s")
            first_step = anomaly.next_step.split('\n')[0] if anomaly.next_step else "检查数据"
            click.echo(f"      → {first_step}")
        if len(report.anomalies) > 3:
            click.echo(f"      ... 还有 {len(report.anomalies) - 3} 个异常，详见报告")


@cli.command()
@click.option("--trajectory", "-t", type=click.Path(exists=True), required=True, help="轨迹点CSV文件路径")
@click.option("--angle", "-a", type=click.Path(exists=True), help="角度记录CSV文件路径")
@click.option("--wind", "-w", type=click.Path(exists=True), help="风速记录CSV文件路径")
@click.option("--config", "-c", type=click.Path(exists=True), help="配置JSON文件路径")
@click.option("--angle-min", type=float, help="角度下限 (deg)")
@click.option("--angle-max", type=float, help="角度上限 (deg)")
def check(trajectory, angle, wind, config, angle_min, angle_max):
    """仅检测异常，不执行拟合"""
    click.echo("🔍 异常检测")
    click.echo("=" * 50)

    bounds = BoundsConfig()
    if angle_min is not None:
        bounds.angle_min_deg = angle_min
    if angle_max is not None:
        bounds.angle_max_deg = angle_max

    workflow = AnalysisWorkflow(bounds=bounds)

    from .data_loader import DataLoader, EventAssociator, AnomalyDetector

    loader = DataLoader(bounds)
    associator = EventAssociator()
    detector = AnomalyDetector(bounds)

    traj_points = loader.load_trajectory_csv(trajectory) if trajectory else []
    angle_records = loader.load_angle_csv(angle) if angle else []
    wind_records = loader.load_wind_csv(wind) if wind else []

    if config:
        loader.load_config_json(config)

    events = associator.associate(traj_points, angle_records, wind_records)
    anomalies = detector.detect_all(events, traj_points, angle_records, wind_records)

    click.echo(f"检测到 {len(anomalies)} 个异常")
    click.echo("")

    if not anomalies:
        click.echo("✅ 未检测到异常，数据正常！")
    else:
        for i, a in enumerate(anomalies, 1):
            icon = "🔴" if a.severity == "error" else "🟡"
            click.echo(f"{icon} 异常 #{i}: {a.anomaly_type} ({a.severity})")
            click.echo(f"   描述: {a.message}")
            if a.source:
                click.echo(f"   来源: {a.source.material_name}")
                click.echo(f"   文件: {a.source.file_path}")
            if a.next_step:
                first_line = a.next_step.split('\n')[0]
                click.echo(f"   建议: {first_line}")
            click.echo("")

        type_groups = detector.group_anomalies_by_type(anomalies)
        click.echo("📊 按类型统计:")
        for atype, alist in type_groups.items():
            click.echo(f"   {atype}: {len(alist)} 个")

        source_groups = detector.group_anomalies_by_source(anomalies)
        click.echo("📊 按材料统计:")
        for sid, alist in source_groups.items():
            name = alist[0].source.material_name if alist and alist[0].source else sid
            click.echo(f"   {name}: {len(alist)} 个")


@cli.command("reproduce-angle-overflow")
@click.option("--angle-file", "-a", type=click.Path(exists=True), required=True, help="角度记录CSV文件")
@click.option("--trajectory-file", "-t", type=click.Path(exists=True), help="轨迹点CSV文件")
@click.option("--config", "-c", type=click.Path(exists=True), help="配置JSON文件")
@click.option("--angle-max", type=float, default=90.0, help="角度上限 (deg)")
@click.option("--angle-min", type=float, default=-10.0, help="角度下限 (deg)")
def reproduce_angle_overflow(angle_file, trajectory_file, config, angle_max, angle_min):
    """复现角度越界问题，定位触发点"""
    click.echo("🎯 角度越界复现分析")
    click.echo("=" * 50)
    click.echo(f"角度范围: [{angle_min}, {angle_max}] deg")
    click.echo(f"角度文件: {angle_file}")
    if trajectory_file:
        click.echo(f"轨迹文件: {trajectory_file}")
    click.echo("")

    bounds = BoundsConfig(angle_min_deg=angle_min, angle_max_deg=angle_max)
    workflow = AnalysisWorkflow(bounds=bounds)

    from .data_loader import DataLoader, EventAssociator, AnomalyDetector

    loader = DataLoader(bounds)
    associator = EventAssociator()
    detector = AnomalyDetector(bounds)

    angle_records = loader.load_angle_csv(angle_file)
    traj_points = loader.load_trajectory_csv(trajectory_file) if trajectory_file else []

    events = associator.associate(traj_points, angle_records, [])
    anomalies = detector.detect_angle_overflow(events, angle_records)

    if not anomalies:
        click.echo("✅ 未检测到角度越界！")
        click.echo("")
        click.echo("所有角度记录:")
        for r in sorted(angle_records, key=lambda x: x.t):
            status = "✅" if angle_min <= r.angle_deg <= angle_max else "❌"
            click.echo(f"  {status} t={r.t:.2f}s  angle={r.angle_deg:.2f} deg")
        return

    click.echo(f"🔴 检测到 {len(anomalies)} 处角度越界:")
    click.echo("")

    for i, a in enumerate(anomalies, 1):
        click.echo(f"越界点 #{i}:")
        click.echo(f"  时间: {a.t:.2f}s")
        click.echo(f"  角度值: {a.value:.2f} deg")
        click.echo(f"  允许范围: [{a.bound_min}, {a.bound_max}] deg")
        click.echo(f"  超出: {abs(a.value - a.bound_max) if a.value > a.bound_max else abs(a.value - a.bound_min):.2f} deg")
        click.echo(f"  触发文件: {a.source.file_path}")
        if a.event and a.event.trajectory_point:
            tp = a.event.trajectory_point
            click.echo(f"  对应轨迹点: x={tp.x:.2f}m, y={tp.y:.2f}m")

            if tp.vx and tp.vy:
                import numpy as np
                expected_angle = np.rad2deg(np.arctan2(tp.vy, tp.vx))
                click.echo(f"  从速度反推角度: {expected_angle:.2f} deg")
                diff = abs(a.value - expected_angle)
                click.echo(f"  与实测角度差: {diff:.2f} deg")
                if diff > 10:
                    click.echo(f"  ⚠️  差异较大，可能存在测量误差或坐标系定义不一致")

        click.echo("")
        click.echo("  详细排查步骤:")
        for step in a.next_step.split('\n'):
            click.echo(f"    {step}")
        click.echo("")

    click.echo("📈 复现方法:")
    click.echo(f"  1. 打开角度文件: {angle_file}")
    click.echo(f"  2. 定位到 t = {anomalies[0].t:.2f}s 附近的记录")
    click.echo(f"  3. 确认角度值 {anomalies[0].value:.2f} deg 是否确实超界")
    click.echo(f"  4. 检查同一时刻的轨迹点速度方向")
    click.echo(f"  5. 验证角度传感器安装方向和读数规则")


@cli.group()
def template():
    """生成示例数据和配置模板"""
    pass


@template.command("data")
@click.option("--output-dir", "-o", type=click.Path(), default="./examples", help="输出目录")
@click.option("--with-anomalies", is_flag=True, help="生成包含异常的示例数据")
def generate_data_template(output_dir, with_anomalies):
    """生成示例CSV数据文件"""
    import os
    import numpy as np

    os.makedirs(output_dir, exist_ok=True)

    click.echo("📝 生成示例数据...")

    t = np.arange(0, 3.1, 0.2)
    v0 = 50.0
    theta0 = 45.0
    theta0_rad = np.deg2rad(theta0)
    cd = 0.47
    mass = 0.1
    area = 0.001
    wind_speed = 2.0
    wind_direction = 0.0

    from .physics import simulate_projectile

    x, y, vx, vy, _ = simulate_projectile(
        t, v0, theta0, mass, cd, area, wind_speed, wind_direction
    )

    traj_path = os.path.join(output_dir, "trajectory_normal.csv")
    with open(traj_path, "w") as f:
        f.write("t,x,y,vx,vy\n")
        for i in range(len(t)):
            f.write(f"{t[i]:.2f},{x[i]:.3f},{y[i]:.3f},{vx[i]:.3f},{vy[i]:.3f}\n")
    click.echo(f"  ✅ 正常轨迹: {traj_path}")

    angle_path = os.path.join(output_dir, "angle_normal.csv")
    theta_deg = np.rad2deg(np.arctan2(vy, vx))
    with open(angle_path, "w") as f:
        f.write("t,angle_deg\n")
        for i in range(len(t)):
            f.write(f"{t[i]:.2f},{theta_deg[i]:.2f}\n")
    click.echo(f"  ✅ 正常角度: {angle_path}")

    wind_path = os.path.join(output_dir, "wind_normal.csv")
    with open(wind_path, "w") as f:
        f.write("t,wind_speed,wind_direction_deg\n")
        for i in range(len(t)):
            ws = wind_speed + np.random.normal(0, 0.3)
            wd = wind_direction + np.random.normal(0, 3)
            f.write(f"{t[i]:.2f},{max(0, ws):.2f},{wd:.1f}\n")
    click.echo(f"  ✅ 正常风速: {wind_path}")

    if with_anomalies:
        theta_deg_anomaly = theta_deg.copy()
        anomaly_idx = len(t) // 2
        theta_deg_anomaly[anomaly_idx] = 95.0

        angle_anom_path = os.path.join(output_dir, "angle_with_overflow.csv")
        with open(angle_anom_path, "w") as f:
            f.write("t,angle_deg\n")
            for i in range(len(t)):
                f.write(f"{t[i]:.2f},{theta_deg_anomaly[i]:.2f}\n")
        click.echo(f"  ✅ 含角度越界: {angle_anom_path} (t={t[anomaly_idx]:.2f}s 时 angle=95.0°)")

        x_anom = x.copy()
        reverse_idx = anomaly_idx + 2
        if reverse_idx < len(x):
            x_anom[reverse_idx] = x_anom[reverse_idx - 1] - 5.0

        traj_anom_path = os.path.join(output_dir, "trajectory_with_reverse.csv")
        with open(traj_anom_path, "w") as f:
            f.write("t,x,y,vx,vy\n")
            for i in range(len(t)):
                vx_val = vx[i] if i != reverse_idx else -10.0
                vy_val = vy[i]
                f.write(f"{t[i]:.2f},{x_anom[i]:.3f},{y[i]:.3f},{vx_val:.3f},{vy_val:.3f}\n")
        click.echo(f"  ✅ 含坐标反向: {traj_anom_path} (t={t[reverse_idx]:.2f}s 时x反向)")

        wind_anom_path = os.path.join(output_dir, "wind_with_missing.csv")
        with open(wind_anom_path, "w") as f:
            f.write("t,wind_speed,wind_direction_deg\n")
            for i in range(len(t)):
                if i == anomaly_idx:
                    f.write(f"{t[i]:.2f},,\n")
                else:
                    ws = wind_speed + np.random.normal(0, 0.3)
                    wd = wind_direction + np.random.normal(0, 3)
                    f.write(f"{t[i]:.2f},{max(0, ws):.2f},{wd:.1f}\n")
        click.echo(f"  ✅ 含风速缺测: {wind_anom_path} (t={t[anomaly_idx]:.2f}s 时缺测)")

    click.echo("")
    click.echo("✅ 示例数据生成完成！")


@template.command("config")
@click.option("--output", "-o", type=click.Path(), default="./config.json", help="输出文件路径")
def generate_config_template(output):
    """生成配置JSON模板"""
    import json

    config = {
        "bounds": {
            "angle_min_deg": -10.0,
            "angle_max_deg": 90.0,
            "wind_speed_min": 0.0,
            "wind_speed_max": 30.0,
            "coordinate_x_min": 0.0,
            "coordinate_x_max": 1000.0,
            "coordinate_y_min": -50.0,
            "coordinate_y_max": 500.0,
            "time_min": 0.0,
            "time_max": 60.0
        },
        "projectile": {
            "mass": 0.1,
            "cross_section_area": 0.001,
            "drag_coeff": 0.47
        }
    }

    with open(output, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    click.echo(f"✅ 配置模板已生成: {output}")
    click.echo("")
    click.echo("参数说明:")
    click.echo("  bounds.angle_min_deg: 角度下限，单位: 度")
    click.echo("  bounds.angle_max_deg: 角度上限，单位: 度")
    click.echo("  bounds.wind_speed_*: 风速范围，单位: m/s")
    click.echo("  bounds.coordinate_*: 坐标范围，单位: m")
    click.echo("  projectile.mass: 抛体质量，单位: kg")
    click.echo("  projectile.cross_section_area: 横截面积，单位: m^2")
    click.echo("  projectile.drag_coeff: 初始风阻系数估计，无量纲")


@cli.command()
@click.argument("file_type", type=click.Choice(["trajectory", "angle", "wind"]))
def format_info(file_type):
    """查看CSV文件格式要求"""
    formats = {
        "trajectory": {
            "required": ["t", "x", "y"],
            "optional": ["vx", "vy"],
            "units": {
                "t": "秒 (s)",
                "x": "米 (m), x轴向右为正",
                "y": "米 (m), y轴向上为正",
                "vx": "米/秒 (m/s), x方向速度",
                "vy": "米/秒 (m/s), y方向速度",
            },
            "example": """t,x,y,vx,vy
0.0,0.0,0.0,35.36,35.36
0.2,7.07,7.02,35.00,33.40
0.4,14.07,13.88,34.65,31.44
..."""
        },
        "angle": {
            "required": ["t", "angle_deg"],
            "optional": [],
            "units": {
                "t": "秒 (s)",
                "angle_deg": "度 (deg), 0°为水平向右, 90°为垂直向上",
            },
            "example": """t,angle_deg
0.0,45.0
0.2,43.7
0.4,42.3
..."""
        },
        "wind": {
            "required": ["t", "wind_speed", "wind_direction_deg"],
            "optional": [],
            "units": {
                "t": "秒 (s)",
                "wind_speed": "米/秒 (m/s), 非负",
                "wind_direction_deg": "度 (deg), 0°为沿x轴正方向, 90°为沿y轴正方向",
            },
            "example": """t,wind_speed,wind_direction_deg
0.0,2.0,0.0
0.2,2.3,1.5
0.4,1.8,0.0
..."""
        }
    }

    info = formats[file_type]
    click.echo(f"📋 {file_type} CSV 格式要求")
    click.echo("=" * 50)
    click.echo(f"必需列: {', '.join(info['required'])}")
    if info['optional']:
        click.echo(f"可选列: {', '.join(info['optional'])}")
    click.echo("")
    click.echo("单位说明:")
    for col, unit in info['units'].items():
        click.echo(f"  {col}: {unit}")
    click.echo("")
    click.echo("示例:")
    click.echo(info['example'])


if __name__ == "__main__":
    cli()
