import json
import os
from datetime import datetime

from database import db_session

REPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
os.makedirs(REPORT_DIR, exist_ok=True)


def _severity_label(s):
    return {"error": "严重", "warning": "警告", "info": "提示"}.get(s, s)


def _fetch_batch(batch_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM dissolution_batches WHERE id = ?", (batch_id,))
        batch = dict(c.fetchone())
        c.execute("SELECT * FROM dissolution_samples WHERE batch_id = ? ORDER BY sample_no", (batch_id,))
        samples = [dict(r) for r in c.fetchall()]
    return batch, samples


def _fetch_findings(sample_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT * FROM review_findings WHERE sample_id = ? ORDER BY severity DESC, id",
            (sample_id,),
        )
        return [dict(r) for r in c.fetchall()]


def _fetch_temperatures(sample_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT time_min, temperature_c, is_anomaly, anomaly_note FROM temperature_curves WHERE sample_id = ? ORDER BY time_min",
            (sample_id,),
        )
        return [dict(r) for r in c.fetchall()]


def _fetch_safety_alerts(batch_id):
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT * FROM safety_alerts WHERE batch_id = ? ORDER BY severity DESC, id",
            (batch_id,),
        )
        return [dict(r) for r in c.fetchall()]


def generate_report_filename(batch):
    batch_no = batch["batch_no"]
    run_idx = batch["run_index"]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"溶出曲线复核报告_{batch_no}_第{run_idx}轮_{ts}.txt"


def build_report_content(batch_id):
    batch, samples = _fetch_batch(batch_id)
    safety_alerts = _fetch_safety_alerts(batch_id)

    lines = []
    lines.append("=" * 70)
    lines.append("                 药 片 溶 出 曲 线 复 核 报 告")
    lines.append("=" * 70)
    lines.append("")
    lines.append(f"批次编号：{batch['batch_no']}")
    lines.append(f"运行轮次：第 {batch['run_index']} 轮")
    lines.append(f"导入时间：{batch['imported_at']}")
    lines.append(f"操作人  ：{batch.get('imported_by') or '未记录'}")
    lines.append(f"源文件  ：{batch.get('source_file') or '未记录'}")
    lines.append(f"整体结论：{batch['overall_status']}")
    if batch.get("remark"):
        lines.append(f"批次备注：{batch['remark']}")
    lines.append("")

    if safety_alerts:
        lines.append("-" * 70)
        lines.append("【安全提示】（与界面显示一致）")
        lines.append("-" * 70)
        for i, alert in enumerate(safety_alerts, 1):
            lines.append(f"{i}. [{_severity_label(alert['severity'])}] {alert['title']}")
            lines.append(f"   {alert['description']}")
            if alert.get("acknowledged"):
                lines.append(f"   已确认：{alert.get('acknowledged_by')} @ {alert.get('acknowledged_at')}")
            lines.append("")

    for idx, sample in enumerate(samples, 1):
        findings = _fetch_findings(sample["id"])
        temps = _fetch_temperatures(sample["id"])
        lines.append("-" * 70)
        lines.append(f"样品 {idx}：{sample.get('product_name') or '（未填写）'}  "
                     f"编号 {sample.get('sample_no')}")
        lines.append("-" * 70)
        lines.append(f"  生产批号    ：{sample.get('batch_number') or '（未填写）'}")
        lines.append(f"  试验日期    ：{sample.get('test_date') or '（未填写）'}")
        lines.append(f"  试验人员    ：{sample.get('analyst') or '（未填写）'}")
        lines.append(f"  溶出介质    ：{sample.get('medium') or '（未填写）'}")
        lines.append(f"  设定温度    ：{sample.get('temperature') or '（未填写）'} ℃")
        lines.append(f"  转速        ：{sample.get('rotation_speed') or '（未填写）'} rpm")

        wv = sample.get("weighing_value")
        wu = sample.get("weighing_unit")
        if wv is not None:
            lines.append(f"  称样量      ：{wv} {wu or '（单位漏填）'}")
        else:
            lines.append(f"  称样量      ：（未填写）")

        if sample.get("old_format"):
            lines.append("  数据来源    ：旧版记录表导入")
        if sample.get("fill_remark"):
            lines.append(f"  补录说明    ：{sample['fill_remark']}")
        lines.append(f"  复核状态    ：{sample['review_status']}")
        if sample.get("review_comment"):
            lines.append(f"  复核意见    ：{sample['review_comment']}")
        lines.append("")

        if temps:
            lines.append("  ● 温度曲线（追溯用）：")
            header = f"    {'时间(min)':>10}  {'温度(℃)':>10}  {'状态'}"
            lines.append(header)
            lines.append("    " + "-" * 36)
            for t in temps:
                flag = "⚠ 异常" if t["is_anomaly"] else "正常"
                note = f"（{t['anomaly_note']}）" if t.get("anomaly_note") else ""
                lines.append(f"    {t['time_min']:>10.1f}  {t['temperature_c']:>10.2f}  {flag} {note}")
            lines.append("")

        if findings:
            lines.append("  ● 复核问题清单：")
            for fi, f in enumerate(findings, 1):
                lines.append(f"    {fi}. [{_severity_label(f['severity'])}] {f['title']}")
                lines.append(f"       说明：{f['description']}")
                if f.get("suggestion"):
                    lines.append(f"       建议：{f['suggestion']}")
                lines.append("")
        else:
            lines.append("  ● 未发现复核问题。")
            lines.append("")

    lines.append("=" * 70)
    lines.append(f"报告生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 70)
    return "\n".join(lines)


def export_report(batch_id):
    batch, _ = _fetch_batch(batch_id)
    filename = generate_report_filename(batch)
    content = build_report_content(batch_id)
    filepath = os.path.join(REPORT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    return filepath, filename, content
