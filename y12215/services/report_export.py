from typing import List, Dict, Optional
from datetime import date, datetime
from decimal import Decimal
import csv
import json
from io import StringIO
from models import AnnualPassAccount, RevenueType


class ReportExportService:
    def __init__(self, data_store):
        self.data_store = data_store

    def export_revenue_report(self, start_date: date, end_date: date,
                              format: str = "csv") -> str:
        report_data = self._generate_revenue_report_data(start_date, end_date)
        if format == "csv":
            return self._to_csv(report_data)
        elif format == "json":
            return self._to_json(report_data)
        else:
            raise ValueError(f"Unsupported format: {format}")

    def _generate_revenue_report_data(self, start_date: date,
                                      end_date: date) -> List[dict]:
        rows = []
        for account in self.data_store.get_all_accounts():
            details = [
                d for d in self.data_store.get_revenue_details_by_account(account.account_id)
                if start_date <= d.revenue_date <= end_date
            ]
            for detail in details:
                package = self.data_store.get_package_version(detail.package_version_id)
                row = {
                    "detail_id": detail.detail_id,
                    "account_id": account.account_id,
                    "customer_name": account.customer_name,
                    "customer_id": account.customer_id,
                    "package_version_id": detail.package_version_id,
                    "package_name": package.package_name if package else "",
                    "revenue_date": detail.revenue_date.isoformat(),
                    "amount": str(detail.amount),
                    "revenue_type": detail.revenue_type.value,
                    "is_adjusted": detail.is_adjusted,
                    "source_record_id": detail.source_record_id or "",
                    "source_record_type": detail.source_record_type or "",
                    "related_detail_id": detail.related_detail_id or "",
                    "account_start_date": account.start_date.isoformat(),
                    "account_expiry_date": account.expiry_date.isoformat(),
                    "original_purchase_amount": str(account.original_amount),
                    "source_order_id": account.source_order_id or ""
                }
                rows.append(row)
        return rows

    def export_account_details_report(self, account_id: str) -> dict:
        account = self.data_store.get_account(account_id)
        if not account:
            return {}
        package = self.data_store.get_package_version(account.package_version_id)
        upgrades = self.data_store.get_upgrade_records_by_account(account_id)
        entries = self.data_store.get_entry_records_by_account(account_id)
        refunds = self.data_store.get_refund_records_by_account(account_id)
        adjustments = self.data_store.get_adjustment_records_by_account(account_id)
        revenue_details = self.data_store.get_revenue_details_by_account(account_id)
        return {
            "account_summary": {
                "account_id": account.account_id,
                "customer_name": account.customer_name,
                "customer_id": account.customer_id,
                "current_package": package.package_name if package else "",
                "current_package_version_id": account.package_version_id,
                "purchase_date": account.purchase_date.isoformat(),
                "start_date": account.start_date.isoformat(),
                "expiry_date": account.expiry_date.isoformat(),
                "original_amount": str(account.original_amount),
                "paid_amount": str(account.paid_amount),
                "status": account.status,
                "source_order_id": account.source_order_id or ""
            },
            "upgrade_history": self._format_upgrades(upgrades),
            "entry_records": self._format_entries(entries),
            "refund_records": self._format_refunds(refunds),
            "adjustment_records": self._format_adjustments(adjustments),
            "revenue_details": self._format_revenue_details(revenue_details),
            "data_mapping": {
                "revenue_to_account": self._map_revenue_to_account(revenue_details, account),
                "refund_to_revenue": self._map_refund_to_revenue(refunds),
                "upgrade_to_adjustment": self._map_upgrade_to_adjustment(upgrades, adjustments)
            }
        }

    def _format_upgrades(self, upgrades: list) -> List[dict]:
        result = []
        for u in upgrades:
            from_pkg = self.data_store.get_package_version(u.from_package_version_id)
            to_pkg = self.data_store.get_package_version(u.to_package_version_id)
            result.append({
                "upgrade_id": u.upgrade_id,
                "upgrade_date": u.upgrade_date.isoformat(),
                "from_package": from_pkg.package_name if from_pkg else "",
                "from_package_id": u.from_package_version_id,
                "to_package": to_pkg.package_name if to_pkg else "",
                "to_package_id": u.to_package_version_id,
                "upgrade_fee": str(u.upgrade_fee),
                "source_order_id": u.source_order_id or ""
            })
        return result

    def _format_entries(self, entries: list) -> List[dict]:
        return [
            {
                "entry_id": e.entry_id,
                "entry_date": e.entry_date.isoformat(),
                "entry_time": e.entry_time.isoformat() if e.entry_time else "",
                "gate_id": e.gate_id or "",
                "entry_type": e.entry_type.value,
                "is_duplicate": e.is_duplicate,
                "duplicate_of_entry_id": e.duplicate_of_entry_id or "",
                "source_record_id": e.source_record_id or ""
            }
            for e in entries
        ]

    def _format_refunds(self, refunds: list) -> List[dict]:
        return [
            {
                "refund_id": r.refund_id,
                "refund_date": r.refund_date.isoformat(),
                "refund_amount": str(r.refund_amount),
                "affected_period": r.affected_period or "",
                "affected_revenue_count": len(r.affected_revenue_detail_ids),
                "affected_revenue_detail_ids": r.affected_revenue_detail_ids,
                "source_order_id": r.source_order_id or ""
            }
            for r in refunds
        ]

    def _format_adjustments(self, adjustments: list) -> List[dict]:
        return [
            {
                "adjustment_id": a.adjustment_id,
                "adjustment_type": a.adjustment_type.value,
                "adjustment_date": a.adjustment_date.isoformat(),
                "amount": str(a.amount),
                "affected_revenue_count": len(a.affected_revenue_detail_ids),
                "source_record_id": a.source_record_id or "",
                "source_record_type": a.source_record_type or ""
            }
            for a in adjustments
        ]

    def _format_revenue_details(self, details: list) -> List[dict]:
        return [
            {
                "detail_id": d.detail_id,
                "revenue_date": d.revenue_date.isoformat(),
                "amount": str(d.amount),
                "revenue_type": d.revenue_type.value,
                "package_version_id": d.package_version_id,
                "is_adjusted": d.is_adjusted,
                "source_record_id": d.source_record_id or "",
                "source_record_type": d.source_record_type or "",
                "related_detail_id": d.related_detail_id or ""
            }
            for d in details
        ]

    def _map_revenue_to_account(self, revenue_details: list,
                                account: AnnualPassAccount) -> Dict[str, str]:
        mapping = {}
        for d in revenue_details:
            mapping[d.detail_id] = f"Account: {account.account_id}, Customer: {account.customer_name}"
        return mapping

    def _map_refund_to_revenue(self, refunds: list) -> Dict[str, List[str]]:
        mapping = {}
        for r in refunds:
            mapping[r.refund_id] = r.affected_revenue_detail_ids
        return mapping

    def _map_upgrade_to_adjustment(self, upgrades: list,
                                    adjustments: list) -> Dict[str, str]:
        mapping = {}
        for u in upgrades:
            for a in adjustments:
                if a.source_record_id == u.upgrade_id:
                    mapping[u.upgrade_id] = a.adjustment_id
        return mapping

    def _to_csv(self, data: List[dict]) -> str:
        if not data:
            return ""
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()

    def _to_json(self, data: list) -> str:
        return json.dumps(data, ensure_ascii=False, indent=2)

    def save_report_to_file(self, content: str, filename: str) -> None:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)

    def generate_audit_trail_report(self, account_id: Optional[str] = None) -> List[dict]:
        trail = []
        adjustments = (
            self.data_store.get_adjustment_records_by_account(account_id)
            if account_id
            else list(self.data_store.adjustment_records.values())
        )
        for adj in sorted(adjustments, key=lambda a: a.adjustment_date):
            account = self.data_store.get_account(adj.account_id)
            trail.append({
                "adjustment_id": adj.adjustment_id,
                "adjustment_date": adj.adjustment_date.isoformat(),
                "adjustment_type": adj.adjustment_type.value,
                "account_id": adj.account_id,
                "customer_name": account.customer_name if account else "",
                "amount": str(adj.amount),
                "affected_revenue_details": adj.affected_revenue_detail_ids,
                "source_record_id": adj.source_record_id or "",
                "source_record_type": adj.source_record_type or "",
                "operator": adj.operator or "",
                "remarks": adj.remarks or ""
            })
        return trail
