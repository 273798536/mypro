"""报告生成模块"""
import json
import csv
import io
from typing import Optional, Dict
from .models import get_conn
from .risk_logger import RiskLogger


def generate_report(
    batch_no: Optional[str] = None,
    station_code: Optional[str] = None,
    pledge_no: Optional[str] = None,
    fmt: str = "text",
    output_path: Optional[str] = None,
) -> str:
    """生成报告，支持 text/json/csv 格式"""
    data = _collect_report_data(batch_no, station_code, pledge_no)

    if fmt == "json":
        result = json.dumps(data, ensure_ascii=False, indent=2)
    elif fmt == "csv":
        result = _to_csv(data)
    else:
        result = _to_text(data)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(result)
        return f"报告已写入: {output_path}"

    return result


def _collect_report_data(
    batch_no: Optional[str],
    station_code: Optional[str],
    pledge_no: Optional[str],
) -> Dict:
    conn = get_conn()
    c = conn.cursor()

    data = {
        "filters": {
            "batch_no": batch_no,
            "station_code": station_code,
            "pledge_no": pledge_no,
        },
        "batches": [],
        "stations": [],
        "orders_summary": {},
        "device_summary": {},
        "risks": [],
        "pledges": [],
    }

    sql_where = []
    sql_params = []

    if batch_no:
        sql_where.append("import_batch_no = ?")
        sql_params.append(batch_no)

    where_clause = (" WHERE " + " AND ".join(sql_where)) if sql_where else ""

    c.execute(f"SELECT * FROM import_batches ORDER BY created_at DESC")
    data["batches"] = [dict(r) for r in c.fetchall()]

    station_sql = "SELECT * FROM station_archives"
    if station_code:
        station_sql += " WHERE station_code = ?"
        c.execute(station_sql, (station_code,))
    else:
        station_sql += where_clause
        c.execute(station_sql, sql_params)
    data["stations"] = [dict(r) for r in c.fetchall()]

    station_codes = [s["station_code"] for s in data["stations"]]
    if station_codes:
        placeholders = ",".join(["?"] * len(station_codes))
        c.execute(
            f"SELECT station_code, COUNT(*) as cnt, SUM(amount) as total_amount FROM charging_orders WHERE station_code IN ({placeholders}) GROUP BY station_code",
            station_codes,
        )
        for r in c.fetchall():
            data["orders_summary"][r["station_code"]] = {
                "order_count": r["cnt"],
                "total_amount": r["total_amount"],
            }

        c.execute(
            f"SELECT station_code, online_status, COUNT(*) as cnt FROM device_status WHERE station_code IN ({placeholders}) GROUP BY station_code, online_status",
            station_codes,
        )
        for r in c.fetchall():
            if r["station_code"] not in data["device_summary"]:
                data["device_summary"][r["station_code"]] = {"online": 0, "offline": 0}
            data["device_summary"][r["station_code"]][r["online_status"].lower()] = r["cnt"]

    data["risks"] = RiskLogger.get_logs(batch_no=batch_no)

    pledge_sql = "SELECT * FROM pledge_records"
    if pledge_no:
        pledge_sql += " WHERE pledge_no = ?"
        c.execute(pledge_sql, (pledge_no,))
    elif station_code:
        pledge_sql += " WHERE station_code = ?"
        c.execute(pledge_sql, (station_code,))
    else:
        c.execute(pledge_sql)
    data["pledges"] = [dict(r) for r in c.fetchall()]

    conn.close()
    return data


def _to_text(data: Dict) -> str:
    lines = []
    lines.append("=" * 80)
    lines.append("充电桩收益权质押风控报告")
    lines.append("=" * 80)

    lines.append(f"\n筛选条件: {json.dumps(data['filters'], ensure_ascii=False)}")

    lines.append(f"\n--- 导入批次 ({len(data['batches'])} 批) ---")
    for b in data["batches"]:
        lines.append(f"  {b['batch_no']:25s} {b['batch_type']:6s} {b['created_at']} {b.get('remark', '')}")

    lines.append(f"\n--- 桩站档案 ({len(data['stations'])} 个) ---")
    for s in data["stations"]:
        orders = data["orders_summary"].get(s["station_code"], {})
        devices = data["device_summary"].get(s["station_code"], {})
        lines.append(f"  {s['station_code']} {s['station_name']:20s} 充电桩{s['total_piles']}台 "
                     f"订单{orders.get('order_count',0):4d}笔 金额{orders.get('total_amount',0):.2f}元 "
                     f"在线{devices.get('online',0)}台 离线{devices.get('offline',0)}台 "
                     f"[来源: station_archives:{s['id']}]")

    lines.append(f"\n--- 风险记录 ({len(data['risks'])} 条) ---")
    for r in data["risks"]:
        lines.append(f"  [{r['created_at']}] {r['risk_type']:20s} {r['risk_level']:6s} {r['description']}")
        if r.get("related_key"):
            lines.append(f"      -> 来源: {r['related_table']}:{r['related_key']}")

    lines.append(f"\n--- 质押记录 ({len(data['pledges'])} 条) ---")
    for p in data["pledges"]:
        lines.append(f"  {p['pledge_no']} {p['station_code']} 金额{p['pledge_amount']:.2f}元 "
                     f"{p['pledge_start_date']}~{p['pledge_end_date']} 利率{p['interest_rate']:.2%} {p['status']}")

    lines.append("\n" + "=" * 80)
    lines.append("说明: 所有数据均可追溯，[来源: 表名:ID] 可直接定位原始记录")
    lines.append("=" * 80)

    return "\n".join(lines)


def _to_csv(data: Dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["类型", "编号/时间", "详情", "来源"])

    for b in data["batches"]:
        writer.writerow(["批次", b["batch_no"], f"{b['batch_type']} {b.get('remark','')}", f"import_batches:{b['id']}"])

    for s in data["stations"]:
        writer.writerow(["桩站", s["station_code"], f"{s['station_name']} {s['total_piles']}台", f"station_archives:{s['id']}"])

    for r in data["risks"]:
        writer.writerow([
            f"风险:{r['risk_type']}",
            r["created_at"],
            f"{r['risk_level']} {r['description']}",
            f"{r['related_table']}:{r['related_key']}" if r.get("related_key") else "",
        ])

    for p in data["pledges"]:
        writer.writerow([
            "质押",
            p["pledge_no"],
            f"{p['station_code']} {p['pledge_amount']:.2f}元 {p['pledge_start_date']}~{p['pledge_end_date']}",
            f"pledge_records:{p['id']}",
        ])

    return output.getvalue()
