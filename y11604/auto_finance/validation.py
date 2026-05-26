from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy import and_, or_

from .models import (
    Contract, DownPayment, BalancePlan, GpsWorkOrder,
    Delivery, Refund, Vehicle
)


class ValidationIssue:
    def __init__(self, issue_type: str, severity: str, message: str,
                 entity_type: str = None, entity_id: int = None,
                 contract_no: str = None, details: Dict = None):
        self.issue_type = issue_type
        self.severity = severity
        self.message = message
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.contract_no = contract_no
        self.details = details or {}

    def to_dict(self):
        return {
            "issue_type": self.issue_type,
            "severity": self.severity,
            "message": self.message,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "contract_no": self.contract_no,
            "details": self.details,
        }


def check_balance_after_delivery(db, contract: Contract) -> Optional[ValidationIssue]:
    deliveries = [d for d in contract.deliveries if d.delivered_at]
    if not deliveries:
        return None

    plans = [p for p in contract.balance_plans if p.status == "settled"]

    for delivery in deliveries:
        if not delivery.delivered_at:
            continue
        for plan in plans:
            if plan.actual_settled_at and plan.actual_settled_at > delivery.delivered_at:
                return ValidationIssue(
                    issue_type="balance_after_delivery",
                    severity="high",
                    message=f"尾款到账({plan.actual_settled_at.strftime('%Y-%m-%d')})晚于交车时间({delivery.delivered_at.strftime('%Y-%m-%d')})",
                    entity_type="BalancePlan",
                    entity_id=plan.id,
                    contract_no=contract.contract_no,
                    details={
                        "delivery_id": delivery.id,
                        "delivery_date": delivery.delivered_at.isoformat(),
                        "settle_date": plan.actual_settled_at.isoformat(),
                        "settle_amount": plan.actual_settled_amount,
                    }
                )
    return None


def check_vehicle_change(db, contract: Contract) -> Optional[ValidationIssue]:
    from .services import get_contract_versions
    versions = get_contract_versions(db, contract.contract_no)
    if len(versions) < 2:
        return None

    vins = [v.vin for v in versions]
    if len(set(vins)) > 1:
        changes = []
        for i in range(1, len(versions)):
            if versions[i].vin != versions[i-1].vin:
                changes.append({
                    "from_version": versions[i-1].version,
                    "to_version": versions[i].version,
                    "from_vin": versions[i-1].vin,
                    "to_vin": versions[i].vin,
                    "changed_at": versions[i].created_at.isoformat(),
                })
        return ValidationIssue(
            issue_type="vehicle_changed",
            severity="medium",
            message=f"合同存在换车记录，共{len(changes)}次变更",
            entity_type="Contract",
            entity_id=contract.id,
            contract_no=contract.contract_no,
            details={"changes": changes}
        )
    return None


def check_gps_not_cancelled_after_refund(db, contract: Contract) -> Optional[ValidationIssue]:
    if contract.status != "cancelled":
        return None

    active_orders = db.query(GpsWorkOrder).filter(
        GpsWorkOrder.contract_id == contract.id,
        GpsWorkOrder.status.in_(["pending", "in_progress", "completed"])
    ).all()

    if active_orders:
        order_nos = [o.order_no for o in active_orders]
        return ValidationIssue(
            issue_type="gps_not_cancelled",
            severity="high",
            message=f"合同已取消，但GPS工单未取消: {', '.join(order_nos)}",
            entity_type="GpsWorkOrder",
            entity_id=active_orders[0].id,
            contract_no=contract.contract_no,
            details={"active_order_nos": order_nos}
        )
    return None


def check_down_payment_mismatch(db, contract: Contract) -> Optional[ValidationIssue]:
    total_paid = sum(
        p.amount for p in contract.down_payments
        if p.status == "paid"
    )

    if total_paid < contract.down_payment_amount:
        diff = contract.down_payment_amount - total_paid
        return ValidationIssue(
            issue_type="down_payment_shortage",
            severity="high",
            message=f"首付款不足，已付{total_paid:.2f}，应付{contract.down_payment_amount:.2f}，差额{diff:.2f}",
            entity_type="DownPayment",
            entity_id=contract.down_payments[0].id if contract.down_payments else contract.id,
            contract_no=contract.contract_no,
            details={
                "total_paid": total_paid,
                "required": contract.down_payment_amount,
                "shortage": diff,
            }
        )
    elif total_paid > contract.down_payment_amount:
        diff = total_paid - contract.down_payment_amount
        return ValidationIssue(
            issue_type="down_payment_over",
            severity="medium",
            message=f"首付款超额，已付{total_paid:.2f}，应付{contract.down_payment_amount:.2f}，超额{diff:.2f}",
            entity_type="DownPayment",
            entity_id=contract.down_payments[0].id if contract.down_payments else contract.id,
            contract_no=contract.contract_no,
            details={
                "total_paid": total_paid,
                "required": contract.down_payment_amount,
                "overage": diff,
            }
        )
    return None


