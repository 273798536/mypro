from enum import Enum
from typing import List, Dict, Set


class Role(str, Enum):
    DATA_ENTRY = "data_entry"
    REVIEWER = "reviewer"
    SUPERVISOR = "supervisor"
    READ_ONLY = "read_only"


ROLE_PERMISSIONS: Dict[str, Dict] = {
    Role.DATA_ENTRY.value: {
        "name": "录入员",
        "visible_fields": {
            "raw_records": ["original_row", "raw_data", "dirty_type", "dirty_reason", "fix_suggestion"],
            "recharge_records": ["original_row", "member_id", "member_name", "recharge_amount", "store_name", "transaction_time", "operator"],
            "refund_records": ["original_row", "member_id", "member_name", "refund_amount", "store_name", "transaction_time"],
            "shift_records": ["original_row", "store_id", "shift_date", "shift_no", "cashier", "start_balance", "end_balance"],
            "store_handovers": ["original_row", "store_name", "handover_date", "outgoing_manager", "incoming_manager"],
            "member_balance_history": ["member_id", "member_name", "transaction_type", "amount", "transaction_time", "store_name"],
            "import_batches": ["id", "source_type", "file_name", "imported_by", "total_rows", "valid_rows", "dirty_rows", "status", "created_at"],
        },
        "allowed_actions": [
            "import_data",
            "view_list",
            "view_raw",
            "view_history",
            "view_summary",
            "suggest_fix",
        ],
        "can_modify_fields": ["fixed_data"],
        "can_approve_fix": False,
        "can_export": False,
    },
    Role.REVIEWER.value: {
        "name": "复核员",
        "visible_fields": {
            "raw_records": ["original_row", "raw_data", "dirty_type", "dirty_reason", "fix_suggestion", "fixed_data", "fixed_by", "fixed_at", "is_dirty", "is_fixed"],
            "recharge_records": ["*"],
            "refund_records": ["*"],
            "shift_records": ["*"],
            "store_handovers": ["*"],
            "member_balance_history": ["*"],
            "balance_gaps": ["*"],
            "import_batches": ["*"],
        },
        "allowed_actions": [
            "import_data",
            "view_list",
            "view_all",
            "view_raw",
            "view_history",
            "view_summary",
            "view_report",
            "view_failures",
            "view_gaps",
            "run_check",
            "apply_fix",
        ],
        "can_modify_fields": ["fixed_data", "is_fixed", "is_dirty"],
        "can_approve_fix": True,
        "can_export": False,
    },
    Role.SUPERVISOR.value: {
        "name": "财务主管",
        "visible_fields": {
            "raw_records": ["*"],
            "recharge_records": ["*"],
            "refund_records": ["*"],
            "shift_records": ["*"],
            "store_handovers": ["*"],
            "member_balance_history": ["*"],
            "balance_gaps": ["*"],
            "import_batches": ["*"],
            "users": ["*"],
        },
        "allowed_actions": [
            "*",
        ],
        "can_modify_fields": ["*"],
        "can_approve_fix": True,
        "can_export": True,
        "can_view_failures": True,
        "can_reimport": True,
    },
    Role.READ_ONLY.value: {
        "name": "只读查看",
        "visible_fields": {
            "raw_records": ["original_row", "source_type", "dirty_type", "dirty_reason", "is_dirty", "is_fixed"],
            "member_balance_history": ["member_id", "member_name", "transaction_type", "amount", "balance_before", "balance_after", "transaction_time", "store_name", "is_cross_store", "is_revoked"],
            "balance_gaps": ["member_id", "expected_balance", "actual_balance", "difference", "detected_at", "notes"],
            "import_batches": ["id", "source_type", "file_name", "imported_by", "total_rows", "valid_rows", "dirty_rows", "status", "created_at"],
        },
        "allowed_actions": [
            "view_list",
            "view_summary",
            "view_history",
            "view_raw",
        ],
        "can_modify_fields": [],
        "can_approve_fix": False,
        "can_export": False,
    },
}


def get_role_config(role: str) -> Dict:
    return ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS[Role.READ_ONLY.value])


def has_permission(role: str, action: str) -> bool:
    config = get_role_config(role)
    allowed = config.get("allowed_actions", [])
    if "*" in allowed:
        return True
    return action in allowed


def can_view_field(role: str, table: str, field: str) -> bool:
    config = get_role_config(role)
    visible = config.get("visible_fields", {}).get(table, [])
    if "*" in visible:
        return True
    return field in visible


def can_modify_field(role: str, field: str) -> bool:
    config = get_role_config(role)
    can_modify = config.get("can_modify_fields", [])
    if "*" in can_modify:
        return True
    return field in can_modify


def filter_fields_by_role(role: str, table: str, data: Dict) -> Dict:
    config = get_role_config(role)
    visible = config.get("visible_fields", {}).get(table, [])
    if "*" in visible:
        return data
    return {k: v for k, v in data.items() if k in visible}


def get_visible_columns(role: str, table: str) -> List[str]:
    config = get_role_config(role)
    visible = config.get("visible_fields", {}).get(table, [])
    return visible
