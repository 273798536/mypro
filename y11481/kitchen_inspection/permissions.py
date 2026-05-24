from .database import get_connection

ROLES = {
    'entry': {
        'name': '录入员',
        'can_import': True,
        'can_check': True,
        'can_view_issues': True,
        'can_fix_own': True,
        'can_fix_all': False,
        'can_verify': False,
        'can_export': False,
        'can_view_history': True,
        'can_view_all_fields': False,
        'visible_fields': [
            'id', 'batch_no', 'store_id', 'record_date', 'status', 'created_at'
        ]
    },
    'reviewer': {
        'name': '复核员',
        'can_import': True,
        'can_check': True,
        'can_view_issues': True,
        'can_fix_own': True,
        'can_fix_all': True,
        'can_verify': True,
        'can_export': True,
        'can_view_history': True,
        'can_view_all_fields': True,
        'visible_fields': None
    },
    'supervisor': {
        'name': '品控主管',
        'can_import': True,
        'can_check': True,
        'can_view_issues': True,
        'can_fix_own': True,
        'can_fix_all': True,
        'can_verify': True,
        'can_export': True,
        'can_view_history': True,
        'can_view_all_fields': True,
        'can_generate_report': True,
        'visible_fields': None
    },
    'readonly': {
        'name': '只读查看',
        'can_import': False,
        'can_check': False,
        'can_view_issues': True,
        'can_fix_own': False,
        'can_fix_all': False,
        'can_verify': False,
        'can_export': False,
        'can_view_history': True,
        'can_view_all_fields': False,
        'visible_fields': [
            'id', 'batch_no', 'store_id', 'record_date', 'status'
        ]
    }
}


def get_user_role(username):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT role FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            return row['role'] if row else None
    except Exception:
        return None


def has_permission(username, permission):
    role = get_user_role(username)
    if not role or role not in ROLES:
        return False
    return ROLES[role].get(permission, False)


def can_perform_action(username, action, record_owner=None):
    role = get_user_role(username)
    if not role or role not in ROLES:
        return False
    
    role_config = ROLES[role]
    
    if action == 'import':
        return role_config.get('can_import', False)
    elif action == 'check':
        return role_config.get('can_check', False)
    elif action == 'fix':
        if role_config.get('can_fix_all', False):
            return True
        if role_config.get('can_fix_own', False) and record_owner == username:
            return True
        return False
    elif action == 'verify':
        return role_config.get('can_verify', False)
    elif action == 'export':
        return role_config.get('can_export', False)
    elif action == 'report':
        return role_config.get('can_generate_report', False)
    elif action == 'view_history':
        return role_config.get('can_view_history', False)
    
    return False


def get_visible_fields(username, data_type):
    role = get_user_role(username)
    if not role or role not in ROLES:
        return ['id']
    
    role_config = ROLES[role]
    if role_config.get('can_view_all_fields', False):
        return None
    
    base_fields = role_config.get('visible_fields', ['id'])
    
    type_specific = {
        'sample': ['product_name', 'sample_time', 'sample_amount', 'keeper'],
        'temperature': ['measure_time', 'temperature', 'measure_point', 'operator'],
        'complaint': ['complaint_no', 'complaint_type', 'complaint_desc', 'handler']
    }
    
    if data_type in type_specific and not role_config.get('can_view_all_fields', False):
        return base_fields
    
    return base_fields


def filter_fields_for_user(username, data, data_type):
    visible = get_visible_fields(username, data_type)
    if visible is None:
        return data
    
    if isinstance(data, dict):
        return {k: v for k, v in data.items() if k in visible}
    elif isinstance(data, list):
        return [filter_fields_for_user(username, item, data_type) for item in data]
    
    return data


def get_role_name(role):
    return ROLES.get(role, {}).get('name', role)


def list_users():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username, role, created_at FROM users ORDER BY username")
        return [dict(row) for row in cursor.fetchall()]
