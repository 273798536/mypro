from datetime import datetime
from typing import Optional, List, Tuple, Dict
from sqlalchemy import and_, or_

from .models import (
    Vehicle, Contract, DownPayment, BalancePlan,
    GpsWorkOrder, Delivery, Refund
)
from .audit import log_creation, log_update


CONTRACT_STATUS = {"active", "cancelled", "completed", "suspended"}
PAYMENT_STATUS = {"pending", "paid", "failed", "refunded"}
GPS_STATUS = {"pending", "in_progress", "completed", "cancelled"}
DELIVERY_STATUS = {"pending", "delivered", "locked"}
REFUND_STATUS = {"pending", "approved", "completed", "rejected"}


def get_or_create_vehicle(db, vin: str, **kwargs) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.vin == vin).first()
    source = kwargs.pop("source", None)
    if not vehicle:
        vehicle = Vehicle(vin=vin, **kwargs)
        db.add(vehicle)
        db.flush()
        log_creation(db, "Vehicle", vehicle.id, source=source)
    return vehicle


def create_contract_version(db, contract_data: Dict, source: str = None, operator: str = None) -> Contract:
    contract_no = contract_data["contract_no"]
    existing = db.query(Contract).filter(
        Contract.contract_no == contract_no
    ).order_by(Contract.version.desc()).first()

    version = existing.version + 1 if existing else 1

    if existing:
        existing.is_current = False
        log_update(
            db, "Contract", existing.id, "is_current",
            True, False, source=source, operator=operator,
            remark=f"合同版本升级，新版本号: {version}"
        )

    vin = contract_data["vin"]
    get_or_create_vehicle(db, vin, source=source)

    contract = Contract(
        contract_no=contract_no,
        version=version,
        vin=vin,
        customer_name=contract_data["customer_name"],
        customer_phone=contract_data.get("customer_phone"),
        total_amount=contract_data["total_amount"],
        down_payment_amount=contract_data["down_payment_amount"],
        balance_amount=contract_data["balance_amount"],
        status=contract_data.get("status", "active"),
        signed_at=contract_data.get("signed_at"),
        effective_at=contract_data.get("effective_at"),
        is_current=True,
        source=source,
        remark=contract_data.get("remark"),
    )
    db.add(contract)
    db.flush()
    log_creation(db, "Contract", contract.id, source=source, operator=operator)

    if existing and existing.vin != vin:
        gps_orders = db.query(GpsWorkOrder).filter(
            GpsWorkOrder.contract_id == existing.id
        ).all()
        for order in gps_orders:
            order.vin = vin
            order.contract_id = contract.id
            log_update(
                db, "GpsWorkOrder", order.id, "vin",
                existing.vin, vin, source=source, operator=operator,
                remark=f"合同换车，VIN从{existing.vin}变更为{vin}"
            )

    return contract


def record_down_payment(db, payment_data: Dict, source: str = None, operator: str = None) -> DownPayment:
    contract_no = payment_data["contract_no"]
    contract = db.query(Contract).filter(
        Contract.contract_no == contract_no,
        Contract.is_current == True
    ).first()

    if not contract:
        raise ValueError(f"合同 {contract_no} 不存在或已失效")

    payment = DownPayment(
        contract_id=contract.id,
        transaction_no=payment_data.get("transaction_no"),
        amount=payment_data["amount"],
        paid_at=payment_data.get("paid_at"),
        payer=payment_data.get("payer"),
        payment_method=payment_data.get("payment_method"),
        status=payment_data.get("status", "paid"),
        source=source,
        remark=payment_data.get("remark"),
    )
    db.add(payment)
    db.flush()
    log_creation(db, "DownPayment", payment.id, source=source, operator=operator)
    return payment


def create_balance_plan(db, plan_data: Dict, source: str = None, operator: str = None) -> BalancePlan:
    contract_no = plan_data["contract_no"]
    contract = db.query(Contract).filter(
        Contract.contract_no == contract_no,
        Contract.is_current == True
    ).first()

    if not contract:
        raise ValueError(f"合同 {contract_no} 不存在或已失效")

    plan = BalancePlan(
        contract_id=contract.id,
        plan_no=plan_data.get("plan_no"),
        total_balance=plan_data["total_balance"],
        installment_count=plan_data.get("installment_count", 1),
        first_payment_date=plan_data.get("first_payment_date"),
        monthly_amount=plan_data.get("monthly_amount"),
        status=plan_data.get("status", "pending"),
        source=source,
        remark=plan_data.get("remark"),
    )
    db.add(plan)
    db.flush()
    log_creation(db, "BalancePlan", plan.id, source=source, operator=operator)
    return plan


def update_balance_settlement(db, plan_id: int, settled_at: datetime,
                               settled_amount: float, source: str = None, operator: str = None) -> BalancePlan:
    plan = db.query(BalancePlan).get(plan_id)
    if not plan:
        raise ValueError(f"尾款计划 {plan_id} 不存在")

    old_status = plan.status
    old_settled_at = plan.actual_settled_at
    old_settled_amount = plan.actual_settled_amount

    plan.status = "settled"
    plan.actual_settled_at = settled_at
    plan.actual_settled_amount = settled_amount

    log_update(db, "BalancePlan", plan.id, "status", old_status, "settled",
               source=source, operator=operator)
    log_update(db, "BalancePlan", plan.id, "actual_settled_at",
               old_settled_at, settled_at, source=source, operator=operator)
    log_update(db, "BalancePlan", plan.id, "actual_settled_amount",
               old_settled_amount, settled_amount, source=source, operator=operator)

    return plan


