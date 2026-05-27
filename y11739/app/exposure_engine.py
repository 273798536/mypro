from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
import json

from . import models, schemas, crud
from .models import (
    Currency, OrderStatus, ContractStatus,
    ExposureStatus, AlertType
)


def _check_currency_mismatch(db: Session, order: models.ForeignOrder,
                            contracts: List[models.ForwardContract]) -> List[Dict[str, Any]]:
    alerts = []
    for contract in contracts:
        if contract.order_id == order.id and contract.currency != order.currency:
            alerts.append({
                "alert_type": AlertType.CURRENCY_MISMATCH,
                "severity": "error",
                "message": f"订单[{order.order_no}]币种为{order.currency}，但关联远期合约[{contract.contract_no}]币种为{contract.currency}，币种不匹配",
                "related_order_id": order.id,
                "related_contract_id": contract.id,
                "details": {
                    "order_no": order.order_no,
                    "order_currency": order.currency,
                    "contract_no": contract.contract_no,
                    "contract_currency": contract.currency
                }
            })
    return alerts


def _check_duplicate_coverage(db: Session, orders: List[models.ForeignOrder],
                             contracts: List[models.ForwardContract]) -> List[Dict[str, Any]]:
    alerts = []
    order_contracts = {}

    for contract in contracts:
        if contract.status != ContractStatus.ACTIVE:
            continue
        if contract.order_id not in order_contracts:
            order_contracts[contract.order_id] = []
        order_contracts[contract.order_id].append(contract)

    for order_id, contract_list in order_contracts.items():
        if not order_id:
            continue
        order = crud.get_order(db, order_id)
        if not order or order.status != OrderStatus.ACTIVE:
            continue

        total_covered = sum(c.amount for c in contract_list)
        if total_covered > order.amount * 1.01:
            alerts.append({
                "alert_type": AlertType.DUPLICATE_COVERAGE,
                "severity": "warning",
                "message": f"订单[{order.order_no}]金额{order.amount}{order.currency}，但关联{len(contract_list)}份远期合约合计覆盖{total_covered}{order.currency}，覆盖率{total_covered/order.amount*100:.1f}%，存在超额覆盖",
                "related_order_id": order.id,
                "details": {
                    "order_no": order.order_no,
                    "order_amount": order.amount,
                    "total_covered": total_covered,
                    "coverage_ratio": total_covered / order.amount,
                    "contracts": [c.contract_no for c in contract_list]
                }
            })
    return alerts


def _check_cancelled_orders(db: Session, orders: List[models.ForeignOrder],
                           contracts: List[models.ForwardContract]) -> List[Dict[str, Any]]:
    alerts = []
    cancelled_orders = [o for o in orders if o.status == OrderStatus.CANCELLED]

    for order in cancelled_orders:
        order_contracts = [c for c in contracts if c.order_id == order.id and c.status == ContractStatus.ACTIVE]
        if order_contracts:
            alerts.append({
                "alert_type": AlertType.ORDER_CANCELLED,
                "severity": "error",
                "message": f"订单[{order.order_no}]已取消，但仍有{len(order_contracts)}份关联远期合约处于活跃状态，合计金额{sum(c.amount for c in order_contracts)}{order.currency}",
                "related_order_id": order.id,
                "details": {
                    "order_no": order.order_no,
                    "contract_count": len(order_contracts),
                    "total_contract_amount": sum(c.amount for c in order_contracts),
                    "contracts": [c.contract_no for c in order_contracts]
                }
            })
    return alerts


def _check_limit_rules(db: Session, currency: Currency, net_exposure_cny: float,
                      total_orders: float, orders: List[models.ForeignOrder]) -> Tuple[List[Dict[str, Any]], ExposureStatus, float]:
    alerts = []
    status = ExposureStatus.NORMAL
    limit_usage = 0.0

    limit_rule = crud.get_active_limit_rule(db, currency)
    if not limit_rule:
        return alerts, status, limit_usage

    if limit_rule.total_exposure_limit > 0:
        limit_usage = abs(net_exposure_cny) / limit_rule.total_exposure_limit

        if limit_usage >= 1.0:
            status = ExposureStatus.BREACH
            alerts.append({
                "alert_type": AlertType.LIMIT_EXCEEDED,
                "severity": "critical",
                "message": f"{currency}敞口已突破限额！净敞口{abs(net_exposure_cny):,.2f}CNY，限额{limit_rule.total_exposure_limit:,.2f}CNY，超限{limit_usage*100:.1f}%",
                "details": {
                    "net_exposure_cny": abs(net_exposure_cny),
                    "limit": limit_rule.total_exposure_limit,
                    "usage_ratio": limit_usage
                }
            })
        elif limit_usage >= limit_rule.warning_threshold:
            status = ExposureStatus.WARNING
            alerts.append({
                "alert_type": AlertType.LIMIT_WARNING,
                "severity": "warning",
                "message": f"{currency}敞口接近限额！净敞口{abs(net_exposure_cny):,.2f}CNY，限额{limit_rule.total_exposure_limit:,.2f}CNY，已使用{limit_usage*100:.1f}%",
                "details": {
                    "net_exposure_cny": abs(net_exposure_cny),
                    "limit": limit_rule.total_exposure_limit,
                    "usage_ratio": limit_usage,
                    "warning_threshold": limit_rule.warning_threshold
                }
            })

    for order in orders:
        if order.status == OrderStatus.ACTIVE and order.amount > limit_rule.single_order_limit:
            alerts.append({
                "alert_type": AlertType.LIMIT_EXCEEDED,
                "severity": "error",
                "message": f"订单[{order.order_no}]金额{order.amount}{currency}超过单笔限额{limit_rule.single_order_limit}{currency}",
                "related_order_id": order.id,
                "details": {
                    "order_no": order.order_no,
                    "order_amount": order.amount,
                    "single_limit": limit_rule.single_order_limit
                }
            })

    return alerts, status, limit_usage


