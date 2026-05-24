from enum import Enum


class ExceptionStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    ATTACHMENT_UPLOADED = "attachment_uploaded"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    SETTLED = "settled"
    REVERTED = "reverted"
    ARCHIVED = "archived"


class ExceptionType(str, Enum):
    TEMP_TRAINING_WINDOW_CONFLICT = "temp_training_window_conflict"
    LUNCH_RULE_CONFLICT = "lunch_rule_conflict"
    STAFF_SHORTAGE = "staff_shortage"
    LEAVE_SCHEDULE_CONFLICT = "leave_schedule_conflict"
    BUSINESS_FORECAST_MISMATCH = "business_forecast_mismatch"
    INVENTORY_DIFFERENCE = "inventory_difference"


class DataSource(str, Enum):
    SCHEDULE = "schedule"
    LEAVE_FORM = "leave_form"
    BUSINESS_FORECAST = "business_forecast"
    REFUND_FLOW = "refund_flow"
    INVENTORY = "inventory"


class RecordStatus(str, Enum):
    UNPROCESSED = "unprocessed"
    CORRECTED = "corrected"
    NEED_MANUAL_CONFIRM = "need_manual_confirm"
    FAILED = "failed"


class ActionType(str, Enum):
    CREATE_BATCH = "create_batch"
    UPLOAD_ATTACHMENT = "upload_attachment"
    SUBMIT_REVIEW = "submit_review"
    REVIEW_APPROVE = "review_approve"
    REVIEW_REJECT = "review_reject"
    MODIFY_JUDGMENT = "modify_judgment"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    SETTLE = "settle"
    REVERT = "revert"
    ARCHIVE = "archive"
