from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import csv
from pathlib import Path
from collections import defaultdict

from models import (
    DowntimeRecord,
    RawSourceInfo,
    DowntimeReason,
)


class DowntimeManager:
    def __init__(self):
        self.downtimes: List[DowntimeRecord] = []
        self.downtimes_by_device: Dict[str, List[DowntimeRecord]] = defaultdict(list)
        self.downtimes_by_date: Dict[date, List[DowntimeRecord]] = defaultdict(list)
        self.source_files: List[str] = []
        self.warnings: List[str] = []

    def import_from_csv(self, file_path: str) -> List[str]:
        path = Path(file_path)
        if not path.exists():
            self.warnings.append(f"故障停机文件不存在: {file_path}")
            return self.warnings

        self.source_files.append(file_path)

        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                try:
                    downtime = self._parse_downtime_row(row, file_path, row_num)
                    self._add_downtime(downtime)
                except Exception as e:
                    self.warnings.append(f"{file_path}第{row_num}行: 解析失败 - {str(e)}")

        return self.warnings

    def _parse_downtime_row(
        self, row: Dict[str, str], source_file: str, row_num: int
    ) -> DowntimeRecord:
        original_name = f"{source_file}第{row_num}行"
        raw_source = RawSourceInfo(
            source_file=source_file, original_name=original_name
        )

        device_id = row.get("设备编号", row.get("设备ID", "")).strip()

        start_time = self._parse_datetime(
            row.get("开始日期", ""), row.get("开始时间", "")
        ) or self._parse_datetime_full(row.get("开始时间", row.get("停机开始", "")))

        end_time = self._parse_datetime(
            row.get("结束日期", ""), row.get("结束时间", "")
        ) or self._parse_datetime_full(row.get("结束时间", row.get("停机结束", "")))

        reason_str = row.get("停机原因", row.get("原因", "其他")).strip()
        reason = self._parse_reason(reason_str)

        is_approved = row.get("是否审核", row.get("已审批", "")).strip().lower() in [
            "是",
            "有",
            "已审批",
            "已审核",
            "true",
            "yes",
        ]

        return DowntimeRecord(
            raw_source=raw_source,
            device_id=device_id,
            start_time=start_time or datetime.now(),
            end_time=end_time or datetime.now(),
            reason=reason,
            description=row.get("故障描述", row.get("描述", "")).strip(),
            reported_by=row.get("报告人", row.get("报修人", "")).strip(),
            is_approved=is_approved,
            notes=row.get("备注", "").strip(),
        )

    def _add_downtime(self, downtime: DowntimeRecord):
        self.downtimes.append(downtime)
        self.downtimes_by_device[downtime.device_id].append(downtime)

        current = downtime.start_time.date()
        end = downtime.end_time.date()
        while current <= end:
            self.downtimes_by_date[current].append(downtime)
            current += timedelta(days=1)

    def _parse_reason(self, value: str) -> DowntimeReason:
        value = value.strip()
        if not value:
            return DowntimeReason.OTHER

        if "保养" in value:
            return DowntimeReason.NORMAL_MAINTENANCE
        elif "故障" in value or "坏" in value:
            return DowntimeReason.BREAKDOWN
        elif "检修" in value or "维修" in value or "计划" in value:
            return DowntimeReason.SCHEDULED_REPAIR
        elif "客户" in value:
            return DowntimeReason.CLIENT_CAUSED
        elif "操作" in value or "司机" in value:
            return DowntimeReason.OPERATOR_ERROR
        elif "停电" in value or "断电" in value:
            return DowntimeReason.POWER_OUTAGE
        return DowntimeReason.OTHER

    def _parse_datetime(self, date_str: str, time_str: str) -> Optional[datetime]:
        if not date_str:
            return None

        date_str = date_str.strip()
        time_str = (time_str or "00:00").strip()

        for date_fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]:
            for time_fmt in ["%H:%M", "%H:%M:%S", "%H%M"]:
                try:
                    return datetime.strptime(
                        f"{date_str} {time_str}", f"{date_fmt} {time_fmt}"
                    )
                except ValueError:
                    continue
        return None

    def _parse_datetime_full(self, value: str) -> Optional[datetime]:
        if not value:
            return None

        value = value.strip()
        formats = [
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y/%m/%d %H:%M:%S",
            "%Y%m%d %H:%M",
            "%Y%m%d%H%M",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue

        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None

    def get_downtimes_by_device(self, device_id: str) -> List[DowntimeRecord]:
        return sorted(
            self.downtimes_by_device.get(device_id, []), key=lambda d: d.start_time
        )

    def get_downtimes_by_date(self, bill_date: date) -> List[DowntimeRecord]:
        return sorted(
            self.downtimes_by_date.get(bill_date, []), key=lambda d: d.start_time
        )

    def get_downtimes_by_period(
        self, start_date: date, end_date: date
    ) -> List[DowntimeRecord]:
        result = []
        for dt in self.downtimes:
            dt_start = dt.start_time.date()
            dt_end = dt.end_time.date()
            if (
                start_date <= dt_start <= end_date
                or start_date <= dt_end <= end_date
                or (dt_start <= start_date and dt_end >= end_date)
            ):
                result.append(dt)
        return sorted(result, key=lambda d: d.start_time)

    def get_downtimes_by_reason(
        self, reason: DowntimeReason, start_date: date = None, end_date: date = None
    ) -> List[DowntimeRecord]:
        result = [d for d in self.downtimes if d.reason == reason]
        if start_date and end_date:
            result = [
                d
                for d in result
                if start_date <= d.start_time.date() <= end_date
            ]
        return result

    def get_unapproved_downtimes(self) -> List[DowntimeRecord]:
        return [d for d in self.downtimes if not d.is_approved]

    def summarize_by_reason(
        self, start_date: date = None, end_date: date = None
    ) -> Dict[DowntimeReason, dict]:
        target_downtimes = self.downtimes
        if start_date and end_date:
            target_downtimes = [
                d
                for d in self.downtimes
                if start_date <= d.start_time.date() <= end_date
            ]

        summary = defaultdict(lambda: {"count": 0, "total_minutes": 0, "records": []})
        for dt in target_downtimes:
            summary[dt.reason]["count"] += 1
            summary[dt.reason]["total_minutes"] += dt.get_duration_minutes()
            summary[dt.reason]["records"].append(dt)

        return dict(summary)

    def summarize(self, start_date: date = None, end_date: date = None) -> dict:
        target_downtimes = self.downtimes
        if start_date and end_date:
            target_downtimes = [
                d
                for d in self.downtimes
                if start_date <= d.start_time.date() <= end_date
            ]

        total_minutes = sum(d.get_duration_minutes() for d in target_downtimes)
        by_reason = self.summarize_by_reason(start_date, end_date)

        return {
            "total_downtimes": len(target_downtimes),
            "total_hours": round(total_minutes / 60, 2),
            "total_minutes": total_minutes,
            "by_reason": {
                reason.value: {
                    "count": data["count"],
                    "hours": round(data["total_minutes"] / 60, 2),
                }
                for reason, data in by_reason.items()
            },
            "unapproved_count": len([d for d in target_downtimes if not d.is_approved]),
            "devices_count": len(set(d.device_id for d in target_downtimes)),
            "source_files": self.source_files,
            "warnings": self.warnings,
        }
