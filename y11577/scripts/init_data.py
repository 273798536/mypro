import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.auth import User, Role, Permission
from app.core.security import get_password_hash


def init_roles_and_permissions():
    db = SessionLocal()
    try:
        permissions = [
            {"name": "查看数据", "code": "view", "description": "查看业务数据"},
            {"name": "录入数据", "code": "data_entry", "description": "录入和编辑业务数据"},
            {"name": "复核数据", "code": "review", "description": "复核和审批业务数据"},
            {"name": "主管权限", "code": "supervise", "description": "主管级别权限，包含人工处理队列"},
            {"name": "导出报表", "code": "export", "description": "导出报表数据"},
        ]
        
        existing_perms = {p.code: p for p in db.query(Permission).all()}
        
        for perm_data in permissions:
            if perm_data["code"] not in existing_perms:
                perm = Permission(**perm_data)
                db.add(perm)
        
        db.commit()
        
        roles = [
            {
                "name": "只读用户",
                "code": "readonly",
                "description": "只能查看数据，不能修改",
                "permissions": ["view"]
            },
            {
                "name": "数据录入员",
                "code": "data_entry",
                "description": "可以录入和编辑数据",
                "permissions": ["view", "data_entry"]
            },
            {
                "name": "复核员",
                "code": "reviewer",
                "description": "可以复核审批数据",
                "permissions": ["view", "data_entry", "review", "export"]
            },
            {
                "name": "主管",
                "code": "supervisor",
                "description": "拥有全部权限，包括人工处理队列",
                "permissions": ["view", "data_entry", "review", "supervise", "export"]
            }
        ]
        
        all_perms = {p.code: p for p in db.query(Permission).all()}
        
        for role_data in roles:
            role = db.query(Role).filter(Role.code == role_data["code"]).first()
            if not role:
                role = Role(
                    name=role_data["name"],
                    code=role_data["code"],
                    description=role_data["description"]
                )
                db.add(role)
                db.flush()
            
            role_perms = [all_perms[code] for code in role_data["permissions"] if code in all_perms]
            role.permissions = role_perms
        
        db.commit()
        
        users = [
            {
                "username": "admin",
                "email": "admin@example.com",
                "password": "admin123",
                "full_name": "系统管理员",
                "roles": ["supervisor"]
            },
            {
                "username": "reviewer",
                "email": "reviewer@example.com",
                "password": "reviewer123",
                "full_name": "复核员张三",
                "roles": ["reviewer"]
            },
            {
                "username": "entry",
                "email": "entry@example.com",
                "password": "entry123",
                "full_name": "录入员李四",
                "roles": ["data_entry"]
            },
            {
                "username": "viewer",
                "email": "viewer@example.com",
                "password": "viewer123",
                "full_name": "只读用户王五",
                "roles": ["readonly"]
            }
        ]
        
        all_roles = {r.code: r for r in db.query(Role).all()}
        
        for user_data in users:
            user = db.query(User).filter(User.username == user_data["username"]).first()
            if not user:
                user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    hashed_password=get_password_hash(user_data["password"]),
                    full_name=user_data["full_name"]
                )
                db.add(user)
                db.flush()
            
            user_roles = [all_roles[code] for code in user_data["roles"] if code in all_roles]
            user.roles = user_roles
        
        db.commit()
        print("初始化数据完成！")
        print("创建的用户:")
        for user_data in users:
            print(f"  用户名: {user_data['username']}, 密码: {user_data['password']}, 角色: {user_data['roles']}")
        
    except Exception as e:
        db.rollback()
        print(f"初始化失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_roles_and_permissions()
