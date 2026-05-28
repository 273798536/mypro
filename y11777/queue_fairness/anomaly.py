from .models import AnomalyRecord, AnomalyType, AuditEntry, CallRecord, ScoreReport
from .fairness import compute_metrics, detect_anomalies


def explain_anomaly(anomaly: AnomalyRecord, calls: list[CallRecord]) -> str:
    parts = [
        f"【{anomaly.anomaly_type.value}】{anomaly.severity}严重度",
        f"结论：{anomaly.description}",
        f"解释：{anomaly.explanation}",
        f"来源：{anomaly.source}",
    ]

    if anomaly.evidence:
        parts.append("数据依据：")
        for k, v in anomaly.evidence.items():
            if isinstance(v, float):
                parts.append(f"  {k}: {v:.4f}")
            else:
                parts.append(f"  {k}: {v}")

    if anomaly.affected_calls:
        affected = anomaly.affected_calls[:5]
        parts.append(f"受影响呼叫（前5个）：{', '.join(affected)}")
        if len(anomaly.affected_calls) > 5:
            parts.append(f"  ...共{len(anomaly.affected_calls)}个")

    if anomaly.anomaly_type == AnomalyType.VIP_SQUEEZE:
        vip_calls = [c for c in calls if c.customer.tier.value == "vip"
                     and c.wait_time is not None and c.wait_time > 300]
        if vip_calls:
            parts.append("典型VIP长等待案例：")
            for vc in vip_calls[:3]:
                parts.append(f"  {vc.call_id}: 等待{vc.wait_time:.0f}秒, 坐席={vc.assigned_agent.agent_id if vc.assigned_agent else '无'}")

    elif anomaly.anomaly_type == AnomalyType.SKILL_MISMATCH:
        mismatch_calls = [c for c in calls if c.skill_matched is False]
        if mismatch_calls:
            parts.append("典型错配案例：")
            for mc in mismatch_calls[:3]:
                skill_info = f"需要[{mc.customer.required_skill}]" if mc.customer.required_skill else "无技能要求"
                agent_skills = ",".join(mc.assigned_agent.skills) if mc.assigned_agent else "无"
                parts.append(f"  {mc.call_id}: {skill_info}, 坐席技能=[{agent_skills}], 服务{mc.service_time:.0f}秒")

    elif anomaly.anomaly_type == AnomalyType.LONG_TAIL_WAIT:
        long_tail = sorted([c for c in calls if c.wait_time is not None and c.wait_time > 600],
                           key=lambda c: -c.wait_time)
        if long_tail:
            parts.append("最长等待案例：")
            for lt in long_tail[:3]:
                parts.append(f"  {lt.call_id}: 等待{lt.wait_time:.0f}秒, 等级={lt.customer.tier.value}")

    return "\n".join(parts)


def explain_report(report: ScoreReport) -> str:
    lines = [
        f"评分报告 {report.report_id}",
        f"生成时间：{report.created_at}",
        f"比较策略数：{len(report.strategies_compared)}",
        "=" * 60,
    ]

    if report.best_strategy:
        lines.append(f"推荐策略：{report.best_strategy}")
        lines.append(f"推荐理由：{report.best_reason}")
        lines.append("")

    for comp in report.strategies_compared:
        m = comp.metrics
        s = comp.strategy
        lines.append(f"策略：{s.name.value} - {s.description}")
        lines.append(f"  Jain公平指数：{m.jain_index:.4f} (1=完全公平)")
        lines.append(f"  基尼系数：{m.gini_coefficient:.4f} (0=完全公平)")
        if m.vip_avg_wait is not None:
            lines.append(f"  VIP平均等待：{m.vip_avg_wait:.1f}秒")
        if m.normal_avg_wait is not None:
            lines.append(f"  普通用户平均等待：{m.normal_avg_wait:.1f}秒")
        if m.low_avg_wait is not None:
            lines.append(f"  低优先级平均等待：{m.low_avg_wait:.1f}秒")
        if m.vip_squeeze_ratio is not None:
            lines.append(f"  VIP/普通等待比：{m.vip_squeeze_ratio:.4f} (<0.7=VIP挤占)")
        lines.append(f"  P90等待：{m.p90_wait:.1f}秒")
        lines.append(f"  P99等待：{m.p99_wait:.1f}秒")
        lines.append(f"  长尾等待(>600s)：{m.long_tail_count}个")
        lines.append(f"  技能错配：{m.skill_mismatch_count}个")
        lines.append(f"  放弃：{m.abandon_count}个")
        lines.append(f"  总呼叫：{m.total_calls}个")

        if comp.anomalies:
            lines.append(f"  异常({len(comp.anomalies)}个)：")
            for a in comp.anomalies:
                lines.append(f"    - [{a.severity}] {a.anomaly_type.value}: {a.description}")
                lines.append(f"      {a.explanation}")
        else:
            lines.append("  未检测到异常")

        lines.append("")

    if report.audit_trail:
        lines.append("修正痕迹：")
        for entry in report.audit_trail:
            lines.append(f"  [{entry.timestamp}] {entry.action}: {entry.field} "
                         f"{entry.old_value}→{entry.new_value} ({entry.reason})")

    return "\n".join(lines)
