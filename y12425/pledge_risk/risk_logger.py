"""风控日志 - 替代聊天截图，系统自动留痕"""
import json
from datetime import datetime
from typing import Optional, Any
from .models import get_conn


class RiskLogger:
    @staticmethod
    def log(
        risk_type: str,
        risk_level: str,
        description: str,
        related_table: Optional[str] = None,
        related_id: Optional[int] = None,
        related_key: Optional[str] = None,
        import_batch_no: Optional[str] = None,
        evidence: Optional[dict] = None,
        operator: Optional[str] = None,
    ) -> int:
        conn = get_conn()
        c = conn.cursor()
        evidence_str = json.dumps(evidence, ensure_ascii=False) if evidence else None
        c.execute(
            """
            INSERT INTO risk_logs (
                risk_type, risk_level, description, related_table,
                related_id, related_key, import_batch_no, evidence,
                operator, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                risk_type, risk_level, description, related_table,
                related_id, related_key, import_batch_no, evidence_str,
                operator, datetime.now().isoformat(timespec="seconds")
            ),
        )
        log_id = c.lastrowid
        conn.commit()
        conn.close()
        return log_id

    @staticmethod
    def device_offline(
        station_code: str,
        pile_code: str,
        report_date: str,
        offline_hours: float,
        threshold_hours: float,
        import_batch_no: Optional[str] = None,
    ) -> int:
        return RiskLogger.log(
            risk_type="DEVICE_OFFLINE",
            risk_level="high" if offline_hours >= threshold_hours * 2 else "medium",
            description=f"桩{pile_code}在{report_date}离线{offline_hours}小时，超过阈值{threshold_hours}小时",
            related_table="device_status",
            related_key=f"{station_code}:{pile_code}:{report_date}",
            import_batch_no=import_batch_no,
            evidence={
                "station_code": station_code,
                "pile_code": pile_code,
                "report_date": report_date,
                "offline_hours": offline_hours,
                "threshold_hours": threshold_hours,
            },
        )

    @staticmethod
    def revenue_duplicate(
        order_no: str,
        duplicate_order_nos: list,
        station_code: str,
        amount: float,
        import_batch_no: Optional[str] = None,
    ) -> int:
        return RiskLogger.log(
            risk_type="REVENUE_DUPLICATE",
            risk_level="high",
            description=f"订单{order_no}与订单{duplicate_order_nos}重复，涉及金额{amount}元",
            related_table="charging_orders",
            related_key=order_no,
            import_batch_no=import_batch_no,
            evidence={
                "order_no": order_no,
                "duplicate_order_nos": duplicate_order_nos,
                "station_code": station_code,
                "amount": amount,
            },
        )

    @staticmethod
    def rule_expired(
        station_code: str,
        contract_end_date: str,
        days_remaining: int,
        import_batch_no: Optional[str] = None,
    ) -> int:
        return RiskLogger.log(
            risk_type="RULE_EXPIRED",
            risk_level="high" if days_remaining <= 0 else ("medium" if days_remaining <= 30 else "low"),
            description=f"桩站{station_code}合同{contract_end_date}到期，剩余{days_remaining}天",
            related_table="station_archives",
            related_key=station_code,
            import_batch_no=import_batch_no,
            evidence={
                "station_code": station_code,
                "contract_end_date": contract_end_date,
                "days_remaining": days_remaining,
            },
        )

    @staticmethod
    def import_summary(
        batch_no: str,
        batch_type: str,
        stats: dict,
        operator: Optional[str] = None,
    ) -> int:
        return RiskLogger.log(
            risk_type="IMPORT_SUMMARY",
            risk_level="info",
            description=f"批次{batch_no}({batch_type})导入完成: {json.dumps(stats, ensure_ascii=False)}",
            import_batch_no=batch_no,
            evidence=stats,
            operator=operator,
        )

    @staticmethod
    def analysis_result(
        analysis_type: str,
        description: str,
        evidence: dict,
        import_batch_no: Optional[str] = None,
    ) -> int:
        return RiskLogger.log(
            risk_type=f"ANALYSIS_{analysis_type.upper()}",
            risk_level="info",
            description=description,
            import_batch_no=import_batch_no,
            evidence=evidence,
        )

    @staticmethod
    def get_logs(batch_no: Optional[str] = None, risk_type: Optional[str] = None) -> list:
        conn = get_conn()
        c = conn.cursor()
        sql = "SELECT * FROM risk_logs WHERE 1=1"
        params = []
        if batch_no:
            sql += " AND import_batch_no = ?"
            params.append(batch_no)
        if risk_type:
            sql += " AND risk_type = ?"
            params.append(risk_type)
        sql += " ORDER BY created_at DESC"
        rows = c.execute(sql, params).fetchall()
        conn.close()
        return [dict(r) for r in rows]
