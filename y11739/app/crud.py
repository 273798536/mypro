from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import json

from . import models, schemas
from .models import (
    Currency, OrderStatus, ContractStatus,
    ExposureStatus, AlertType
)


def _log_audit(db: Session, entity_type: str, entity_id: int, action: str,
              old_value: Optional[str] = None, new_value: Optional[str] = None,
              source: Optional[str] = None, operator: str = "system"):
    audit = models.AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        source=source,
        operator=operator
    )
    db.add(audit)


def create_order(db: Session, order: schemas.ForeignOrderCreate) -> models.ForeignOrder:
    db_order = models.ForeignOrder(**order.model_dump())
    db.add(db_order)
    db.flush()
    _log_audit(db, "ForeignOrder", db_order.id, "CREATE",
              new_value=f"order_no={db_order.order_no}, amount={db_order.amount}, currency={db_order.currency}",
              source=order.source, operator=order.created_by)
    db.commit()
    db.refresh(db_order)
    return db_order


def get_order(db: Session, order_id: int) -> Optional[models.ForeignOrder]:
    return db.query(models.ForeignOrder).filter(models.ForeignOrder.id == order_id).first()


def get_order_by_no(db: Session, order_no: str) -> Optional[models.ForeignOrder]:
    return db.query(models.ForeignOrder).filter(models.ForeignOrder.order_no == order_no).first()


def get_orders(db: Session, skip: int = 0, limit: int = 100,
              currency: Optional[Currency] = None,
              status: Optional[OrderStatus] = None) -> List[models.ForeignOrder]:
    query = db.query(models.ForeignOrder)
    if currency:
        query = query.filter(models.ForeignOrder.currency == currency)
    if status:
        query = query.filter(models.ForeignOrder.status == status)
    return query.offset(skip).limit(limit).all()


def update_order(db: Session, order_id: int, order_update: schemas.ForeignOrderUpdate) -> Optional[models.ForeignOrder]:
    db_order = get_order(db, order_id)
    if not db_order:
        return None

    old_values = {}
    update_data = order_update.model_dump(exclude_unset=True)
    change_reason = update_data.pop("change_reason", None)
    updated_by = update_data.pop("updated_by", "system")

    for field, value in update_data.items():
        old_val = getattr(db_order, field)
        old_values[field] = str(old_val)
        setattr(db_order, field, value)

    if old_values:
        for field, old_val in old_values.items():
            new_val = str(update_data[field])
            change = models.OrderChange(
                order_id=order_id,
                change_type=f"UPDATE_{field.upper()}",
                old_value=old_val,
                new_value=new_val,
                change_reason=change_reason,
                changed_by=updated_by
            )
            db.add(change)

        db_order.status = OrderStatus.MODIFIED
        _log_audit(db, "ForeignOrder", order_id, "UPDATE",
                  old_value=json.dumps(old_values, ensure_ascii=False),
                  new_value=json.dumps(update_data, ensure_ascii=False),
                  source="order_update", operator=updated_by)

    db.commit()
    db.refresh(db_order)
    return db_order


def cancel_order(db: Session, order_id: int, reason: str, operator: str = "system") -> Optional[models.ForeignOrder]:
    db_order = get_order(db, order_id)
    if not db_order:
        return None

    old_status = db_order.status
    db_order.status = OrderStatus.CANCELLED

    change = models.OrderChange(
        order_id=order_id,
        change_type="CANCEL",
        old_value=str(old_status),
        new_value=str(OrderStatus.CANCELLED),
        change_reason=reason,
        changed_by=operator
    )
    db.add(change)

    _log_audit(db, "ForeignOrder", order_id, "CANCEL",
              old_value=str(old_status), new_value=str(OrderStatus.CANCELLED),
              source="order_cancel", operator=operator)
    db.commit()
    db.refresh(db_order)
    return db_order


def create_contract(db: Session, contract: schemas.ForwardContractCreate) -> models.ForwardContract:
    db_contract = models.ForwardContract(**contract.model_dump())
    db.add(db_contract)
    db.flush()
    _log_audit(db, "ForwardContract", db_contract.id, "CREATE",
              new_value=f"contract_no={db_contract.contract_no}, amount={db_contract.amount}, currency={db_contract.currency}",
              source=contract.source, operator=contract.created_by)
    db.commit()
    db.refresh(db_contract)
    return db_contract


def get_contract(db: Session, contract_id: int) -> Optional[models.ForwardContract]:
    return db.query(models.ForwardContract).filter(models.ForwardContract.id == contract_id).first()


def get_contracts(db: Session, skip: int = 0, limit: int = 100,
                 currency: Optional[Currency] = None,
                 order_id: Optional[int] = None) -> List[models.ForwardContract]:
    query = db.query(models.ForwardContract)
    if currency:
        query = query.filter(models.ForwardContract.currency == currency)
    if order_id:
        query = query.filter(models.ForwardContract.order_id == order_id)
    return query.offset(skip).limit(limit).all()


def create_spot_rate(db: Session, rate: schemas.SpotRateCreate) -> models.SpotRate:
    db_rate = models.SpotRate(**rate.model_dump())
    db.add(db_rate)
    db.flush()
    _log_audit(db, "SpotRate", db_rate.id, "CREATE",
              new_value=f"currency={db_rate.currency}, rate={db_rate.rate}",
              source=rate.source, operator=rate.created_by)
    db.commit()
    db.refresh(db_rate)
    return db_rate


