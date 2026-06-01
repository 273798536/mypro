import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import (
    CalculationResult,
    DataSource,
    Observation,
    Report,
    ValidationResult,
)
from . import __version__


def _build_datetime_conclusion(calculations: list[CalculationResult]) -> str:
    if not calculations:
        return "无计算结果，无法生成日期时间结论。"

    lines = []
    for calc in calculations:
        if calc.skip_reason:
            lines.append(
                f"[#{calc.observation_index}] {calc.site_name} | "
                f"{calc.obs_date} {calc.obs_time} {calc.timezone_label} | "
                f"跳过: {calc.skip_reason}"
            )
        else:
            angle = calc.solar_elevation_angle_deg
            lines.append(
                f"[#{calc.observation_index}] {calc.site_name} | "
                f"{calc.obs_date} {calc.obs_time} {calc.timezone_label} | "
                f"太阳高度角={angle}°"
            )
    return "\n".join(lines)


def _build_summary(observations, validations, calculations) -> str:
    total = len(observations)
    skipped = sum(1 for c in calculations if c.skip_reason)
    completed = total - skipped
    error_count = sum(len(v.errors()) for v in validations)
    warning_count = sum(len(v.warnings()) for v in validations)

    lines = [
        f"共导入 {total} 条观测记录",
        f"成功计算 {completed} 条，跳过 {skipped} 条",
        f"验证错误 {error_count} 项，警告 {warning_count} 项",
    ]

    valid_angles = [c.solar_elevation_angle_deg for c in calculations if c.solar_elevation_angle_deg is not None]
    if valid_angles:
        lines.append(
            f"太阳高度角范围: {min(valid_angles):.2f}° ~ {max(valid_angles):.2f}°"
        )

    return "\n".join(lines)


def generate_report(
    observations: list[Observation],
    validations: list[ValidationResult],
    calculations: list[CalculationResult],
    source: Optional[DataSource] = None,
) -> Report:
    dt_conclusion = _build_datetime_conclusion(calculations)
    summary = _build_summary(observations, validations, calculations)

    combined_validation = {
        "total_observations": len(observations),
        "total_errors": sum(len(v.errors()) for v in validations),
        "total_warnings": sum(len(v.warnings()) for v in validations),
        "details": [v.to_dict() for v in validations],
    }

    return Report(
        title="太阳高度角影长计算报告",
        generated_at=datetime.now().isoformat(),
        source=source or DataSource(name="solar_shadow", version=__version__),
        observations=[obs.to_dict() for obs in observations],
        validation=combined_validation,
        calculations=[calc.to_dict() for calc in calculations],
        summary=summary,
        datetime_conclusion=dt_conclusion,
    )


def export_json(report: Report, output_path: str) -> str:
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(report.to_dict(), f, ensure_ascii=False, indent=2)
    return str(p.resolve())


def export_text(report: Report, output_path: str) -> str:
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "=" * 60,
        f"  {report.title}",
        f"  生成时间: {report.generated_at}",
        f"  工具版本: {report.source.name} v{report.source.version}" if report.source else "",
        "=" * 60,
        "",
        "【摘要】",
        report.summary,
        "",
        "【日期时间结论】",
        report.datetime_conclusion,
        "",
        "【验证详情】",
    ]

    for i, detail in enumerate(report.validation.get("details", [])):
        obs_dict = report.observations[i] if i < len(report.observations) else {}
        lines.append(f"  --- 观测 #{i}: {obs_dict.get('site_name', '?')} ---")
        if detail.get("passed"):
            lines.append("  ✓ 验证通过")
        else:
            lines.append("  ✗ 验证未通过")
        for issue in detail.get("issues", []):
            icon = {"info": "ℹ", "warning": "⚠", "error": "✗"}.get(issue["severity"], "?")
            lines.append(f"  {icon} [{issue['code']}] {issue['message']}")
            if issue.get("affected_fields"):
                lines.append(f"    影响字段: {', '.join(issue['affected_fields'])}")
            if issue.get("explanation"):
                lines.append(f"    说明: {issue['explanation']}")
        lines.append("")

    lines.append("【计算结果】")
    for calc in report.calculations:
        lines.append(f"  --- 观测 #{calc['observation_index']}: {calc['site_name']} ---")
        lines.append(f"    日期时间: {calc['obs_date']} {calc['obs_time']} {calc['timezone_label']}")
        if calc.get("skip_reason"):
            lines.append(f"    跳过: {calc['skip_reason']}")
        else:
            lines.append(f"    太阳高度角: {calc['solar_elevation_angle_deg']}° "
                         f"({calc['solar_elevation_angle_rad']} rad)")
            if calc.get("azimuth_deg") is not None:
                lines.append(f"    方位角: {calc['azimuth_deg']}°")
            if calc.get("pole_height_used"):
                lines.append(f"    杆高: {calc['pole_height_used']}m, 影长: {calc['shadow_length_used']}m")
            lines.append(f"    误差估计: ±{calc['error_estimate_deg']}°")
            lines.append(f"    误差说明: {calc['error_explanation']}")
            lines.append(f"    计算来源: {calc['angle_source']}")
            lines.append(f"    单位来源: {calc['unit_source']}")
        lines.append("")

    lines.append("=" * 60)
    lines.append("报告结束")
    lines.append("=" * 60)

    text = "\n".join(lines)
    with open(p, "w", encoding="utf-8") as f:
        f.write(text)
    return str(p.resolve())


def print_summary(report: Report):
    print("=" * 60)
    print(f"  {report.title}")
    print("=" * 60)
    print()
    print("【摘要】")
    print(report.summary)
    print()
    print("【日期时间结论】")
    print(report.datetime_conclusion)
    print()
    print("【验证概览】")
    print(f"  总错误: {report.validation['total_errors']}, 总警告: {report.validation['total_warnings']}")
    print()
    print("【计算概览】")
    for calc in report.calculations:
        if calc.get("skip_reason"):
            print(f"  #{calc['observation_index']} {calc['site_name']}: 跳过 - {calc['skip_reason']}")
        else:
            print(f"  #{calc['observation_index']} {calc['site_name']}: "
                  f"太阳高度角={calc['solar_elevation_angle_deg']}° "
                  f"误差±{calc['error_estimate_deg']}°")
    print()
