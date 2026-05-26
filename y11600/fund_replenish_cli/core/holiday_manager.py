from datetime import date, timedelta
from typing import Set, List
import json
from pathlib import Path


class HolidayManager:
    def __init__(self, holiday_file: str = None):
        self.holidays: Set[date] = set()
        self.weekend_off = True
        if holiday_file and Path(holiday_file).exists():
            self.load_holidays(holiday_file)

    def load_holidays(self, holiday_file: str):
        with open(holiday_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for d in data.get("holidays", []):
                self.holidays.add(date.fromisoformat(d))

    def is_holiday(self, d: date) -> bool:
        if self.weekend_off and d.weekday() >= 5:
            return True
        return d in self.holidays

    def is_workday(self, d: date) -> bool:
        return not self.is_holiday(d)

    def next_workday(self, d: date) -> date:
        next_day = d + timedelta(days=1)
        while self.is_holiday(next_day):
            next_day += timedelta(days=1)
        return next_day

    def next_workdays(self, d: date, count: int) -> List[date]:
        workdays = []
        current = d
        while len(workdays) < count:
            current = self.next_workday(current)
            workdays.append(current)
        return workdays

    def calculate_replenish_date(
        self,
        base_date: date,
        window_start: date = None,
        window_end: date = None,
        defer_days: int = 1,
    ) -> date:
        start = window_start or base_date
        candidate = start
        for _ in range(defer_days):
            candidate = self.next_workday(candidate)

        if window_end and candidate > window_end:
            raise ValueError(f"补扣日期 {candidate} 超出补扣窗口期 {window_end}")

        return candidate

    def check_window_contains_workdays(
        self, window_start: date, window_end: date
    ) -> int:
        count = 0
        current = window_start
        while current <= window_end:
            if self.is_workday(current):
                count += 1
            current += timedelta(days=1)
        return count

    def get_holidays_in_range(self, start: date, end: date) -> List[date]:
        holidays = []
        current = start
        while current <= end:
            if self.is_holiday(current):
                holidays.append(current)
            current += timedelta(days=1)
        return holidays
