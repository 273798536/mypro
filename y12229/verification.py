from datetime import date
from typing import List, Dict, Tuple, Optional
import uuid

from models import (
    PriceLockAgreement,
    BookingOrder,
    AmendmentRecord,
    BAFRate,
    CostReport,
    Issue,
    VerificationResult,
    IssueType,
    IssueSeverity,
    ContainerType,
)
from data_import import DataStore, parse_container_type


class PriceLockVerifier:
    def __init__(self, data_store: DataStore):
        self.data_store = data_store
        self._issue_counter = 0

    def _generate_issue_id(self) -> str:
        self._issue_counter += 1
        return f"ISS-{self._issue_counter:04d}"

    def _check_price_expired(
        self, booking: BookingOrder, agreement: PriceLockAgreement
    ) -> Optional[Issue]:
        if booking.etd > agreement.expiry_date:
            days_overdue = (booking.etd - agreement.expiry_date).days
            issue = Issue(
                issue_id=self._generate_issue_id(),
                issue_type=IssueType.PRICE_EXPIRED,
                severity=IssueSeverity.CRITICAL,
                booking_no=booking.booking_no,
                title="锁价协议已过期",
                description=f"订舱开船日期 {booking.etd} 超出锁价协议到期日 {agreement.expiry_date}，过期 {days_overdue} 天",
                source_records=[f"协议:{agreement.agreement_id}", f"订舱:{booking.booking_no}"],
                details={
                    "agreement_expiry": str(agreement.expiry_date),
                    "booking_etd": str(booking.etd),
                    "days_overdue": days_overdue,
                },
            )
            return issue
        return None

    def _check_container_changed(
        self, booking: BookingOrder, agreement: PriceLockAgreement, amendments: List[AmendmentRecord]
    ) -> Optional[Issue]:
        if booking.container_type != agreement.container_type:
            container_changes = [
                amd for amd in amendments
                if "箱型" in amd.field_changed or "container" in amd.field_changed.lower()
            ]
            
            change_history = []
            for amd in container_changes:
                change_history.append(f"{amd.amendment_date}: {amd.old_value} → {amd.new_value}")
            
            issue = Issue(
                issue_id=self._generate_issue_id(),
                issue_type=IssueType.CONTAINER_CHANGED,
                severity=IssueSeverity.WARNING,
                booking_no=booking.booking_no,
                title="箱型与锁价协议不符",
                description=f"订舱箱型 {booking.container_type.value} 与协议箱型 {agreement.container_type.value} 不符",
                source_records=[f"协议:{agreement.agreement_id}", f"订舱:{booking.booking_no}"] + [f"改单:{amd.amendment_id}" for amd in container_changes],
                amount_diff=None,
                details={
                    "agreement_container": agreement.container_type.value,
                    "booking_container": booking.container_type.value,
                    "change_history": change_history,
                    "has_amendment": len(container_changes) > 0,
                },
            )
            return issue
        return None

    def _get_baf_rate_for_container(self, baf_rate: BAFRate, container_type: ContainerType) -> float:
        rate_map = {
            ContainerType.TE20: baf_rate.baf_20gp,
            ContainerType.TE40: baf_rate.baf_40gp,
            ContainerType.TE40HQ: baf_rate.baf_40hq,
            ContainerType.TE45: baf_rate.baf_40hq * 1.125,
        }
        return rate_map.get(container_type, baf_rate.baf_20gp)

    def _find_applicable_baf_rate(
        self, carrier: str, trade_lane: str, target_date: date
    ) -> Optional[BAFRate]:
        for rate in self.data_store.baf_rates:
            if (
                rate.carrier == carrier
                and rate.trade_lane == trade_lane
                and rate.effective_date <= target_date <= rate.expiry_date
            ):
                return rate
        return None

    def _check_baf_adjustment(
        self,
        booking: BookingOrder,
        agreement: PriceLockAgreement,
        cost_report: CostReport,
    ) -> Optional[Issue]:
        current_baf_rate = self._find_applicable_baf_rate(
            booking.carrier, booking.trade_lane, booking.etd
        )
        
        if current_baf_rate:
            current_baf = self._get_baf_rate_for_container(current_baf_rate, booking.container_type)
            agreed_baf = agreement.baf_rate
            actual_baf = cost_report.actual_baf_rate
            
            baf_diff = actual_baf - agreed_baf
            
            if abs(baf_diff) > 0.01:
                issue = Issue(
                    issue_id=self._generate_issue_id(),
                    issue_type=IssueType.BAF_ADJUSTMENT,
                    severity=IssueSeverity.WARNING if baf_diff > 0 else IssueSeverity.INFO,
                    booking_no=booking.booking_no,
                    title="燃油费率差异",
                    description=f"协议燃油费 {agreed_baf} {agreement.currency}，实际燃油费 {actual_baf} {cost_report.currency}，差异 {baf_diff:+.2f} {cost_report.currency}",
                    source_records=[f"协议:{agreement.agreement_id}", f"订舱:{booking.booking_no}", f"费用报告:{cost_report.report_id}"],
                    amount_diff=baf_diff,
                    currency=cost_report.currency,
                    details={
                        "agreed_baf": agreed_baf,
                        "actual_baf": actual_baf,
                        "current_published_baf": current_baf,
                        "difference": baf_diff,
                        "rate_effective_date": str(current_baf_rate.effective_date),
                        "rate_expiry_date": str(current_baf_rate.expiry_date),
                    },
                )
                return issue
        return None

    def _check_quote_version(
        self, booking: BookingOrder, agreement: PriceLockAgreement, amendments: List[AmendmentRecord]
    ) -> Optional[Issue]:
        version_changes = [
            amd for amd in amendments
            if "版本" in amd.field_changed or "version" in amd.field_changed.lower() or "报价" in amd.field_changed
        ]
        
        if booking.quote_version != agreement.quote_version or version_changes:
            change_history = []
            for amd in version_changes:
                change_history.append(f"{amd.amendment_date}: {amd.old_value} → {amd.new_value} ({amd.reason or '无原因'})")
            
            issue = Issue(
                issue_id=self._generate_issue_id(),
                issue_type=IssueType.QUOTE_VERSION_MISMATCH,
                severity=IssueSeverity.INFO,
                booking_no=booking.booking_no,
                title="报价版本变更",
                description=f"订舱使用报价版本 {booking.quote_version}，协议版本 {agreement.quote_version}",
                source_records=[f"协议:{agreement.agreement_id}", f"订舱:{booking.booking_no}"] + [f"改单:{amd.amendment_id}" for amd in version_changes],
                details={
                    "agreement_version": agreement.quote_version,
                    "booking_version": booking.quote_version,
                    "version_history": change_history,
                    "has_rollback": any("回滚" in (amd.reason or "") for amd in version_changes),
                },
            )
            return issue
        return None

    def _calculate_expected_rates(
        self,
        booking: BookingOrder,
        agreement: PriceLockAgreement,
        amendments: List[AmendmentRecord],
    ) -> Tuple[float, float, Dict]:
        base_rate = agreement.base_rate
        baf_rate = agreement.baf_rate
        audit_trail = {
            "initial_base_rate": base_rate,
            "initial_baf_rate": baf_rate,
            "rate_adjustments": [],
            "version_changes": [],
        }

        for amd in sorted(amendments, key=lambda x: x.amendment_date):
            if "基本运费" in amd.field_changed or "base" in amd.field_changed.lower():
                try:
                    old_val = float(amd.old_value) if amd.old_value else base_rate
                    new_val = float(amd.new_value) if amd.new_value else base_rate
                    base_rate = new_val
                    audit_trail["rate_adjustments"].append({
                        "date": str(amd.amendment_date),
                        "type": "base_rate",
                        "old": old_val,
                        "new": new_val,
                        "reason": amd.reason,
                        "amendment_id": amd.amendment_id,
                    })
                except (ValueError, TypeError):
                    pass
            elif "燃油" in amd.field_changed or "baf" in amd.field_changed.lower():
                try:
                    old_val = float(amd.old_value) if amd.old_value else baf_rate
                    new_val = float(amd.new_value) if amd.new_value else baf_rate
                    baf_rate = new_val
                    audit_trail["rate_adjustments"].append({
                        "date": str(amd.amendment_date),
                        "type": "baf_rate",
                        "old": old_val,
                        "new": new_val,
                        "reason": amd.reason,
                        "amendment_id": amd.amendment_id,
                    })
                except (ValueError, TypeError):
                    pass
            elif "版本" in amd.field_changed or "version" in amd.field_changed.lower():
                audit_trail["version_changes"].append({
                    "date": str(amd.amendment_date),
                    "old_version": amd.old_value,
                    "new_version": amd.new_value,
                    "reason": amd.reason,
                    "amendment_id": amd.amendment_id,
                })

        audit_trail["final_base_rate"] = base_rate
        audit_trail["final_baf_rate"] = baf_rate

        return base_rate, baf_rate, audit_trail

    def verify_booking(self, booking_no: str) -> Optional[VerificationResult]:
        booking = self.data_store.get_booking(booking_no)
        if not booking:
            return None

        agreement = self.data_store.get_agreement(booking.agreement_id)
        if not agreement:
            return None

        amendments = self.data_store.get_booking_amendments(booking_no)
        cost_reports = self.data_store.get_booking_cost_reports(booking_no)

        issues = []

        expired_issue = self._check_price_expired(booking, agreement)
        if expired_issue:
            issues.append(expired_issue)

        container_issue = self._check_container_changed(booking, agreement, amendments)
        if container_issue:
            issues.append(container_issue)

        version_issue = self._check_quote_version(booking, agreement, amendments)
        if version_issue:
            issues.append(version_issue)

        expected_base_rate, expected_baf_rate, audit_trail = self._calculate_expected_rates(
            booking, agreement, amendments
        )

        actual_base_rate = booking.agreed_base_rate or expected_base_rate
        actual_baf_rate = booking.agreed_baf_rate or expected_baf_rate

        if cost_reports:
            latest_report = sorted(cost_reports, key=lambda x: x.report_date)[-1]
            actual_base_rate = latest_report.actual_base_rate
            actual_baf_rate = latest_report.actual_baf_rate

            baf_issue = self._check_baf_adjustment(booking, agreement, latest_report)
            if baf_issue:
                issues.append(baf_issue)

        base_rate_diff = actual_base_rate - expected_base_rate
        baf_diff = actual_baf_rate - expected_baf_rate
        total_diff = (base_rate_diff + baf_diff) * booking.container_count

        audit_trail["agreement_link"] = agreement.agreement_id
        audit_trail["booking_link"] = booking.booking_no
        if amendments:
            audit_trail["amendment_links"] = [amd.amendment_id for amd in amendments]
        if cost_reports:
            audit_trail["cost_report_links"] = [rep.report_id for rep in cost_reports]

        result = VerificationResult(
            booking_no=booking_no,
            agreement_id=agreement.agreement_id,
            is_match=len(issues) == 0,
            issues=issues,
            expected_base_rate=expected_base_rate,
            expected_baf_rate=expected_baf_rate,
            actual_base_rate=actual_base_rate,
            actual_baf_rate=actual_baf_rate,
            base_rate_diff=base_rate_diff,
            baf_diff=baf_diff,
            total_diff=total_diff,
            quote_version=booking.quote_version,
            container_type=booking.container_type,
            audit_trail=audit_trail,
        )

        return result

    def verify_all(self) -> List[VerificationResult]:
        results = []
        for booking_no in self.data_store.bookings:
            result = self.verify_booking(booking_no)
            if result:
                results.append(result)
        return results
