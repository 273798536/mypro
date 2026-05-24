from enum import Enum as PyEnum


class RecordStatus(str, PyEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    CONFIRMED = "confirmed"
    FROZEN = "frozen"
    ARCHIVED = "archived"


class RecordType(str, PyEnum):
    DECLARATION = "declaration"
    TRACE_NODE = "trace_node"
    TAX_NOTICE = "tax_notice"
    SUPPLEMENTARY = "supplementary"
    SHIFT = "shift"


class NodeType(str, PyEnum):
    CUSTOMS_DECLARATION = "customs_declaration"
    CUSTOMS_INSPECTION = "customs_inspection"
    TAX_CALCULATION = "tax_calculation"
    TAX_PAYMENT = "tax_payment"
    DELIVERY = "delivery"
    EXCEPTION = "exception"
    RETURN = "return"


class TaxNoticeType(str, PyEnum):
    INITIAL = "initial"
    SUPPLEMENTARY = "supplementary"
    CORRECTION = "correction"


class ChangeReason(str, PyEnum):
    DATA_ENTRY_ERROR = "data_entry_error"
    TAX_RECALCULATION = "tax_recalculation"
    CUSTOMS_ADJUSTMENT = "customs_adjustment"
    MANUAL_CORRECTION = "manual_correction"
    PACKAGE_SPLIT = "package_split"
    EXCEPTION_HANDLING = "exception_handling"
    OTHER = "other"


class Role(str, PyEnum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    MANAGER = "manager"
    AUDITOR = "auditor"
    EXPORT_ONLY = "export_only"


class ActionType(str, PyEnum):
    CREATE = "create"
    UPDATE = "update"
    SUBMIT = "submit"
    REJECT = "reject"
    CONFIRM = "confirm"
    RECALL = "recall"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    EXPORT = "export"
    IMPORT = "import"
    DELETE = "delete"
