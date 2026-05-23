#!/usr/bin/env python3
"""
数据库初始化脚本

创建默认用户：
- 主管账号: admin / admin123
- 复核账号: reviewer / reviewer123
- 录入账号: entry / entry123
- 只读账号: readonly / readonly123
"""

from app.database import SessionLocal
from app.models import User, UserRole
from app.auth import get_password_hash


def init_users():
    db = SessionLocal()
    
    default_users = [
        {
            "username": "admin",
            "full_name": "系统管理员",
            "password": "admin123",
            "role": UserRole.SUPERVISOR,
            "city": None
        },
        {
            "username": "reviewer",
            "full_name": "复核员-北京",
            "password": "reviewer123",
            "role": UserRole.REVIEWER,
            "city": "北京"
        },
        {
            "username": "reviewer_sh",
            "full_name": "复核员-上海",
            "password": "reviewer123",
            "role": UserRole.REVIEWER,
            "city": "上海"
        },
        {
            "username": "entry",
            "full_name": "录入员-北京",
            "password": "entry123",
            "role": UserRole.DATA_ENTRY,
            "city": "北京"
        },
        {
            "username": "readonly",
            "full_name": "只读用户",
            "password": "readonly123",
            "role": UserRole.READ_ONLY,
            "city": None
        }
    ]
    
    for user_data in default_users:
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if existing:
            print(f"用户 {user_data['username']} 已存在，跳过")
            continue
        
        user = User(
            username=user_data["username"],
            full_name=user_data["full_name"],
            hashed_password=get_password_hash(user_data["password"]),
            role=user_data["role"],
            city=user_data["city"],
            is_active=True
        )
        db.add(user)
        print(f"创建用户: {user_data['username']} / {user_data['password']} (角色: {user_data['role'].value})")
    
    db.commit()
    db.close()
    print("\n初始化完成！")


if __name__ == "__main__":
    init_users()
