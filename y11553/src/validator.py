from typing import Dict, Any, Tuple, Optional
from .models import RecordType


class ValidationError(Exception):
    def __init__(self, message: str, field: Optional[str] = None):
        self.message = message
        self.field = field
        super().__init__(message)

    def __str__(self):
        if self.field:
            return f"字段[{self.field}]: {self.message}"
        return self.message


def validate_record(data: Dict[str, Any], record_type: RecordType) -> Tuple[bool, Optional[ValidationError]]:
    try:
        if record_type == RecordType.INVENTORY:
            _validate_inventory(data)
        elif record_type == RecordType.REPLENISHMENT:
            _validate_replenishment(data)
        elif record_type == RecordType.REFUND:
            _validate_refund(data)
        elif record_type == RecordType.PRICE_ADJUSTMENT:
            _validate_price_adjustment(data)
        return True, None
    except ValidationError as e:
        return False, e


def _validate_inventory(data: Dict[str, Any]):
    required_fields = ["cabinet_id", "cell_id", "sku_id", "quantity"]
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == "":
            raise ValidationError("字段不可为空", field)

    if not isinstance(data["quantity"], int) or data["quantity"] < 0:
        raise ValidationError("必须为非负整数", "quantity")

    if data.get("is_hot_cell") is not None and not isinstance(data["is_hot_cell"], bool):
        raise ValidationError("必须为布尔值", "is_hot_cell")


def _validate_replenishment(data: Dict[str, Any]):
    required_fields = ["cabinet_id", "cell_id", "photo_hash", "replenishment_quantity"]
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == "":
            raise ValidationError("字段不可为空", field)

    if not isinstance(data["replenishment_quantity"], int) or data["replenishment_quantity"] < 0:
        raise ValidationError("必须为非负整数", "replenishment_quantity")


def _validate_refund(data: Dict[str, Any]):
    required_fields = ["order_id", "refund_amount"]
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == "":
            raise ValidationError("字段不可为空", field)

    if not isinstance(data["refund_amount"], (int, float)) or data["refund_amount"] < 0:
        raise ValidationError("必须为非负数", "refund_amount")


def _validate_price_adjustment(data: Dict[str, Any]):
    required_fields = ["cabinet_id", "cell_id", "sku_id", "original_price", "new_price"]
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == "":
            raise ValidationError("字段不可为空", field)

    if not isinstance(data["original_price"], (int, float)) or data["original_price"] < 0:
        raise ValidationError("必须为非负数", "original_price")

    if not isinstance(data["new_price"], (int, float)) or data["new_price"] < 0:
        raise ValidationError("必须为非负数", "new_price")


def is_validation_error(e: Exception) -> bool:
    return isinstance(e, ValidationError) or "ValidationError" in type(e).__name__
