import json
import os
from datetime import datetime, timezone
from scheduler.db import (
    get_connection,
    get_issues_by_type,
    get_all_issues,
    get_run_history,
    save_report,
    now_iso,
)


def generate_report(conn, run_id):
    print("\n[报告] 生成调度报告...")

    vip_issues = get_issues_by_type(conn, "VIP挤占")
    skill_issues = get_issues_by_type(conn, "技能组缺人")
    cascade_issues = get_issues_by_type(conn, "超时连锁")
    all_issues = get_all_issues(conn)

    report = {
        "报告生成时间": now_iso(),
        "运行ID": run_id,
        "问题汇总": {
            "VIP挤占": len(vip_issues),
            "技能组缺人": len(skill_issues),
            "超时连锁": len(cascade_issues),
            "总计": len(all_issues),
        },
        "VIP挤占明细": _format_section(vip_issues, "VIP挤占"),
        "技能组缺人明细": _format_section(skill_issues, "技能组缺人"),
        "超时连锁明细": _format_section(cascade_issues, "超时连锁"),
        "历史运行记录": _format_runs(conn),
    }

    save_report(
        conn, run_id, report,
        len(vip_issues), len(skill_issues), len(cascade_issues),
    )
    return report


def _format_section(issues, section_name):
    if not issues:
        return [{"说明": f"未发现{section_name}问题"}]

    result = []
    for iss in issues:
        affected = json.loads(iss["affected_ticket_ids"]) if isinstance(iss["affected_ticket_ids"], str) else iss["affected_ticket_ids"]
        source_records = json.loads(iss["source_records"]) if isinstance(iss["source_records"], str) else iss["source_records"]
        result.append({
            "问题类型": iss["issue_type"],
            "严重程度": iss["severity"],
            "描述": iss["description"],
            "受影响工单": affected,
            "来源溯源": source_records,
            "首次检出时间": iss["detected_at"],
            "检出运行ID": iss["run_id"],
        })
    return result


def _format_runs(conn):
    runs = get_run_history(conn)
    return [
        {
            "运行ID": r["run_id"],
            "开始时间": r["started_at"],
            "完成时间": r["completed_at"],
            "状态": r["status"],
        }
        for r in runs
    ]


def export_report_text(conn, run_id, output_path=None):
    report = generate_report(conn, run_id)

    if output_path is None:
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        output_path = f"scheduler_report_{ts}.txt"

    lines = []
    lines.append("=" * 60)
    lines.append("队列公平调度器 — 调度报告")
    lines.append("=" * 60)
    lines.append(f"生成时间: {report['报告生成时间']}")
    lines.append(f"运行ID: {report['运行ID']}")
    lines.append("")

    lines.append("-" * 40)
    lines.append("问题汇总")
    lines.append("-" * 40)
    for k, v in report["问题汇总"].items():
        lines.append(f"  {k}: {v}")
    lines.append("")

    _write_section(lines, "VIP挤占明细", report["VIP挤占明细"])
    _write_section(lines, "技能组缺人明细", report["技能组缺人明细"])
    _write_section(lines, "超时连锁明细", report["超时连锁明细"])

    lines.append("-" * 40)
    lines.append("历史运行记录")
    lines.append("-" * 40)
    for r in report["历史运行记录"]:
        lines.append(f"  运行 {r['运行ID'][:8]}... | {r['开始时间']} → {r['完成时间'] or '进行中'} | {r['状态']}")

    lines.append("")
    lines.append("=" * 60)
    lines.append("报告结束")
    lines.append("=" * 60)

    text = "\n".join(lines)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)

    conn.execute(
        "UPDATE reports SET exported_path = ? WHERE run_id = ?",
        (output_path, run_id),
    )
    conn.commit()

    print(f"  报告已导出: {output_path}")
    return output_path


def export_report_json(conn, run_id, output_path=None):
    report = generate_report(conn, run_id)

    if output_path is None:
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        output_path = f"scheduler_report_{ts}.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    conn.execute(
        "UPDATE reports SET exported_path = ? WHERE run_id = ?",
        (output_path, run_id),
    )
    conn.commit()

    print(f"  报告已导出(JSON): {output_path}")
    return output_path


def _write_section(lines, title, items):
    lines.append("-" * 40)
    lines.append(title)
    lines.append("-" * 40)
    for item in items:
        lines.append(f"  问题类型: {item.get('问题类型', '-')}")
        lines.append(f"  严重程度: {item.get('严重程度', '-')}")
        lines.append(f"  描述: {item.get('描述', item.get('说明', '-'))}")
        if "受影响工单" in item:
            affected = item["受影响工单"]
            if isinstance(affected, list):
                lines.append(f"  受影响工单: {', '.join(affected)}")
            else:
                lines.append(f"  受影响工单: {affected}")
        if "来源溯源" in item:
            sources = item["来源溯源"]
            if isinstance(sources, dict):
                for sk, sv in sources.items():
                    lines.append(f"    {sk}: {sv}")
        lines.append("")
