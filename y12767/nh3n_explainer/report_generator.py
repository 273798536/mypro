import os
from datetime import datetime
from typing import List, Dict, Any

from .models import (
    MonitorRecord,
    ReagentRecord,
    AnomalyRecord,
    BatchRecord,
    ANOMALY_TYPES,
    SEVERITY_LEVELS,
)


def _severity_to_cn(level: str) -> str:
    return SEVERITY_LEVELS.get(level, level)


def _anomaly_type_to_cn(at: str) -> str:
    return ANOMALY_TYPES.get(at, at)


def generate_text_report(
    batch: BatchRecord,
    monitors: List[MonitorRecord],
    reagents: List[ReagentRecord],
    anomalies: List[AnomalyRecord],
    balance_results: Dict[str, Dict[str, Any]],
) -> str:
    lines = []
    sep = "=" * 70
    thin_sep = "-" * 70

    lines.append(sep)
    lines.append("          氨氮监测异常解释报告")
    lines.append(sep)
    lines.append(f"批次编号：{batch.batch_id}")
    lines.append(f"批次名称：{batch.batch_name}")
    lines.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"输入目录：{batch.input_dir}")
    lines.append(f"输出目录：{batch.output_dir}")
    lines.append(f"监测记录数：{len(monitors)}")
    lines.append(f"试剂台账数：{len(reagents)}")
    lines.append(f"检出异常数：{len(anomalies)}")
    lines.append("")

    severity_counter = {}
    type_counter = {}
    for a in anomalies:
        severity_counter[a.severity] = severity_counter.get(a.severity, 0) + 1
        type_counter[a.anomaly_type] = type_counter.get(a.anomaly_type, 0) + 1

    lines.append("【异常统计】")
    lines.append(thin_sep)
    if severity_counter:
        for lvl, cnt in sorted(severity_counter.items()):
            lines.append(f"  {_severity_to_cn(lvl)}：{cnt} 条")
    else:
        lines.append("  无异常")
    lines.append("")
    lines.append("按异常类型：")
    for at, cnt in sorted(type_counter.items()):
        lines.append(f"  {_anomaly_type_to_cn(at)}：{cnt} 条")
    lines.append("")

    lines.append(sep)
    lines.append("一、给实验室管理员的汇总说明（可直接转发同事）")
    lines.append(sep)
    lines.append("")

    if not anomalies:
        lines.append("本批次氨氮监测记录未发现明显异常，所有记录要素齐全、数值在正常范围内。")
        lines.append("")
    else:
        critical = [a for a in anomalies if a.severity == "critical"]
        major = [a for a in anomalies if a.severity == "major"]
        minor = [a for a in anomalies if a.severity in ("minor", "info")]

        lines.append("各位同事好：")
        lines.append("")
        lines.append(
            f"整理了本批次（{batch.batch_name}）共{len(monitors)}条氨氮监测记录的检查情况，"
            f"发现{len(anomalies)}条待处理事项，请相关同事对照处理。"
        )
        lines.append("")

        if critical:
            lines.append(f"【严重问题 {len(critical)} 条——请立即处理】")
            for i, a in enumerate(critical, 1):
                m = next((x for x in monitors if x.record_id == a.monitor_record_id), None)
                sample_tag = f"{m.sample_name}({m.sample_id})" if m else a.monitor_record_id
                lines.append(f"  {i}. {sample_tag}：{a.description}")
            lines.append("")

        if major:
            lines.append(f"【主要问题 {len(major)} 条——请本周内处理】")
            for i, a in enumerate(major, 1):
                m = next((x for x in monitors if x.record_id == a.monitor_record_id), None)
                sample_tag = f"{m.sample_name}({m.sample_id})" if m else a.monitor_record_id
                lines.append(f"  {i}. {sample_tag}：{a.description}")
            lines.append("")

        if minor:
            lines.append(f"【一般问题 {len(minor)} 条——请下次记录时注意】")
            for i, a in enumerate(minor, 1):
                m = next((x for x in monitors if x.record_id == a.monitor_record_id), None)
                sample_tag = f"{m.sample_name}({m.sample_id})" if m else a.monitor_record_id
                lines.append(f"  {i}. {sample_tag}：{a.description}")
            lines.append("")

        lines.append("处理完后请在原始记录上补签或备注，有问题随时找我。")
        lines.append("")
        lines.append("——质检主管")
        lines.append("")

    lines.append(sep)
    lines.append("二、异常逐条详情（含追溯链路）")
    lines.append(sep)
    lines.append("")

    monitor_map = {m.record_id: m for m in monitors}
    reagent_map = {r.reagent_id: r for r in reagents}

    for idx, a in enumerate(anomalies, 1):
        lines.append(f"◆ 异常 #{idx}")
        lines.append(thin_sep)
        lines.append(f"  异常编号：{a.anomaly_id}")
        lines.append(f"  异常类型：{_anomaly_type_to_cn(a.anomaly_type)}")
        lines.append(f"  严重程度：{_severity_to_cn(a.severity)}")
        lines.append(f"  关联记录：{a.monitor_record_id}")

        m = monitor_map.get(a.monitor_record_id)
        if m:
            lines.append(f"  样品名称：{m.sample_name}")
            lines.append(f"  样品编号：{m.sample_id}")
            if m.monitor_date:
                lines.append(f"  监测日期：{m.monitor_date.strftime('%Y-%m-%d')}")
            if m.operator:
                lines.append(f"  检测人员：{m.operator}")
        lines.append("")

        lines.append("  【普通话解释（可直接复制发给同事）】")
        for paragraph in a.plain_explanation.split("。"):
            paragraph = paragraph.strip()
            if paragraph:
                lines.append(f"    {paragraph}。")
        lines.append("")

        if a.reagent_evidence:
            lines.append("  【试剂台账追溯】")
            for rid in a.reagent_evidence:
                r = reagent_map.get(rid)
                if r:
                    exp_info = (
                        f"有效期至{r.expiry_date.strftime('%Y-%m-%d')}"
                        if r.expiry_date
                        else "有效期未登记"
                    )
                    open_info = (
                        f"开瓶日期{r.open_date.strftime('%Y-%m-%d')}"
                        if r.open_date
                        else "开瓶日期未登记"
                    )
                    lines.append(
                        f"    - 试剂ID：{r.reagent_id} | "
                        f"名称：{r.name} | "
                        f"批号：{r.batch_no} | "
                        f"厂家：{r.manufacturer} | "
                        f"{exp_info} | "
                        f"{open_info}"
                    )
                    if r.remarks:
                        lines.append(f"      台账备注：{r.remarks}")
                else:
                    lines.append(f"    - 试剂ID：{rid} | ⚠️ 该编号未在试剂台账中找到")
            lines.append("")

        if a.balance_calc:
            bc = a.balance_calc
            lines.append("  【配平计算】")
            lines.append(
                f"    公式：{bc.get('formula', '')}"
            )
            if bc.get("blank_absorbance") is not None:
                lines.append(
                    f"    空白吸光度 = {bc['blank_absorbance']} {bc.get('blank_unit', '')}"
                )
            if bc.get("sample_absorbance") is not None:
                lines.append(
                    f"    样品吸光度 = {bc['sample_absorbance']} {bc.get('sample_unit', '')}"
                )
            lines.append(
                f"    校正吸光度 = {bc.get('corrected_absorbance', '')}"
            )
            if bc.get("standard_curve"):
                sc = bc["standard_curve"]
                lines.append(
                    f"    标曲斜率 = {sc.get('slope')}, 截距 = {sc.get('intercept')}"
                    f"（{sc.get('source', '')}）"
                )
            lines.append(
                f"    计算浓度 = {bc.get('concentration_mg_l', '')} {bc.get('concentration_unit', 'mg/L')}"
            )
            lines.append(
                f"    稀释倍数 = {bc.get('dilution_factor', '')}"
            )
            if bc.get("calculation_notes"):
                for note in bc["calculation_notes"]:
                    lines.append(f"    ⚠️ {note}")
            lines.append("")

        if a.retest_suggestion:
            lines.append("  【复测建议】")
            lines.append(f"    {a.retest_suggestion}")
            lines.append("")

        if a.action_suggestion:
            lines.append("  【处理意见】")
            for step in a.action_suggestion.split(";"):
                step = step.strip()
                if step:
                    lines.append(f"    {step}")
            lines.append("")

        lines.append("")

    lines.append(sep)
    lines.append("三、试剂台账概览")
    lines.append(sep)
    lines.append("")
    now = datetime.now()
    expiring_soon = []
    expired = []
    for r in reagents:
        if r.expiry_date:
            days_left = (r.expiry_date - now).days
            if days_left < 0:
                expired.append((r, days_left))
            elif days_left <= 30:
                expiring_soon.append((r, days_left))

    if expired:
        lines.append(f"【已过期试剂 {len(expired)} 瓶】")
        for r, d in expired:
            lines.append(
                f"  - {r.name}({r.reagent_id}) 批号{r.batch_no} "
                f"已于{r.expiry_date.strftime('%Y-%m-%d')}过期（超期{-d}天）"
            )
        lines.append("")

    if expiring_soon:
        lines.append(f"【30天内即将过期试剂 {len(expiring_soon)} 瓶】")
        for r, d in expiring_soon:
            lines.append(
                f"  - {r.name}({r.reagent_id}) 批号{r.batch_no} "
                f"还有{d}天到期（{r.expiry_date.strftime('%Y-%m-%d')}）"
            )
        lines.append("")

    lines.append(f"全部试剂共 {len(reagents)} 条记录，详见导出的Excel文件。")
    lines.append("")

    lines.append(sep)
    lines.append("四、监测记录配平结果（全量）")
    lines.append(sep)
    lines.append("")
    lines.append(
        f"{'样品名':<14}{'样品编号':<14}{'空白A':<10}{'样品A':<10}"
        f"{'校正A':<10}{'浓度mg/L':<12}{'备注'}"
    )
    lines.append(thin_sep)
    for m in monitors:
        b = balance_results.get(m.record_id, {})
        note = ""
        if b.get("calculation_notes"):
            note = b["calculation_notes"][0][:20]
        lines.append(
            f"{m.sample_name:<14}{m.sample_id:<14}"
            f"{str(b.get('blank_absorbance', '')):<10}"
            f"{str(b.get('sample_absorbance', '')):<10}"
            f"{str(b.get('corrected_absorbance', '')):<10}"
            f"{str(b.get('concentration_mg_l', '')):<12}"
            f"{note}"
        )
    lines.append("")

    lines.append(sep)
    lines.append(f"报告结束 | 批次号 {batch.batch_id}")
    lines.append(sep)

    return "\n".join(lines)


def save_text_report(report_text: str, output_dir: str, batch_id: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    filename = f"氨氮异常解释报告_{batch_id}.txt"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report_text)
    return filepath
