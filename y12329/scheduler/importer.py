import csv
import json
import os
from scheduler.db import get_connection, now_iso


def _open_data_file(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        with open(path, "r", encoding="utf-8-sig") as f:
            return list(csv.DictReader(f)), os.path.basename(path)
    elif ext == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                data = [data]
            return data, os.path.basename(path)
    else:
        raise ValueError(f"不支持的文件格式: {ext}，仅支持 .csv 和 .json")


def import_tickets(conn, path):
    rows, source = _open_data_file(path)
    ts = now_iso()
    inserted = 0
    for row in rows:
        try:
            conn.execute(
                """INSERT OR REPLACE INTO tickets
                   (ticket_id, customer_id, customer_level, skill_group,
                    create_time, assigned_time, resolve_time, status, source, imported_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    row["ticket_id"],
                    row["customer_id"],
                    row["customer_level"],
                    row["skill_group"],
                    row["create_time"],
                    row.get("assigned_time"),
                    row.get("resolve_time"),
                    row.get("status", "待处理"),
                    source,
                    ts,
                ),
            )
            inserted += 1
        except Exception as e:
            print(f"  跳过异常工单 {row.get('ticket_id', '?')}: {e}")
    conn.commit()
    print(f"  导入工单: {inserted} 条, 来源: {source}")
    return inserted


def import_customer_levels(conn, path):
    rows, source = _open_data_file(path)
    ts = now_iso()
    inserted = 0
    for row in rows:
        conn.execute(
            """INSERT OR REPLACE INTO customer_levels
               (level_name, priority_weight, max_concurrent, source, imported_at)
               VALUES (?, ?, ?, ?, ?)""",
            (
                row["level_name"],
                float(row["priority_weight"]),
                int(row["max_concurrent"]) if row.get("max_concurrent") else None,
                source,
                ts,
            ),
        )
        inserted += 1
    conn.commit()
    print(f"  导入客户等级: {inserted} 条, 来源: {source}")
    return inserted


def import_timeout_rules(conn, path):
    rows, source = _open_data_file(path)
    ts = now_iso()
    inserted = 0
    for row in rows:
        conn.execute(
            """INSERT OR REPLACE INTO timeout_rules
               (skill_group, level, max_wait_minutes, escalation_action, source, imported_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                row["skill_group"],
                row["level"],
                int(row["max_wait_minutes"]),
                row.get("escalation_action"),
                source,
                ts,
            ),
        )
        inserted += 1
    conn.commit()
    print(f"  导入超时规则: {inserted} 条, 来源: {source}")
    return inserted


def import_handling_durations(conn, path):
    rows, source = _open_data_file(path)
    ts = now_iso()
    inserted = 0
    for row in rows:
        conn.execute(
            """INSERT INTO handling_durations
               (ticket_id, agent_id, skill_group, duration_minutes, source, imported_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                row["ticket_id"],
                row.get("agent_id"),
                row["skill_group"],
                float(row["duration_minutes"]),
                source,
                ts,
            ),
        )
        inserted += 1
    conn.commit()
    print(f"  导入处理时长: {inserted} 条, 来源: {source}")
    return inserted


def import_scheduling_records(conn, path):
    rows, source = _open_data_file(path)
    ts = now_iso()
    inserted = 0
    for row in rows:
        conn.execute(
            """INSERT INTO scheduling_records
               (ticket_id, action, from_queue, to_queue, timestamp, reason, source, imported_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                row["ticket_id"],
                row["action"],
                row.get("from_queue"),
                row.get("to_queue"),
                row["timestamp"],
                row.get("reason"),
                source,
                ts,
            ),
        )
        inserted += 1
    conn.commit()
    print(f"  导入调度记录: {inserted} 条, 来源: {source}")
    return inserted


IMPORTERS = {
    "tickets": import_tickets,
    "customer_levels": import_customer_levels,
    "timeout_rules": import_timeout_rules,
    "handling_durations": import_handling_durations,
    "scheduling_records": import_scheduling_records,
}
