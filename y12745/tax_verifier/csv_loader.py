import csv
import os
from typing import List, Optional
from .models import TaxRecord, SourceRef


class CsvLoader:
    REQUIRED_COLUMNS = {"record_id", "income_amount", "claimed_tax"}
    OPTIONAL_COLUMNS = {
        "taxpayer_name",
        "tax_year",
        "original_line_no",
        "image_name",
        "sheet_name",
        "source_note",
    }

    @classmethod
    def load(cls, file_path: str) -> List[TaxRecord]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"找不到文件: {file_path}")
        records: List[TaxRecord] = []
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            missing = cls.REQUIRED_COLUMNS - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"CSV缺少必要列: {', '.join(sorted(missing))}")
            for i, row in enumerate(reader, start=2):
                try:
                    records.append(cls._row_to_record(row, csv_line_no=i))
                except (ValueError, KeyError) as e:
                    raise ValueError(f"CSV第{i}行解析失败: {e}")
        return records

    @classmethod
    def _row_to_record(cls, row: dict, csv_line_no: int) -> TaxRecord:
        rid = row["record_id"].strip()
        if not rid:
            raise ValueError("record_id不能为空")
        income = float(row["income_amount"])
        tax = float(row["claimed_tax"])
        line_no = row.get("original_line_no", "").strip()
        source_ref = SourceRef(
            original_line_no=int(line_no) if line_no.isdigit() else csv_line_no,
            image_name=row.get("image_name", "").strip() or None,
            sheet_name=row.get("sheet_name", "").strip() or None,
            source_note=row.get("source_note", "").strip() or None,
        )
        return TaxRecord(
            record_id=rid,
            income_amount=income,
            claimed_tax=tax,
            taxpayer_name=row.get("taxpayer_name", "").strip(),
            tax_year=int(row.get("tax_year") or 0) if str(row.get("tax_year", "")).strip().isdigit() else 0,
            source_ref=source_ref,
            raw_data={k: v for k, v in row.items() if v},
        )

    @classmethod
    def template_row(cls) -> dict:
        return {
            "record_id": "R001",
            "income_amount": "100000.00",
            "claimed_tax": "7480.00",
            "taxpayer_name": "张三",
            "tax_year": "2024",
            "original_line_no": "2",
            "image_name": "scan_2024_001.jpg",
            "sheet_name": "评分记录表",
            "source_note": "来自题目清单第3题",
        }
