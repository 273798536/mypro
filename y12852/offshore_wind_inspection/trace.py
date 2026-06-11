"""追溯模块：从异常结果一路回到来源和处理记录
顺着一条异常往回查，能查到船舶轨迹和处理意见
"""

import json
from .db import get_conn


def trace_from_alert(alert_id):
    """从水质预警倒查完整链路：预警 → 风险评估 → 任务 → 船舶轨迹 → 原始数据 → 处理日志"""
    with get_conn() as conn:
        alert = conn.execute(
            "SELECT * FROM water_alerts WHERE id = ?",
            (alert_id,)
        ).fetchone()
        if not alert:
            return {"error": "预警记录不存在"}

        risk = conn.execute(
            "SELECT * FROM risk_assessments WHERE id = ?",
            (alert["risk_assessment_id"],)
        ).fetchone()

        task = None
        tracks = []
        if risk and risk["task_id"]:
            task = conn.execute(
                "SELECT * FROM inspection_tasks WHERE id = ?",
                (risk["task_id"],)
            ).fetchone()
            if task:
                track_rows = conn.execute("""
                    SELECT * FROM ship_tracks
                    WHERE task_id = ? ORDER BY timestamp
                """, (risk["task_id"],)).fetchall()
                tracks = [dict(r) for r in track_rows]

        wave = None
        if risk and risk["wave_forecast_id"]:
            wave = conn.execute(
                "SELECT * FROM wave_forecasts WHERE id = ?",
                (risk["wave_forecast_id"],)
            ).fetchone()

        water = None
        if risk and risk["water_quality_id"]:
            water = conn.execute(
                "SELECT * FROM water_quality WHERE id = ?",
                (risk["water_quality_id"],)
            ).fetchone()

        logs = _get_entity_logs(conn, "water_alert", alert_id)
        if risk:
            logs.extend(_get_entity_logs(conn, "risk_assessment", risk["id"]))
        if task:
            logs.extend(_get_entity_logs(conn, "inspection_task", task["id"]))

        reviews = []
        if risk:
            review_rows = conn.execute("""
                SELECT * FROM reviews WHERE risk_assessment_id = ?
                ORDER BY created_at DESC
            """, (risk["id"],)).fetchall()
            reviews = [dict(r) for r in review_rows]

        factors = {}
        if risk and risk["factors"]:
            try:
                factors = json.loads(risk["factors"])
            except json.JSONDecodeError:
                pass

        return {
            "alert": dict(alert) if alert else None,
            "risk_assessment": {**dict(risk), "factors": factors} if risk else None,
            "task": dict(task) if task else None,
            "ship_tracks": tracks,
            "wave_forecast": dict(wave) if wave else None,
            "water_quality": dict(water) if water else None,
            "processing_logs": sorted(
                [dict(l) for l in logs],
                key=lambda x: x["timestamp"]
            ),
            "reviews": reviews
        }


def trace_from_risk(risk_id):
    """从风险评估记录倒查"""
    with get_conn() as conn:
        risk = conn.execute(
            "SELECT * FROM risk_assessments WHERE id = ?",
            (risk_id,)
        ).fetchone()
        if not risk:
            return {"error": "风险评估不存在"}

        alerts = conn.execute("""
            SELECT * FROM water_alerts WHERE risk_assessment_id = ?
        """, (risk_id,)).fetchall()

        result = trace_from_alert(alerts[0]["id"]) if alerts else {}
        if not result:
            task = conn.execute(
                "SELECT * FROM inspection_tasks WHERE id = ?",
                (risk["task_id"],)
            ).fetchone() if risk["task_id"] else None
            logs = _get_entity_logs(conn, "risk_assessment", risk_id)
            result = {
                "risk_assessment": dict(risk),
                "task": dict(task) if task else None,
                "processing_logs": [dict(l) for l in logs],
                "alerts": [dict(a) for a in alerts]
            }
        return result


def trace_from_task(task_code):
    """从巡检任务倒查所有相关记录"""
    with get_conn() as conn:
        task = conn.execute(
            "SELECT * FROM inspection_tasks WHERE task_code = ?",
            (task_code,)
        ).fetchone()
        if not task:
            return {"error": "任务不存在"}

        risks = conn.execute("""
            SELECT * FROM risk_assessments WHERE task_id = ?
            ORDER BY assessment_date DESC
        """, (task["id"],)).fetchall()

        tracks = conn.execute("""
            SELECT * FROM ship_tracks WHERE task_id = ? ORDER BY timestamp
        """, (task["id"],)).fetchall()

        logs = _get_entity_logs(conn, "inspection_task", task["id"])

        risk = None
        wave = None
        water = None
        alerts = []
        reviews = []
        factors = {}

        if risks:
            risk = risks[0]
            if risk["wave_forecast_id"]:
                wave = conn.execute(
                    "SELECT * FROM wave_forecasts WHERE id = ?",
                    (risk["wave_forecast_id"],)
                ).fetchone()
            if risk["water_quality_id"]:
                water = conn.execute(
                    "SELECT * FROM water_quality WHERE id = ?",
                    (risk["water_quality_id"],)
                ).fetchone()
            if risk["factors"]:
                try:
                    factors = json.loads(risk["factors"])
                except json.JSONDecodeError:
                    pass

            alert_rows = conn.execute("""
                SELECT * FROM water_alerts WHERE risk_assessment_id = ?
            """, (risk["id"],)).fetchall()
            alerts = [dict(a) for a in alert_rows]

            review_rows = conn.execute("""
                SELECT * FROM reviews WHERE risk_assessment_id = ?
                ORDER BY created_at DESC
            """, (risk["id"],)).fetchall()
            reviews = [dict(r) for r in review_rows]

            logs.extend(_get_entity_logs(conn, "risk_assessment", risk["id"]))

        risk_dict = None
        if risk:
            risk_dict = {**dict(risk), "factors": factors}

        return {
            "task": dict(task),
            "risk_assessment": risk_dict,
            "wave_forecast": dict(wave) if wave else None,
            "water_quality": dict(water) if water else None,
            "alerts": alerts,
            "ship_tracks": [dict(t) for t in tracks],
            "reviews": reviews,
            "processing_logs": sorted(
                [dict(l) for l in logs],
                key=lambda x: x["timestamp"]
            )
        }


def _get_entity_logs(conn, entity_type, entity_id):
    rows = conn.execute("""
        SELECT * FROM processing_logs
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY timestamp
    """, (entity_type, entity_id)).fetchall()
    return rows


def get_processing_chain(entity_type, entity_id):
    """获取实体的完整处理链，包括来源和结果引用"""
    with get_conn() as conn:
        logs = conn.execute("""
            SELECT * FROM processing_logs
            WHERE entity_type = ? AND entity_id = ?
            ORDER BY timestamp
        """, (entity_type, entity_id)).fetchall()

        chain = []
        for log in logs:
            entry = dict(log)
            if log["source_ref"]:
                parts = log["source_ref"].split(":")
                if len(parts) == 2:
                    entry["source_entity"] = parts[0]
                    entry["source_entity_id"] = parts[1]
            if log["result_ref"]:
                parts = log["result_ref"].split(":")
                if len(parts) == 2:
                    entry["result_entity"] = parts[0]
                    entry["result_entity_id"] = parts[1]
            chain.append(entry)
        return chain
