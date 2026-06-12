import json
from dataclasses import asdict
from pathlib import Path
from mc_verify.models import BatchReport, MCResult, QuestionItem, UnitStatus


def generate_report(
    items: list[QuestionItem],
    results: list[MCResult],
    param_version: str = "1.0.0",
    mc_sample_count: int = 10000,
    mc_seed: int = 42,
    output_path: str | Path = "output/report.json",
) -> BatchReport:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    passed = 0
    failed = 0
    unit_blocked = 0
    all_anomalies = []
    unit_missing_details = []

    for item, result in zip(items, results):
        has_anomaly = bool(result.anomalies)
        is_unit_blocked = (
            item.unit_trace is not None
            and item.unit_trace.status in (UnitStatus.MISSING, UnitStatus.MISMATCH)
        )

        if is_unit_blocked:
            unit_blocked += 1
        elif has_anomaly:
            failed += 1
        else:
            passed += 1

        for a in result.anomalies:
            all_anomalies.append({"question_id": item.question_id, "detail": a})

        if is_unit_blocked:
            unit_missing_details.append({
                "question_id": item.question_id,
                "unit_status": item.unit_trace.status.value,
                "original_field": item.unit_trace.original_field,
                "original_value": str(item.unit_trace.original_value),
                "expected_unit": item.unit_trace.expected_unit,
                "actual_unit": item.unit_trace.actual_unit,
                "trace_detail": item.unit_trace.detail,
                "source_description": item.source_description,
                "source_fields": item.source_fields,
            })

    report = BatchReport(
        param_version=param_version,
        mc_sample_count=mc_sample_count,
        mc_seed=mc_seed,
        total_questions=len(items),
        passed=passed,
        failed=failed,
        unit_blocked=unit_blocked,
        results=[asdict(r) for r in results],
        anomalies=all_anomalies,
        unit_missing_details=unit_missing_details,
    )

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(asdict(report), f, ensure_ascii=False, indent=2)

    return report


def format_report_text(report: BatchReport) -> str:
    lines = []
    lines.append("=" * 72)
    lines.append("蒙特卡洛误差批量验算 · 复核报告")
    lines.append("=" * 72)
    lines.append("")
    lines.append(f"报告编号:   {report.report_id}")
    lines.append(f"生成时间:   {report.timestamp}")
    lines.append(f"参数版本:   {report.param_version}")
    lines.append(f"仿真设置:   采样数={report.mc_sample_count}, 种子={report.mc_seed}")
    lines.append("")
    lines.append("-" * 72)
    lines.append(f"题目总数: {report.total_questions}")
    lines.append(f"  通过:   {report.passed}")
    lines.append(f"  失败:   {report.failed}")
    lines.append(f"  单位受阻: {report.unit_blocked}")
    lines.append("-" * 72)

    for r in report.results:
        qid = r["question_id"]
        lines.append("")
        lines.append(f"  题目 {qid}:")
        lines.append(f"    MC均值:      {r['mc_mean']:.6f}")
        lines.append(f"    MC标准差:    {r['mc_std']:.6f}")
        lines.append(f"    MC标准误:    {r['mc_error']:.6f}")
        lines.append(f"    相对误差:    {r['relative_error']:.4%}")
        lines.append(f"    有效采样:    {r['sample_count']}")
        if r["anomalies"]:
            lines.append(f"    异常点:")
            for a in r["anomalies"]:
                lines.append(f"      ⚠ {a}")
        ut = r.get("unit_trace")
        if ut and ut.get("status") != "ok":
            lines.append(f"    单位追踪:")
            lines.append(f"      状态:     {ut['status']}")
            lines.append(f"      来源字段: {ut['original_field']}")
            lines.append(f"      原始值:   {ut['original_value']}")
            lines.append(f"      期望单位: {ut.get('expected_unit', '(无)')}")
            lines.append(f"      实际单位: {ut.get('actual_unit', '(无)')}")
            lines.append(f"      说明:     {ut['detail']}")

    if report.unit_missing_details:
        lines.append("")
        lines.append("=" * 72)
        lines.append("单位缺失详细追踪")
        lines.append("=" * 72)
        for d in report.unit_missing_details:
            lines.append("")
            lines.append(f"  题目 {d['question_id']}:")
            lines.append(f"    单位状态:   {d['unit_status']}")
            lines.append(f"    卡在字段:   {d['original_field']}")
            lines.append(f"    原始说法:   {d['original_value']}")
            lines.append(f"    期望单位:   {d['expected_unit'] or '(无法推断)'}")
            lines.append(f"    实际单位:   {d['actual_unit'] or '(缺失)'}")
            lines.append(f"    追踪说明:   {d['trace_detail']}")
            lines.append(f"    题目描述:   {d['source_description']}")
            if d['source_fields']:
                lines.append(f"    来源字段:   {d['source_fields']}")

    if report.anomalies:
        lines.append("")
        lines.append("=" * 72)
        lines.append("异常点汇总")
        lines.append("=" * 72)
        for a in report.anomalies:
            lines.append(f"  [{a['question_id']}] {a['detail']}")

    lines.append("")
    lines.append("=" * 72)
    lines.append("报告结束")
    lines.append("=" * 72)
    return "\n".join(lines)
