"""排程核心逻辑：风险分层、水质预警、潮汐窗口计算
风险分层和水质预警共用同一批处理记录（risk_assessments）
"""

import json
from datetime import datetime, timedelta
from .db import get_conn, log_processing


WAVE_HEIGHT_THRESHOLDS = {
    "low": 1.5,
    "medium": 2.5,
    "high": 3.5
}

WATER_QUALITY_THRESHOLDS = {
    "turbidity_high": 50.0,
    "do_low": 5.0,
    "ph_low": 6.5,
    "ph_high": 8.5
}


def calculate_risk_score(wave_height, wind_speed, turbidity=None, dissolved_oxygen=None, ph=None):
    """计算风险分数 0-100，分数越高风险越大"""
    score = 0

    if wave_height is not None:
        if wave_height >= 3.5:
            score += 40
        elif wave_height >= 2.5:
            score += 25
        elif wave_height >= 1.5:
            score += 15
        else:
            score += 5

    if wind_speed is not None:
        if wind_speed >= 20:
            score += 30
        elif wind_speed >= 15:
            score += 20
        elif wind_speed >= 10:
            score += 10
        else:
            score += 5

    if turbidity is not None:
        if turbidity >= 80:
            score += 20
        elif turbidity >= 50:
            score += 12
        elif turbidity >= 30:
            score += 6
        else:
            score += 2

    if dissolved_oxygen is not None:
        if dissolved_oxygen <= 3:
            score += 20
        elif dissolved_oxygen <= 5:
            score += 12
        elif dissolved_oxygen <= 6:
            score += 5

    if ph is not None:
        if ph < 6 or ph > 9:
            score += 15
        elif ph < 6.5 or ph > 8.5:
            score += 8

    return min(score, 100)


def score_to_level(score):
    if score >= 70:
        return "high"
    elif score >= 40:
        return "medium"
    else:
        return "low"


