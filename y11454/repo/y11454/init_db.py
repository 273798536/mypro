import sys
sys.path.insert(0, '.')

from app.database import Base, engine, SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    existing_users = db.query(User).count()
    if existing_users == 0:
        initial_users = [
            {'username': 'admin', 'full_name': '系统管理员', 'email': 'admin@example.com', 'password': 'admin123', 'role': UserRole.SUPERVISOR},
            {'username': 'reviewer', 'full_name': '复核人员', 'email': 'reviewer@example.com', 'password': 'reviewer123', 'role': UserRole.REVIEWER},
            {'username': 'operator', 'full_name': '录入人员', 'email': 'operator@example.com', 'password': 'operator123', 'role': UserRole.DATA_ENTRY},
            {'username': 'viewer', 'full_name': '只读用户', 'email': 'viewer@example.com', 'password': 'viewer123', 'role': UserRole.READ_ONLY}
        ]
        for user_data in initial_users:
            user = User(
                username=user_data['username'],
                full_name=user_data['full_name'],
                email=user_data['email'],
                hashed_password=get_password_hash(user_data['password']),
                role=user_data['role']
            )
            db.add(user)
        db.commit()
        print('数据库初始化完成，已创建初始用户:')
        for user_data in initial_users:
            print(f'  - {user_data["username"]} / {user_data["password"]} ({user_data["role"].value})')
    else:
        print(f'数据库已存在 {existing_users} 个用户，跳过初始化')
except Exception as e:
    print(f'初始化失败: {e}')
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
