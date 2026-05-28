from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from collections import defaultdict
import json
import csv
from pathlib import Path

from models import (
    Device,
    BillingCalendarDay,
    BillingPeriod,
    BillItem,
    ExportableBill,
    BillingType,
    DowntimeReason,
)
from device_ledger import DeviceLedger
from shift_manager import ShiftManager
from downtime_manager import DowntimeManager
from signature_manager import SignatureManager


class BillingEngine:
    def __init__(
        self,
        device_ledger: DeviceLedger,
        shift_manager: ShiftManager,
        downtime_manager: DowntimeManager,
        signature_manager: SignatureManager,
    ):
        self.device_ledger = device_ledger
        self.shift_manager = shift_manager
        self.downtime_manager = downtime_manager
        self.signature_manager = signature_manager
        self.issues: List[str] = []
        self.warnings: List[str] = []

    def create_billing_period(
        self,
        period_start: date,
        period_end: date,
        customer: str = "",
        mining_site: str = "",
    ) -> BillingPeriod:
        self.issues = []
        self.warnings = []

        devices = self._get_target_devices(customer, mining_site)

        billing_period = BillingPeriod(
            period_start=period_start,
            period_end=period_end,
            customer=customer,
            mining_site=mining_site,
        )

        current = period_start
        while current <= period_end:
            for device in devices:
                day = self._build_calendar_day(current, device)
                billing_period.calendar_days[(current, device.device_id)] = day
            current += timedelta(days=1)

        self._calculate_period_totals(billing_period)
        self._check_missing_shifts(billing_period, devices)
        self._check_signature_issues(billing_period)
        self._match_signatures_to_shifts(billing_period)

        billing_period.issues = self.issues
        billing_period.warnings = self.warnings

        return billing_period

    def _get_target_devices(self, customer: str, mining_site: str) -> List[Device]:
        devices = self.device_ledger.list_all_devices()

        if customer:
            devices = [d for d in devices if d.customer == customer]
        if mining_site:
            devices = [d for d in devices if d.mining_site == mining_site]

        return devices

    def _build_calendar_day(self, bill_date: date, device: Device) -> BillingCalendarDay:
        day = BillingCalendarDay(
            bill_date=bill_date,
            device_id=device.device_id,
        )

        day.shift_records = [
            s
            for s in self.shift_manager.get_shifts_by_date(bill_date)
            if s.device_id == device.device_id
        ]

        day.downtime_records = [
            d
            for d in self.downtime_manager.get_downtimes_by_date(bill_date)
            if d.device_id == device.device_id
        ]

        day.signature_sheets = [
            s
            for s in self.signature_manager.get_signatures_by_date(bill_date)
            if s.device_id == device.device_id
        ]

        self._calculate_day_billing(day, device)

        return day

    def _calculate_day_billing(self, day: BillingCalendarDay, device: Device):
        billable_hours = 0.0
        free_hours = 0.0
        billable_shifts = 0

        for shift in day.shift_records:
            shift_hours = shift.working_hours or shift.get_duration_hours()

            if device.billing_type == BillingType.SHIFT:
                billable_shifts += 1
            else:
                billable_hours += shift_hours

            if not shift.has_signature:
                day.warnings.append(
                    f"班次{shift.shift_type.value}无签字确认 - 来源: {shift.raw_source.original_name}"
                )

            if shift.is_cross_day():
                day.warnings.append(
                    f"班次{shift.shift_type.value}跨日 - 开始:{shift.start_time} 结束:{shift.end_time} - 来源: {shift.raw_source.original_name}"
                )

        for dt in day.downtime_records:
            dt_hours = dt.get_duration_minutes() / 60

            if device.is_free_downtime(dt.reason):
                free_hours += dt_hours
                day.warnings.append(
                    f"{dt.reason.value}{dt_hours:.2f}小时免租 - 来源: {dt.raw_source.original_name}"
                )
            else:
                if dt_hours > 0:
                    if billable_hours >= dt_hours:
                        billable_hours -= dt_hours
                    else:
                        billable_hours = 0

            if not dt.is_approved:
                day.issues.append(
                    f"停机记录未审批 - {dt.reason.value} {dt_hours:.2f}小时 - 来源: {dt.raw_source.original_name}"
                )

        if device.billing_type == BillingType.SHIFT:
            day.billable_shifts = billable_shifts
            day.total_amount = billable_shifts * device.shift_rate
        else:
            day.billable_hours = max(0.0, billable_hours)
            day.total_amount = day.billable_hours * device.hourly_rate

        day.free_hours = free_hours

        if not day.shift_records:
            day.warnings.append("当日无班次记录")

        if day.signature_sheets:
            total_pages = sum(s.total_pages for s in day.signature_sheets)
            actual_pages = len(day.signature_sheets)
            if actual_pages < total_pages:
                day.issues.append(
                    f"签字单缺页 - 应{total_pages}页实{actual_pages}页"
                )

    def _calculate_period_totals(self, billing_period: BillingPeriod):
        total_billable_hours = 0.0
        total_billable_shifts = 0
        total_free_hours = 0.0
        total_amount = 0.0

        for day in billing_period.calendar_days.values():
            total_billable_hours += day.billable_hours
            total_billable_shifts += day.billable_shifts
            total_free_hours += day.free_hours
            total_amount += day.total_amount

        billing_period.total_billable_hours = round(total_billable_hours, 2)
        billing_period.total_billable_shifts = total_billable_shifts
        billing_period.total_free_hours = round(total_free_hours, 2)
        billing_period.total_amount = round(total_amount, 2)

    def _check_missing_shifts(self, billing_period: BillingPeriod, devices: List[Device]):
        missing_dates = set()

        for device in devices:
            missing = self.shift_manager.detect_missing_shifts(
                device.device_id,
                billing_period.period_start,
                billing_period.period_end,
            )
            for m in missing:
                if m["missing_count"] > 0:
                    missing_dates.add(m["date"])
                    self.warnings.append(
                        f"设备{device.device_id}({device.device_name}) {m['date']} 缺少{m['missing_count']}个班次 "
                        f"(应{m['expected']}个,实{m['actual']}个) - 现有: {','.join(m['existing_shifts']) or '无'}"
                    )

        billing_period.missing_shifts_dates = sorted(list(missing_dates))

    def _check_signature_issues(self, billing_period: BillingPeriod):
        missing_pages = self.signature_manager.detect_missing_pages(
            billing_period.period_start, billing_period.period_end
        )

        for mp in missing_pages:
            self.issues.append(
                f"签字单{mp['sheet_id']}缺页 - 缺少第{mp['missing_pages']}页 "
                f"(共{mp['total_pages']}页) - 来源: {mp['original_source']}"
            )
            billing_period.missing_signature_pages.append(
                f"{mp['sheet_id']}缺{mp['missing_count']}页"
            )

    def _match_signatures_to_shifts(self, billing_period: BillingPeriod):
        all_shifts = self.shift_manager.get_shifts_by_period(
            billing_period.period_start, billing_period.period_end
        )

        unmatched_sigs, unmatched_shifts = self.signature_manager.match_shifts(
            all_shifts
        )

        billing_period.unmatched_signatures = unmatched_sigs
        billing_period.unmatched_shifts = unmatched_shifts

        if unmatched_sigs:
            self.warnings.append(
                f"有{len(unmatched_sigs)}份签字单未匹配到班次"
            )

        if unmatched_shifts:
            self.warnings.append(
                f"有{len(unmatched_shifts)}个班次无对应签字单"
            )

    def export_bill(self, billing_period: BillingPeriod) -> ExportableBill:
        bill_id = f"BILL-{billing_period.period_start.strftime('%Y%m')}-{billing_period.mining_site or 'ALL'}"

        bill = ExportableBill(
            bill_id=bill_id,
            customer=billing_period.customer,
            mining_site=billing_period.mining_site,
            period_start=billing_period.period_start,
            period_end=billing_period.period_end,
            issue_date=date.today(),
        )

        items_by_device = defaultdict(list)

        for (bill_date, device_id), day in billing_period.calendar_days.items():
            device = self.device_ledger.get_device(device_id)
            if not device:
                continue

            if device.billing_type == BillingType.SHIFT:
                if day.billable_shifts > 0:
                    item = BillItem(
                        device_id=device_id,
                        device_name=device.device_name,
                        description=f"{bill_date} - 台班费",
                        quantity=day.billable_shifts,
                        unit="班",
                        unit_price=device.shift_rate,
                        amount=day.total_amount,
                        source_refs=[s.raw_source.original_name for s in day.shift_records],
                        billing_date=bill_date,
                    )
                    items_by_device[device_id].append(item)
            else:
                if day.billable_hours > 0:
                    item = BillItem(
                        device_id=device_id,
                        device_name=device.device_name,
                        description=f"{bill_date} - 设备租赁",
                        quantity=round(day.billable_hours, 2),
                        unit="小时",
                        unit_price=device.hourly_rate,
                        amount=day.total_amount,
                        source_refs=[s.raw_source.original_name for s in day.shift_records]
                        + [d.raw_source.original_name for d in day.downtime_records],
                        billing_date=bill_date,
                    )
                    items_by_device[device_id].append(item)

        for device_items in items_by_device.values():
            bill.items.extend(device_items)

        bill.total_amount = round(sum(item.amount for item in bill.items), 2)
        bill.issues_summary = billing_period.issues
        bill.warnings_summary = billing_period.warnings

        evidence_files = set()
        for day in billing_period.calendar_days.values():
            for s in day.signature_sheets:
                if s.image_ref:
                    evidence_files.add(s.image_ref)
            for shift in day.shift_records:
                if shift.signature_image_ref:
                    evidence_files.add(shift.signature_image_ref)
        bill.evidence_files = list(evidence_files)

        return bill

    def save_bill_to_csv(self, bill: ExportableBill, output_path: str) -> str:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["=", "=" * 40])
            writer.writerow(["矿山设备租赁账单"])
            writer.writerow(["账单编号", bill.bill_id])
            writer.writerow(["客户", bill.customer])
            writer.writerow(["矿区", bill.mining_site])
            writer.writerow(["账期", f"{bill.period_start} 至 {bill.period_end}"])
            writer.writerow(["出具日期", bill.issue_date])
            writer.writerow(["-", "-" * 40])
            writer.writerow([])

            writer.writerow(["设备编号", "设备名称", "日期", "项目", "数量", "单位", "单价", "金额", "来源凭证"])
            for item in bill.items:
                writer.writerow([
                    item.device_id,
                    item.device_name,
                    item.billing_date,
                    item.description,
                    item.quantity,
                    item.unit,
                    item.unit_price,
                    round(item.amount, 2),
                    "; ".join(item.source_refs)[:200],
                ])

            writer.writerow([])
            writer.writerow(["-", "-" * 40])
            writer.writerow(["合计", "", "", "", "", "", "", bill.total_amount])
            writer.writerow([])

            if bill.issues_summary:
                writer.writerow(["【问题清单】"])
                for issue in bill.issues_summary:
                    writer.writerow(["!", issue])
                writer.writerow([])

            if bill.warnings_summary:
                writer.writerow(["【警告提示】"])
                for warning in bill.warnings_summary:
                    writer.writerow(["?", warning])
                writer.writerow([])

            if bill.evidence_files:
                writer.writerow(["【凭证文件】"])
                for ev in bill.evidence_files:
                    writer.writerow(["@", ev])

        return str(path)

    def save_period_details_json(self, billing_period: BillingPeriod, output_path: str) -> str:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "period_info": {
                "start": str(billing_period.period_start),
                "end": str(billing_period.period_end),
                "customer": billing_period.customer,
                "mining_site": billing_period.mining_site,
            },
            "summary": {
                "total_billable_hours": billing_period.total_billable_hours,
                "total_billable_shifts": billing_period.total_billable_shifts,
                "total_free_hours": billing_period.total_free_hours,
                "total_amount": billing_period.total_amount,
            },
            "calendar_days": {
                f"{date}_{device_id}": {
                    "bill_date": str(day.bill_date),
                    "device_id": day.device_id,
                    "billable_hours": day.billable_hours,
                    "billable_shifts": day.billable_shifts,
                    "free_hours": day.free_hours,
                    "total_amount": day.total_amount,
                    "shifts_count": len(day.shift_records),
                    "downtimes_count": len(day.downtime_records),
                    "signatures_count": len(day.signature_sheets),
                    "issues": day.issues,
                    "warnings": day.warnings,
                    "shift_sources": [s.raw_source.original_name for s in day.shift_records],
                    "downtime_sources": [d.raw_source.original_name for d in day.downtime_records],
                    "signature_sources": [s.raw_source.original_name for s in day.signature_sheets],
                }
                for (date, device_id), day in billing_period.calendar_days.items()
            },
            "issues": billing_period.issues,
            "warnings": billing_period.warnings,
            "missing_shifts_dates": [str(d) for d in billing_period.missing_shifts_dates],
            "missing_signature_pages": billing_period.missing_signature_pages,
        }

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return str(path)

    def get_actionable_hints(self, billing_period: BillingPeriod) -> List[str]:
        hints = []

        if billing_period.missing_shifts_dates:
            dates_str = ", ".join(str(d) for d in billing_period.missing_shifts_dates[:5])
            if len(billing_period.missing_shifts_dates) > 5:
                dates_str += f" 等共{len(billing_period.missing_shifts_dates)}天"
            hints.append(f"【需补班次】以下日期缺少班次记录: {dates_str}")
            hints.append("  > 操作建议：联系现场调度补填或确认当日设备是否停用")

        if billing_period.missing_signature_pages:
            hints.append(f"【需补签字单】{len(billing_period.missing_signature_pages)}份签字单缺页")
            hints.append("  > 操作建议：查找对应日期的签字单扫描件或联系客户补签")

        unsigned = self.shift_manager.get_unsigned_shifts(
            billing_period.period_start, billing_period.period_end
        )
        if unsigned:
            hints.append(f"【需确认签字】{len(unsigned)}个班次无客户签字")
            hints.append("  > 操作建议：优先核对纸质签字单或安排补签")

        unapproved = self.downtime_manager.get_unapproved_downtimes()
        if unapproved:
            hints.append(f"【需审批】{len(unapproved)}条停机记录未审批")
            hints.append("  > 操作建议：请主管审批故障记录后重新计算")

        if billing_period.unmatched_shifts:
            hints.append(f"【需匹配】{len(billing_period.unmatched_shifts)}个班次无对应签字单")
            hints.append("  > 操作建议：检查签字单关联的班次编号是否正确")

        if billing_period.unmatched_signatures:
            hints.append(f"【需核对】{len(billing_period.unmatched_signatures)}份签字单未匹配班次")
            hints.append("  > 操作建议：确认这些签字单对应的设备和日期")

        return hints
