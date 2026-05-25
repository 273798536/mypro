import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set
from .config import Config


DEFAULT_ROLES = {
    'admin': {
        'permissions': ['*'],
        'description': '系统管理员'
    },
    'inspector': {
        'permissions': ['import', 'check', 'view', 'export'],
        'description': '巡检员'
    },
    'reviewer': {
        'permissions': ['import', 'check', 'view', 'manual_judge', 'fix', 'withdraw'],
        'description': '审核员'
    },
    'operator': {
        'permissions': ['import', 'view'],
        'description': '操作员'
    }
}

DEFAULT_USERS = {
    'admin': {
        'role': 'admin',
        'name': '系统管理员'
    }
}


class AuthManager:
    def __init__(self, config: Config):
        self.config = config
        self.base_dir = Path(config.base_dir)
        self.auth_file = self.base_dir / 'data' / 'auth.json'
        self.log_file = self.base_dir / 'logs' / 'audit.log'
        self._ensure_auth_file()

    def _ensure_auth_file(self):
        self.auth_file.parent.mkdir(parents=True, exist_ok=True)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        
        if not self.auth_file.exists():
            auth_data = {
                'roles': DEFAULT_ROLES,
                'users': DEFAULT_USERS,
                'created_at': datetime.now().isoformat()
            }
            with open(self.auth_file, 'w', encoding='utf-8') as f:
                json.dump(auth_data, f, ensure_ascii=False, indent=2)

    def _load_auth_data(self) -> Dict:
        if self.auth_file.exists():
            with open(self.auth_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {'roles': DEFAULT_ROLES, 'users': DEFAULT_USERS}

    def get_user_role(self, username: str) -> Optional[str]:
        auth_data = self._load_auth_data()
        user = auth_data.get('users', {}).get(username)
        return user.get('role') if user else None

    def get_role_permissions(self, role: str) -> Set[str]:
        auth_data = self._load_auth_data()
        role_data = auth_data.get('roles', {}).get(role)
        if not role_data:
            return set()
        return set(role_data.get('permissions', []))

    def check_permission(self, username: str, permission: str) -> bool:
        role = self.get_user_role(username)
        if not role:
            return False
        
        permissions = self.get_role_permissions(role)
        return '*' in permissions or permission in permissions

    def add_user(self, username: str, role: str, name: str = None) -> bool:
        auth_data = self._load_auth_data()
        
        if role not in auth_data.get('roles', {}):
            return False
        
        auth_data['users'][username] = {
            'role': role,
            'name': name or username
        }
        
        with open(self.auth_file, 'w', encoding='utf-8') as f:
            json.dump(auth_data, f, ensure_ascii=False, indent=2)
        
        return True

    def remove_user(self, username: str) -> bool:
        auth_data = self._load_auth_data()
        
        if username not in auth_data.get('users', {}):
            return False
        
        if username == 'admin':
            return False
        
        del auth_data['users'][username]
        
        with open(self.auth_file, 'w', encoding='utf-8') as f:
            json.dump(auth_data, f, ensure_ascii=False, indent=2)
        
        return True

    def list_users(self) -> List[Dict]:
        auth_data = self._load_auth_data()
        users = []
        for username, user_data in auth_data.get('users', {}).items():
            users.append({
                'username': username,
                'name': user_data.get('name', username),
                'role': user_data.get('role')
            })
        return users

    def log_operation(self, username: str, operation: str, target: str = None,
                      details: str = None) -> None:
        timestamp = datetime.now().isoformat()
        log_entry = f"[{timestamp}] user={username} op={operation}"
        if target:
            log_entry += f" target={target}"
        if details:
            log_entry += f" details={details}"
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry + '\n')

    def get_audit_logs(self, limit: int = 100) -> List[str]:
        if not self.log_file.exists():
            return []
        
        with open(self.log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        return lines[-limit:]
