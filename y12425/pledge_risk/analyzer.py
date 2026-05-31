"""风险拆解引擎
自动拆分：设备离线、收益重复、规则过期
每项风险都指向原始记录（桩站档案行/充电订单行）
"""
import json
from datetime import datetime, date
from typing import List, Dict, Optional
from .models import get_conn
from .risk_logger import RiskLogger


def analyze(
    risk_types: List[str],
    station_code: Optional[str] = None,
    batch_no: Optional[str] = None,
    offline_threshold_hours: float = 4,
) -> Dict:
    """统一分析入口"""
    results = {}

    if "DEVICE_OFFLINE" in risk_types:
        results["device_offline"] = _analyze_device_offline(
            station_code=station_code,
            batch_no=batch_no,
            threshold_hours=offline_threshold_hours,
        )

    if "REVENUE_DUPLICATE" in risk_types:
        results["revenue_duplicate"] = _analyze_revenue_duplicate(
            station_code=station_code,
            batch_no=batch_no,
        )

    if "RULE_EXPIRED" in risk_types:
        results["rule_expired"] = _analyze_rule_expired(
            station_code=station_code,
            batch_no=batch_no,
        )

    _save_analysis_result(results, station_code, batch_no)

    return {
        "analysis_time": datetime.now().isoformat(timespec="seconds"),
        "risk_types": risk_types,
        "station_code": station_code,
        "batch_no": batch_no,
        "results": results,
        "summary": _build_summary(results),
        "message": "风险拆解完成，每项风险均已记录到风控日志。可用 `pledge-risk logs --risk-type DEVICE_OFFLINE` 查看。",
    }


def _analyze_device_offline(
    station_code: Optional[str],
    batch_no: Optional[str],
    threshold_hours: float,
) -> Dict:
    """拆解设备离线风险，每条记录指向device_status表"""
    conn = get_conn()
    c = conn.cursor()

    sql = """
        SELECT id, station_code, pile_code, report_date, offline_hours, last_online_time, fault_code
        FROM device_status
        WHERE online_status != 'online' AND offline_hours >= ?
    """
    params = [threshold_hours]
    if station_code:
        sql += " AND station_code = ?"
        params.append(station_code)
    if batch_no:
        sql += " AND import_batch_no = ?"
        params.append(batch_no)

    rows = c.execute(sql, params).fetchall()
    conn.close()

    offline_records = []
    for r in rows:
        record = {
            "id": r["id"],
            "station_code": r["station_code"],
            "pile_code": r["pile_code"],
            "report_date": r["report_date"],
            "offline_hours": r["offline_hours"],
            "last_online_time": r["last_online_time"],
            "fault_code": r["fault_code"],
            "source": f"device_status:{r['id']}",
        }
        offline_records.append(record)
        RiskLogger.device_offline(
            station_code=r["station_code"],
            pile_code=r["pile_code"],
            report_date=r["report_date"],
            offline_hours=r["offline_hours"],
            threshold_hours=threshold_hours,
            import_batch_no=batch_no,
        )

    return {
        "threshold_hours": threshold_hours,
        "total_offline_over_threshold": len(offline_records),
        "records": offline_records,
    }


