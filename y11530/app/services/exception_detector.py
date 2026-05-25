from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import (
    TellerSchedule,
    LeaveForm,
    BusinessForecast,
    RefundFlow,
    InventoryDifference,
    ExceptionType,
    RecordStatus,
)


class ExceptionDetector:
    def __init__(self, db: Session):
        self.db = db

    def detect_training_window_conflicts(
        self, branch_id: str, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        conflicts = []
        schedules = (
            self.db.query(TellerSchedule)
            .filter(
                TellerSchedule.branch_id == branch_id,
                TellerSchedule.schedule_date >= start_date,
                TellerSchedule.schedule_date <= end_date,
                TellerSchedule.is_training == True,
            )
            .all()
        )

        for schedule in schedules:
            date_schedules = (
                self.db.query(TellerSchedule)
                .filter(
                    TellerSchedule.branch_id == branch_id,
                    TellerSchedule.schedule_date == schedule.schedule_date,
                    TellerSchedule.is_training == False,
                )
                .all()
            )

            on_duty_count = len([s for s in date_schedules if s.shift_type == "on_duty"])
            if on_duty_count < 2:
                conflict = {
                    "exception_type": ExceptionType.TEMP_TRAINING_WINDOW_CONFLICT,
                    "exception_date": schedule.schedule_date,
                    "teller_id": schedule.teller_id,
                    "teller_name": schedule.teller_name,
                    "description": f"临时外出培训导致窗口人手不足，日期：{schedule.schedule_date.date()}",
                    "blocking_point": (
                        f"培训柜员：{schedule.teller_name}({schedule.teller_id})，"
                        f"培训类型：{schedule.training_type}，"
                        f"当值窗口数：{on_duty_count}，"
                        f"冲突点：培训导致窗口数低于最低要求(2个)"
                    ),
                    "source_type": "schedule",
                    "source_ids": [str(schedule.id)],
                    "raw_data": {
                        "training_schedule": {
                            "teller_id": schedule.teller_id,
                            "teller_name": schedule.teller_name,
                            "training_type": schedule.training_type,
                            "window_number": schedule.window_number,
                        },
                        "on_duty_count": on_duty_count,
                        "date": schedule.schedule_date.isoformat(),
                    },
                }
                conflicts.append(conflict)

        return conflicts

    def detect_lunch_rule_conflicts(
        self, branch_id: str, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        conflicts = []
        schedules = (
            self.db.query(TellerSchedule)
            .filter(
                TellerSchedule.branch_id == branch_id,
                TellerSchedule.schedule_date >= start_date,
                TellerSchedule.schedule_date <= end_date,
            )
            .all()
        )

        date_groups: Dict[datetime, List[TellerSchedule]] = {}
        for s in schedules:
            if s.schedule_date not in date_groups:
                date_groups[s.schedule_date] = []
            date_groups[s.schedule_date].append(s)

        for schedule_date, day_schedules in date_groups.items():
            lunch_periods = []
            for s in day_schedules:
                if s.lunch_start and s.lunch_end:
                    lunch_periods.append((s.lunch_start, s.lunch_end, s.teller_id, s.teller_name))

            for i, (start1, end1, teller1, name1) in enumerate(lunch_periods):
                for start2, end2, teller2, name2 in lunch_periods[i + 1 :]:
                    if start1 < end2 and start2 < end1:
                        conflict = {
                            "exception_type": ExceptionType.LUNCH_RULE_CONFLICT,
                            "exception_date": schedule_date,
                            "teller_id": f"{teller1},{teller2}",
                            "teller_name": f"{name1},{name2}",
                            "description": f"午休时间重叠冲突，日期：{schedule_date.date()}",
                            "blocking_point": (
                                f"柜员{name1}午休：{start1.strftime('%H:%M')}-{end1.strftime('%H:%M')}，"
                                f"柜员{name2}午休：{start2.strftime('%H:%M')}-{end2.strftime('%H:%M')}，"
                                f"冲突点：午休时段重叠，导致窗口同时空置"
                            ),
                            "source_type": "schedule",
                            "source_ids": [str(s.id) for s in day_schedules if s.teller_id in [teller1, teller2]],
                            "raw_data": {
                                "teller1": {"id": teller1, "name": name1, "lunch": [start1.isoformat(), end1.isoformat()]},
                                "teller2": {"id": teller2, "name": name2, "lunch": [start2.isoformat(), end2.isoformat()]},
                            },
                        }
                        conflicts.append(conflict)

        return conflicts

    def detect_leave_schedule_conflicts(
        self, branch_id: str, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        conflicts = []
        leaves = (
            self.db.query(LeaveForm)
            .filter(
                LeaveForm.branch_id == branch_id,
                LeaveForm.status == "approved",
                LeaveForm.start_date <= end_date,
                LeaveForm.end_date >= start_date,
            )
            .all()
        )

        for leave in leaves:
            current_date = max(leave.start_date, start_date)
            while current_date <= min(leave.end_date, end_date):
                day_schedules = (
                    self.db.query(TellerSchedule)
                    .filter(
                        TellerSchedule.branch_id == branch_id,
                        TellerSchedule.schedule_date == current_date,
                        TellerSchedule.teller_id != leave.teller_id,
                        TellerSchedule.shift_type == "on_duty",
                    )
                    .all()
                )

                if len(day_schedules) < 2:
                    conflict = {
                        "exception_type": ExceptionType.LEAVE_SCHEDULE_CONFLICT,
                        "exception_date": current_date,
                        "teller_id": leave.teller_id,
                        "teller_name": leave.teller_name,
                        "description": f"请假导致窗口人手不足，日期：{current_date.date()}",
                        "blocking_point": (
                            f"请假柜员：{leave.teller_name}({leave.teller_id})，"
                            f"请假类型：{leave.leave_type}，"
                            f"剩余当值窗口数：{len(day_schedules)}，"
                            f"冲突点：请假导致窗口数低于最低要求"
                        ),
                        "source_type": "leave_form,schedule",
                        "source_ids": [str(leave.id)] + [str(s.id) for s in day_schedules],
                        "raw_data": {
                            "leave": {
                                "teller_id": leave.teller_id,
                                "teller_name": leave.teller_name,
                                "leave_type": leave.leave_type,
                                "days": leave.leave_days,
                            },
                            "remaining_windows": len(day_schedules),
                        },
                    }
                    conflicts.append(conflict)
                current_date += timedelta(days=1)

        return conflicts

    def detect_business_forecast_mismatch(
        self, branch_id: str, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        conflicts = []
        forecasts = (
            self.db.query(BusinessForecast)
            .filter(
                BusinessForecast.branch_id == branch_id,
                BusinessForecast.forecast_date >= start_date,
                BusinessForecast.forecast_date <= end_date,
            )
            .all()
        )

        for forecast in forecasts:
            date_schedules = (
                self.db.query(TellerSchedule)
                .filter(
                    TellerSchedule.branch_id == branch_id,
                    TellerSchedule.schedule_date == forecast.forecast_date,
                    TellerSchedule.shift_type == "on_duty",
                )
                .all()
            )

            on_duty_count = len(date_schedules)
            expected_windows_needed = max(1, forecast.expected_customers // 50)

            if on_duty_count < expected_windows_needed:
                conflict = {
                    "exception_type": ExceptionType.BUSINESS_FORECAST_MISMATCH,
                    "exception_date": forecast.forecast_date,
                    "teller_id": None,
                    "teller_name": None,
                    "description": f"业务量预测与排班窗口数不匹配，日期：{forecast.forecast_date.date()}",
                    "blocking_point": (
                        f"预测客户数：{forecast.expected_customers}，"
                        f"预计需窗口数：{expected_windows_needed}，"
                        f"实际当值窗口：{on_duty_count}，"
                        f"冲突点：预测业务量超出现有窗口承载能力"
                    ),
                    "source_type": "business_forecast,schedule",
                    "source_ids": [str(forecast.id)] + [str(s.id) for s in date_schedules],
                    "raw_data": {
                        "forecast": {
                            "expected_customers": forecast.expected_customers,
                            "expected_transactions": forecast.expected_transactions,
                            "service_level": forecast.service_level,
                        },
                        "on_duty_count": on_duty_count,
                        "expected_windows_needed": expected_windows_needed,
                    },
                }
                conflicts.append(conflict)

        return conflicts

    def detect_inventory_difference(
        self, branch_id: str, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        conflicts = []
        inventories = (
            self.db.query(InventoryDifference)
            .filter(
                InventoryDifference.branch_id == branch_id,
                InventoryDifference.inventory_date >= start_date,
                InventoryDifference.inventory_date <= end_date,
                InventoryDifference.difference != 0,
            )
            .all()
        )

        for inv in inventories:
            conflict = {
                "exception_type": ExceptionType.INVENTORY_DIFFERENCE,
                "exception_date": inv.inventory_date,
                "teller_id": None,
                "teller_name": None,
                "description": f"盘点差异异常，日期：{inv.inventory_date.date()}",
                "blocking_point": (
                    f"物品类型：{inv.item_type}，"
                    f"预期数量：{inv.expected_quantity}，"
                    f"实际数量：{inv.actual_quantity}，"
                    f"差异：{inv.difference}，"
                    f"差异原因：{inv.difference_reason or '未说明'}，"
                    f"冲突点：盘点数据存在差异需核实"
                ),
                "source_type": "inventory",
                "source_ids": [str(inv.id)],
                "raw_data": {
                    "item_type": inv.item_type,
                    "expected_quantity": inv.expected_quantity,
                    "actual_quantity": inv.actual_quantity,
                    "difference": inv.difference,
                    "difference_reason": inv.difference_reason,
                },
            }
            conflicts.append(conflict)

        return conflicts

    def detect_refund_flow_anomaly(
        self, branch_id: str, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        conflicts = []
        refunds = (
            self.db.query(RefundFlow)
            .filter(
                RefundFlow.branch_id == branch_id,
                RefundFlow.refund_date >= start_date,
                RefundFlow.refund_date <= end_date,
            )
            .all()
        )

        date_groups: Dict[datetime, List[RefundFlow]] = {}
        for refund in refunds:
            refund_date = refund.refund_date.replace(hour=0, minute=0, second=0, microsecond=0)
            if refund_date not in date_groups:
                date_groups[refund_date] = []
            date_groups[refund_date].append(refund)

        for refund_date, day_refunds in date_groups.items():
            total_amount = sum(r.refund_amount for r in day_refunds)
            refund_count = len(day_refunds)

            if refund_count >= 5 or total_amount >= 10000:
                tellers = list(set(r.teller_id for r in day_refunds))
                conflict = {
                    "exception_type": ExceptionType.REFUND_FLOW_ANOMALY,
                    "exception_date": refund_date,
                    "teller_id": ",".join(tellers),
                    "teller_name": None,
                    "description": f"退款流水异常，日期：{refund_date.date()}",
                    "blocking_point": (
                        f"退款笔数：{refund_count}，"
                        f"退款总金额：{total_amount:.2f}，"
                        f"涉及柜员：{', '.join(tellers)}，"
                        f"冲突点：退款数据超出正常阈值需核实"
                    ),
                    "source_type": "refund_flow",
                    "source_ids": [str(r.id) for r in day_refunds],
                    "raw_data": {
                        "refund_count": refund_count,
                        "total_amount": total_amount,
                        "tellers": tellers,
                    },
                }
                conflicts.append(conflict)

        return conflicts

    def detect_all_exceptions(
        self, branch_id: str, start_date: datetime, end_date: datetime
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        all_exceptions = []
        failed_records = []

        try:
            all_exceptions.extend(self.detect_training_window_conflicts(branch_id, start_date, end_date))
        except Exception as e:
            failed_records.append(
                {
                    "source_type": "training_detection",
                    "error_message": str(e),
                    "error_type": type(e).__name__,
                }
            )

        try:
            all_exceptions.extend(self.detect_lunch_rule_conflicts(branch_id, start_date, end_date))
        except Exception as e:
            failed_records.append(
                {
                    "source_type": "lunch_detection",
                    "error_message": str(e),
                    "error_type": type(e).__name__,
                }
            )

        try:
            all_exceptions.extend(self.detect_leave_schedule_conflicts(branch_id, start_date, end_date))
        except Exception as e:
            failed_records.append(
                {
                    "source_type": "leave_detection",
                    "error_message": str(e),
                    "error_type": type(e).__name__,
                }
            )

        try:
            all_exceptions.extend(self.detect_business_forecast_mismatch(branch_id, start_date, end_date))
        except Exception as e:
            failed_records.append(
                {
                    "source_type": "forecast_detection",
                    "error_message": str(e),
                    "error_type": type(e).__name__,
                }
            )

        try:
            all_exceptions.extend(self.detect_inventory_difference(branch_id, start_date, end_date))
        except Exception as e:
            failed_records.append(
                {
                    "source_type": "inventory_detection",
                    "error_message": str(e),
                    "error_type": type(e).__name__,
                }
            )

        try:
            all_exceptions.extend(self.detect_refund_flow_anomaly(branch_id, start_date, end_date))
        except Exception as e:
            failed_records.append(
                {
                    "source_type": "refund_detection",
                    "error_message": str(e),
                    "error_type": type(e).__name__,
                }
            )

        return all_exceptions, failed_records
