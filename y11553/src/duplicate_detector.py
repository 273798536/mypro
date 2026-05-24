import hashlib
import json
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from .models import (
    InventoryRecord,
    ReplenishmentPhoto,
    RefundRecord,
    PriceAdjustment,
    RecordType,
)


def generate_fingerprint(data: Dict[str, Any], record_type: RecordType) -> str:
    if record_type == RecordType.INVENTORY:
        key_fields = [
            str(data.get("cabinet_id", "")),
            str(data.get("cell_id", "")),
            str(data.get("sku_id", "")),
            str(data.get("quantity", "")),
            data.get("record_time", "").isoformat() if isinstance(data.get("record_time"), datetime) else str(data.get("record_time", ""))
        ]
    elif record_type == RecordType.REPLENISHMENT:
        key_fields = [
            str(data.get("cabinet_id", "")),
            str(data.get("cell_id", "")),
            str(data.get("photo_hash", "")),
            str(data.get("replenishment_quantity", "")),
            str(data.get("operator_id", ""))
        ]
    elif record_type == RecordType.REFUND:
        key_fields = [
            str(data.get("order_id", "")),
            str(data.get("refund_amount", "")),
            data.get("record_time", "").isoformat() if isinstance(data.get("record_time"), datetime) else str(data.get("record_time", ""))
        ]
    elif record_type == RecordType.PRICE_ADJUSTMENT:
        key_fields = [
            str(data.get("cabinet_id", "")),
            str(data.get("cell_id", "")),
            str(data.get("sku_id", "")),
            str(data.get("original_price", "")),
            str(data.get("new_price", ""))
        ]
    else:
        key_fields = [json.dumps(data, sort_keys=True, default=str)]

    fingerprint_str = "|".join(key_fields)
    return hashlib.md5(fingerprint_str.encode("utf-8")).hexdigest()


def generate_record_id(data: Dict[str, Any], record_type: RecordType) -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    fp = generate_fingerprint(data, record_type)
    return f"{record_type.value}_{fp[:8]}_{timestamp}"


def check_duplicate(db: Session, fingerprint: str, record_type: RecordType) -> Optional[Any]:
    if record_type == RecordType.INVENTORY:
        return db.query(InventoryRecord).filter(
            InventoryRecord.fingerprint == fingerprint
        ).first()
    elif record_type == RecordType.REPLENISHMENT:
        return db.query(ReplenishmentPhoto).filter(
            ReplenishmentPhoto.fingerprint == fingerprint
        ).first()
    elif record_type == RecordType.REFUND:
        return db.query(RefundRecord).filter(
            RefundRecord.fingerprint == fingerprint
        ).first()
    elif record_type == RecordType.PRICE_ADJUSTMENT:
        return db.query(PriceAdjustment).filter(
            PriceAdjustment.fingerprint == fingerprint
        ).first()
    return None
