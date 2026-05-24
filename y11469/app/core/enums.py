from enum import Enum


class RecordStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    SECOND_CONFIRM = "second_confirm"
    AUDIT_ONLY = "audit_only"
    FROZEN = "frozen"
    EXPORTED = "exported"


class DataSourceType(str, Enum):
    SAMPLE_TRANSFER = "sample_transfer"
    SIZE_MODIFICATION = "size_modification"
    FABRIC_INVENTORY = "fabric_inventory"
    MANUAL_PRICING = "manual_pricing"
    SHIFT_RECORD = "shift_record"


class RoleType(str, Enum):
    DESIGNER = "designer"
    PATTERN_MAKER = "pattern_maker"
    SAMPLE_MAKER = "sample_maker"
    WAREHOUSE = "warehouse"
    QUALITY = "quality"
    BRAND_PLANNER = "brand_planner"
    AUDITOR = "auditor"
    ADMIN = "admin"


class FabricStatus(str, Enum):
    PENDING = "pending"
    IN_STOCK = "in_stock"
    ALLOCATED = "allocated"
    USED = "used"
    OBSOLETE = "obsolete"
    RETURNED = "returned"


class ImportResult(str, Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
