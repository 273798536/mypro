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


class WorkOrderStatus(str, Enum):
    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CLOSED = "closed"
    ABNORMAL = "abnormal"
    REOPENED = "reopened"


class DuplicateStrategy(str, Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    FAILED_PERMANENT = "failed_permanent"


class TaskType(str, Enum):
    BATCH_IMPORT = "batch_import"
    EXPORT_REPORT = "export_report"
    RECALCULATE = "recalculate"
    SYNC_EXTERNAL = "sync_external"


class AttachmentType(str, Enum):
    INSPECTION_PHOTO = "inspection_photo"
    REPAIR_HOTLINE = "repair_hotline"
    SPARE_PART = "spare_part"
    PRICE_ADJUSTMENT = "price_adjustment"
    OTHER = "other"


class ChangeType(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    STATUS_CHANGE = "status_change"
    ATTACHMENT_ADD = "attachment_add"
    ATTACHMENT_REMOVE = "attachment_remove"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    SETTLE = "settle"
    ARCHIVE = "archive"
    CANCEL = "cancel"