def _analyze_revenue_duplicate(
    station_code: Optional[str],
    batch_no: Optional[str],
) -> Dict:
    """拆解收益重复风险，指向具体充电订单记录"""
    conn = get_conn()
    c = conn.cursor()

    sql = """
        SELECT o1.id as id1, o1.order_no as order1, o1.amount, o1.station_code, o1.pile_code, o1.start_time,
               o2.id as id2, o2.order_no as order2
        FROM charging_orders o1
        JOIN charging_orders o2 ON o1.station_code = o2.station_code
                               AND o1.pile_code = o2.pile_code
                               AND o1.start_time = o2.start_time
                               AND o1.id < o2.id
                               AND ABS(o1.amount - o2.amount) < 0.01
    """
    params = []
    if station_code:
        sql += " AND o1.station_code = ?"
        params.append(station_code)
    if batch_no:
        sql += " AND o1.import_batch_no = ? AND o2.import_batch_no = ?"
        params.extend([batch_no, batch_no])

    rows = c.execute(sql, params).fetchall()
    conn.close()

    duplicate_groups = {}
    for r in rows:
        key = r["order1"]
        if key not in duplicate_groups:
            duplicate_groups[key] = {
                "order_no": r["order1"],
                "station_code": r["station_code"],
                "pile_code": r["pile_code"],
                "start_time": r["start_time"],
                "amount": r["amount"],
                "source": f"charging_orders:{r['id1']}",
                "duplicate_with": [],
            }
        duplicate_groups[key]["duplicate_with"].append({
            "order_no": r["order2"],
            "source": f"charging_orders:{r['id2']}",
        })
        RiskLogger.revenue_duplicate(
            order_no=r["order1"],
            duplicate_order_nos=[r["order2"]],
            station_code=r["station_code"],
            amount=r["amount"],
            import_batch_no=batch_no,
        )

    return {
        "total_duplicate_groups": len(duplicate_groups),
        "total_duplicated_amount": sum(g["amount"] for g in duplicate_groups.values()),
        "groups": list(duplicate_groups.values()),
    }


def _analyze_rule_expired(
    station_code: Optional[str],
    batch_no: Optional[str],
) -> Dict:
    """拆解规则过期风险，指向具体桩站档案记录"""
    conn = get_conn()
    c = conn.cursor()

    today = date.today()
    sql = """
        SELECT id, station_code, station_name, contract_end_date, contract_no, import_batch_no
        FROM station_archives
        WHERE contract_end_date IS NOT NULL
    """
    params = []
    if station_code:
        sql += " AND station_code = ?"
        params.append(station_code)
    if batch_no:
        sql += " AND import_batch_no = ?"
        params.append(batch_no)

    rows = c.execute(sql, params).fetchall()
    conn.close()

    expired_records = []
    for r in rows:
        try:
            end_date = datetime.strptime(r["contract_end_date"], "%Y-%m-%d").date()
            days_remaining = (end_date - today).days
        except (ValueError, TypeError):
            continue

        if days_remaining <= 90:
            record = {
                "id": r["id"],
                "station_code": r["station_code"],
                "station_name": r["station_name"],
                "contract_no": r["contract_no"],
                "contract_end_date": r["contract_end_date"],
                "days_remaining": days_remaining,
                "source": f"station_archives:{r['id']}",
            }
            expired_records.append(record)
            RiskLogger.rule_expired(
                station_code=r["station_code"],
                contract_end_date=r["contract_end_date"],
                days_remaining=days_remaining,
                import_batch_no=batch_no,
            )

    expired_records.sort(key=lambda x: x["days_remaining"])

    return {
        "total_expiring": len(expired_records),
        "already_expired": sum(1 for r in expired_records if r["days_remaining"] <= 0),
        "expiring_in_30_days": sum(1 for r in expired_records if 0 < r["days_remaining"] <= 30),
        "expiring_in_90_days": sum(1 for r in expired_records if 30 < r["days_remaining"] <= 90),
        "records": expired_records,
    }


def _save_analysis_result(results: Dict, station_code: Optional[str], batch_no: Optional[str]) -> None:
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO analysis_results (analysis_type, station_code, result_json, batch_from, batch_to, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            "RISK_ANALYSIS",
            station_code,
            json.dumps(results, ensure_ascii=False),
            batch_no,
            batch_no,
            datetime.now().isoformat(timespec="seconds"),
        ),
    )
    conn.commit()
    conn.close()


def _build_summary(results: Dict) -> Dict:
    summary = {}
    for k, v in results.items():
        if k == "device_offline":
            summary["设备离线"] = f"{v['total_offline_over_threshold']}台设备离线超过{v['threshold_hours']}小时"
        elif k == "revenue_duplicate":
            summary["收益重复"] = f"{v['total_duplicate_groups']}组重复订单，涉及{v['total_duplicated_amount']:.2f}元"
        elif k == "rule_expired":
            summary["规则过期"] = f"{v['total_expiring']}个合同即将到期，其中已过期{v['already_expired']}个"
    return summary
