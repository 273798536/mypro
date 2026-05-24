from app.models import RoleEnum, OrderStatus
from typing import Set


class Permission:
    VIEW_ORDER = "view_order"
    CREATE_ORDER = "create_order"
    EDIT_ORDER = "edit_order"
    DELETE_ORDER = "delete_order"
    SUBMIT_ORDER = "submit_order"
    REVIEW_ORDER = "review_order"
    FREEZE_ORDER = "freeze_order"
    VIEW_FABRIC = "view_fabric"
    CREATE_FABRIC = "create_fabric"
    EDIT_FABRIC = "edit_fabric"
    VIEW_SIZE = "view_size"
    CREATE_SIZE = "create_size"
    EDIT_SIZE = "edit_size"
    IMPORT_SCAN = "import_scan"
    VIEW_AUDIT = "view_audit"
    EXPORT_DATA = "export_data"
    VIEW_FAILED = "view_failed"
    REPLAY_HISTORY = "replay_history"


ROLE_PERMISSIONS = {
    RoleEnum.DATA_ENTRY: {
        Permission.VIEW_ORDER,
        Permission.CREATE_ORDER,
        Permission.EDIT_ORDER,
        Permission.SUBMIT_ORDER,
        Permission.VIEW_FABRIC,
        Permission.CREATE_FABRIC,
        Permission.EDIT_FABRIC,
        Permission.VIEW_SIZE,
        Permission.CREATE_SIZE,
        Permission.EDIT_SIZE,
        Permission.IMPORT_SCAN,
        Permission.EXPORT_DATA,
    },
    RoleEnum.REVIEWER: {
        Permission.VIEW_ORDER,
        Permission.REVIEW_ORDER,
        Permission.VIEW_FABRIC,
        Permission.VIEW_SIZE,
        Permission.VIEW_AUDIT,
        Permission.EXPORT_DATA,
        Permission.VIEW_FAILED,
        Permission.REPLAY_HISTORY,
    },
    RoleEnum.SUPERVISOR: {
        Permission.VIEW_ORDER,
        Permission.CREATE_ORDER,
        Permission.EDIT_ORDER,
        Permission.DELETE_ORDER,
        Permission.SUBMIT_ORDER,
        Permission.REVIEW_ORDER,
        Permission.FREEZE_ORDER,
        Permission.VIEW_FABRIC,
        Permission.CREATE_FABRIC,
        Permission.EDIT_FABRIC,
        Permission.VIEW_SIZE,
        Permission.CREATE_SIZE,
        Permission.EDIT_SIZE,
        Permission.IMPORT_SCAN,
        Permission.VIEW_AUDIT,
        Permission.EXPORT_DATA,
        Permission.VIEW_FAILED,
        Permission.REPLAY_HISTORY,
    },
    RoleEnum.READ_ONLY: {
        Permission.VIEW_ORDER,
        Permission.VIEW_FABRIC,
        Permission.VIEW_SIZE,
        Permission.EXPORT_DATA,
    },
}


def has_permission(role: RoleEnum, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def can_edit_order(role: RoleEnum, status: OrderStatus) -> bool:
    if status == OrderStatus.FROZEN:
        return False
    if status in [OrderStatus.REVIEWED, OrderStatus.SUBMITTED]:
        return role in [RoleEnum.SUPERVISOR]
    if status == OrderStatus.DRAFT:
        return role in [RoleEnum.DATA_ENTRY, RoleEnum.SUPERVISOR]
    return False


def get_visible_fields(role: RoleEnum, entity: str) -> Set[str]:
    base_fields = {
        "style_order": {"id", "order_no", "style_code", "style_name", "version", "status"},
        "fabric": {"id", "fabric_code", "fabric_name", "action", "quantity", "unit"},
        "size": {"id", "size_code", "part_name", "old_value", "new_value"},
    }
    
    fields = set(base_fields.get(entity, set()))
    
    if role in [RoleEnum.REVIEWER, RoleEnum.SUPERVISOR]:
        if entity == "style_order":
            fields.update({"created_by", "created_at", "reviewed_by", "reviewed_at", "frozen_by", "frozen_at"})
        if entity == "fabric":
            fields.update({"operator", "transaction_time", "remark"})
    
    if role == RoleEnum.SUPERVISOR:
        if entity == "style_order":
            fields.update({"parent_id", "batch_no", "updated_at"})
    
    return fields


def filter_fields_by_role(data: dict, role: RoleEnum, entity: str) -> dict:
    visible = get_visible_fields(role, entity)
    return {k: v for k, v in data.items() if k in visible}
