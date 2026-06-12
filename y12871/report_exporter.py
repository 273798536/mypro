"""
报告导出模块
============

支持:
  1. 文本报告 (控制台/文件)
  2. CSV格式 (方便导入Excel)
  3. 清洗前后对比 (关键指标、状态变化)
"""

import csv
import io
from datetime import datetime
from typing import Optional

from models import DriftReport, Trajectory, CleanResult, DriftStatus
from drift_calculator import get_formula_info, haversine_distance
from trajectory_cleaner import has_significant_change


def format_position(lat: float, lon: float) -> str:
    lat_hem = "N" if lat >= 0 else "S"
    lon_hem = "E" if lon >= 0 else "W"
    return f"{abs(lat):.4f}°{lat_hem}, {abs(lon):.4f}°{lon_hem}"


def generate_text_report(
    report: DriftReport,
    include_formula: bool = True,
    include_details: bool = True
) -> str:
    """
    生成文本格式的漂移报告
    """
    lines = []
    lines.append("=" * 70)
    lines.append("       海上搜救漂移预测报告")
    lines.append("=" * 70)
    lines.append(f"报告生成时间: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"轨迹ID: {report.trajectory_id}")
    lines.append("")

    if include_formula:
        lines.append("-" * 70)
        lines.append("【计算方法说明】")
        formula_info = get_formula_info()
        for name, info in formula_info.items():
            lines.append(f"  ▶ {name}")
            lines.append(f"    公式: {info['formula']}")
            lines.append(f"    参数: {info['params']}")
            lines.append(f"    单位: {info['unit']}")
            lines.append(f"    适用范围: {info['scope']}")
            lines.append(f"    常见失败原因: {', '.join(info['failures'])}")
            lines.append("")

    if report.before_clean and report.after_clean:
        lines.append("-" * 70)
        lines.append("【轨迹清洗对比】")
        before = report.before_clean
        after = report.after_clean
        lines.append(f"  清洗前点数: {len(before.drift_points)}")
        lines.append(f"  清洗后点数: {len(after.drift_points)}")
        lines.append(f"  删除点数: {len(before.drift_points) - len(after.drift_points)}")

        if report.clean_result:
            lines.append(f"  修改点数: {len(report.clean_result.modified_points)}")
            lines.append(f"  应用规则: {len(report.clean_result.clean_rules_applied)} 条")
            for rule in report.clean_result.clean_rules_applied:
                lines.append(f"    - {rule}")

        if has_significant_change(report.clean_result) if report.clean_result else False:
            lines.append("  ⚠ 清洗引起显著状态变化, 请重点关注!")
        lines.append("")

    traj = report.after_clean or report.before_clean
    if traj:
        lines.append("-" * 70)
        lines.append("【漂移轨迹概览】")
        lines.append(f"  起点: {format_position(traj.start_position.lat, traj.start_position.lon)}")
        lines.append(f"  起点时间: {traj.start_position.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")

        if traj.drift_points:
            last = traj.latest_point()
            if last:
                total_dist = haversine_distance(traj.start_position, last.position)
                lines.append(f"  终点: {format_position(last.position.lat, last.position.lon)}")
                lines.append(f"  终点时间: {last.position.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
                lines.append(f"  总漂移距离: {total_dist:.2f} 海里")
                lines.append(f"  总漂移点数: {len(traj.drift_points)}")
        lines.append("")

    if report.restricted_zone_violations:
        lines.append("-" * 70)
        lines.append(f"【禁航区越界告警】共 {len(report.restricted_zone_violations)} 处")
        for i, point in enumerate(report.restricted_zone_violations, 1):
            lines.append(f"  {i}. {format_position(point.position.lat, point.position.lon)}")
            lines.append(f"     时间: {point.position.timestamp.strftime('%H:%M')}, 区域: {point.restricted_zone_id}")
            if point.notes:
                lines.append(f"     备注: {'; '.join(point.notes)}")
        lines.append("")

    if report.failures:
        lines.append("-" * 70)
        lines.append(f"【计算失败点】共 {len(report.failures)} 处")
        for f in report.failures:
            lines.append(f"  - 第 {f.point_index} 步, 方法: {f.method.value}")
            lines.append(f"    原因: {f.reason}")
            if f.missing_fields:
                lines.append(f"    缺失字段: {', '.join(f.missing_fields)}")
        lines.append("")

    if report.missing_buoys:
        lines.append("-" * 70)
        lines.append(f"【需补录数据的浮标】共 {len(report.missing_buoys)} 个")
        for buoy_id in report.missing_buoys:
            lines.append(f"  - {buoy_id}")
        lines.append("")

    if include_details and traj and traj.drift_points:
        lines.append("-" * 70)
        lines.append("【详细漂移点列表】")
        lines.append(f"{'序号':>4} {'时间':>16} {'位置':>25} {'状态':>12} {'置信度':>6} {'方法':>10}")
        lines.append("-" * 70)
        for i, dp in enumerate(traj.drift_points, 1):
            pos_str = format_position(dp.position.lat, dp.position.lon)
            time_str = dp.position.timestamp.strftime('%m-%d %H:%M')
            status_str = dp.status.value
            conf_str = f"{dp.confidence:.2f}"
            method_str = dp.calc_method.value if dp.calc_method else "-"
            lines.append(f"{i:>4} {time_str:>16} {pos_str:>25} {status_str:>12} {conf_str:>6} {method_str:>10}")
        lines.append("")

    if report.reviewer_notes:
        lines.append("-" * 70)
        lines.append("【复核备注】")
        lines.append(f"  {report.reviewer_notes}")
        lines.append("")

    lines.append("=" * 70)
    lines.append("                    -- 报告结束 --")
    lines.append("=" * 70)

    return "\n".join(lines)


def generate_csv_report(report: DriftReport) -> str:
    """
    生成CSV格式报告
    """
    output = io.StringIO()
    writer = csv.writer(output)

    traj = report.after_clean or report.before_clean

    writer.writerow(["海上搜救漂移预测报告"])
    writer.writerow(["轨迹ID", report.trajectory_id])
    writer.writerow(["生成时间", report.generated_at.strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow([])

    if traj:
        writer.writerow(["起点纬度", "起点经度", "起点时间"])
        writer.writerow([
            traj.start_position.lat,
            traj.start_position.lon,
            traj.start_position.timestamp.isoformat()
        ])
        writer.writerow([])

        writer.writerow(["序号", "时间", "纬度", "经度", "状态", "置信度",
                         "计算方法", "来源浮标", "是否在禁航区", "禁航区ID", "备注"])
        for i, dp in enumerate(traj.drift_points, 1):
            writer.writerow([
                i,
                dp.position.timestamp.isoformat(),
                dp.position.lat,
                dp.position.lon,
                dp.status.value,
                dp.confidence,
                dp.calc_method.value if dp.calc_method else "",
                dp.source_buoy or "",
                "是" if dp.in_restricted_zone else "否",
                dp.restricted_zone_id or "",
                "; ".join(dp.notes)
            ])

    if report.failures:
        writer.writerow([])
        writer.writerow(["计算失败记录"])
        writer.writerow(["点索引", "失败原因", "计算方法", "缺失字段"])
        for f in report.failures:
            writer.writerow([
                f.point_index,
                f.reason,
                f.method.value,
                ", ".join(f.missing_fields)
            ])

    if report.restricted_zone_violations:
        writer.writerow([])
        writer.writerow(["禁航区越界记录"])
        writer.writerow(["序号", "纬度", "经度", "时间", "禁航区ID"])
        for i, dp in enumerate(report.restricted_zone_violations, 1):
            writer.writerow([
                i,
                dp.position.lat,
                dp.position.lon,
                dp.position.timestamp.isoformat(),
                dp.restricted_zone_id
            ])

    return output.getvalue()


def generate_comparison_report(clean_result: CleanResult) -> str:
    """
    生成清洗前后对比报告 (专门用于看差别)
    """
    lines = []
    lines.append("=" * 70)
    lines.append("       轨迹清洗前后对比报告")
    lines.append("=" * 70)
    lines.append(f"轨迹ID: {clean_result.cleaned_trajectory.trajectory_id}")
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    lines.append("-" * 70)
    lines.append("【总体对比】")
    before_count = len(clean_result.original_trajectory.drift_points)
    after_count = len(clean_result.cleaned_trajectory.drift_points)
    lines.append(f"  清洗前: {before_count} 个点")
    lines.append(f"  清洗后: {after_count} 个点")
    lines.append(f"  删除: {before_count - after_count} 个点")
    lines.append(f"  修改: {len(clean_result.modified_points)} 个点")
    lines.append("")

    if clean_result.clean_rules_applied:
        lines.append("-" * 70)
        lines.append("【应用的清洗规则】")
        for rule in clean_result.clean_rules_applied:
            lines.append(f"  ✓ {rule}")
        lines.append("")

    if clean_result.removed_points:
        lines.append("-" * 70)
        lines.append(f"【被删除的点】共 {len(clean_result.removed_points)} 个")
        for i, dp in enumerate(clean_result.removed_points, 1):
            lines.append(f"  {i}. 时间: {dp.position.timestamp.strftime('%H:%M:%S')}")
            lines.append(f"     位置: {format_position(dp.position.lat, dp.position.lon)}")
            lines.append(f"     状态: {dp.status.value}, 置信度: {dp.confidence:.2f}")
            if dp.notes:
                lines.append(f"     备注: {'; '.join(dp.notes)}")
        lines.append("")

    if clean_result.modified_points:
        lines.append("-" * 70)
        lines.append(f"【被修改的点】共 {len(clean_result.modified_points)} 个")
        for i, (orig, mod) in enumerate(clean_result.modified_points, 1):
            lines.append(f"  {i}. 时间: {orig.position.timestamp.strftime('%H:%M:%S')}")
            lines.append(f"     清洗前: 状态={orig.status.value}, 置信度={orig.confidence:.2f}")
            lines.append(f"             位置={format_position(orig.position.lat, orig.position.lon)}")
            lines.append(f"     清洗后: 状态={mod.status.value}, 置信度={mod.confidence:.2f}")
            lines.append(f"             位置={format_position(mod.position.lat, mod.position.lon)}")
            status_changed = orig.status != mod.status
            if status_changed:
                lines.append(f"     ⚠ 状态发生变化!")
            if mod.notes:
                lines.append(f"     备注: {'; '.join(mod.notes)}")
        lines.append("")

    sig = has_significant_change(clean_result)
    lines.append("-" * 70)
    lines.append(f"【清洗影响判断】")
    if sig:
        lines.append("  ⚠ 清洗引起了显著变化, 可能影响搜救判断, 建议人工复核。")
    else:
        lines.append("  ✓ 清洗未引起显著变化, 轨迹基本稳定。")
    lines.append("")

    lines.append("=" * 70)
    return "\n".join(lines)


def save_report_to_file(content: str, filepath: str) -> None:
    """保存报告到文件"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def build_report_from_workflow(
    trajectory_id: str,
    workflow
) -> DriftReport:
    """
    从工作流对象构建报告
    """
    traj = workflow.get_trajectory(trajectory_id)
    clean_result = workflow.get_clean_result(trajectory_id)

    report = DriftReport(trajectory_id=trajectory_id)

    if clean_result:
        report.before_clean = clean_result.original_trajectory
        report.after_clean = clean_result.cleaned_trajectory
        report.clean_result = clean_result
    elif traj:
        report.after_clean = traj

    if traj:
        report.restricted_zone_violations = [
            dp for dp in traj.drift_points if dp.in_restricted_zone
        ]

    buoy_mgr = workflow._buoy_manager
    if buoy_mgr:
        gap_report = buoy_mgr.get_gap_report()
        report.missing_buoys = list(gap_report.keys())

    return report