def create_gps_order(db, order_data: Dict, source: str = None, operator: str = None) -> GpsWorkOrder:
    vin = order_data["vin"]
    get_or_create_vehicle(db, vin, source=source)

    contract_id = None
    if "contract_no" in order_data:
        contract = db.query(Contract).filter(
            Contract.contract_no == order_data["contract_no"],
            Contract.is_current == True
        ).first()
        if contract:
            contract_id = contract.id

    order = GpsWorkOrder(
        order_no=order_data["order_no"],
        vin=vin,
        contract_id=contract_id,
        type=order_data.get("type", "install"),
        status=order_data.get("status", "pending"),
        scheduled_at=order_data.get("scheduled_at"),
        completed_at=order_data.get("completed_at"),
        technician=order_data.get("technician"),
        device_no=order_data.get("device_no"),
        source=source,
        remark=order_data.get("remark"),
    )
    db.add(order)
    db.flush()
    log_creation(db, "GpsWorkOrder", order.id, source=source, operator=operator)
    return order


def update_gps_order_status(db, order_id: int, status: str, completed_at: datetime = None,
                            device_no: str = None, source: str = None, operator: str = None) -> GpsWorkOrder:
    order = db.query(GpsWorkOrder).get(order_id)
    if not order:
        raise ValueError(f"GPS工单 {order_id} 不存在")

    old_status = order.status
    order.status = status
    if completed_at:
        order.completed_at = completed_at
    if device_no:
        order.device_no = device_no

    log_update(db, "GpsWorkOrder", order.id, "status", old_status, status,
               source=source, operator=operator)
    return order


def create_delivery(db, delivery_data: Dict, source: str = None, operator: str = None) -> Delivery:
    contract_no = delivery_data["contract_no"]
    contract = db.query(Contract).filter(
        Contract.contract_no == contract_no,
        Contract.is_current == True
    ).first()

    if not contract:
        raise ValueError(f"合同 {contract_no} 不存在或已失效")

    delivery = Delivery(
        contract_id=contract.id,
        delivery_no=delivery_data["delivery_no"],
        vin=delivery_data.get("vin", contract.vin),
        delivered_at=delivery_data.get("delivered_at"),
        down_payment_verified=delivery_data.get("down_payment_verified", False),
        gps_installed=delivery_data.get("gps_installed", False),
        balance_verified=delivery_data.get("balance_verified", False),
        delivered_by=delivery_data.get("delivered_by"),
        received_by=delivery_data.get("received_by"),
        source=source,
        remark=delivery_data.get("remark"),
    )
    db.add(delivery)
    db.flush()
    log_creation(db, "Delivery", delivery.id, source=source, operator=operator)
    return delivery


def lock_delivery(db, delivery_id: int, source: str = None, operator: str = None) -> Delivery:
    delivery = db.query(Delivery).get(delivery_id)
    if not delivery:
        raise ValueError(f"交车记录 {delivery_id} 不存在")

    if delivery.is_locked:
        raise ValueError(f"交车记录 {delivery_id} 已锁定，无法重复锁定")

    delivery.is_locked = True
    delivery.locked_at = datetime.now()

    log_update(db, "Delivery", delivery.id, "is_locked", False, True,
               source=source, operator=operator, remark="交车锁定")
    return delivery


def create_refund(db, refund_data: Dict, source: str = None, operator: str = None) -> Refund:
    contract_no = refund_data["contract_no"]
    contract = db.query(Contract).filter(
        Contract.contract_no == contract_no,
        Contract.is_current == True
    ).first()

    if not contract:
        raise ValueError(f"合同 {contract_no} 不存在或已失效")

    refund = Refund(
        contract_id=contract.id,
        refund_no=refund_data["refund_no"],
        amount=refund_data["amount"],
        refund_type=refund_data["refund_type"],
        reason=refund_data.get("reason"),
        status=refund_data.get("status", "pending"),
        refunded_at=refund_data.get("refunded_at"),
        recipient=refund_data.get("recipient"),
        source=source,
        remark=refund_data.get("remark"),
    )
    db.add(refund)
    db.flush()
    log_creation(db, "Refund", refund.id, source=source, operator=operator)

    if contract.status != "cancelled":
        old_status = contract.status
        contract.status = "cancelled"
        log_update(db, "Contract", contract.id, "status", old_status, "cancelled",
                   source=source, operator=operator, remark="合同因退款取消")

    return refund


def cancel_gps_orders_for_contract(db, contract_id: int, source: str = None, operator: str = None) -> List[GpsWorkOrder]:
    orders = db.query(GpsWorkOrder).filter(
        GpsWorkOrder.contract_id == contract_id,
        GpsWorkOrder.status.in_(["pending", "in_progress"])
    ).all()

    for order in orders:
        old_status = order.status
        order.status = "cancelled"
        log_update(db, "GpsWorkOrder", order.id, "status", old_status, "cancelled",
                   source=source, operator=operator, remark="合同取消，联动取消GPS工单")

    return orders


def get_contract_by_no(db, contract_no: str) -> Optional[Contract]:
    return db.query(Contract).filter(
        Contract.contract_no == contract_no,
        Contract.is_current == True
    ).first()


def get_contract_versions(db, contract_no: str) -> List[Contract]:
    return db.query(Contract).filter(
        Contract.contract_no == contract_no
    ).order_by(Contract.version.asc()).all()
