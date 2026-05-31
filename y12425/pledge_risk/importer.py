"""数据导入模块
第一次导入：桩站档案 + 充电订单
第二次导入：设备状态补充，自动计算前后变化
"""
import csv
from datetime import datetime
from typing import List, Dict, Optional
from .models import get_conn
from .risk_logger import RiskLogger


def _read_csv(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return [row for row in reader]


def _create_batch(batch_no: str, batch_type: str, operator: Optional[str], remark: Optional[str]) -> None:
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        "INSERT INTO import_batches (batch_no, batch_type, operator, remark, created_at) VALUES (?, ?, ?, ?, ?)",
        (batch_no, batch_type, operator, remark, datetime.now().isoformat(timespec="seconds")),
    )
    conn.commit()
    conn.close()


def import_first_batch(
    stations_path: str,
    orders_path: str,
    batch_no: str,
    operator: Optional[str] = None,
    remark: Optional[str] = None,
) -> Dict:
    """第一次导入：桩站档案 + 充电订单"""
    _create_batch(batch_no, "FIRST", operator, remark)

    stations = _read_csv(stations_path)
    orders = _read_csv(orders_path)

    conn = get_conn()
    c = conn.cursor()

    station_count = 0
    station_errors = []
    for s in stations:
        try:
            c.execute(
                """
                INSERT INTO station_archives (
                    station_code, station_name, address, total_piles, pile_type,
                    power_kw, operator, contract_no, contract_start_date,
                    contract_end_date, revenue_share_ratio, pledgeable_flag,
                    import_batch_no, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    s["station_code"], s["station_name"], s.get("address"),
                    int(s["total_piles"]), s.get("pile_type"),
                    float(s.get("power_kw", 0)) if s.get("power_kw") else None,
                    s.get("operator"), s.get("contract_no"),
                    s.get("contract_start_date"), s.get("contract_end_date"),
                    float(s.get("revenue_share_ratio", 0)) if s.get("revenue_share_ratio") else None,
                    int(s.get("pledgeable_flag", 1)),
                    batch_no, datetime.now().isoformat(timespec="seconds"),
                ),
            )
            station_count += 1
        except Exception as e:
            station_errors.append({"station_code": s.get("station_code"), "error": str(e)})

    order_count = 0
    order_errors = []
    for o in orders:
        try:
            c.execute(
                """
                INSERT INTO charging_orders (
                    order_no, station_code, pile_code, start_time, end_time,
                    duration_min, power_kwh, amount, electricity_fee,
                    service_fee, user_id, pay_status, import_batch_no, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    o["order_no"], o["station_code"], o["pile_code"],
                    o["start_time"], o["end_time"],
                    float(o.get("duration_min", 0)),
                    float(o["power_kwh"]), float(o["amount"]),
                    float(o.get("electricity_fee", 0)) if o.get("electricity_fee") else None,
                    float(o.get("service_fee", 0)) if o.get("service_fee") else None,
                    o.get("user_id"), o.get("pay_status", "paid"),
                    batch_no, datetime.now().isoformat(timespec="seconds"),
                ),
            )
            order_count += 1
        except Exception as e:
            order_errors.append({"order_no": o.get("order_no"), "error": str(e)})

    conn.commit()
    conn.close()

    stats = {
        "stations": {"total": len(stations), "imported": station_count, "errors": len(station_errors)},
        "orders": {"total": len(orders), "imported": order_count, "errors": len(order_errors)},
        "station_errors": station_errors[:10],
        "order_errors": order_errors[:10],
    }

    RiskLogger.import_summary(batch_no, "FIRST", stats, operator)

    return {
        "batch_no": batch_no,
        "batch_type": "FIRST",
        "stats": stats,
        "message": "第一次导入完成，系统已留痕。可用 `pledge-risk logs --batch-no " + batch_no + "` 查看详情。",
    }


def import_second_batch(
    device_status_path: str,
    batch_no: str,
    compare_batch: Optional[str] = None,
    operator: Optional[str] = None,
    remark: Optional[str] = None,
) -> Dict:
    """第二次导入：设备状态补充，自动对比前后变化"""
    _create_batch(batch_no, "SECOND", operator, remark)

    device_status = _read_csv(device_status_path)

    conn = get_conn()
    c = conn.cursor()

    status_before = None
    if compare_batch:
        c.execute(
            """
            SELECT online_status, COUNT(*) as cnt FROM device_status
            WHERE import_batch_no = ? GROUP BY online_status
            """,
            (compare_batch,),
        )
        status_before = {row["online_status"]: row["cnt"] for row in c.fetchall()}

    status_count = 0
    status_errors = []
    online_count = 0
    offline_count = 0

    for d in device_status:
        try:
            c.execute(
                """
                INSERT OR REPLACE INTO device_status (
                    station_code, pile_code, report_date, online_status,
                    offline_hours, last_online_time, fault_code, fault_desc,
                    import_batch_no, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    d["station_code"], d["pile_code"], d["report_date"],
                    d["online_status"],
                    float(d.get("offline_hours", 0)),
                    d.get("last_online_time"),
                    d.get("fault_code"), d.get("fault_desc"),
                    batch_no, datetime.now().isoformat(timespec="seconds"),
                ),
            )
            status_count += 1
            if d["online_status"].lower() == "online":
                online_count += 1
            else:
                offline_count += 1
        except Exception as e:
            status_errors.append({"pile_code": d.get("pile_code"), "error": str(e)})

    status_after = {"online": online_count, "offline": offline_count}

    diff = None
    if status_before is not None:
        before_online = status_before.get("online", 0)
        before_offline = status_before.get("offline", 0)
        diff = {
            "online": {"before": before_online, "after": online_count, "change": online_count - before_online},
            "offline": {"before": before_offline, "after": offline_count, "change": offline_count - before_offline},
        }

    conn.commit()
    conn.close()

    stats = {
        "device_status": {"total": len(device_status), "imported": status_count, "errors": len(status_errors)},
        "status_after": status_after,
        "status_before": status_before,
        "diff": diff,
        "errors": status_errors[:10],
    }

    RiskLogger.import_summary(batch_no, "SECOND", stats, operator)
    if diff:
        RiskLogger.analysis_result(
            "DEVICE_STATUS_CHANGE",
            f"批次{compare_batch}->{batch_no} 设备状态变化: 在线{diff['online']['change']:+d}, 离线{diff['offline']['change']:+d}",
            diff,
            batch_no,
        )

    return {
        "batch_no": batch_no,
        "batch_type": "SECOND",
        "compare_with": compare_batch,
        "stats": stats,
        "message": "第二次导入完成，系统已自动计算前后变化并留痕。可用 `pledge-risk analyze --risk-types DEVICE_OFFLINE` 拆解离线问题。",
    }
