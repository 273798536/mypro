from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path
import csv
from collections import defaultdict
from .models import CorrectionRecord, CorrectionType, SalesOrder


class AuditTrail:
    def __init__(self, audit_file: str = "./data/audit_log.csv"):
        self.audit_file = Path(audit_file)
        self.corrections: List[CorrectionRecord] = []
        self._ensure_audit_file()

    def _ensure_audit_file(self) -> None:
        if not self.audit_file.parent.exists():
            self.audit_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.audit_file.exists():
            self._write_header()

    def _write_header(self) -> None:
        with open(self.audit_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "order_id", "correction_type", "field_name", "old_value",
                "new_value", "reason", "corrected_by", "corrected_at", "source"
            ])

    def add_correction(
        self,
        order_id: str,
        correction_type: CorrectionType,
        field_name: str,
        old_value: Any,
        new_value: Any,
        reason: str,
        corrected_by: str = "system",
        source: str = "",
    ) -> CorrectionRecord:
        record = CorrectionRecord(
            order_id=order_id,
            correction_type=correction_type,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            corrected_by=corrected_by,
            corrected_at=datetime.now(),
            source=source,
        )
        self.corrections.append(record)
        self._append_to_file(record)
        return record

    def _append_to_file(self, record: CorrectionRecord) -> None:
        with open(self.audit_file, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                record.order_id,
                record.correction_type.value,
                record.field_name,
                str(record.old_value),
                str(record.new_value),
                record.reason,
                record.corrected_by,
                record.corrected_at.isoformat(),
                record.source,
            ])

    def load_existing(self) -> List[CorrectionRecord]:
        if not self.audit_file.exists():
            return []

        records = []
        with open(self.audit_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    record = CorrectionRecord(
                        order_id=row["order_id"],
                        correction_type=CorrectionType(row["correction_type"]),
                        field_name=row["field_name"],
                        old_value=row["old_value"],
                        new_value=row["new_value"],
                        reason=row["reason"],
                        corrected_by=row["corrected_by"],
                        corrected_at=datetime.fromisoformat(row["corrected_at"]),
                        source=row.get("source", ""),
                    )
                    records.append(record)
                except (ValueError, KeyError):
                    continue
        self.corrections = records
        return records

    def get_corrections_for_order(self, order_id: str) -> List[CorrectionRecord]:
        return [c for c in self.corrections if c.order_id == order_id]

    def get_corrections_by_type(self, correction_type: CorrectionType) -> List[CorrectionRecord]:
        return [c for c in self.corrections if c.correction_type == correction_type]

    def get_correction_summary(self) -> Dict[str, int]:
        summary = defaultdict(int)
        for c in self.corrections:
            summary[c.correction_type.value] += 1
        return dict(summary)

    def apply_auto_corrections(
        self,
        orders: List[SalesOrder],
        region_rules: Dict,
        product_lines: List[str],
    ) -> List[SalesOrder]:
        corrected_orders = []

        for order in orders:
            corrected = False

            if order.region and order.region not in region_rules:
                corrected_region = self._suggest_region(order.region, list(region_rules.keys()))
                if corrected_region:
                    self.add_correction(
                        order_id=order.order_id,
                        correction_type=CorrectionType.REGION_FIX,
                        field_name="region",
                        old_value=order.region,
                        new_value=corrected_region,
                        reason=f"区域名称模糊匹配: '{order.region}' -> '{corrected_region}'",
                        corrected_by="auto_fix",
                        source=order.source_file,
                    )
                    order.region = corrected_region
                    corrected = True

            if order.product_line and order.product_line not in product_lines and product_lines:
                corrected_product = self._suggest_product_line(order.product_line, product_lines)
                if corrected_product:
                    self.add_correction(
                        order_id=order.order_id,
                        correction_type=CorrectionType.REGION_FIX,
                        field_name="product_line",
                        old_value=order.product_line,
                        new_value=corrected_product,
                        reason=f"产品线名称模糊匹配: '{order.product_line}' -> '{corrected_product}'",
                        corrected_by="auto_fix",
                        source=order.source_file,
                    )
                    order.product_line = corrected_product
                    corrected = True

            if order.payment_status.lower() in ["已回款", "paid", "complete"] and order.payment_amount == 0:
                self.add_correction(
                    order_id=order.order_id,
                    correction_type=CorrectionType.PAYMENT_STATUS_FIX,
                    field_name="payment_amount",
                    old_value=0,
                    new_value=order.amount,
                    reason=f"状态为'已回款'但回款金额为0, 自动修正为订单金额",
                    corrected_by="auto_fix",
                    source=order.source_file,
                )
                order.payment_amount = order.amount
                corrected = True

            corrected_orders.append(order)

        return corrected_orders

    def _suggest_region(self, region: str, valid_regions: List[str]) -> Optional[str]:
        region_lower = region.lower()
        for valid in valid_regions:
            if region_lower in valid.lower() or valid.lower() in region_lower:
                return valid
        return None

    def _suggest_product_line(self, product: str, valid_products: List[str]) -> Optional[str]:
        product_lower = product.lower()
        for valid in valid_products:
            if product_lower in valid.lower() or valid.lower() in product_lower:
                return valid
        return None

    def export_corrections(self, output_file: str) -> None:
        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "order_id", "correction_type", "field_name", "old_value",
                "new_value", "reason", "corrected_by", "corrected_at", "source"
            ])
            for record in self.corrections:
                writer.writerow([
                    record.order_id,
                    record.correction_type.value,
                    record.field_name,
                    str(record.old_value),
                    str(record.new_value),
                    record.reason,
                    record.corrected_by,
                    record.corrected_at.isoformat(),
                    record.source,
                ])
