from enum import Enum as PyEnum
from typing import Set, Dict


class UserRole(PyEnum):
    ADMIN = "admin"
    MANAGER = "manager"
    REVIEWER = "reviewer"
    ASSISTANT = "assistant"
    GUEST = "guest"


ROLE_PERMISSIONS: Dict[UserRole, Set[str]] = {
    UserRole.ADMIN: {
        "batch:create", "batch:read", "batch:update", "batch:delete",
        "batch:freeze", "batch:unfreeze", "batch:settle", "batch:recall", "batch:archive",
        "record:read", "record:update", "record:delete",
        "record:submit", "record:review", "record:override",
        "import:data", "export:data",
        "attachment:upload", "attachment:download", "attachment:delete"
    },
    UserRole.MANAGER: {
        "batch:create", "batch:read", "batch:update",
        "batch:freeze", "batch:unfreeze", "batch:settle", "batch:recall",
        "record:read", "record:update",
        "record:submit", "record:review", "record:override",
        "import:data", "export:data",
        "attachment:upload", "attachment:download"
    },
    UserRole.REVIEWER: {
        "batch:read",
        "record:read", "record:update",
        "record:submit", "record:review",
        "import:data",
        "attachment:upload", "attachment:download"
    },
    UserRole.ASSISTANT: {
        "batch:create", "batch:read",
        "record:read", "record:update",
        "record:submit",
        "import:data",
        "attachment:upload", "attachment:download"
    },
    UserRole.GUEST: {
        "batch:read",
        "record:read"
    }
}


OPERATOR_ROLE_MAP = {
    "行政经理": UserRole.MANAGER,
    "张总": UserRole.MANAGER,
    "经理": UserRole.MANAGER,
    "复核员": UserRole.REVIEWER,
    "老李": UserRole.REVIEWER,
    "行政助理": UserRole.ASSISTANT,
    "小王": UserRole.ASSISTANT,
    "admin": UserRole.ADMIN,
    "管理员": UserRole.ADMIN,
}


def get_operator_role(operator_name: str) -> UserRole:
    for keyword, role in OPERATOR_ROLE_MAP.items():
        if keyword in operator_name:
            return role
    return UserRole.GUEST


def has_permission(operator_name: str, permission: str) -> bool:
    role = get_operator_role(operator_name)
    return permission in ROLE_PERMISSIONS.get(role, set())


def check_permission(operator_name: str, permission: str) -> None:
    if not has_permission(operator_name, permission):
        role = get_operator_role(operator_name)
        raise PermissionError(
            f"操作人 '{operator_name}' (角色: {role.value}) "
            f"没有权限执行: {permission}"
        )