def check_balance_mismatch(db, contract: Contract) -> Optional[ValidationIssue]:
    total_settled = sum(
        p.actual_settled_amount or 0 for p in contract.balance_plans
        if p.status == "settled"
    )

    if total_settled == 0:
        return None

    if abs(total_settled - contract.balance_amount) > 0.01:
        diff = contract.balance_amount - total_settled
        return ValidationIssue(
            issue_type="balance_mismatch",
            severity="high",
            message=f"尾款金额不一致，已到账{total_settled:.2f}，合同金额{contract.balance_amount:.2f}，差额{diff:.2f}",
            entity_type="BalancePlan",
            entity_id=contract.balance_plans[0].id if contract.balance_plans else contract.id,
            contract_no=contract.contract_no,
            details={
                "total_settled": total_settled,
                "contract_balance": contract.balance_amount,
                "difference": diff,
            }
        )
    return None


def check_amount_totals(db, contract: Contract) -> Optional[ValidationIssue]:
    calculated_total = contract.down_payment_amount + contract.balance_amount
    if abs(calculated_total - contract.total_amount) > 0.01:
        return ValidationIssue(
            issue_type="total_mismatch",
            severity="high",
            message=f"合同金额不一致，首付+尾款={calculated_total:.2f}，合同总价={contract.total_amount:.2f}",
            entity_type="Contract",
            entity_id=contract.id,
            contract_no=contract.contract_no,
            details={
                "down_payment": contract.down_payment_amount,
                "balance": contract.balance_amount,
                "sum": calculated_total,
                "total_amount": contract.total_amount,
            }
        )
    return None


def check_delivery_without_down_payment(db, contract: Contract) -> Optional[ValidationIssue]:
    deliveries = [d for d in contract.deliveries if d.delivered_at]
    if not deliveries:
        return None

    total_paid = sum(
        p.amount for p in contract.down_payments
        if p.status == "paid"
    )

    for delivery in deliveries:
        if delivery.down_payment_verified and total_paid < contract.down_payment_amount:
            return ValidationIssue(
                issue_type="delivery_without_down_payment",
                severity="high",
                message=f"交车已确认但首付款未足额到账，交车时间: {delivery.delivered_at.strftime('%Y-%m-%d')}",
                entity_type="Delivery",
                entity_id=delivery.id,
                contract_no=contract.contract_no,
                details={
                    "delivery_date": delivery.delivered_at.isoformat(),
                    "total_paid": total_paid,
                    "required": contract.down_payment_amount,
                }
            )
    return None


def check_delivery_without_gps(db, contract: Contract) -> Optional[ValidationIssue]:
    deliveries = [d for d in contract.deliveries if d.delivered_at]
    if not deliveries:
        return None

    gps_completed = db.query(GpsWorkOrder).filter(
        GpsWorkOrder.contract_id == contract.id,
        GpsWorkOrder.status == "completed",
        GpsWorkOrder.type == "install"
    ).first()

    for delivery in deliveries:
        if delivery.gps_installed and not gps_completed:
            return ValidationIssue(
                issue_type="delivery_without_gps",
                severity="medium",
                message=f"交车已确认GPS安装但无对应完工工单，交车时间: {delivery.delivered_at.strftime('%Y-%m-%d')}",
                entity_type="Delivery",
                entity_id=delivery.id,
                contract_no=contract.contract_no,
                details={"delivery_date": delivery.delivered_at.isoformat()}
            )
    return None


def validate_contract(db, contract: Contract) -> List[ValidationIssue]:
    issues = []
    checks = [
        check_amount_totals,
        check_down_payment_mismatch,
        check_balance_mismatch,
        check_balance_after_delivery,
        check_vehicle_change,
        check_gps_not_cancelled_after_refund,
        check_delivery_without_down_payment,
        check_delivery_without_gps,
    ]

    for check in checks:
        try:
            issue = check(db, contract)
            if issue:
                issues.append(issue)
        except Exception as e:
            issues.append(ValidationIssue(
                issue_type="validation_error",
                severity="low",
                message=f"校验出错: {str(e)}",
                entity_type="Contract",
                entity_id=contract.id,
                contract_no=contract.contract_no,
            ))

    return issues


def validate_all_contracts(db) -> List[ValidationIssue]:
    contracts = db.query(Contract).filter(Contract.is_current == True).all()
    all_issues = []
    for contract in contracts:
        issues = validate_contract(db, contract)
        all_issues.extend(issues)
    return all_issues


def group_issues_by_severity(issues: List[ValidationIssue]) -> Dict[str, List[ValidationIssue]]:
    return {
        "high": [i for i in issues if i.severity == "high"],
        "medium": [i for i in issues if i.severity == "medium"],
        "low": [i for i in issues if i.severity == "low"],
    }


def summarize_issues(issues: List[ValidationIssue]) -> Dict:
    grouped = group_issues_by_severity(issues)
    types = {}
    for issue in issues:
        types[issue.issue_type] = types.get(issue.issue_type, 0) + 1

    return {
        "total": len(issues),
        "high_count": len(grouped["high"]),
        "medium_count": len(grouped["medium"]),
        "low_count": len(grouped["low"]),
        "issue_types": types,
    }
