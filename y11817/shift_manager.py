from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Set
import csv
from pathlib import Path
from collections import defaultdict

from models import (
    ShiftRecord,
    RawSourceInfo,
    ShiftType,
)


class ShiftManager:
    def __init__(self):
        self.shifts: List[ShiftRecord] = []
        self.shifts_by_device: Dict[str, List[ShiftRecord]] = defaultdict(list)
        self.shifts_by_date: Dict[date, List[ShiftRecord]] = defaultdict(list)
        self.source_files: List[str] = []
        self.warnings: List[str] = []

    def import_from_csv(self, file_path: str) -> List[str]:
        path = Path(file_path)
        if not path.exists():
            self.warnings.append(f"班次表文件不存在: {file_path}")
            return self.warnings

        self.source_files.append(file_path)

        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                try:
                    shift = self._parse_shift_row(row, file_path, row_num)
                    self._add_shift(shift)
                except Exception as e:
                    self.warnings.append(f"{file_path}第{row_num}行: 解析失败 - {str(e)}")

        return self.warnings

    def _parse_shift_row(
        self, row: Dict[str, str], source_file: str, row_num: int
    ) -> ShiftRecord:
        original_name = f"{source_file}第{row_num}行"
        raw_source = RawSourceInfo(
            source_file=source_file, original_name=original_name
        )

        device_id = row.get("设备编号", row.get("设备ID", "")).strip()

        shift_date_str = row.get("日期", row.get("班次日期", "")).strip()
        shift_date = self._parse_date(shift_date_str)

        shift_type_str = row.get("班次", row.get("班次类型", "白班")).strip()
        shift_type = self._parse_shift_type(shift_type_str)

        start_time_str = row.get("开始时间", row.get("上班时间", "")).strip()
        end_time_str = row.get("结束时间", row.get("下班时间", "")).strip()

        start_time = self._parse_datetime(shift_date_str, start_time_str)
        end_time = self._parse_datetime(shift_date_str, end_time_str)

        if end_time and start_time and end_time < start_time:
            end_time = end_time + timedelta(days=1)

        working_hours = float(row.get("工作时长", row.get("工时", 0)) or 0)
        if working_hours == 0 and start_time and end_time:
            working_hours = (end_time - start_time).total_seconds() / 3600

        has_signature = row.get("是否签字", row.get("签字", "")).strip().lower() in [
            "是",
            "有",
            "已签",
            "true",
            "yes",
        ]

        return ShiftRecord(
            raw_source=raw_source,
            device_id=device_id,
            shift_date=shift_date or date.today(),
            shift_type=shift_type,
            start_time=start_time,
            end_time=end_time,
            operator=row.get("司机", row.get("操作员", "")).strip(),
            working_hours=working_hours,
            meter_start=float(row.get("起始表数", row.get("开始里程", 0)) or 0),
            meter_end=float(row.get("结束表数", row.get("结束里程", 0)) or 0),
            has_signature=has_signature,
            signature_image_ref=row.get("签字图片", row.get("凭证", "")).strip(),
            notes=row.get("备注", "").strip(),
        )

    def _add_shift(self, shift: ShiftRecord):
        self.shifts.append(shift)
        self.shifts_by_device[shift.device_id].append(shift)
        self.shifts_by_date[shift.shift_date].append(shift)

        if shift.is_cross_day():
            next_day = shift.shift_date + timedelta(days=1)
            if shift not in self.shifts_by_date[next_day]:
                self.shifts_by_date[next_day].append(shift)

    def _parse_shift_type(self, value: str) -> ShiftType:
        value = value.strip()
        if "早" in value:
            return ShiftType.MORNING
        elif "中" in value:
            return ShiftType.AFTERNOON
        elif "夜" in value:
            return ShiftType.NIGHT
        return ShiftType.DAY

    def _parse_date(self, value: str) -> Optional[date]:
        value = value.strip()
        if not value:
            return None

        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]:
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        return None

    def _parse_datetime(self, date_str: str, time_str: str) -> Optional[datetime]:
        if not date_str or not time_str:
            return None

        date_str = date_str.strip()
        time_str = time_str.strip()

        for date_fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]:
            for time_fmt in ["%H:%M", "%H:%M:%S", "%H%M"]:
                try:
                    return datetime.strptime(f"{date_str} {time_str}", f"{date_fmt} {time_fmt}")
                except ValueError:
                    continue

        try:
            return datetime.fromisoformat(f"{date_str}T{time_str}")
        except ValueError:
            return None

    def get_shifts_by_device(self, device_id: str) -> List[ShiftRecord]:
        return sorted(self.shifts_by_device.get(device_id, []), key=lambda s: s.start_time)

    def get_shifts_by_date(self, bill_date: date) -> List[ShiftRecord]:
        return sorted(self.shifts_by_date.get(bill_date, []), key=lambda s: s.start_time)

    def get_shifts_by_period(self, start_date: date, end_date: date) -> List[ShiftRecord]:
        result = []
        for shift in self.shifts:
            if start_date <= shift.shift_date <= end_date:
                result.append(shift)
            elif shift.is_cross_day():
                if start_date <= shift.end_time.date() <= end_date:
                    result.append(shift)
        return sorted(result, key=lambda s: s.start_time)

    def get_cross_day_shifts(self) -> List[ShiftRecord]:
        return [s for s in self.shifts if s.is_cross_day()]

    def detect_missing_shifts(
        self, device_id: str, start_date: date, end_date: date, expected_shifts_per_day: int = 3
    ) -> List[dict]:
        missing = []
        current = start_date

        device_shifts = self.get_shifts_by_device(device_id)
        shifts_by_date = defaultdict(list)
        for shift in device_shifts:
            shifts_by_date[shift.shift_date].append(shift)

        while current <= end_date:
            day_shifts = shifts_by_date.get(current, [])
            if len(day_shifts) < expected_shifts_per_day:
                missing.append(
                    {
                        "date": current,
                        "expected": expected_shifts_per_day,
                        "actual": len(day_shifts),
                        "missing_count": expected_shifts_per_day - len(day_shifts),
                        "existing_shifts": [s.shift_type.value for s in day_shifts],
                    }
                )
            current += timedelta(days=1)

        return missing

    def get_unsigned_shifts(self, start_date: date = None, end_date: date = None) -> List[ShiftRecord]:
        result = [s for s in self.shifts if not s.has_signature]
        if start_date and end_date:
            result = [s for s in result if start_date <= s.shift_date <= end_date]
        return result

    def summarize(self, start_date: date = None, end_date: date = None) -> dict:
        target_shifts = self.shifts
        if start_date and end_date:
            target_shifts = [
                s for s in self.shifts if start_date <= s.shift_date <= end_date
            ]

        total_hours = sum(s.working_hours for s in target_shifts)
        cross_day = len([s for s in target_shifts if s.is_cross_day()])
        unsigned = len([s for s in target_shifts if not s.has_signature])

        return {
            "total_shifts": len(target_shifts),
            "total_hours": round(total_hours, 2),
            "cross_day_shifts": cross_day,
            "unsigned_shifts": unsigned,
            "devices_count": len(set(s.device_id for s in target_shifts)),
            "source_files": self.source_files,
            "warnings": self.warnings,
        }
