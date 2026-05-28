from datetime import date
from typing import Dict, List, Optional
import csv
import json
from pathlib import Path

from models import (
    Device,
    RawSourceInfo,
    BillingType,
    DowntimeReason,
)


class DeviceLedger:
    def __init__(self):
        self.devices: Dict[str, Device] = {}
        self.source_files: List[str] = []

    def import_from_csv(self, file_path: str) -> List[str]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"设备台账文件不存在: {file_path}")

        self.source_files.append(file_path)
        warnings = []

        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                try:
                    device = self._parse_device_row(row, file_path, row_num)
                    if device.device_id in self.devices:
                        warnings.append(
                            f"行{row_num}: 设备ID {device.device_id} 已存在，已更新记录"
                        )
                    self.devices[device.device_id] = device
                except Exception as e:
                    warnings.append(f"行{row_num}: 解析失败 - {str(e)}")

        return warnings

    def _parse_device_row(
        self, row: Dict[str, str], source_file: str, row_num: int
    ) -> Device:
        original_name = f"{source_file}第{row_num}行"
        raw_source = RawSourceInfo(
            source_file=source_file, original_name=original_name
        )

        billing_type_str = row.get("计费方式", row.get("计费类型", "按小时计费"))
        billing_type = self._parse_billing_type(billing_type_str)

        free_reasons_str = row.get("免租停机原因", row.get("免租原因", ""))
        free_downtime_reasons = self._parse_free_reasons(free_reasons_str)

        start_date = self._parse_date(row.get("起租日期", ""))
        end_date = self._parse_date(row.get("停租日期", ""))

        return Device(
            raw_source=raw_source,
            device_id=row.get("设备编号", row.get("设备ID", "")).strip(),
            device_name=row.get("设备名称", "").strip(),
            device_type=row.get("设备类型", "").strip(),
            model=row.get("型号", row.get("规格", "")).strip(),
            serial_number=row.get("序列号", row.get("出厂编号", "")).strip(),
            customer=row.get("客户名称", row.get("客户", "")).strip(),
            mining_site=row.get("矿区", row.get("工地", "")).strip(),
            billing_type=billing_type,
            hourly_rate=float(row.get("小时单价", row.get("时租", 0)) or 0),
            shift_rate=float(row.get("班次单价", row.get("台班费", 0)) or 0),
            free_downtime_reasons=free_downtime_reasons,
            free_downtime_minutes=int(row.get("免租分钟数", 0) or 0),
            start_date=start_date,
            end_date=end_date,
            notes=row.get("备注", "").strip(),
        )

    def _parse_billing_type(self, value: str) -> BillingType:
        value = value.strip()
        if "小时" in value:
            return BillingType.HOURLY
        elif "班次" in value or "台班" in value:
            return BillingType.SHIFT
        elif "停机" in value:
            return BillingType.DOWNTIME
        return BillingType.HOURLY

    def _parse_free_reasons(self, value: str) -> List[DowntimeReason]:
        reasons = []
        value = value.strip()
        if not value:
            return reasons

        reason_map = {
            "保养": DowntimeReason.NORMAL_MAINTENANCE,
            "正常保养": DowntimeReason.NORMAL_MAINTENANCE,
            "故障": DowntimeReason.BREAKDOWN,
            "故障停机": DowntimeReason.BREAKDOWN,
            "检修": DowntimeReason.SCHEDULED_REPAIR,
            "计划检修": DowntimeReason.SCHEDULED_REPAIR,
            "客户": DowntimeReason.CLIENT_CAUSED,
            "客户原因": DowntimeReason.CLIENT_CAUSED,
            "操作": DowntimeReason.OPERATOR_ERROR,
            "操作失误": DowntimeReason.OPERATOR_ERROR,
            "停电": DowntimeReason.POWER_OUTAGE,
            "其他": DowntimeReason.OTHER,
        }

        for part in value.replace("，", ",").split(","):
            part = part.strip()
            if part in reason_map:
                reasons.append(reason_map[part])

        return reasons

    def _parse_date(self, value: str) -> Optional[date]:
        value = value.strip()
        if not value:
            return None

        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]:
            try:
                return date.fromisoformat(value)
            except ValueError:
                try:
                    return datetime.strptime(value, fmt).date()
                except ValueError:
                    continue
        return None

    def get_device(self, device_id: str) -> Optional[Device]:
        return self.devices.get(device_id)

    def get_devices_by_site(self, mining_site: str) -> List[Device]:
        return [d for d in self.devices.values() if d.mining_site == mining_site]

    def get_devices_by_customer(self, customer: str) -> List[Device]:
        return [d for d in self.devices.values() if d.customer == customer]

    def list_all_devices(self) -> List[Device]:
        return list(self.devices.values())

    def to_dict(self) -> Dict:
        return {
            "source_files": self.source_files,
            "devices": {
                device_id: {
                    "device_id": d.device_id,
                    "device_name": d.device_name,
                    "original_source": d.raw_source.original_name,
                    "source_file": d.raw_source.source_file,
                }
                for device_id, d in self.devices.items()
            },
        }


from datetime import datetime
