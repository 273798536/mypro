import hashlib
import json
import secrets
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from .database import get_connection


PERMISSION_CACHE: Dict[str, set] = {}


def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return hashed.hex(), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    hashed, _ = hash_password(password, salt)
    return hashed == stored_hash


def authenticate_user(username: str, password: str, workspace: Optional[str] = None) -> Optional[Dict]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT u.*, r.role_name, r.description as role_description
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.username = ? AND u.is_active = 1
    ''', (username,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row is None:
        return None
    
    return {
        'user_id': row['user_id'],
        'username': row['username'],
        'display_name': row['display_name'],
        'role_id': row['role_id'],
        'role_name': row['role_name'],
        'branch_id': row['branch_id'],
    }


def get_user_permissions(user_id: int, workspace: Optional[str] = None) -> List[str]:
    cache_key = f"{workspace}:{user_id}"
    if cache_key in PERMISSION_CACHE:
        return list(PERMISSION_CACHE[cache_key])
    
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT p.permission_name, p.resource, p.action
    FROM users u
    JOIN role_permissions rp ON u.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.permission_id
    WHERE u.user_id = ? AND u.is_active = 1
    ''', (user_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    permissions = [row['permission_name'] for row in rows]
    PERMISSION_CACHE[cache_key] = set(permissions)
    
    return permissions


def has_permission(user: Dict, permission_name: str, workspace: Optional[str] = None) -> bool:
    if user.get('role_name') == 'admin':
        return True
    
    permissions = get_user_permissions(user['user_id'], workspace)
    return permission_name in permissions


def check_branch_access(user: Dict, target_branch_id: str) -> bool:
    if user.get('role_name') in ['admin', 'branch_manager']:
        if user.get('branch_id') and user['branch_id'] != target_branch_id:
            return False
        return True
    if user.get('branch_id') == target_branch_id:
        return True
    return False


def log_audit(user: Dict, action: str, resource: str, 
              resource_id: Optional[str] = None, session_id: Optional[int] = None,
              detail: Optional[str] = None, success: bool = True,
              error_message: Optional[str] = None,
              workspace: Optional[str] = None) -> None:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
        INSERT INTO audit_logs 
        (user_id, username, action, resource, resource_id, session_id, detail, success, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user.get('user_id'),
            user.get('username', 'unknown'),
            action,
            resource,
            resource_id,
            session_id,
            detail,
            success,
            error_message,
            datetime.now().isoformat(),
        ))
        conn.commit()
    except Exception as e:
        pass
    finally:
        conn.close()


def get_audit_logs(limit: int = 50, username: Optional[str] = None,
                   action: Optional[str] = None, workspace: Optional[str] = None) -> List[Dict]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    query = 'SELECT * FROM audit_logs WHERE 1=1'
    params = []
    
    if username:
        query += ' AND username = ?'
        params.append(username)
    if action:
        query += ' AND action = ?'
        params.append(action)
    
    query += ' ORDER BY created_at DESC LIMIT ?'
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def invalidate_permission_cache(user_id: Optional[int] = None, workspace: Optional[str] = None) -> None:
    if user_id is None:
        PERMISSION_CACHE.clear()
    else:
        cache_key = f"{workspace}:{user_id}"
        PERMISSION_CACHE.pop(cache_key, None)
