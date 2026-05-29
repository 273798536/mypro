"""核心业务引擎"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import uuid

from .models import (
    Invoice, BuyerConfirmation, CreditPool, RepaymentFlow,
    WriteOffApplication, OccupationRecord, RiskAlert,
    InvoiceProcessingResult, ProcessingSummary,
    InvoiceStatus, ConfirmationStatus, OccupationStatus,
    WriteOffStatus, RiskType, ProcessingStatus, DataSource,
    CorrectionTrace
)


class InvoiceFinanceEngine:
    """发票融资业务引擎"""

    def __init__(self):
        self.invoices: Dict[str, Invoice] = {}
        self.confirmations: Dict[str, BuyerConfirmation] = {}
        self.credit_pools: Dict[str, CreditPool] = {}
        self.repayments: Dict[str, RepaymentFlow] = {}
        self.write_offs: Dict[str, WriteOffApplication] = {}
        self.occupations: Dict[str, OccupationRecord] = {}
        self.invoice_no_index: Dict[str, List[str]] = {}
        self.processing_results: Dict[str, InvoiceProcessingResult] = {}

    def add_invoice(self, invoice: Invoice) -> None:
        """添加发票"""
        self.invoices[invoice.id] = invoice
        if invoice.invoice_no not in self.invoice_no_index:
            self.invoice_no_index[invoice.invoice_no] = []
        self.invoice_no_index[invoice.invoice_no].append(invoice.id)

    def add_confirmation(self, confirmation: BuyerConfirmation) -> None:
        """添加买方确认"""
        self.confirmations[confirmation.id] = confirmation

    def add_credit_pool(self, pool: CreditPool) -> None:
        """添加额度池"""
        self.credit_pools[pool.id] = pool

    def add_repayment(self, repayment: RepaymentFlow) -> None:
        """添加回款流水"""
        self.repayments[repayment.id] = repayment

    def add_write_off(self, write_off: WriteOffApplication) -> None:
        """添加核销申请"""
        self.write_offs[write_off.id] = write_off

    def add_occupation(self, occupation: OccupationRecord) -> None:
        """添加额度占用记录"""
        self.occupations[occupation.id] = occupation

    def verify_invoice(self, invoice_id: str, verifier: str, note: str = "") -> Tuple[bool, Optional[RiskAlert]]:
        """验真发票"""
        invoice = self.invoices.get(invoice_id)
        if not invoice:
            return False, None

        invoice.status = InvoiceStatus.VERIFIED
        invoice.verified_at = datetime.now()
        invoice.verified_by = verifier
        invoice.verification_note = note
        invoice.updated_at = datetime.now()

        return True, None

    def lock_credit(self, pool_id: str, invoice_id: str, amount: float) -> Tuple[bool, Optional[RiskAlert]]:
        """锁定额度"""
        pool = self.credit_pools.get(pool_id)
        invoice = self.invoices.get(invoice_id)

        if not pool or not invoice:
            return False, None

        if pool.available_credit < amount:
            alert = RiskAlert(
                alert_id=f"alert_{uuid.uuid4().hex[:8]}",
                risk_type=RiskType.EXCEED_CREDIT,
                severity="high",
                invoice_id=invoice_id,
                invoice_no=invoice.invoice_no,
                message=f"额度不足，锁定失败。可用额度: {pool.available_credit:.2f}，申请锁定: {amount:.2f}",
                details={
                    "pool_id": pool_id,
                    "available_credit": pool.available_credit,
                    "requested_amount": amount
                }
            )
            return False, alert

        pool.frozen_credit += amount
        pool.updated_at = datetime.now()

        occupation = OccupationRecord(
            id=f"occ_{uuid.uuid4().hex[:8]}",
            source=DataSource.OCCUPATION_REPORT,
            occupation_no=f"OCC{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:4].upper()}",
            invoice_id=invoice_id,
            amount=amount,
            status=OccupationStatus.LOCKED
        )
        self.add_occupation(occupation)

        return True, None

    def occupy_credit(self, occupation_id: str) -> bool:
        """正式占用额度"""
        occupation = self.occupations.get(occupation_id)
        if not occupation or occupation.status != OccupationStatus.LOCKED:
            return False

        invoice = self.invoices.get(occupation.invoice_id)
        if not invoice:
            return False

        pool = self._find_pool_for_invoice(occupation.invoice_id)
        if pool:
            pool.frozen_credit -= occupation.amount
            pool.used_credit += occupation.amount
            pool.updated_at = datetime.now()

        occupation.status = OccupationStatus.OCCUPIED
        occupation.occupied_at = datetime.now()
        occupation.updated_at = datetime.now()

        return True

    def release_credit(self, occupation_id: str, reason: str) -> bool:
        """释放额度"""
        occupation = self.occupations.get(occupation_id)
        if not occupation:
            return False

        invoice = self.invoices.get(occupation.invoice_id)
        if not invoice:
            return False

        pool = self._find_pool_for_invoice(occupation.invoice_id)
        if pool:
            if occupation.status == OccupationStatus.LOCKED:
                pool.frozen_credit -= occupation.amount
            elif occupation.status == OccupationStatus.OCCUPIED:
                pool.used_credit -= occupation.amount
            pool.updated_at = datetime.now()

        occupation.status = OccupationStatus.RELEASED
        occupation.released_at = datetime.now()
        occupation.release_reason = reason
        occupation.updated_at = datetime.now()

        return True

    def approve_write_off(self, write_off_id: str, approver: str, approved_amount: Optional[float] = None) -> Tuple[bool, List[RiskAlert]]:
        """审批核销申请"""
        write_off = self.write_offs.get(write_off_id)
        if not write_off or write_off.status != WriteOffStatus.PENDING:
            return False, []

        invoice = self.invoices.get(write_off.invoice_id)
        if not invoice:
            return False, []

        alerts: List[RiskAlert] = []
        amount_to_approve = approved_amount if approved_amount is not None else write_off.amount

        total_repaid = self._get_total_repayment(write_off.invoice_id)
        total_approved = self._get_total_approved_write_off(write_off.invoice_id)
        remaining = total_repaid - total_approved

        if amount_to_approve > remaining:
            alert = RiskAlert(
                alert_id=f"alert_{uuid.uuid4().hex[:8]}",
                risk_type=RiskType.PARTIAL_WRITE_OFF,
                severity="medium",
                invoice_id=write_off.invoice_id,
                invoice_no=invoice.invoice_no,
                message=f"部分核销：核销金额({amount_to_approve:.2f})超过可核销余额({remaining:.2f})",
                details={
                    "total_repaid": total_repaid,
                    "total_approved": total_approved,
                    "remaining": remaining,
                    "requested_amount": amount_to_approve
                }
            )
            alerts.append(alert)
            amount_to_approve = remaining

        write_off.status = WriteOffStatus.APPROVED if amount_to_approve == write_off.amount else WriteOffStatus.PARTIAL
        write_off.approved_amount = amount_to_approve
        write_off.approved_at = datetime.now()
        write_off.approver = approver
        write_off.updated_at = datetime.now()

        if amount_to_approve > 0:
            self._release_credit_by_invoice(write_off.invoice_id, amount_to_approve)

        return True, alerts

    def rollback_write_off(self, write_off_id: str, operator: str, reason: str) -> bool:
        """回滚核销"""
        write_off = self.write_offs.get(write_off_id)
        if not write_off or write_off.status not in [WriteOffStatus.APPROVED, WriteOffStatus.PARTIAL]:
            return False

        invoice = self.invoices.get(write_off.invoice_id)
        if not invoice:
            return False

        approved_amount = write_off.approved_amount or 0

        pool = self._find_pool_for_invoice(write_off.invoice_id)
        if pool:
            pool.used_credit -= approved_amount
            pool.updated_at = datetime.now()

        occupation = self._get_occupation_for_invoice(write_off.invoice_id)
        if occupation:
            occupation.amount += approved_amount
            occupation.updated_at = datetime.now()

        trace = CorrectionTrace(
            trace_id=f"trace_{uuid.uuid4().hex[:8]}",
            field_name="status",
            old_value=write_off.status,
            new_value=WriteOffStatus.ROLLED_BACK,
            operator=operator,
            reason=reason,
            source=DataSource.MANUAL_CORRECTION
        )
        write_off.corrections.append(trace)
        write_off.status = WriteOffStatus.ROLLED_BACK
        write_off.updated_at = datetime.now()

        return True

    def check_duplicate_pledge(self, invoice_id: str) -> Optional[RiskAlert]:
        """检查重复质押"""
        invoice = self.invoices.get(invoice_id)
        if not invoice:
            return None

        same_invoice_ids = self.invoice_no_index.get(invoice.invoice_no, [])
        occupied_ids = []

        for inv_id in same_invoice_ids:
            if inv_id == invoice_id:
                continue
            if self._has_active_occupation(inv_id):
                occupied_ids.append(inv_id)

        if occupied_ids:
            alert = RiskAlert(
                alert_id=f"alert_{uuid.uuid4().hex[:8]}",
                risk_type=RiskType.DUPLICATE_PLEDGE,
                severity="high",
                invoice_id=invoice_id,
                invoice_no=invoice.invoice_no,
                message=f"发票重复质押警告：该发票号码已在 {len(occupied_ids)} 笔业务中使用",
                details={
                    "duplicate_invoice_ids": occupied_ids,
                    "invoice_no": invoice.invoice_no
                }
            )
            return alert

        return None

    def check_buyer_revoked(self, invoice_id: str) -> Optional[RiskAlert]:
        """检查买方是否撤确认"""
        for conf in self.confirmations.values():
            if conf.invoice_id == invoice_id and conf.status == ConfirmationStatus.REVOKED:
                invoice = self.invoices.get(invoice_id)
                if invoice:
                    return RiskAlert(
                        alert_id=f"alert_{uuid.uuid4().hex[:8]}",
                        risk_type=RiskType.BUYER_REVOKED,
                        severity="high",
                        invoice_id=invoice_id,
                        invoice_no=invoice.invoice_no,
                        message=f"买方已撤销确认：撤销人={conf.revoker}，原因={conf.revocation_reason}",
                        details={
                            "revoked_at": conf.revoked_at.isoformat() if conf.revoked_at else None,
                            "revoker": conf.revoker,
                            "reason": conf.revocation_reason
                        }
                    )
        return None

    def check_invoice_valid(self, invoice_id: str) -> Optional[RiskAlert]:
        """检查发票有效性"""
        invoice = self.invoices.get(invoice_id)
        if not invoice:
            return None

        if invoice.status == InvoiceStatus.REJECTED:
            return RiskAlert(
                alert_id=f"alert_{uuid.uuid4().hex[:8]}",
                risk_type=RiskType.INVOICE_INVALID,
                severity="high",
                invoice_id=invoice_id,
                invoice_no=invoice.invoice_no,
                message="发票已被标记为无效/拒绝",
                details={"status": invoice.status}
            )

        if invoice.status != InvoiceStatus.VERIFIED:
            return RiskAlert(
                alert_id=f"alert_{uuid.uuid4().hex[:8]}",
                risk_type=RiskType.INVOICE_INVALID,
                severity="medium",
                invoice_id=invoice_id,
                invoice_no=invoice.invoice_no,
                message="发票尚未完成验真",
                details={"status": invoice.status}
            )

        return None

    def process_invoice(self, invoice_id: str, pool_id: str) -> InvoiceProcessingResult:
        """处理单张发票的额度占用"""
        invoice = self.invoices.get(invoice_id)
        if not invoice:
            raise ValueError(f"发票不存在: {invoice_id}")

        result = InvoiceProcessingResult(
            invoice_id=invoice_id,
            invoice_no=invoice.invoice_no,
            status=ProcessingStatus.NORMAL,
            available_amount=invoice.amount
        )

        alerts: List[RiskAlert] = []

        valid_alert = self.check_invoice_valid(invoice_id)
        if valid_alert:
            alerts.append(valid_alert)

        revoked_alert = self.check_buyer_revoked(invoice_id)
        if revoked_alert:
            alerts.append(revoked_alert)

        duplicate_alert = self.check_duplicate_pledge(invoice_id)
        if duplicate_alert:
            alerts.append(duplicate_alert)

        high_risk = [a for a in alerts if a.severity == "high"]
        if high_risk:
            result.status = ProcessingStatus.NEED_MANUAL
            result.risk_alerts = alerts
            result.notes.append("存在高风险，需人工确认")
            self.processing_results[invoice_id] = result
            return result

        total_repaid = self._get_total_repayment(invoice_id)
        total_written_off = self._get_total_approved_write_off(invoice_id)
        net_amount = invoice.amount - total_written_off

        if total_repaid > 0 and total_repaid < invoice.amount:
            partial_alert = RiskAlert(
                alert_id=f"alert_{uuid.uuid4().hex[:8]}",
                risk_type=RiskType.PARTIAL_WRITE_OFF,
                severity="medium",
                invoice_id=invoice_id,
                invoice_no=invoice.invoice_no,
                message=f"部分回款: 已回{total_repaid:.2f}, 未回{invoice.amount - total_repaid:.2f}",
                details={
                    "total_repaid": total_repaid,
                    "invoice_amount": invoice.amount,
                    "unpaid": invoice.amount - total_repaid
                }
            )
            alerts.append(partial_alert)
            result.notes.append(f"部分回款: 已回{total_repaid:.2f}, 未回{invoice.amount - total_repaid:.2f}")

        lock_success, lock_alert = self.lock_credit(pool_id, invoice_id, net_amount)
        if lock_alert:
            alerts.append(lock_alert)

        if not lock_success:
            result.status = ProcessingStatus.UNPROCESSED
            result.risk_alerts = alerts
            result.notes.append("额度锁定失败")
            self.processing_results[invoice_id] = result
            return result

        result.occupied_amount = net_amount
        result.available_amount = invoice.amount - net_amount - total_written_off
        result.risk_alerts = alerts

        if invoice.corrections:
            result.status = ProcessingStatus.CORRECTED
            result.corrections = invoice.corrections
            result.notes.append(f"存在{len(invoice.corrections)}条修正记录")
        elif alerts:
            result.status = ProcessingStatus.CORRECTED
            result.notes.append("系统自动修正了部分问题")

        self.processing_results[invoice_id] = result
        return result

    def process_all(self, pool_id: str) -> ProcessingSummary:
        """批量处理所有发票"""
        summary = ProcessingSummary()

        for invoice_id in self.invoices:
            result = self.process_invoice(invoice_id, pool_id)

            invoice = self.invoices[invoice_id]
            summary.total_invoices += 1
            summary.total_amount += invoice.amount

            if result.status == ProcessingStatus.UNPROCESSED:
                summary.unprocessed_count += 1
                summary.unprocessed_amount += invoice.amount
            elif result.status == ProcessingStatus.CORRECTED:
                summary.corrected_count += 1
                summary.corrected_amount += invoice.amount
            elif result.status == ProcessingStatus.NEED_MANUAL:
                summary.need_manual_count += 1
                summary.need_manual_amount += invoice.amount
            else:
                summary.normal_count += 1
                summary.normal_amount += invoice.amount

            summary.total_risk_alerts += len(result.risk_alerts)
            for alert in result.risk_alerts:
                key = alert.risk_type.value
                summary.risk_breakdown[key] = summary.risk_breakdown.get(key, 0) + 1

        return summary

    def _find_pool_for_invoice(self, invoice_id: str) -> Optional[CreditPool]:
        for pool in self.credit_pools.values():
            return pool
        return None

    def _has_active_occupation(self, invoice_id: str) -> bool:
        for occ in self.occupations.values():
            if occ.invoice_id == invoice_id and occ.status in [OccupationStatus.LOCKED, OccupationStatus.OCCUPIED]:
                return True
        return False

    def _get_total_repayment(self, invoice_id: str) -> float:
        return sum(r.amount for r in self.repayments.values() if r.invoice_id == invoice_id)

    def _get_total_approved_write_off(self, invoice_id: str) -> float:
        return sum(
            (w.approved_amount or 0)
            for w in self.write_offs.values()
            if w.invoice_id == invoice_id and w.status in [WriteOffStatus.APPROVED, WriteOffStatus.PARTIAL]
        )

    def _get_occupation_for_invoice(self, invoice_id: str) -> Optional[OccupationRecord]:
        for occ in self.occupations.values():
            if occ.invoice_id == invoice_id:
                return occ
        return None

    def _release_credit_by_invoice(self, invoice_id: str, amount: float) -> None:
        pool = self._find_pool_for_invoice(invoice_id)
        if pool:
            pool.used_credit -= amount
            pool.updated_at = datetime.now()

        occupation = self._get_occupation_for_invoice(invoice_id)
        if occupation and occupation.status == OccupationStatus.OCCUPIED:
            occupation.amount -= amount
            if occupation.amount <= 0:
                occupation.status = OccupationStatus.RELEASED
                occupation.released_at = datetime.now()
                occupation.release_reason = "核销完成"
            occupation.updated_at = datetime.now()
