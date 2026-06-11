"""报告生成模块：生成给海事处的报告，含普通话解释"""

import json
from datetime import datetime
from .db import get_conn


RISK_LEVEL_CN = {
    "low": "低风险",
    "medium": "中风险",
    "high": "高风险"
}

ALERT_TYPE_CN = {
    "turbidity_high": "浊度过高",
    "do_low": "溶解氧偏低",
    "ph_abnormal": "pH值异常",
    "forecast_delayed": "风浪预报晚到"
}

ALERT_LEVEL_CN = {
    "low": "低",
    "medium": "中",
    "high": "高"
}


def generate_task_report(task_code, format="text"):
    """生成单个任务的排程报告"""
    with get_conn() as conn:
        task = conn.execute(
            "SELECT * FROM inspection_tasks WHERE task_code = ?",
            (task_code,)
        ).fetchone()
        if not task:
            return "任务不存在"

        risk = conn.execute("""
            SELECT * FROM risk_assessments
            WHERE task_code = ? ORDER BY assessment_date DESC LIMIT 1
        """, (task_code,)).fetchone()

        wave = None
        water = None
        factors = {}
        alerts = []

        if risk:
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
                SELECT * FROM water_alerts
                WHERE risk_assessment_id = ? ORDER BY alert_level DESC
            """, (risk["id"],)).fetchall()
            alerts = [dict(a) for a in alert_rows]

        tracks = conn.execute("""
            SELECT * FROM ship_tracks WHERE task_id = ? ORDER BY timestamp
        """, (task["id"],)).fetchall()

        if format == "text":
            return _format_text_report(task, risk, wave, water, factors, alerts, tracks)
        elif format == "json":
            return _format_json_report(task, risk, wave, water, factors, alerts, tracks)
        else:
            raise ValueError(f"不支持的格式: {format}")


def _format_text_report(task, risk, wave, water, factors, alerts, tracks):
    lines = []
    lines.append("=" * 60)
    lines.append("       海上风电巡检排程报告")
    lines.append("=" * 60)
    lines.append("")
    lines.append(f"任务编号: {task['task_code']}")
    lines.append(f"风场名称: {task['wind_farm']}")
    lines.append(f"计划日期: {task['planned_date']}")
    if task["tide_window_start"]:
        lines.append(f"潮汐窗口: {task['tide_window_start']} ~ {task['tide_window_end']}")
    lines.append(f"任务状态: {task['status']}")
    if task["ship_name"]:
        lines.append(f"执行船舶: {task['ship_name']}")
    lines.append("")

    sec = 0
    sec_titles = ["一、", "二、", "三、", "四、", "五、", "六、", "七、", "八、"]

    def section(title):
        nonlocal sec
        lines.append("-" * 40)
        lines.append(sec_titles[sec] + title)
        lines.append("-" * 40)
        sec += 1

    section("风险分层结果")
    if risk:
        risk_cn = RISK_LEVEL_CN.get(risk["risk_level"], risk["risk_level"])
        lines.append(f"风险等级: {risk_cn} ({risk['risk_score']} 分)")
        lines.append(f"评估时间: {risk['assessment_date']}")
        if risk["status"] == "reviewed":
            lines.append("状态: 已复核")
        lines.append("")
        lines.append(_generate_plain_explanation(task, risk, wave, water, alerts))
    else:
        lines.append("尚未进行风险评估")
    lines.append("")

    section("风浪预报数据")
    if wave:
        lines.append(f"预报日期: {wave['forecast_date']}")
        lines.append(f"浪高: {wave['wave_height']} m")
        lines.append(f"风速: {wave['wind_speed']} m/s")
        lines.append(f"风向: {wave['wind_direction']}°")
        if wave["is_delayed"]:
            lines.append("⚠️  备注: 该预报为晚到数据，请及时复核")
        lines.append(f"数据来源: {wave['data_source'] or '未知'}")
        if wave["source_file"]:
            lines.append(f"来源文件: {wave['source_file']}")
    else:
        lines.append("暂无风浪预报数据")
    lines.append("")

    section("水质监测数据")
    if water:
        lines.append(f"采样日期: {water['sample_date']}")
        lines.append(f"pH值: {water['ph']}")
        lines.append(f"浊度: {water['turbidity']} NTU")
        lines.append(f"溶解氧: {water['dissolved_oxygen']} mg/L")
        lines.append(f"水温: {water['temperature']} °C")
        if water["sample_location"]:
            lines.append(f"采样点: {water['sample_location']}")
    else:
        lines.append("暂无水质监测数据")
    lines.append("")

    section("水质预警")
    if alerts:
        for a in alerts:
            type_cn = ALERT_TYPE_CN.get(a["alert_type"], a["alert_type"])
            level_cn = ALERT_LEVEL_CN.get(a["alert_level"], a["alert_level"])
            lines.append(f"  [{level_cn}] {type_cn}: {a['description']}")
    else:
        lines.append("无预警")
    lines.append("")

    if tracks:
        section("船舶轨迹")
        lines.append(f"共 {len(tracks)} 条轨迹记录")
        for t in tracks[:3]:
            lines.append(f"  {t['timestamp']}  位置: ({t['lon']}, {t['lat']})"
                         f"  航速: {t['speed'] or '-'} kn")
        if len(tracks) > 3:
            lines.append(f"  ... 还有 {len(tracks) - 3} 条")
        lines.append("")

    section("复核入口")
    lines.append("如需复核本任务的风险评估结果，可执行:")
    if risk:
        lines.append(f"  owi review {risk['id']} --type risk_level --value medium --reviewer 张三 --reason 现场核实实际海况较好")
    else:
        lines.append("  (请先完成风险评估后再进行复核)")
    lines.append("")

    lines.append("=" * 60)
    lines.append("报告生成时间: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    lines.append("=" * 60)

    return "\n".join(lines)


def _format_json_report(task, risk, wave, water, factors, alerts, tracks):
    report = {
        "task": dict(task),
        "risk_assessment": {
            **dict(risk),
            "factors": factors
        } if risk else None,
        "wave_forecast": dict(wave) if wave else None,
        "water_quality": dict(water) if water else None,
        "alerts": alerts,
        "ship_tracks": [dict(t) for t in tracks],
        "plain_explanation": _generate_plain_explanation(task, risk, wave, water, alerts)
    }
    return json.dumps(report, ensure_ascii=False, indent=2)


def _generate_plain_explanation(task, risk, wave, water, alerts):
    """生成普通话解释，海洋监测员可以直接复制给同事"""
    if not risk:
        return ""

    risk_cn = RISK_LEVEL_CN.get(risk["risk_level"], risk["risk_level"])
    score = risk["risk_score"]

    parts = []
    parts.append("【普通话解释】")
    parts.append(f"各位同事，{task['wind_farm']}风场 {task['planned_date']} 的巡检排程已生成。")
    parts.append(f"本次评估整体为{risk_cn}（{score}分），以下是具体说明：")
    parts.append("")

    if wave:
        wave_h = wave["wave_height"]
        wind_s = wave["wind_speed"]
        if wave_h is not None:
            if wave_h >= 2.5:
                parts.append(f"  • 海况方面：浪高{wave_h}米，风大浪急，出海作业要特别注意安全。")
            elif wave_h >= 1.5:
                parts.append(f"  • 海况方面：浪高{wave_h}米，有一定风浪，常规作业可以正常进行。")
            else:
                parts.append(f"  • 海况方面：浪高{wave_h}米，海况良好，适合出海作业。")
        if wave["is_delayed"]:
            parts.append("  • 注意：当天的风浪预报到得比较晚，上面的评估是按晚到的数据算的，建议再核实一下。")
        parts.append("")

    if water:
        parts.append("  • 水质方面：")
        if water["turbidity"] is not None:
            parts.append(f"    - 浊度 {water['turbidity']} NTU，"
                         f"{'偏高，视线会受影响' if water['turbidity'] >= 50 else '在正常范围内'}")
        if water["dissolved_oxygen"] is not None:
            parts.append(f"    - 溶解氧 {water['dissolved_oxygen']} mg/L，"
                         f"{'偏低，水下作业要留意' if water['dissolved_oxygen'] <= 5 else '正常'}")
        if water["ph"] is not None:
            parts.append(f"    - pH值 {water['ph']}，"
                         f"{'略有异常' if water['ph'] < 6.5 or water['ph'] > 8.5 else '正常'}")
        parts.append("")

    if alerts:
        parts.append("  • 预警提醒：")
        for a in alerts:
            type_cn = ALERT_TYPE_CN.get(a["alert_type"], a["alert_type"])
            level_cn = ALERT_LEVEL_CN.get(a["alert_level"], a["alert_level"])
            parts.append(f"    - [{level_cn}级] {type_cn}：{a['description']}")
        parts.append("")

    parts.append("以上就是本次排程的主要情况，有问题随时沟通。")

    return "\n".join(parts)


def generate_batch_report(date_from=None, date_to=None, wind_farm=None):
    """生成批量排程报告"""
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
        query += " ORDER BY planned_date"

        rows = conn.execute(query, params).fetchall()

        lines = []
        lines.append("=" * 70)
        lines.append("             海上风电巡检排程汇总报告")
        lines.append("=" * 70)
        lines.append("")

        if date_from or date_to:
            lines.append(f"报告时段: {date_from or '开始'} ~ {date_to or '至今'}")
        if wind_farm:
            lines.append(f"风场: {wind_farm}")
        lines.append(f"任务总数: {len(rows)}")
        lines.append("")

        lines.append("-" * 70)
        lines.append(f"{'任务编号':<18}{'风场':<14}{'计划日期':<14}{'风险等级':<10}{'状态':<10}")
        lines.append("-" * 70)

        for row in rows:
            tc = row["task_code"]
            task = conn.execute(
                "SELECT * FROM inspection_tasks WHERE task_code = ?",
                (tc,)
            ).fetchone()
            risk = conn.execute("""
                SELECT * FROM risk_assessments WHERE task_code = ?
                ORDER BY assessment_date DESC LIMIT 1
            """, (tc,)).fetchone()

            risk_cn = RISK_LEVEL_CN.get(risk["risk_level"], "-") if risk else "-"
            status = task["status"]
            if risk and risk["status"] == "reviewed":
                status += "(已复核)"

            lines.append(f"{tc:<18}{task['wind_farm']:<14}{task['planned_date']:<14}"
                         f"{risk_cn:<10}{status:<10}")

        lines.append("")
        lines.append("=" * 70)
        lines.append("报告生成时间: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        lines.append("=" * 70)

        return "\n".join(lines)
