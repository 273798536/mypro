from enum import Enum


class DataSourceType(str, Enum):
    APPOINTMENT = "appointment"
    TECHNICIAN_LOCATION = "technician_location"
    USER_REVIEW = "user_review"
    REFUND_FLOW = "refund_flow"


class QueueStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    WAITING_RETRY = "waiting_retry"
    WAITING_MANUAL = "waiting_manual"
    COMPENSATING = "compensating"
    COMPLETED = "completed"
    PERMANENT_FAILED = "permanent_failed"
    CLOSED = "closed"


class FailCategory(str, Enum):
    RETRYABLE = "retryable"
    NEED_MANUAL = "need_manual"
    PERMANENT = "permanent"


class ReviewType(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
