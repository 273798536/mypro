from enum import Enum


class ReturnApplicationStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    QUALITY_CHECKING = "quality_checking"
    QUALITY_PASSED = "quality_passed"
    QUALITY_FAILED = "quality_failed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    SUPPLIER_CONFIRMED = "supplier_confirmed"
    SUPPLIER_PARTIAL = "supplier_partial"
    DISPUTED = "disputed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CompensationStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    RETRYING = "retrying"
    PARTIAL_SUCCESS = "partial_success"
    SUCCESS = "success"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"
    MANUAL_REVIEW = "manual_review"
    MANUAL_RESOLVED = "manual_resolved"
    COMPENSATED = "compensated"
    CLOSED = "closed"
    FROZEN = "frozen"


class RetryStrategy(str, Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class ReceiptSource(str, Enum):
    RETURN_APPLICATION = "return_application"
    QUALITY_PHOTO = "quality_photo"
    LOGISTICS_RECEIPT = "logistics_receipt"
    EXTERNAL_RECEIPT = "external_receipt"


class DisputeCategory(str, Enum):
    MISSING_ITEMS = "missing_items"
    QUALITY_MISMATCH = "quality_mismatch"
    WRONG_PRODUCT = "wrong_product"
    DAMAGE_IN_TRANSIT = "damage_in_transit"
    DOCUMENT_MISMATCH = "document_mismatch"
    OTHER = "other"


class UserRole(str, Enum):
    WAREHOUSE_STAFF = "warehouse_staff"
    QUALITY_INSPECTOR = "quality_inspector"
    PROCUREMENT_STAFF = "procurement_staff"
    SUPPLIER = "supplier"
    ADMIN = "admin"


class OperationType(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    SUBMIT = "submit"
    CANCEL = "cancel"
    RETRY = "retry"
    MANUAL_REVIEW = "manual_review"
    MANUAL_RESOLVE = "manual_resolve"
    COMPENSATE = "compensate"
    CLOSE = "close"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    WITHDRAW = "withdraw"
    RESUBMIT = "resubmit"
    EXPORT = "export"
    IMPORT = "import"
