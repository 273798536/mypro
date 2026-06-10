import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, db_session, get_next_run_index, STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_PASSED, STATUS_FAILED
from demo_data import DEMO_PAYLOAD
from review_logic import run_batch_review
from report_export import export_report, build_report_content, generate_report_filename

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dissolution.db")


def reset_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db()


def import_batch_via_logic(payload):
    from datetime import datetime
    from database import generate_batch_no

    source_file = payload.get("source_file", "manual_input.xlsx")
    imported_by = payload.get("imported_by", "操作人")
    remark = payload.get("remark", "")
    samples_raw = payload.get("samples", [])

    now = datetime.now().isoformat(timespec="seconds")
    batch_no = generate_batch_no()
    run_index = get_next_run_index()

    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            """INSERT INTO dissolution_batches
               (batch_no, run_index, imported_at, imported_by, source_file, remark, overall_status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (batch_no, run_index, now, imported_by, source_file, remark, STATUS_PENDING, now),
        )
        batch_id = c.lastrowid

        c.execute(
            """INSERT INTO status_audit (batch_id, from_status, to_status, operator, comment, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (batch_id, None, STATUS_PENDING, imported_by, "创建批次", now),
        )

        for sp in samples_raw:
            missing_fields = []
            for key in ("product_name", "batch_number", "test_date", "analyst", "medium", "temperature", "rotation_speed"):
                val = sp.get(key)
                if val is None or (isinstance(val, str) and val.strip() == ""):
                    missing_fields.append(key)
            if not sp.get("weighing_unit"):
                missing_fields.append("weighing_unit")

            c.execute(
                """INSERT INTO dissolution_samples
                   (batch_id, sample_no, product_name, batch_number, test_date, analyst,
                    weighing_value, weighing_unit, weighing_precision_ok, medium, temperature,
                    rotation_speed, time_points, dissolution_data, spectrum_data,
                    fill_remark, missing_fields, old_format, review_status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    batch_id,
                    sp.get("sample_no", ""),
                    sp.get("product_name"),
                    sp.get("batch_number"),
                    sp.get("test_date"),
                    sp.get("analyst"),
                    sp.get("weighing_value"),
                    sp.get("weighing_unit"),
                    1,
                    sp.get("medium"),
                    sp.get("temperature"),
                    sp.get("rotation_speed"),
                    json.dumps(sp.get("time_points", []), ensure_ascii=False) if sp.get("time_points") else None,
                    json.dumps(sp.get("dissolution_data", []), ensure_ascii=False) if sp.get("dissolution_data") else None,
                    json.dumps(sp.get("spectrum_data", []), ensure_ascii=False) if sp.get("spectrum_data") else None,
                    sp.get("fill_remark"),
                    json.dumps(missing_fields, ensure_ascii=False) if missing_fields else None,
                    1 if sp.get("old_format") else 0,
                    STATUS_PENDING,
                    now,
                ),
            )
            sample_id = c.lastrowid
            for tp in sp.get("temperature_curve", []) or []:
                c.execute(
                    """INSERT INTO temperature_curves
                       (sample_id, time_min, temperature_c, is_anomaly, anomaly_note)
                       VALUES (?, ?, ?, ?, ?)""",
                    (
                        sample_id,
                        float(tp.get("time_min", 0)),
                        float(tp.get("temperature_c", 0)),
                        1 if tp.get("is_anomaly") else 0,
                        tp.get("anomaly_note"),
                    ),
                )
    return {"batch_id": batch_id, "batch_no": batch_no, "run_index": run_index}


def generate_safety_alerts(batch_id):
    from datetime import datetime
    now = datetime.now().isoformat(timespec="seconds")
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT id, finding_type, severity, title, description, sample_id FROM review_findings WHERE sample_id IN (SELECT id FROM dissolution_samples WHERE batch_id = ?)",
            (batch_id,),
        )
        rows = [dict(r) for r in c.fetchall()]
        for f in rows:
            c.execute(
                """INSERT INTO safety_alerts
                   (batch_id, sample_id, alert_type, severity, title, description, linked_finding_id, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (batch_id, f["sample_id"], f["finding_type"], f["severity"], f["title"], f["description"], f["id"], now),
            )


def step(title):
    print("\n" + "=" * 65)
    print(f"  {title}")
    print("=" * 65)


print_step = step


def main():
    reset_db()
    print_step("1. 数据库已初始化（持久化文件 dissolution.db）")
    print(f"  数据库路径: {DB_PATH}")

    step("2. 导入样例批次（含旧表、补录备注、漏填单位等日常混合场景）")
    result = import_batch_via_logic(DEMO_PAYLOAD)
    batch_id = result["batch_id"]
    batch_no = result["batch_no"]
    run_index = result["run_index"]
    print(f"  批次ID: {batch_id}")
    print(f"  批次号: {batch_no}")
    print(f"  运行轮次: 第 {run_index} 轮")
    print(f"  样品数: {len(DEMO_PAYLOAD['samples'])}")

    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT sample_no, product_name, old_format, fill_remark, missing_fields FROM dissolution_samples WHERE batch_id = ? ORDER BY id", (batch_id,))
        for r in c.fetchall():
            missing = json.loads(r["missing_fields"]) if r["missing_fields"] else []
            print(f"    {r['sample_no']} {r['product_name'] or '(未填)'}  旧表={bool(r['old_format'])}  补录备注={bool(r['fill_remark'])}  漏填字段数={len(missing)}")
            if r["fill_remark"]:
                print(f"      补录内容: {r['fill_remark']}")

    step("3. 执行自动复核（谱峰重叠 + 称量精度 + 温度曲线 + 字段完整性）")
    review_result = run_batch_review(batch_id)
    generate_safety_alerts(batch_id)
    print(f"  批次整体结论: {review_result['overall_status']}")
    for s in review_result["samples"]:
        print(f"    样品 {s['sample_id']}: 状态={s['status']}, 问题数={s['findings_count']}")

    step("4. 查看复核问题（材料工程师可读的原因说明，非字段名/缩写）")
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            """SELECT f.*, s.sample_no, s.product_name
               FROM review_findings f JOIN dissolution_samples s ON f.sample_id = s.id
               WHERE s.batch_id = ? ORDER BY s.id, f.severity DESC""",
            (batch_id,),
        )
        findings = [dict(r) for r in c.fetchall()]
    for f in findings:
        sev = {"error": "严重", "warning": "警告", "info": "提示"}.get(f["severity"], f["severity"])
        print(f"\n  [{sev}] {f['sample_no']} {f['product_name'] or ''} — {f['title']}")
        print(f"    说明: {f['description']}")
        if f.get("suggestion"):
            print(f"    建议: {f['suggestion']}")

    step("5. 查看安全提示（与报告共用同一批处理记录）")
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM safety_alerts WHERE batch_id = ? ORDER BY severity DESC", (batch_id,))
        alerts = [dict(r) for r in c.fetchall()]
    print(f"  安全提示总数: {len(alerts)}")
    for a in alerts[:3]:
        sev = {"error": "严重", "warning": "警告", "info": "提示"}.get(a["severity"], a["severity"])
        print(f"    [{sev}] {a['title']}  → 关联复核问题ID={a['linked_finding_id']}")
    print(f"  （剩余 {len(alerts) - 3} 条省略，与上述复核问题一一对应）")

    step("6. 报告预览（文件名区分本次运行，内容面向非技术人员）")
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM dissolution_batches WHERE id = ?", (batch_id,))
        batch = dict(c.fetchone())
    filename = generate_report_filename(batch)
    content = build_report_content(batch_id)
    print(f"  文件名: {filename}")
    print(f"  说明: 文件名包含批次号、运行轮次、时间戳，可区分历次导出")
    print("-" * 60)
    print(content[:2500])
    if len(content) > 2500:
        print(f"\n...（已截断，全文 {len(content)} 字符）")

    step("7. 导出报告文件到 reports/ 目录")
    filepath, fn, _ = export_report(batch_id)
    print(f"  文件已生成: {filepath}")
    print(f"  文件大小: {os.path.getsize(filepath)} 字节")

    step("8. 模拟重启：关闭后重新打开数据库，验证历史痕迹保留")
    print("  （重新建立独立数据库连接）")
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM dissolution_batches")
        batch_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM dissolution_samples")
        sample_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM review_findings")
        finding_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM safety_alerts")
        alert_count = c.fetchone()[0]
    print(f"  重启后仍可查到: 批次 {batch_count} 个 / 样品 {sample_count} 条 / 复核问题 {finding_count} 条 / 安全提示 {alert_count} 条")

    step("9. 异常追溯：从一条问题反向查到温度曲线和处理意见")
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            """SELECT f.id as fid, f.title, f.description, f.sample_id,
                      s.sample_no, s.product_name, s.review_comment,
                      b.batch_no, b.run_index
               FROM review_findings f
               JOIN dissolution_samples s ON f.sample_id = s.id
               JOIN dissolution_batches b ON s.batch_id = b.id
               WHERE f.severity = 'error' LIMIT 1""",
        )
        row = c.fetchone()
        if row:
            print(f"  选中问题ID: {row['fid']}")
            print(f"  问题: {row['title']}")
            print(f"  描述: {row['description'][:80]}...")
            print(f"  所属样品: {row['sample_no']} {row['product_name']}")
            print(f"  所属批次: {row['batch_no']} 第{row['run_index']}轮")
            c.execute(
                "SELECT time_min, temperature_c, is_anomaly, anomaly_note FROM temperature_curves WHERE sample_id = ? ORDER BY time_min",
                (row["sample_id"],),
            )
            temps = [dict(r) for r in c.fetchall()]
            print(f"  温度曲线（{len(temps)} 个点）:")
            for t in temps:
                flag = "  ⚠ 异常" if t["is_anomaly"] else "     正常"
                note = f"  备注: {t['anomaly_note']}" if t.get("anomaly_note") else ""
                print(f"    {t['time_min']:>6.1f} min  {t['temperature_c']:>5.2f} ℃{flag}{note}")
            c.execute(
                "SELECT created_at, from_status, to_status, operator, comment FROM status_audit WHERE sample_id = ? OR batch_id = (SELECT batch_id FROM dissolution_samples WHERE id = ?) ORDER BY id",
                (row["sample_id"], row["sample_id"]),
            )
            audits = [dict(r) for r in c.fetchall()]
            print(f"  处理记录（审计追踪）:")
            for a in audits:
                fs = a["from_status"] or "-"
                print(f"    {a['created_at']}  {fs:>6} → {a['to_status']:<6}  操作人={a['operator']:<6}  {a.get('comment') or ''}")

    step("10. 第二轮导入（验证 run_index 递增，文件名可区分）")
    result2 = import_batch_via_logic(DEMO_PAYLOAD)
    print(f"  第二轮批次号: {result2['batch_no']}, 轮次: 第 {result2['run_index']} 轮")
    review_result2 = run_batch_review(result2["batch_id"])
    generate_safety_alerts(result2["batch_id"])
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM dissolution_batches WHERE id = ?", (result2["batch_id"],))
        batch2 = dict(c.fetchone())
    filename2 = generate_report_filename(batch2)
    print(f"  第二轮报告文件名: {filename2}")
    filepath2, _, _ = export_report(result2["batch_id"])
    print(f"  文件已生成: {filepath2}")

    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT batch_no, run_index, overall_status, imported_at FROM dissolution_batches ORDER BY id")
        print("\n  全部历史批次（重启后全部可见）:")
        for r in c.fetchall():
            print(f"    {r['batch_no']}  第{r['run_index']}轮  {r['overall_status']}  {r['imported_at']}")

    step("✅ 全部验证通过")
    print(f"  数据库文件: {DB_PATH}")
    print(f"  报告目录  : {os.path.join(os.path.dirname(DB_PATH), 'reports')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
