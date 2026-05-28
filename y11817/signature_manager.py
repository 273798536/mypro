from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple
import csv
from pathlib import Path
from collections import defaultdict

from models import (
    SignatureSheet,
    RawSourceInfo,
    ShiftRecord,
)


class SignatureManager:
    def __init__(self):
        self.signatures: List[SignatureSheet] = []
        self.signatures_by_device: Dict[str, List[SignatureSheet]] = defaultdict(list)
        self.signatures_by_date: Dict[date, List[SignatureSheet]] = defaultdict(list)
        self.signatures_by_sheet_id: Dict[str, SignatureSheet] = {}
        self.source_files: List[str] = []
        self.warnings: List[str] = []

    def import_from_csv(self, file_path: str) -> List[str]:
        path = Path(file_path)
        if not path.exists():
            self.warnings.append(f"签字单文件不存在: {file_path}")
            return self.warnings

        self.source_files.append(file_path)

        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                try:
                    sheet = self._parse_signature_row(row, file_path, row_num)
                    self._add_signature(sheet)
                except Exception as e:
                    self.warnings.append(f"{file_path}第{row_num}行: 解析失败 - {str(e)}")

        return self.warnings

    def _parse_signature_row(
        self, row: Dict[str, str], source_file: str, row_num: int
    ) -> SignatureSheet:
        original_name = f"{source_file}第{row_num}行"
        raw_source = RawSourceInfo(
            source_file=source_file, original_name=original_name
        )

        sheet_id = row.get("单据编号", row.get("签字单编号", "")).strip()
        device_id = row.get("设备编号", row.get("设备ID", "")).strip()

        sheet_date_str = row.get("日期", row.get("签字日期", "")).strip()
        sheet_date = self._parse_date(sheet_date_str)

        page_number = int(row.get("页码", row.get("当前页", 1)) or 1)
        total_pages = int(row.get("总页数", row.get("总页码", 1)) or 1)

        signed_at = None
        signed_at_str = row.get("签字时间", "").strip()
        if signed_at_str:
            signed_at = self._parse_datetime_full(signed_at_str)

        shift_refs_str = row.get("关联班次", row.get("班次记录", "")).strip()
        shift_refs = [r.strip() for r in shift_refs_str.replace("，", ",").split(",") if r.strip()]

        return SignatureSheet(
            raw_source=raw_source,
            sheet_id=sheet_id,
            sheet_date=sheet_date or date.today(),
            page_number=page_number,
            total_pages=total_pages,
            device_id=device_id,
            signed_by=row.get("签字人", row.get("客户签字", "")).strip(),
            signed_at=signed_at,
            shift_records_ref=shift_refs,
            image_ref=row.get("扫描件", row.get("图片路径", "")).strip(),
            notes=row.get("备注", "").strip(),
        )

    def _add_signature(self, sheet: SignatureSheet):
        if sheet.sheet_id in self.signatures_by_sheet_id:
            self.warnings.append(f"签字单编号重复: {sheet.sheet_id}")

        self.signatures.append(sheet)
        self.signatures_by_device[sheet.device_id].append(sheet)
        self.signatures_by_date[sheet.sheet_date].append(sheet)
        self.signatures_by_sheet_id[sheet.sheet_id] = sheet

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

    def _parse_datetime_full(self, value: str) -> Optional[datetime]:
        if not value:
            return None

        value = value.strip()
        formats = [
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y/%m/%d %H:%M:%S",
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

    def get_signature(self, sheet_id: str) -> Optional[SignatureSheet]:
        return self.signatures_by_sheet_id.get(sheet_id)

    def get_signatures_by_device(self, device_id: str) -> List[SignatureSheet]:
        return sorted(
            self.signatures_by_device.get(device_id, []), key=lambda s: s.sheet_date
        )

    def get_signatures_by_date(self, bill_date: date) -> List[SignatureSheet]:
        return sorted(
            self.signatures_by_date.get(bill_date, []), key=lambda s: s.sheet_id
        )

    def get_signatures_by_period(
        self, start_date: date, end_date: date
    ) -> List[SignatureSheet]:
        result = [
            s for s in self.signatures if start_date <= s.sheet_date <= end_date
        ]
        return sorted(result, key=lambda s: s.sheet_date)

    def detect_missing_pages(
        self, start_date: date = None, end_date: date = None
    ) -> List[dict]:
        missing = []

        target_signatures = self.signatures
        if start_date and end_date:
            target_signatures = [
                s for s in self.signatures if start_date <= s.sheet_date <= end_date
            ]

        pages_by_sheet: Dict[str, Dict[int, SignatureSheet]] = defaultdict(dict)
        for sheet in target_signatures:
            pages_by_sheet[sheet.sheet_id][sheet.page_number] = sheet

        for sheet_id, pages in pages_by_sheet.items():
            if not pages:
                continue

            example_sheet = list(pages.values())[0]
            total_pages = example_sheet.total_pages

            if total_pages <= 1:
                continue

            expected_pages = set(range(1, total_pages + 1))
            actual_pages = set(pages.keys())
            missing_pages = expected_pages - actual_pages

            if missing_pages:
                missing.append(
                    {
                        "sheet_id": sheet_id,
                        "device_id": example_sheet.device_id,
                        "sheet_date": example_sheet.sheet_date,
                        "total_pages": total_pages,
                        "missing_pages": sorted(list(missing_pages)),
                        "missing_count": len(missing_pages),
                        "original_source": example_sheet.raw_source.original_name,
                    }
                )

        return missing

    def match_shifts(
        self, shifts: List[ShiftRecord]
    ) -> Tuple[List[SignatureSheet], List[ShiftRecord]]:
        matched_signatures: List[SignatureSheet] = []
        matched_shift_ids: set = set()

        shift_map = {
            self._make_shift_key(s): s for s in shifts
        }

        for sheet in self.signatures:
            is_matched = False

            for ref in sheet.shift_records_ref:
                if ref in shift_map:
                    matched_shift_ids.add(ref)
                    is_matched = True

            if is_matched:
                matched_signatures.append(sheet)

        unmatched_shifts = [s for s in shifts if self._make_shift_key(s) not in matched_shift_ids]
        unmatched_signatures = [s for s in self.signatures if s not in matched_signatures]

        return unmatched_signatures, unmatched_shifts

    def _make_shift_key(self, shift: ShiftRecord) -> str:
        return f"{shift.device_id}-{shift.shift_date}-{shift.shift_type.value}"

    def summarize(self, start_date: date = None, end_date: date = None) -> dict:
        target_signatures = self.signatures
        if start_date and end_date:
            target_signatures = [
                s for s in self.signatures if start_date <= s.sheet_date <= end_date
            ]

        missing_pages = self.detect_missing_pages(start_date, end_date)

        return {
            "total_signatures": len(target_signatures),
            "unique_sheets": len(set(s.sheet_id for s in target_signatures)),
            "devices_count": len(set(s.device_id for s in target_signatures)),
            "missing_page_reports": len(missing_pages),
            "missing_pages_details": missing_pages,
            "source_files": self.source_files,
            "warnings": self.warnings,
        }