def assess_task_risk(task_code):
    """对单个巡检任务做风险评估，风险分层和水质预警共用此记录"""
    with get_conn() as conn:
        task = conn.execute(
            "SELECT * FROM inspection_tasks WHERE task_code = ?",
            (task_code,)
        ).fetchone()
        if not task:
            raise ValueError(f"任务不存在: {task_code}")

        wave = conn.execute("""
            SELECT * FROM wave_forecasts
            WHERE wind_farm = ? AND forecast_date = ?
            ORDER BY received_at DESC LIMIT 1
        """, (task["wind_farm"], task["planned_date"])).fetchone()

        water = conn.execute("""
            SELECT * FROM water_quality
            WHERE wind_farm = ? AND sample_date <= ?
            ORDER BY sample_date DESC LIMIT 1
        """, (task["wind_farm"], task["planned_date"])).fetchone()

        factors = {}
        wave_height = wave["wave_height"] if wave else None
        wind_speed = wave["wind_speed"] if wave else None
        turbidity = water["turbidity"] if water else None
        do_val = water["dissolved_oxygen"] if water else None
        ph_val = water["ph"] if water else None

        if wave:
            factors["wave_forecast_id"] = wave["id"]
            factors["wave_height"] = wave_height
            factors["wind_speed"] = wind_speed
            if wave["is_delayed"]:
                factors["forecast_delayed"] = True

        if water:
            factors["water_quality_id"] = water["id"]
            factors["turbidity"] = turbidity
            factors["dissolved_oxygen"] = do_val
            factors["ph"] = ph_val

        risk_score = calculate_risk_score(wave_height, wind_speed, turbidity, do_val, ph_val)
        risk_level = score_to_level(risk_score)
        factors_json = json.dumps(factors, ensure_ascii=False)

        wave_id = wave["id"] if wave else None
        water_id = water["id"] if water else None

        cur = conn.execute("""
            INSERT INTO risk_assessments
            (task_id, task_code, risk_level, risk_score, factors,
             wave_forecast_id, water_quality_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (task["id"], task_code, risk_level, risk_score, factors_json,
              wave_id, water_id))
        risk_id = cur.lastrowid

        log_processing(
            conn,
            operation="risk_assessment",
            entity_type="risk_assessment",
            entity_id=risk_id,
            source_ref=f"task:{task_code}",
            result_ref=f"risk:{risk_id}",
            details=f"风险评估完成: 任务={task_code} 等级={risk_level} 分数={risk_score}"
        )

        alerts = _generate_water_alerts(conn, risk_id, water, wave)
        for a in alerts:
            log_processing(
                conn,
                operation="water_alert",
                entity_type="water_alert",
                entity_id=a["id"],
                source_ref=f"risk_assessment:{risk_id}",
                result_ref=f"alert:{a['id']}",
                details=f"水质预警触发: {a['alert_type']} 等级={a['alert_level']}"
            )

        return {
            "id": risk_id,
            "task_code": task_code,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "factors": factors,
            "alerts": alerts
        }


def _generate_water_alerts(conn, risk_id, water, wave):
    """根据水质和风浪数据生成预警，与风险分层共用 risk_assessment_id"""
    alerts = []
    if not water:
        return alerts

    if water["turbidity"] is not None and water["turbidity"] >= WATER_QUALITY_THRESHOLDS["turbidity_high"]:
        cur = conn.execute("""
            INSERT INTO water_alerts (risk_assessment_id, alert_level, alert_type, description)
            VALUES (?, ?, ?, ?)
        """, (risk_id, "high", "turbidity_high",
              f"浊度过高: {water['turbidity']} NTU，超过安全阈值 50 NTU"))
        alerts.append({"id": cur.lastrowid, "alert_level": "high", "alert_type": "turbidity_high"})

    if water["dissolved_oxygen"] is not None and water["dissolved_oxygen"] <= WATER_QUALITY_THRESHOLDS["do_low"]:
        cur = conn.execute("""
            INSERT INTO water_alerts (risk_assessment_id, alert_level, alert_type, description)
            VALUES (?, ?, ?, ?)
        """, (risk_id, "medium", "do_low",
              f"溶解氧偏低: {water['dissolved_oxygen']} mg/L，低于阈值 5 mg/L"))
        alerts.append({"id": cur.lastrowid, "alert_level": "medium", "alert_type": "do_low"})

    if water["ph"] is not None and (water["ph"] < WATER_QUALITY_THRESHOLDS["ph_low"]
                                     or water["ph"] > WATER_QUALITY_THRESHOLDS["ph_high"]):
        cur = conn.execute("""
            INSERT INTO water_alerts (risk_assessment_id, alert_level, alert_type, description)
            VALUES (?, ?, ?, ?)
        """, (risk_id, "medium", "ph_abnormal",
              f"pH值异常: {water['ph']}，正常范围 6.5-8.5"))
        alerts.append({"id": cur.lastrowid, "alert_level": "medium", "alert_type": "ph_abnormal"})

    if wave and wave["is_delayed"]:
        cur = conn.execute("""
            INSERT INTO water_alerts (risk_assessment_id, alert_level, alert_type, description)
            VALUES (?, ?, ?, ?)
        """, (risk_id, "low", "forecast_delayed",
              "风浪预报晚到，风险评估结果仅供参考，请及时复核"))
        alerts.append({"id": cur.lastrowid, "alert_level": "low", "alert_type": "forecast_delayed"})

    return alerts


def batch_assess(date_from=None, date_to=None, wind_farm=None):
    """批量评估指定范围内的任务"""
    with get_conn() as conn:
        query = "SELECT task_code FROM inspection_tasks WHERE 1=1"
        params = []
        if date_from:
            query += " AND planned_date >= ?"
            params.append(date_from)
        if date_to:
            query += " AND planned_date <= ?"
            params.append(date_to)
        if wind_farm:
            query += " AND wind_farm = ?"
            params.append(wind_farm)

        rows = conn.execute(query, params).fetchall()
        results = []
        for row in rows:
            results.append(assess_task_risk(row["task_code"]))
        return results


def get_delayed_forecasts():
    """获取所有晚到的风浪预报记录，方便复核"""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT wf.*, t.task_code, t.id as task_id
            FROM wave_forecasts wf
            LEFT JOIN inspection_tasks t ON t.wind_farm = wf.wind_farm AND t.planned_date = wf.forecast_date
            WHERE wf.is_delayed = 1
            ORDER BY wf.received_at DESC
        """).fetchall()
        return [dict(r) for r in rows]


def create_review(risk_assessment_id, review_type, corrected_value, reviewer, reason):
    """创建复核记录，提供复核入口，不用重新导入"""
    with get_conn() as conn:
        risk = conn.execute(
            "SELECT * FROM risk_assessments WHERE id = ?",
            (risk_assessment_id,)
        ).fetchone()
        if not risk:
            raise ValueError(f"风险评估不存在: {risk_assessment_id}")

        original_value = risk["risk_level"] if review_type == "risk_level" else str(risk["risk_score"])

        cur = conn.execute("""
            INSERT INTO reviews
            (risk_assessment_id, review_type, original_value, corrected_value, reviewer, reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'completed')
        """, (risk_assessment_id, review_type, original_value, corrected_value, reviewer, reason))
        review_id = cur.lastrowid

        if review_type == "risk_level":
            conn.execute("""
                UPDATE risk_assessments SET risk_level = ?, status = 'reviewed' WHERE id = ?
            """, (corrected_value, risk_assessment_id))

        log_processing(
            conn,
            operation="review",
            entity_type="risk_assessment",
            entity_id=risk_assessment_id,
            source_ref=f"review:{review_id}",
            result_ref=corrected_value,
            details=f"复核完成: 类型={review_type} 原值={original_value} 修正为={corrected_value} 原因={reason}"
        )

        return {"id": review_id, "review_type": review_type,
                "original": original_value, "corrected": corrected_value}
