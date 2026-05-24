from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import (
    TellerSchedule,
    LeaveForm,
    BusinessForecast,
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

        return all_exceptions, failed_records
