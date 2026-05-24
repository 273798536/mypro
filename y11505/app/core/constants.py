from enum import Enum


class BatchStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    SETTLED = "settled"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"


class RecordStatus(str, Enum):
    NORMAL = "normal"
    ABNORMAL = "abnormal"
    CERTIFICATE_EXPIRED = "certificate_expired"
    DEVICE_DISABLED = "device_disabled"
    PENDING_REPAIR = "pending_repair"
    REPAIRED = "repaired"
    PENDING_CALIBRATION = "pending_calibration"
    CALIBRATED = "calibrated"


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    PERMANENT_FAILED = "permanent_failed"


class OperationType(str, Enum):
    BATCH_CREATE = "batch_create"
    BATCH_UPDATE = "batch_update"
    BATCH_FREEZE = "batch_freeze"
    BATCH_SETTLE = "batch_settle"
    BATCH_ARCHIVE = "batch_archive"
    BATCH_CANCEL = "batch_cancel"
    ATTACHMENT_UPLOAD = "attachment_upload"
    RECORD_INSPECT = "record_inspect"
    RECORD_REVIEW = "record_review"
    RECORD_REVISE = "record_revise"
    STATUS_CHANGE = "status_change"
    MANUAL_REPAIR = "manual_repair"
    DATA_IMPORT = "data_import"
    DATA_EXPORT = "data_export"


class DuplicateStrategy(str, Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class RecordType(str, Enum):
    INSPECTION = "inspection"
    CALIBRATION = "calibration"
    REPAIR_QUOTE = "repair_quote"
    PRICE_ADJUSTMENT = "price_adjustment"


STATUS_TRANSITIONS = {
    BatchStatus.DRAFT: [BatchStatus.PENDING_REVIEW, BatchStatus.CANCELLED],
    BatchStatus.PENDING_REVIEW: [BatchStatus.REVIEWING, BatchStatus.DRAFT, BatchStatus.CANCELLED],
    BatchStatus.REVIEWING: [BatchStatus.APPROVED, BatchStatus.REJECTED, BatchStatus.DRAFT],
    BatchStatus.APPROVED: [BatchStatus.FROZEN, BatchStatus.DRAFT],
    BatchStatus.REJECTED: [BatchStatus.DRAFT, BatchStatus.CANCELLED],
    BatchStatus.FROZEN: [BatchStatus.SETTLED, BatchStatus.DRAFT],
    BatchStatus.SETTLED: [BatchStatus.ARCHIVED],
    BatchStatus.ARCHIVED: [],
    BatchStatus.CANCELLED: [],
}


RECORD_STATUS_TRIGGERS = {
    "certificate_expired": RecordStatus.CERTIFICATE_EXPIRED,
    "device_disabled": RecordStatus.DEVICE_DISABLED,
}
