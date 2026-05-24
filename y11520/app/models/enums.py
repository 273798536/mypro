import enum


class UserRole(str, enum.Enum):
    ENTRY = "entry"
    REVIEW = "review"
    MANAGER = "manager"
    READONLY = "readonly"


class RecordStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    REVIEWED = "reviewed"
    FROZEN = "frozen"
    SETTLED = "settled"
    ARCHIVED = "archived"
    REJECTED = "rejected"


class DirtyType(str, enum.Enum):
    MISSING_FIELD = "missing_field"
    CROSS_DAY = "cross_day"
    NAME_CHANGED = "name_changed"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"
    OTHER = "other"


class RecordSource(str, enum.Enum):
    APPOINTMENT = "appointment"
    TECHNICIAN_LOCATION = "technician_location"
    USER_REVIEW = "user_review"
    EXTERNAL_RECEIPT = "external_receipt"


class ReviewResult(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVISION = "needs_revision"
