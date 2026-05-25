from typing import Dict, Set, List, Optional
from dataclasses import dataclass, field


@dataclass
class Role:
    name: str
    permissions: Set[str] = field(default_factory=set)


class PermissionService:
    """权限校验服务"""

    ROLES = {
        "admin": Role("admin", {"*"}),
        "finance": Role("finance", {
            "checkin:read", "checkin:write",
            "deposit:read", "deposit:write",
            "room_change:read", "room_change:write",
            "reconciliation:read", "reconciliation:adjust",
            "export:read", "export:create", "export:freeze",
            "audit:read",
        }),
        "reception": Role("reception", {
            "checkin:read", "checkin:write",
            "deposit:read", "deposit:write",
            "room_change:read", "room_change:write",
            "sms:read", "sms:write",
            "handover:read", "handover:write",
        }),
        "auditor": Role("auditor", {
            "checkin:read", "deposit:read", "room_change:read",
            "reconciliation:read", "export:read", "audit:read",
        }),
    }

    def __init__(self):
        self._user_roles: Dict[str, List[str]] = {}

    def assign_role(self, user_id: str, role: str):
        if role not in self.ROLES:
            raise ValueError(f"未知角色: {role}")
        if user_id not in self._user_roles:
            self._user_roles[user_id] = []
        if role not in self._user_roles[user_id]:
            self._user_roles[user_id].append(role)

    def get_user_permissions(self, user_id: str) -> Set[str]:
        permissions = set()
        for role_name in self._user_roles.get(user_id, []):
            role = self.ROLES.get(role_name)
            if role:
                permissions.update(role.permissions)
        return permissions

    def check_permission(self, user_id: str, permission: str) -> bool:
        user_permissions = self.get_user_permissions(user_id)
        if "*" in user_permissions:
            return True
        return permission in user_permissions

    def require_permission(self, user_id: str, permission: str, action: str = "操作"):
        if not self.check_permission(user_id, permission):
            raise PermissionError(f"用户 {user_id} 无权执行{action}，需要权限: {permission}")


class ConflictLockService:
    """冲突锁服务 - 防止同一记录并发修改"""

    def __init__(self):
        self._locks: Dict[str, str] = {}

    def acquire_lock(self, record_type: str, record_id: str, operator: str) -> bool:
        key = f"{record_type}:{record_id}"
        if key in self._locks and self._locks[key] != operator:
            return False
        self._locks[key] = operator
        return True

    def release_lock(self, record_type: str, record_id: str):
        key = f"{record_type}:{record_id}"
        self._locks.pop(key, None)

    def is_locked(self, record_type: str, record_id: str) -> Optional[str]:
        key = f"{record_type}:{record_id}"
        return self._locks.get(key)

    def force_release(self, record_type: str, record_id: str, operator: str):
        key = f"{record_type}:{record_id}"
        if key in self._locks and self._locks[key] == operator:
            self._locks.pop(key, None)
            return True
        return False
