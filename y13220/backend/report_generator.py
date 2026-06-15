from datetime import datetime
from database import get_conn
from status_manager import status_label


def generate_markdown(status_filter: str = None) -> str:
    with get_conn() as conn:
        if status_filter:
            rows = conn.execute(
                "SELECT * FROM review_tracks WHERE process_status = ? ORDER BY id",
                (status_filter,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM review_tracks ORDER BY id").fetchall()

        status_counts = conn.execute(
            "SELECT process_status, COUNT(*) as cnt FROM review_tracks GROUP BY process_status"
        ).fetchall()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = []
    lines.append("# 鼓组节拍版本复核报告")
    lines.append("")
    lines.append(f"> 导出时间：{now_str}")
    lines.append(f"> 总曲目数：{len(rows)}")
    lines.append("")

    lines.append("## 状态汇总")
    lines.append("")
    lines.append("| 状态 | 数量 |")
    lines.append("|------|------|")
    total = 0
    for sc in status_counts:
        label = status_label(sc["process_status"])
        lines.append(f"| {label} | {sc['cnt']} |")
        total += sc["cnt"]
    lines.append(f"| **合计** | **{total}** |")
    lines.append("")

    lines.append("## 复核明细")
    lines.append("")
    lines.append("| ID | 文件名 | 曲目名称 | 鼓组版本 | 来源 | 来源行 | 处理状态 | 授权到期日 | 授权备注 | 影响范围 | 更新时间 |")
    lines.append("|----|--------|----------|----------|------|--------|----------|------------|----------|----------|----------|")

    for r in rows:
        lines.append(
            f"| {r['id']} "
            f"| {r['file_name'] or '-'} "
            f"| {r['track_name'] or '-'} "
            f"| {r['beat_version'] or '-'} "
            f"| {r['source'] or '-'} "
            f"| {r['source_row']} "
            f"| {status_label(r['process_status'])} "
            f"| {r['authorization_expire_date'] or '-'} "
            f"| {r['authorization_note'] or '-'} "
            f"| {r['impact_scope'] or '-'} "
            f"| {r['updated_at'] or '-'} |"
        )

    lines.append("")

    abnormal = [r for r in rows if r["process_status"] in ("expired", "mismatch", "abnormal", "need_note")]
    if abnormal:
        lines.append("## 异常出口清单")
        lines.append("")
        lines.append("以下条目需要人工处理：")
        lines.append("")
        for r in abnormal:
            reason_map = {
                "expired": "授权到期",
                "mismatch": "文件名与曲目表不匹配",
                "abnormal": "异常状态",
                "need_note": "缺少授权备注",
            }
            reason = reason_map.get(r["process_status"], "待处理")
            lines.append(f"- **[ID:{r['id']}] {r['file_name'] or r['track_name'] or '未命名'}** — {reason}")
            if r["impact_scope"]:
                lines.append(f"  - 影响范围：{r['impact_scope']}")
            if r["source"]:
                lines.append(f"  - 来源：{r['source']}（行{r['source_row']}）")
            lines.append("")

    return "\n".join(lines)