def calculate_exposure(db: Session, currency: Currency,
                      record_date: Optional[datetime] = None) -> schemas.ExposureCalculationResult:
    if record_date is None:
        record_date = datetime.now()

    all_orders = crud.get_orders(db, currency=currency)
    all_contracts = crud.get_contracts(db, currency=currency)

    active_orders = [o for o in all_orders if o.status == OrderStatus.ACTIVE]
    active_contracts = [c for c in all_contracts if c.status == ContractStatus.ACTIVE]

    total_orders = sum(o.amount for o in active_orders)
    total_contracts = sum(c.amount for c in active_contracts)
    net_exposure = total_orders - total_contracts
    coverage_ratio = total_contracts / total_orders if total_orders > 0 else 0

    spot_rate_record = crud.get_latest_spot_rate(db, currency)
    spot_rate = spot_rate_record.rate if spot_rate_record else 7.0
    net_exposure_cny = net_exposure * spot_rate

    all_alerts: List[Dict[str, Any]] = []

    for order in active_orders:
        order_contracts = [c for c in active_contracts if c.order_id == order.id]
        all_alerts.extend(_check_currency_mismatch(db, order, order_contracts))

    all_alerts.extend(_check_duplicate_coverage(db, all_orders, all_contracts))
    all_alerts.extend(_check_cancelled_orders(db, all_orders, all_contracts))

    limit_alerts, status, limit_usage = _check_limit_rules(
        db, currency, net_exposure_cny, total_orders, active_orders
    )
    all_alerts.extend(limit_alerts)

    if any(a["severity"] in ["error", "critical"] for a in all_alerts):
        status = ExposureStatus.BREACH
    elif any(a["severity"] == "warning" for a in all_alerts) and status == ExposureStatus.NORMAL:
        status = ExposureStatus.WARNING

    order_details = []
    for order in active_orders:
        covered = sum(c.amount for c in active_contracts if c.order_id == order.id)
        order_details.append({
            "order_no": order.order_no,
            "amount": order.amount,
            "covered_amount": covered,
            "uncovered_amount": order.amount - covered,
            "source": order.source,
            "order_date": order.order_date.isoformat(),
            "expected_settle_date": order.expected_settle_date.isoformat()
        })

    contract_details = []
    for contract in active_contracts:
        linked_order = crud.get_order(db, contract.order_id) if contract.order_id else None
        contract_details.append({
            "contract_no": contract.contract_no,
            "amount": contract.amount,
            "order_no": linked_order.order_no if linked_order else "未关联",
            "forward_rate": contract.forward_rate,
            "source": contract.source,
            "trade_date": contract.trade_date.isoformat(),
            "settle_date": contract.settle_date.isoformat()
        })

    calculation_details = {
        "calculation_time": record_date.isoformat(),
        "currency": currency,
        "orders": {
            "total_count": len(active_orders),
            "total_amount": total_orders,
            "details": order_details
        },
        "contracts": {
            "total_count": len(active_contracts),
            "total_amount": total_contracts,
            "details": contract_details
        },
        "exposure": {
            "net_exposure": net_exposure,
            "spot_rate": spot_rate,
            "net_exposure_cny": net_exposure_cny,
            "coverage_ratio": coverage_ratio,
            "limit_usage": limit_usage
        },
        "status": status,
        "alert_count": len(all_alerts)
    }

    return schemas.ExposureCalculationResult(
        currency=currency,
        total_orders=total_orders,
        total_contracts=total_contracts,
        net_exposure=net_exposure,
        net_exposure_cny=net_exposure_cny,
        coverage_ratio=coverage_ratio,
        spot_rate=spot_rate,
        status=status,
        limit_usage=limit_usage,
        alerts=all_alerts,
        calculation_details=calculation_details
    )


def calculate_all_exposures(db: Session, record_date: Optional[datetime] = None) -> List[schemas.ExposureCalculationResult]:
    results = []
    for currency in [Currency.USD, Currency.EUR, Currency.JPY]:
        result = calculate_exposure(db, currency, record_date)
        results.append(result)
    return results


def save_exposure_calculation(db: Session, result: schemas.ExposureCalculationResult,
                             operator: str = "system") -> models.ExposureRecord:
    spot_rate_record = crud.get_latest_spot_rate(db, result.currency)

    record = schemas.ExposureRecordCreate(
        record_date=datetime.now(),
        currency=result.currency,
        total_order_amount=result.total_orders,
        total_contract_amount=result.total_contracts,
        net_exposure=result.net_exposure,
        net_exposure_cny=result.net_exposure_cny,
        coverage_ratio=result.coverage_ratio,
        status=result.status,
        spot_rate_id=spot_rate_record.id if spot_rate_record else None,
        calculation_details=json.dumps(result.calculation_details, ensure_ascii=False)
    )

    db_record = crud.create_exposure_record(db, record)

    for alert_data in result.alerts:
        alert = schemas.AlertCreate(
            exposure_record_id=db_record.id,
            alert_type=alert_data["alert_type"],
            severity=alert_data["severity"],
            message=alert_data["message"],
            related_order_id=alert_data.get("related_order_id"),
            related_contract_id=alert_data.get("related_contract_id")
        )
        crud.create_alert(db, alert)

    return db_record
