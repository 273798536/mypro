from enum import Enum


class ExceptionType(str, Enum):
    MISSING = "少发"
    DAMAGED = "坏品"
    WRONG_ITEM = "错发"
    OTHER = "其他"


class ReviewChannel(str, Enum):
    LEADER_REFUND = "团长退款"
    WAREHOUSE_AUDIT = "仓库复核"
    MANUAL_REVIEW = "人工改判"
    SYSTEM_AUTO = "系统自动"


class ReceiptStatus(str, Enum):
    PENDING = "待复核"
    REVIEWING = "复核中"
    APPROVED = "已通过"
    REJECTED = "已驳回"
    FROZEN = "已冻结"
    ARCHIVED = "已归档"
    CANCELLED = "已撤回"


class FreezeReason(str, Enum):
    PENDING_EXPORT = "待导出前冻结"
    DISPUTE = "存在争议"
    AMOUNT_MISMATCH = "金额不符"
    MANUAL_FREEZE = "人工冻结"


class AttachmentType(str, Enum):
    SMS_SCREENSHOT = "短信截图"
    EXCEPTION_PHOTO = "异常照片"
    REFUND_PROOF = "退款凭证"
    OTHER_PROOF = "其他凭证"


class OperationType(str, Enum):
    CREATE = "创建"
    UPDATE = "更新"
    REVIEW = "复核"
    OVERRULE = "改判"
    FREEZE = "冻结"
    UNFREEZE = "解冻"
    CANCEL = "撤回"
    ARCHIVE = "归档"
    ATTACH_UPLOAD = "附件上传"
    EXPORT = "导出"


class DataSource(str, Enum):
    LEADER_REFUND_TABLE = "团长退款表"
    WAREHOUSE_REVIEW_TABLE = "仓库复核表"
    USER_REMARK = "用户备注"
    MANUAL_IMPORT = "人工导入"
