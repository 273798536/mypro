#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import User, UserRole
from app.auth import get_password_hash


def init_users(db: Session):
    users = [
        {
            "username": "supervisor",
            "password": "supervisor123",
            "full_name": "主管用户",
            "role": UserRole.SUPERVISOR,
        },
        {
            "username": "reviewer",
            "password": "reviewer123",
            "full_name": "复核用户",
            "role": UserRole.REVIEWER,
        },
        {
            "username": "data_entry",
            "password": "data123",
            "full_name": "录入用户",
            "role": UserRole.DATA_ENTRY,
        },
        {
            "username": "viewer",
            "password": "viewer123",
            "full_name": "只读用户",
            "role": UserRole.VIEWER,
        },
    ]

    for user_data in users:
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if existing:
            print(f"用户 {user_data['username']} 已存在")
            continue

        user = User(
            username=user_data["username"],
            full_name=user_data["full_name"],
            hashed_password=get_password_hash(user_data["password"]),
            role=user_data["role"],
        )
        db.add(user)
        print(f"创建用户: {user_data['username']} ({user_data['role'].value})")

    db.commit()


def main():
    print("=" * 50)
    print("初始化数据库...")
    print("=" * 50)

    Base.metadata.create_all(bind=engine)
    print("数据库表创建完成")

    db = SessionLocal()
    try:
        init_users(db)
    finally:
        db.close()

    print("=" * 50)
    print("数据库初始化完成!")
    print("=" * 50)
    print("\n默认账号:")
    print("  主管账号: supervisor / supervisor123")
    print("  复核账号: reviewer / reviewer123")
    print("  录入账号: data_entry / data123")
    print("  只读账号: viewer / viewer123")


if __name__ == "__main__":
    main()
