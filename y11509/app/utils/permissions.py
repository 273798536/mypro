from functools import wraps
from flask import g, jsonify
from app.models import Role, User


def get_current_user():
    user_id = getattr(g, "user_id", 1)
    user = User.query.get(user_id)
    return user


def get_user_department():
    user = get_current_user()
    return user.department if user else None


def can_view_all_departments():
    role = getattr(g, "user_role", "admin")
    return role in ["admin", "auditor", "technician"]


def can_view_department(department):
    if can_view_all_departments():
        return True
    user_dept = get_user_department()
    return user_dept and department == user_dept


def can_edit_record(record):
    role = getattr(g, "user_role", "admin")
    user_id = getattr(g, "user_id", 1)

    if role == "admin":
        return True

    if hasattr(record, "created_by"):
        return record.created_by == user_id

    return False


def can_submit(record):
    role = getattr(g, "user_role", "admin")
    return role in ["admin", "department_head", "nurse", "technician"]


def can_approve(record):
    role = getattr(g, "user_role", "admin")
    return role in ["admin", "department_head"]


def can_freeze():
    role = getattr(g, "user_role", "admin")
    return role in ["admin", "department_head"]


def can_import():
    role = getattr(g, "user_role", "admin")
    return role in ["admin", "department_head", "technician"]


def can_export():
    role = getattr(g, "user_role", "admin")
    return role in ["admin", "department_head", "auditor"]


def can_manual_edit():
    role = getattr(g, "user_role", "admin")
    return role in ["admin", "department_head"]


def require_permission(permission_check):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not permission_check():
                return jsonify({"error": "权限不足", "code": 403}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def apply_department_filter(query, Model):
    if not can_view_all_departments():
        user_dept = get_user_department()
        if user_dept:
            query = query.filter(Model.department == user_dept)
    return query
