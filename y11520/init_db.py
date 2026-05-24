#!/usr/bin/env python3
"""初始化数据库和默认用户"""

from sqlalchemy.orm import Session

from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.enums import UserRole
from app.models.models import User


def init_users(db: Session):
    default_users = [
        {
            "username": "manager",
            "password": "manager123",
            "full_name": "主管用户",
            "role": UserRole.MANAGER
        },
        {
            "username": "reviewer",
            "password": "reviewer123",
            "full_name": "复核用户",
            "role": UserRole.REVIEW
        },
        {
            "username": "entry",
            "password": "entry123",
            "full_name": "录入用户",
            "role": UserRole.ENTRY
        },
        {
            "username": "readonly",
            "password": "readonly123",
            "full_name": "只读用户",
            "role": UserRole.READONLY
        }
    ]

    for user_data in default_users:
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if not existing:
            user = User(
                username=user_data["username"],
                full_name=user_data["full_name"],
                hashed_password=get_password_hash(user_data["password"]),
                role=user_data["role"]
            )
            db.add(user)
            print(f"创建用户: {user_data['username']} / {user_data['password']}")
        else:
            print(f"用户已存在: {user_data['username']}")

    db.commit()


def main():
    print("初始化数据库...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        init_users(db)
        print("数据库初始化完成!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
