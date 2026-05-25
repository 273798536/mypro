from flask import Blueprint, request, jsonify, g
from app.models import db, User, Role

bp = Blueprint("user", __name__)


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "real_name": user.real_name,
        "role": user.role.value if user.role else None,
        "department": user.department,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "is_active": user.is_active,
    }


@bp.route("", methods=["POST"])
def create_user():
    data = request.get_json()

    if not data.get("username"):
        return jsonify({"error": "用户名不能为空", "code": 400}), 400
    if not data.get("real_name"):
        return jsonify({"error": "真实姓名不能为空", "code": 400}), 400
    if not data.get("role"):
        return jsonify({"error": "角色不能为空", "code": 400}), 400

    try:
        role = Role(data["role"])
    except ValueError:
        return jsonify({"error": "无效的角色", "code": 400}), 400

    existing = User.query.filter_by(username=data["username"]).first()
    if existing:
        return jsonify({"error": "用户名已存在", "code": 409}), 409

    user = User(
        username=data["username"],
        real_name=data["real_name"],
        role=role,
        department=data.get("department"),
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "用户创建成功",
        "data": user_to_dict(user),
        "code": 201
    }), 201


@bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id: int):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "用户不存在", "code": 404}), 404

    return jsonify({"data": user_to_dict(user), "code": 200})


@bp.route("", methods=["GET"])
def list_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    role = request.args.get("role")
    department = request.args.get("department")

    query = User.query

    if role:
        try:
            query = query.filter(User.role == Role(role))
        except ValueError:
            pass
    if department:
        query = query.filter(User.department.like(f"%{department}%"))

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "data": [user_to_dict(u) for u in pagination.items],
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
        "code": 200
    })


@bp.route("/<int:user_id>", methods=["PUT"])
def update_user(user_id: int):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "用户不存在", "code": 404}), 404

    data = request.get_json()

    if "username" in data and data["username"] != user.username:
        existing = User.query.filter_by(username=data["username"]).first()
        if existing:
            return jsonify({"error": "用户名已存在", "code": 409}), 409
        user.username = data["username"]

    if "real_name" in data:
        user.real_name = data["real_name"]
    if "department" in data:
        user.department = data["department"]
    if "role" in data:
        try:
            user.role = Role(data["role"])
        except ValueError:
            return jsonify({"error": "无效的角色", "code": 400}), 400
    if "is_active" in data:
        user.is_active = data["is_active"]

    db.session.commit()

    return jsonify({
        "message": "用户更新成功",
        "data": user_to_dict(user),
        "code": 200
    })


@bp.route("/role-view", methods=["GET"])
def get_role_view():
    role = getattr(g, "user_role", "admin")

    role_configs = {
        "admin": {
            "role": "系统管理员",
            "permissions": ["全部权限", "查看所有记录", "修改所有记录", "人工改判", "导出全部数据", "查看完整审计"],
            "visible_fields": ["全部字段"],
            "masked": False,
        },
        "auditor": {
            "role": "审计员",
            "permissions": ["查看所有记录", "查看完整审计", "导出全部数据"],
            "visible_fields": ["全部字段"],
            "masked": False,
        },
        "department_head": {
            "role": "科室护士长",
            "permissions": ["查看本科室记录", "提交审核", "导出本科室数据", "查看本科室审计"],
            "visible_fields": ["记录编号", "设备名称", "科室", "状态", "证书状态", "日期", "人工改判"],
            "masked": True,
            "masked_fields": ["设备序列号", "原始数据"],
        },
        "nurse": {
            "role": "护士",
            "permissions": ["创建记录", "编辑草稿", "提交审核", "查看自己的记录"],
            "visible_fields": ["记录编号", "设备名称", "科室", "状态"],
            "masked": True,
            "masked_fields": ["设备序列号", "故障描述", "原始数据", "问题详情"],
        },
        "technician": {
            "role": "技术员",
            "permissions": ["创建校准/维修记录", "编辑草稿", "提交审核"],
            "visible_fields": ["记录编号", "设备名称", "技术相关字段"],
            "masked": True,
            "masked_fields": ["设备序列号"],
        },
    }

    return jsonify({
        "data": role_configs.get(role, role_configs["nurse"]),
        "code": 200
    })