def get_latest_spot_rate(db: Session, currency: Currency) -> Optional[models.SpotRate]:
    return db.query(models.SpotRate).filter(
        models.SpotRate.currency == currency
    ).order_by(models.SpotRate.rate_date.desc()).first()


def create_limit_rule(db: Session, rule: schemas.LimitRuleCreate) -> models.LimitRule:
    db_rule = models.LimitRule(**rule.model_dump())
    db.add(db_rule)
    db.flush()
    _log_audit(db, "LimitRule", db_rule.id, "CREATE",
              new_value=f"currency={db_rule.currency}, single={db_rule.single_order_limit}, total={db_rule.total_exposure_limit}",
              source=rule.source, operator=rule.created_by)
    db.commit()
    db.refresh(db_rule)
    return db_rule


def get_active_limit_rule(db: Session, currency: Currency) -> Optional[models.LimitRule]:
    now = datetime.now()
    return db.query(models.LimitRule).filter(
        models.LimitRule.currency == currency,
        models.LimitRule.is_active == True,
        models.LimitRule.effective_date <= now,
        (models.LimitRule.expiry_date == None) | (models.LimitRule.expiry_date > now)
    ).first()


def get_order_changes(db: Session, order_id: int) -> List[models.OrderChange]:
    return db.query(models.OrderChange).filter(
        models.OrderChange.order_id == order_id
    ).order_by(models.OrderChange.change_date.desc()).all()


def rollback_order_change(db: Session, change_id: int, reason: str, operator: str = "system") -> Optional[models.ForeignOrder]:
    db_change = db.query(models.OrderChange).filter(models.OrderChange.id == change_id).first()
    if not db_change:
        return None

    db_order = get_order(db, db_change.order_id)
    if not db_order:
        return None

    field = db_change.change_type.replace("UPDATE_", "").lower()
    old_val = db_change.old_value

    if hasattr(db_order, field):
        original_val = str(getattr(db_order, field))
        if field in ["amount"]:
            setattr(db_order, field, float(old_val))
        elif field == "currency":
            setattr(db_order, field, Currency(old_val))
        elif field == "expected_settle_date":
            setattr(db_order, field, datetime.fromisoformat(old_val))
        elif field == "status":
            setattr(db_order, field, OrderStatus(old_val))

        rollback_change = models.OrderChange(
            order_id=db_order.id,
            change_type=f"ROLLBACK_{db_change.change_type}",
            old_value=original_val,
            new_value=old_val,
            change_reason=reason,
            changed_by=operator,
            rollback_id=change_id
        )
        db.add(rollback_change)

        _log_audit(db, "ForeignOrder", db_order.id, "ROLLBACK",
                  old_value=original_val, new_value=old_val,
                  source=f"rollback_change_{change_id}", operator=operator)

        db.commit()
        db.refresh(db_order)

    return db_order


def create_exposure_record(db: Session, record: schemas.ExposureRecordCreate) -> models.ExposureRecord:
    db_record = models.ExposureRecord(**record.model_dump())
    db.add(db_record)
    db.flush()
    _log_audit(db, "ExposureRecord", db_record.id, "CREATE",
              new_value=f"currency={db_record.currency}, net_exposure={db_record.net_exposure}, status={db_record.status}",
              source="exposure_calculation", operator=record.created_by if hasattr(record, 'created_by') else "system")
    db.commit()
    db.refresh(db_record)
    return db_record


def get_exposure_records(db: Session, skip: int = 0, limit: int = 100,
                        currency: Optional[Currency] = None,
                        start_date: Optional[datetime] = None,
                        end_date: Optional[datetime] = None) -> List[models.ExposureRecord]:
    query = db.query(models.ExposureRecord)
    if currency:
        query = query.filter(models.ExposureRecord.currency == currency)
    if start_date:
        query = query.filter(models.ExposureRecord.record_date >= start_date)
    if end_date:
        query = query.filter(models.ExposureRecord.record_date <= end_date)
    return query.order_by(models.ExposureRecord.record_date.desc()).offset(skip).limit(limit).all()


def create_alert(db: Session, alert: schemas.AlertCreate) -> models.Alert:
    db_alert = models.Alert(**alert.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert


def resolve_alert(db: Session, alert_id: int, resolution: schemas.AlertResolve) -> Optional[models.Alert]:
    db_alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not db_alert:
        return None
    db_alert.is_resolved = True
    db_alert.resolution_note = resolution.resolution_note
    db_alert.resolved_at = datetime.now()
    db.commit()
    db.refresh(db_alert)
    return db_alert


def get_alerts(db: Session, skip: int = 0, limit: int = 100,
              resolved: Optional[bool] = None,
              alert_type: Optional[AlertType] = None) -> List[models.Alert]:
    query = db.query(models.Alert)
    if resolved is not None:
        query = query.filter(models.Alert.is_resolved == resolved)
    if alert_type:
        query = query.filter(models.Alert.alert_type == alert_type)
    return query.order_by(models.Alert.created_at.desc()).offset(skip).limit(limit).all()


def get_audit_logs(db: Session, skip: int = 0, limit: int = 100,
                  entity_type: Optional[str] = None) -> List[models.AuditLog]:
    query = db.query(models.AuditLog)
    if entity_type:
        query = query.filter(models.AuditLog.entity_type == entity_type)
    return query.order_by(models.AuditLog.operation_time.desc()).offset(skip).limit(limit).all()
