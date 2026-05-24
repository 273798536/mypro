from app.database import SessionLocal, engine, Base
from app import models
from app.security import get_password_hash

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    existing_users = db.query(models.User).count()
    if existing_users == 0:
        print("初始化默认用户...")

        supervisor = models.User(
            username="supervisor",
            hashed_password=get_password_hash("supervisor123"),
            role=models.UserRole.SUPERVISOR,
            full_name="品控主管",
            is_active=True
        )
        db.add(supervisor)

        reviewer = models.User(
            username="reviewer",
            hashed_password=get_password_hash("reviewer123"),
            role=models.UserRole.REVIEWER,
            full_name="复核员",
            is_active=True
        )
        db.add(reviewer)

        data_entry = models.User(
            username="data_entry",
            hashed_password=get_password_hash("data_entry123"),
            role=models.UserRole.DATA_ENTRY,
            full_name="数据录入员",
            is_active=True
        )
        db.add(data_entry)

        read_only = models.User(
            username="readonly",
            hashed_password=get_password_hash("readonly123"),
            role=models.UserRole.READ_ONLY,
            full_name="只读用户",
            is_active=True
        )
        db.add(read_only)

        db.commit()
        print("默认用户创建完成:")
        print("  - 主管: supervisor / supervisor123")
        print("  - 复核员: reviewer / reviewer123")
        print("  - 录入员: data_entry / data_entry123")
        print("  - 只读: readonly / readonly123")
    else:
        print("数据库已存在用户数据，跳过初始化")

except Exception as e:
    print(f"初始化失败: {e}")
    db.rollback()
finally:
    db.close()
