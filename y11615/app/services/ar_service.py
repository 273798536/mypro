import json
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.models import (
    Customer, Invoice, Receipt, ReceiptMatch, CollectionRecord,
    CreditLimit, Alert, AlertType, AgingBucket, AuditLog
)
from app.schemas.schemas import (
    AgingBucketSummary, CustomerOverdueSummary, RollingReport,
    ReceiptMatchCreate, MatchingCorrection
)
from app.utils.common import calculate_aging_bucket, get_bucket_order


class ARService:
    def __init__(self, db: Session):
        self.db = db

    def update_invoice_aging(self, report_date: Optional[date] = None) -> int:
        if report_date is None:
            report_date = date.today()
        invoices = self.db.query(Invoice).filter(Invoice.remaining_amount > 0).all()
        updated = 0
        for invoice in invoices:
            old_bucket = invoice.aging_bucket
            old_overdue = invoice.overdue_days
            new_bucket, overdue_days = calculate_aging_bucket(invoice.due_date, report_date)
            if old_bucket != new_bucket or old_overdue != overdue_days:
                invoice.aging_bucket = new_bucket
                invoice.overdue_days = overdue_days
                updated += 1
        self.db.commit()
        return updated

    def auto_match_receipts(self) -> Dict[str, Any]:
        unmatched_receipts = self.db.query(Receipt).filter(
            Receipt.unmatched_amount > 0.01
        ).order_by(Receipt.receipt_date).all()

        matched_count = 0
        total_matched_amount = 0
        alerts_created = 0

        for receipt in unmatched_receipts:
            unpaid_invoices = self.db.query(Invoice).filter(
                Invoice.customer_id == receipt.customer_id,
                Invoice.remaining_amount > 0.01
            ).order_by(Invoice.due_date).all()

            remaining_to_match = receipt.unmatched_amount
            for invoice in unpaid_invoices:
                if remaining_to_match <= 0.01:
                    break
                match_amount = min(remaining_to_match, invoice.remaining_amount)
                if match_amount <= 0.01:
                    continue

                receipt_match = ReceiptMatch(
                    receipt_id=receipt.id,
                    invoice_id=invoice.id,
                    match_amount=match_amount,
                    match_date=receipt.receipt_date,
                    is_manual=False
                )
                self.db.add(receipt_match)

                invoice.paid_amount += match_amount
                invoice.remaining_amount -= match_amount
                if invoice.remaining_amount <= 0.01:
                    invoice.status = "paid"
                    invoice.remaining_amount = 0

                receipt.matched_amount += match_amount
                receipt.unmatched_amount -= match_amount
                if receipt.unmatched_amount <= 0.01:
                    receipt.status = "matched"
                    receipt.unmatched_amount = 0

                remaining_to_match -= match_amount
                matched_count += 1
                total_matched_amount += match_amount

        self.db.commit()
        self.update_invoice_aging()

        return {
            "matched_count": matched_count,
            "total_matched_amount": total_matched_amount,
            "alerts_created": alerts_created
        }

    def manual_match_receipt(self, match_data: ReceiptMatchCreate,
                             operator: str = "system") -> ReceiptMatch:
        receipt = self.db.query(Receipt).filter(Receipt.id == match_data.receipt_id).first()
        invoice = self.db.query(Invoice).filter(Invoice.id == match_data.invoice_id).first()

        if not receipt or not invoice:
            raise ValueError("回款或发票不存在")

        if receipt.customer_id != invoice.customer_id:
            alert = Alert(
                alert_type=AlertType.WRONG_RECEIPT_MATCH,
                customer_id=receipt.customer_id,
                invoice_id=invoice.id,
                receipt_id=receipt.id,
                message=f"警告：回款{receipt.receipt_no}与发票{invoice.invoice_no}客户不一致"
            )
            self.db.add(alert)

        match_amount = min(match_data.match_amount, receipt.unmatched_amount, invoice.remaining_amount)
        if match_amount <= 0:
            raise ValueError("可匹配金额不足")

        receipt_match = ReceiptMatch(
            receipt_id=receipt.id,
            invoice_id=invoice.id,
            match_amount=match_amount,
            match_date=match_data.match_date,
            is_manual=True,
            remarks=match_data.remarks
        )
        self.db.add(receipt_match)

        invoice.paid_amount += match_amount
        invoice.remaining_amount -= match_amount
        if invoice.remaining_amount <= 0.01:
            invoice.status = "paid"
            invoice.remaining_amount = 0

        receipt.matched_amount += match_amount
        receipt.unmatched_amount -= match_amount
        if receipt.unmatched_amount <= 0.01:
            receipt.status = "matched"
            receipt.unmatched_amount = 0

        self.db.commit()
        self.update_invoice_aging()
        return receipt_match

    def correct_matching(self, correction: MatchingCorrection) -> Dict[str, Any]:
        old_match = self.db.query(ReceiptMatch).filter(
            ReceiptMatch.id == correction.old_match_id
        ).first()
        if not old_match:
            raise ValueError("原匹配记录不存在")

        old_match.is_corrected = True

        old_receipt = old_match.receipt
        old_invoice = old_match.invoice

        old_invoice.paid_amount -= old_match.match_amount
        old_invoice.remaining_amount += old_match.match_amount
        if old_invoice.remaining_amount > 0.01:
            old_invoice.status = "unpaid"

        old_receipt.matched_amount -= old_match.match_amount
        old_receipt.unmatched_amount += old_match.match_amount
        old_receipt.status = "pending" if old_receipt.unmatched_amount > 0.01 else old_receipt.status

        new_invoice = self.db.query(Invoice).filter(Invoice.id == correction.new_invoice_id).first()
        if not new_invoice:
            raise ValueError("目标发票不存在")

        match_amount = min(correction.new_match_amount, old_receipt.unmatched_amount, new_invoice.remaining_amount)
        if match_amount <= 0:
            raise ValueError("可匹配金额不足")

        new_match = ReceiptMatch(
            receipt_id=old_receipt.id,
            invoice_id=new_invoice.id,
            match_amount=match_amount,
            match_date=date.today(),
            is_manual=True,
            is_corrected=False,
            corrected_from_id=old_match.id,
            remarks=f"修正匹配: {correction.reason}"
        )
        self.db.add(new_match)

        new_invoice.paid_amount += match_amount
        new_invoice.remaining_amount -= match_amount
        if new_invoice.remaining_amount <= 0.01:
            new_invoice.status = "paid"
            new_invoice.remaining_amount = 0

        old_receipt.matched_amount += match_amount
        old_receipt.unmatched_amount -= match_amount
        if old_receipt.unmatched_amount <= 0.01:
            old_receipt.status = "matched"
            old_receipt.unmatched_amount = 0

        audit = AuditLog(
            table_name="receipt_matches",
            record_id=old_match.id,
            action="correct",
            old_values=json.dumps({
                "invoice_id": old_invoice.id,
                "invoice_no": old_invoice.invoice_no,
                "match_amount": old_match.match_amount
            }, ensure_ascii=False),
            new_values=json.dumps({
                "invoice_id": new_invoice.id,
                "invoice_no": new_invoice.invoice_no,
                "match_amount": match_amount,
                "reason": correction.reason
            }, ensure_ascii=False),
            changed_by=correction.corrected_by or "system",
            change_reason=correction.reason
        )
        self.db.add(audit)

        alert = Alert(
            alert_type=AlertType.WRONG_RECEIPT_MATCH,
            customer_id=old_receipt.customer_id,
            invoice_id=new_invoice.id,
            receipt_id=old_receipt.id,
            message=f"回款匹配修正: {old_receipt.receipt_no} 从 {old_invoice.invoice_no} 调整为 {new_invoice.invoice_no}, 原因: {correction.reason}"
        )
        self.db.add(alert)

        self.db.commit()
        self.update_invoice_aging()

        return {
            "old_match_id": old_match.id,
            "new_match_id": new_match.id,
            "match_amount": match_amount
        }

    def update_credit_usage(self) -> int:
        updated = 0
        customers = self.db.query(Customer).all()
        for customer in customers:
            total_unpaid = self.db.query(Invoice).filter(
                Invoice.customer_id == customer.id,
                Invoice.remaining_amount > 0
            ).with_entities(Invoice.remaining_amount).all()
            used_credit = sum(row[0] for row in total_unpaid)

            active_credit = self.db.query(CreditLimit).filter(
                CreditLimit.customer_id == customer.id,
                CreditLimit.is_frozen == False
            ).order_by(CreditLimit.effective_date.desc()).first()

            if active_credit:
                old_used = active_credit.used_credit
                old_available = active_credit.available_credit
                active_credit.used_credit = used_credit
                active_credit.available_credit = max(0, active_credit.credit_limit - used_credit)

                if used_credit > active_credit.credit_limit and not active_credit.is_frozen:
                    alert = Alert(
                        alert_type=AlertType.CREDIT_FROZEN,
                        customer_id=customer.id,
                        message=f"客户{customer.customer_name}({customer.customer_code})已超信用额度: 额度{active_credit.credit_limit}, 已用{used_credit:.2f}"
                    )
                    self.db.add(alert)

                if old_used != used_credit or old_available != active_credit.available_credit:
                    updated += 1

        self.db.commit()
        return updated

    def check_promise_dates(self) -> int:
        alerts_created = 0
        today = date.today()

        invoices = self.db.query(Invoice).filter(
            Invoice.promise_date.isnot(None),
            Invoice.remaining_amount > 0
        ).all()

        for invoice in invoices:
            if invoice.promise_date < today:
                existing_alert = self.db.query(Alert).filter(
                    Alert.invoice_id == invoice.id,
                    Alert.alert_type == AlertType.PROMISE_EXPIRED,
                    Alert.is_resolved == False
                ).first()

                if not existing_alert:
                    alert = Alert(
                        alert_type=AlertType.PROMISE_EXPIRED,
                        customer_id=invoice.customer_id,
                        invoice_id=invoice.id,
                        message=f"发票{invoice.invoice_no}承诺付款日{invoice.promise_date}已过期，欠款{invoice.remaining_amount:.2f}"
                    )
                    self.db.add(alert)
                    alerts_created += 1

        collection_records = self.db.query(CollectionRecord).filter(
            CollectionRecord.promise_date.isnot(None),
            CollectionRecord.status == "in_progress"
        ).all()

        for record in collection_records:
            if record.promise_date < today:
                existing_alert = self.db.query(Alert).filter(
                    Alert.customer_id == record.customer_id,
                    Alert.alert_type == AlertType.PROMISE_EXPIRED,
                    Alert.is_resolved == False
                ).first()

                if not existing_alert:
                    alert = Alert(
                        alert_type=AlertType.PROMISE_EXPIRED,
                        customer_id=record.customer_id,
                        invoice_id=record.invoice_id,
                        message=f"催收承诺{record.promise_date}已过期: {record.notes}"
                    )
                    self.db.add(alert)
                    alerts_created += 1

        self.db.commit()
        return alerts_created

    def generate_rolling_report(self, report_date: Optional[date] = None) -> RollingReport:
        if report_date is None:
            report_date = date.today()

        self.update_invoice_aging(report_date)
        self.update_credit_usage()
        self.check_promise_dates()

        customers = self.db.query(Customer).filter(Customer.is_active == True).all()
        customer_details = []
        total_invoice_amount = 0
        total_paid_amount = 0
        total_remaining = 0
        current_amount = 0
        total_overdue = 0

        all_buckets = defaultdict(lambda: {"amount": 0, "count": 0})

        for customer in customers:
            invoices = self.db.query(Invoice).filter(
                Invoice.customer_id == customer.id
            ).all()

            cust_invoice_total = sum(inv.total_amount for inv in invoices)
            cust_paid_total = sum(inv.paid_amount for inv in invoices)
            cust_remaining = sum(inv.remaining_amount for inv in invoices)

            cust_current = sum(inv.remaining_amount for inv in invoices
                               if inv.aging_bucket == AgingBucket.CURRENT)
            cust_overdue = cust_remaining - cust_current

            bucket_summary = []
            for bucket in get_bucket_order():
                bucket_amount = sum(inv.remaining_amount for inv in invoices
                                    if inv.aging_bucket == bucket)
                bucket_count = sum(1 for inv in invoices
                                   if inv.aging_bucket == bucket and inv.remaining_amount > 0.01)
                bucket_summary.append(AgingBucketSummary(
                    bucket=bucket,
                    amount=bucket_amount,
                    invoice_count=bucket_count,
                    percentage=(bucket_amount / cust_remaining * 100) if cust_remaining > 0 else 0
                ))
                all_buckets[bucket]["amount"] += bucket_amount
                all_buckets[bucket]["count"] += bucket_count

            alerts = self.db.query(Alert).filter(
                Alert.customer_id == customer.id,
                Alert.is_resolved == False
            ).all()

            last_collection = self.db.query(CollectionRecord).filter(
                CollectionRecord.customer_id == customer.id
            ).order_by(CollectionRecord.contact_date.desc()).first()

            active_credit = self.db.query(CreditLimit).filter(
                CreditLimit.customer_id == customer.id,
                CreditLimit.is_frozen == False
            ).order_by(CreditLimit.effective_date.desc()).first()

            total_invoice_amount += cust_invoice_total
            total_paid_amount += cust_paid_total
            total_remaining += cust_remaining
            current_amount += cust_current
            total_overdue += cust_overdue

            customer_details.append(CustomerOverdueSummary(
                customer_id=customer.id,
                customer_code=customer.customer_code,
                customer_name=customer.customer_name,
                total_invoice_amount=cust_invoice_total,
                total_paid_amount=cust_paid_total,
                total_remaining=cust_remaining,
                current_amount=cust_current,
                overdue_amount=cust_overdue,
                aging_buckets=bucket_summary,
                alerts=alerts,
                last_collection_date=last_collection.contact_date if last_collection else None,
                credit_limit=active_credit.credit_limit if active_credit else None,
                credit_used=active_credit.used_credit if active_credit else None,
                is_credit_frozen=active_credit.is_frozen if active_credit else False
            ))

        aging_summary = []
        for bucket in get_bucket_order():
            amount = all_buckets[bucket]["amount"]
            count = all_buckets[bucket]["count"]
            aging_summary.append(AgingBucketSummary(
                bucket=bucket,
                amount=amount,
                invoice_count=count,
                percentage=(amount / total_remaining * 100) if total_remaining > 0 else 0
            ))

        all_alerts = self.db.query(Alert).filter(Alert.is_resolved == False).all()

        return RollingReport(
            report_date=report_date,
            total_customers=len(customers),
            total_invoice_amount=total_invoice_amount,
            total_paid_amount=total_paid_amount,
            total_remaining=total_remaining,
            current_amount=current_amount,
            total_overdue=total_overdue,
            aging_summary=aging_summary,
            customer_details=customer_details,
            alerts=all_alerts
        )

    def get_collection_history(self, customer_id: int) -> List[Dict[str, Any]]:
        records = self.db.query(CollectionRecord).filter(
            CollectionRecord.customer_id == customer_id
        ).order_by(CollectionRecord.contact_date.desc()).all()

        result = []
        for record in records:
            invoice_no = record.invoice.invoice_no if record.invoice else None
            result.append({
                "id": record.id,
                "contact_date": record.contact_date,
                "collector": record.collector,
                "contact_method": record.contact_method,
                "contact_person": record.contact_person,
                "invoice_no": invoice_no,
                "promise_date": record.promise_date,
                "promise_amount": record.promise_amount,
                "next_action_date": record.next_action_date,
                "next_action": record.next_action,
                "status": record.status,
                "notes": record.notes,
                "created_at": record.created_at
            })
        return result
