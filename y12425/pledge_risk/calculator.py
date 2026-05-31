"""现金流估算、设备校验、质押占用计算
每一项都指向具体的桩站档案或充电订单记录
"""
import json
from datetime import datetime, date
from typing import Optional, Dict, List
from .models import get_conn
from .risk_logger import RiskLogger


def calculate_pledge(
    station_code: str,
    pledge_amount: float,
    start_date: str,
    end_date: str,
    interest_rate: float = 0.06,
    pledge_no: Optional[str] = None,
    operator: Optional[str] = None,
) -> Dict:
    """质押计算：现金流估算 + 设备校验 + 质押占用，全部记录级可追溯"""
    conn = get_conn()
    c = conn.cursor()

    station = c.execute(
        "SELECT * FROM station_archives WHERE station_code = ?",
        (station_code,),
    ).fetchone()

    if not station:
        return {"error": f"桩站 {station_code} 不存在"}

    pledge_no = pledge_no or f"PLEDGE_{station_code}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    cashflow = _calculate_cashflow(c, station_code, start_date, end_date)
    device_check = _check_devices(c, station_code)
    pledge_occupy = _calculate_pledge_occupy(
        cashflow, pledge_amount, interest_rate, start_date, end_date, station
    )

    c.execute(
        """
        INSERT INTO pledge_records (
            pledge_no, station_code, pledge_amount, pledge_start_date,
            pledge_end_date, interest_rate, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            pledge_no, station_code, pledge_amount, start_date, end_date,
            interest_rate, "active", datetime.now().isoformat(timespec="seconds"),
        ),
    )

    conn.commit()
    conn.close()

    result = {
        "pledge_no": pledge_no,
        "station_code": station_code,
        "station_name": station["station_name"],
        "pledge_amount": pledge_amount,
        "start_date": start_date,
        "end_date": end_date,
        "interest_rate": interest_rate,
        "cashflow_estimation": cashflow,
        "device_validation": device_check,
        "pledge_occupation": pledge_occupy,
        "operator": operator,
    }

    RiskLogger.analysis_result(
        "PLEDGE_CALCULATION",
        f"质押{pledge_no}计算完成: 金额{pledge_amount:.2f}元，覆盖倍数{pledge_occupy['coverage_ratio']:.2f}x",
        {k: v for k, v in result.items() if k not in ("cashflow_estimation", "device_validation", "pledge_occupation")},
    )

    return result


def _calculate_cashflow(
    c, station_code: str, start_date: str, end_date: str
) -> Dict:
    """现金流估算，指向具体充电订单记录"""
    c.execute(
        """
        SELECT id, order_no, start_time, amount, power_kwh, pile_code
        FROM charging_orders
        WHERE station_code = ? AND start_time >= ? AND start_time <= ?
        ORDER BY start_time
        """,
        (station_code, start_date + " 00:00:00", end_date + " 23:59:59"),
    )
    orders = c.fetchall()

    order_details = []
    total_amount = 0.0
    total_kwh = 0.0

    for o in orders:
        order_details.append({
            "order_no": o["order_no"],
            "date": o["start_time"][:10],
            "amount": o["amount"],
            "power_kwh": o["power_kwh"],
            "pile_code": o["pile_code"],
            "source": f"charging_orders:{o['id']}",
        })
        total_amount += o["amount"]
        total_kwh += o["power_kwh"]

    monthly_stats = {}
    for d in order_details:
        month = d["date"][:7]
        if month not in monthly_stats:
            monthly_stats[month] = {"amount": 0, "count": 0}
        monthly_stats[month]["amount"] += d["amount"]
        monthly_stats[month]["count"] += 1

    return {
        "period": f"{start_date} 至 {end_date}",
        "total_order_count": len(orders),
        "total_amount": total_amount,
        "total_power_kwh": total_kwh,
        "avg_daily_amount": total_amount / max(1, (date.fromisoformat(end_date) - date.fromisoformat(start_date)).days),
        "monthly_breakdown": monthly_stats,
        "order_details": order_details,
        "summary": f"共{len(orders)}笔订单，合计{total_amount:.2f}元，{total_kwh:.2f}度",
    }


def _check_devices(c, station_code: str) -> Dict:
    """设备校验，指向具体桩站档案和设备状态记录"""
    station = c.execute(
        "SELECT * FROM station_archives WHERE station_code = ?",
        (station_code,),
    ).fetchone()

    c.execute(
        """
        SELECT id, pile_code, report_date, online_status, offline_hours
        FROM device_status
        WHERE station_code = ?
        ORDER BY report_date DESC, pile_code
        """,
        (station_code,),
    )
    devices = c.fetchall()

    device_details = []
    online_count = 0
    offline_count = 0
    total_offline_hours = 0.0

    for d in devices:
        device_details.append({
            "pile_code": d["pile_code"],
            "report_date": d["report_date"],
            "online_status": d["online_status"],
            "offline_hours": d["offline_hours"],
            "source": f"device_status:{d['id']}",
        })
        if d["online_status"].lower() == "online":
            online_count += 1
        else:
            offline_count += 1
        total_offline_hours += d["offline_hours"] or 0

    c.execute(
        "SELECT COUNT(*) as cnt FROM charging_orders WHERE station_code = ?",
        (station_code,),
    )
    order_count = c.fetchone()["cnt"]

    return {
        "station_archive": {
            "station_code": station["station_code"],
            "station_name": station["station_name"],
            "total_piles_registered": station["total_piles"],
            "contract_end_date": station["contract_end_date"],
            "revenue_share_ratio": station["revenue_share_ratio"],
            "source": f"station_archives:{station['id']}",
        },
        "device_status_summary": {
            "total_piles_reported": len(devices),
            "online_count": online_count,
            "offline_count": offline_count,
            "total_offline_hours": total_offline_hours,
            "avg_offline_hours_per_pile": total_offline_hours / max(1, len(devices)),
        },
        "reconciliation": {
            "registered_piles": station["total_piles"],
            "reported_piles": len(devices),
            "mismatch": station["total_piles"] - len(devices),
            "orders_count": order_count,
        },
        "device_details": device_details,
        "summary": f"档案登记{station['total_piles']}台，实际上报{len(devices)}台，在线{online_count}台，离线{offline_count}台",
    }


def _calculate_pledge_occupy(
    cashflow: Dict,
    pledge_amount: float,
    interest_rate: float,
    start_date: str,
    end_date: str,
    station,
) -> Dict:
    """质押占用计算，指向现金流结果和桩站档案"""
    days = (date.fromisoformat(end_date) - date.fromisoformat(start_date)).days
    annual_interest = pledge_amount * interest_rate
    total_interest = annual_interest * (days / 365)
    total_repayment = pledge_amount + total_interest

    share_ratio = station["revenue_share_ratio"] or 1.0
    pledgeable_revenue = cashflow["total_amount"] * share_ratio

    coverage_ratio = pledgeable_revenue / max(0.01, total_repayment)
    daily_coverage = cashflow["avg_daily_amount"] * share_ratio / max(0.01, total_repayment / max(1, days))

    return {
        "principal": pledge_amount,
        "annual_interest_rate": interest_rate,
        "term_days": days,
        "total_interest": total_interest,
        "total_repayment": total_repayment,
        "monthly_repayment": total_repayment / max(1, days / 30),
        "pledgeable_revenue": pledgeable_revenue,
        "revenue_share_ratio": share_ratio,
        "coverage_ratio": coverage_ratio,
        "daily_coverage_ratio": daily_coverage,
        "risk_assessment": _assess_pledge_risk(coverage_ratio, cashflow, station),
        "source": {
            "cashflow_source": "cashflow_estimation.order_details",
            "station_source": f"station_archives:{station['id']}",
        },
        "summary": f"本息合计{total_repayment:.2f}元，可质押收益{pledgeable_revenue:.2f}元，覆盖倍数{coverage_ratio:.2f}x",
    }


def _assess_pledge_risk(coverage_ratio: float, cashflow: Dict, station) -> str:
    if coverage_ratio >= 1.5:
        return "LOW: 覆盖倍数充足"
    elif coverage_ratio >= 1.2:
        return "MEDIUM: 覆盖倍数基本足够"
    elif coverage_ratio >= 1.0:
        return "HIGH: 覆盖倍数刚够，需关注"
    else:
        return "CRITICAL: 覆盖不足，建议缩减质押金额"
