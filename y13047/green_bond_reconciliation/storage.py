import json
import csv
from typing import List, Optional, Dict
from pathlib import Path
from datetime import datetime

from .models import ReconciliationRecord, ReconciliationStatus, ChangeHistory, ChangeType


class Storage:
    @staticmethod
    def save_records(records: List[ReconciliationRecord], output_path: str):
        data = [r.to_dict() for r in records]
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @staticmethod
    def load_records(input_path: str) -> List[ReconciliationRecord]:
        path = Path(input_path)
        if not path.exists():
            return []

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = []
        for item in data:
            history_list = []
            for h in item.get("history", []):
                old_status = ReconciliationStatus(h["old_status"]) if h.get("old_status") else None
                history_list.append(ChangeHistory(
                    timestamp=h["timestamp"],
                    change_type=ChangeType(h["change_type"]),
                    old_status=old_status,
                    new_status=ReconciliationStatus(h["new_status"]),
                    operator=h["operator"],
                    remark=h.get("remark", ""),
                    old_values=h.get("old_values", {}),
                    new_values=h.get("new_values", {}),
                ))

            record = ReconciliationRecord(
                record_id=item["record_id"],
                source_file=item["source_file"],
                source_row=item["source_row"],
                bond_code=item["bond_code"],
                bond_name=item["bond_name"],
                raise_amount=item["raise_amount"],
                used_amount=item["used_amount"],
                tax_amount=item.get("tax_amount"),
                exchange_rate=item.get("exchange_rate"),
                currency=item.get("currency", "CNY"),
                source=item.get("source", ""),
                raw_data=item.get("raw_data", {}),
                status=ReconciliationStatus(item["status"]),
                supplement=item.get("supplement", ""),
                impact_scope=item.get("impact_scope", ""),
                late_document=item.get("late_document", False),
                field_mappings=item.get("field_mappings", {}),
                failed_reason=item.get("failed_reason", ""),
                history=history_list,
                created_at=item.get("created_at", datetime.now().isoformat()),
                updated_at=item.get("updated_at", datetime.now().isoformat()),
            )
            records.append(record)

        return records


class CsvExporter:
    MAIN_HEADERS = [
        "记录ID", "来源文件", "来源行号", "债券代码", "债券名称",
        "募集金额", "已使用金额", "税费", "汇率", "币种",
        "数据来源", "处理状态", "影响范围", "是否凭证晚到",
        "补充说明", "字段映射", "失败原因", "创建时间", "更新时间"
    ]

    HISTORY_HEADERS = [
        "记录ID", "时间", "变更类型", "原状态", "新状态",
        "操作人", "备注", "原值", "新值"
    ]

    @staticmethod
    def export_details(records: List[ReconciliationRecord], output_path: str,
                       status_filter: Optional[ReconciliationStatus] = None) -> int:
        filtered = records
        if status_filter:
            filtered = [r for r in records if r.status == status_filter]

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(CsvExporter.MAIN_HEADERS)

            for r in filtered:
                field_mapping_str = ";".join(f"{k}->{v}" for k, v in r.field_mappings.items())
                writer.writerow([
                    r.record_id,
                    r.source_file,
                    r.source_row,
                    r.bond_code,
                    r.bond_name,
                    r.raise_amount,
                    r.used_amount,
                    r.tax_amount if r.tax_amount is not None else "",
                    r.exchange_rate if r.exchange_rate is not None else "",
                    r.currency,
                    r.source,
                    r.status.value,
                    r.impact_scope,
                    "是" if r.late_document else "否",
                    r.supplement,
                    field_mapping_str,
                    r.failed_reason,
                    r.created_at,
                    r.updated_at,
                ])

        return len(filtered)

    @staticmethod
    def export_history(records: List[ReconciliationRecord], output_path: str) -> int:
        total = 0
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(CsvExporter.HISTORY_HEADERS)

            for r in records:
                for h in r.history:
                    total += 1
                    old_status_val = h.old_status.value if h.old_status else "-"
                    writer.writerow([
                        r.record_id,
                        h.timestamp,
                        h.change_type.value,
                        old_status_val,
                        h.new_status.value,
                        h.operator,
                        h.remark,
                        json.dumps(h.old_values, ensure_ascii=False),
                        json.dumps(h.new_values, ensure_ascii=False),
                    ])

        return total

    @staticmethod
    def export_by_status(records: List[ReconciliationRecord], output_dir: str) -> Dict[str, int]:
        result = {}
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        for status in ReconciliationStatus:
            count = CsvExporter.export_details(
                records,
                str(output_path / f"{status.value}_明细.csv"),
                status_filter=status,
            )
            result[status.value] = count

        return result
