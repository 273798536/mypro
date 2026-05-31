from __future__ import annotations

from datetime import datetime
from typing import Optional

from dateutil.relativedelta import relativedelta

from .calculator import months_between
from .models import Alert, AlertLevel, Phase, SourceRef
from .storage import DataStore


class AlertManager:
    def __init__(self, store: DataStore):
        self.store = store

    def check_initial_phase(self, project_id: str) -> list[Alert]:
        alerts = []
        project = self.store.load_project(project_id)
        if not project:
            return alerts

        if not project.sharing_ratios:
            alerts.append(
                Alert(
                    project_id=project_id,
                    phase=Phase.INITIAL,
                    level=AlertLevel.WARNING,
                    title="缺少收益分成比例",
                    message="项目合同已创建，但尚未设置收益分成比例，请补充分成比例后再进行计算",
                    source_refs=[
                        SourceRef(
                            entity_type="ProjectContract",
                            entity_id=project_id,
                            field="sharing_ratios",
                            description="项目合同",
                        )
                    ],
                )
            )

        if project.baseline_adjustments:
            adjustments_count = len(project.baseline_adjustments)
            alerts.append(
                Alert(
                    project_id=project_id,
                    phase=Phase.INITIAL,
                    level=AlertLevel.INFO,
                    title=f"存在 {adjustments_count} 项基准调整",
                    message="基准电量已调整，请确认调整原因和数值是否正确",
                    source_refs=[
                        SourceRef(
                            entity_type="BaselineAdjustment",
                            entity_id=adj.adjustment_id,
                            field="adjusted_kwh",
                            description=f"{adj.month}: {adj.reason}",
                        )
                        for adj in project.baseline_adjustments
                    ],
                )
            )

        for alert in alerts:
            self.store.save_alert(alert)
        return alerts

    def check_monthly_phase(self, project_id: str, check_month: str) -> list[Alert]:
        alerts = []
        project = self.store.load_project(project_id)
        if not project:
            return alerts

        readings = self.store.load_readings_by_month(project_id, check_month)
        if not readings:
            alerts.append(
                Alert(
                    project_id=project_id,
                    phase=Phase.MONTHLY,
                    level=AlertLevel.CRITICAL,
                    title=f"{check_month} 缺少电表读数",
                    message=f"月底核对发现 {check_month} 没有电表读数，请补录后重新计算收益",
                    source_refs=[
                        SourceRef(
                            entity_type="MeterReading",
                            entity_id="",
                            field="kwh",
                            description=f"待补录: {check_month}",
                        )
                    ],
                )
            )

        maintenance = self.store.load_maintenance(project_id)
        month_maintenance = [
            m for m in maintenance
            if m.start_date.strftime("%Y-%m") == check_month
            or m.end_date.strftime("%Y-%m") == check_month
        ]
        if month_maintenance:
            total_excluded = sum(m.excluded_kwh for m in month_maintenance)
            alerts.append(
                Alert(
                    project_id=project_id,
                    phase=Phase.MONTHLY,
                    level=AlertLevel.WARNING,
                    title=f"{check_month} 有 {len(month_maintenance)} 项检修记录",
                    message=f"设备检修已剔除约 {total_excluded:.2f} kwh 用电量，请确认检修剔除数是否准确",
                    source_refs=[
                        SourceRef(
                            entity_type="MaintenanceRecord",
                            entity_id=m.record_id,
                            field="excluded_kwh",
                            description=f"{m.start_date}~{m.end_date}: {m.description}",
                        )
                        for m in month_maintenance
                    ],
                )
            )

        for alert in alerts:
            self.store.save_alert(alert)
        return alerts

    def check_final_phase(self, project_id: str, period_start: str, period_end: str) -> list[Alert]:
        alerts = []
        project = self.store.load_project(project_id)
        if not project:
            return alerts

        readings = self.store.load_readings(project_id)
        reading_months = {r.month for r in readings}
        expected_months = set(months_between(period_start, period_end))
        missing_months = expected_months - reading_months

        if missing_months:
            alerts.append(
                Alert(
                    project_id=project_id,
                    phase=Phase.FINAL,
                    level=AlertLevel.CRITICAL,
                    title=f"汇总期间缺少 {len(missing_months)} 个月的电表读数",
                    message=f"缺少月份: {', '.join(sorted(missing_months))}，请补录后再汇总",
                    source_refs=[
                        SourceRef(
                            entity_type="MeterReading",
                            entity_id="",
                            field="kwh",
                            description=f"待补录: {month}",
                        )
                        for month in sorted(missing_months)
                    ],
                )
            )

        results = self.store.load_results(project_id)
        if results:
            latest = results[-1]
            if latest.exclusions:
                alerts.append(
                    Alert(
                        project_id=project_id,
                        phase=Phase.FINAL,
                        level=AlertLevel.INFO,
                        title=f"汇总包含 {len(latest.exclusions)} 项检修剔除",
                        message="请在收益分成表中标注检修剔除数及来源记录编号",
                        source_refs=[
                            SourceRef(
                                entity_type="ExclusionTrace",
                                entity_id=e.trace_id,
                                field="excluded_kwh",
                                description=f"{e.month}: {e.reason} ({e.excluded_kwh:.2f} kwh)",
                            )
                            for e in latest.exclusions
                        ],
                    )
                )

        for alert in alerts:
            self.store.save_alert(alert)
        return alerts

    def check_all(self, project_id: str, check_month: Optional[str] = None) -> list[Alert]:
        if check_month is None:
            check_month = datetime.now().strftime("%Y-%m")

        all_alerts = []
        all_alerts.extend(self.check_initial_phase(project_id))
        all_alerts.extend(self.check_monthly_phase(project_id, check_month))

        project = self.store.load_project(project_id)
        if project:
            start = project.contract_start.strftime("%Y-%m")
            end = project.contract_end.strftime("%Y-%m")
            all_alerts.extend(self.check_final_phase(project_id, start, end))

        return all_alerts

    def get_alerts(self, project_id: Optional[str] = None, phase: Optional[Phase] = None) -> list[dict]:
        alerts = self.store.load_alerts(project_id)
        if phase:
            alerts = [a for a in alerts if a.phase == phase]

        return [
            {
                "阶段": a.phase.value,
                "级别": a.level.value,
                "标题": a.title,
                "消息": a.message,
                "时间": a.generated_at.strftime("%Y-%m-%d %H:%M"),
                "来源数": len(a.source_refs),
            }
            for a in alerts
        ]
