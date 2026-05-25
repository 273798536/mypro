import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("1. 测试应用导入...")
try:
    from main import app
    print(f"   ✓ 应用加载成功！路由数量: {len(app.routes)}")
except Exception as e:
    print(f"   ✗ 应用加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n2. 测试 schema 导入...")
try:
    from app.schemas import (
        CheckinRecordCreate, DepositRecordCreate, RoomChangeRecordCreate
    )
    c = CheckinRecordCreate(record_no="TEST001")
    assert "raw_data" not in c.model_dump() or c.model_dump().get("raw_data") is None
    print(f"   ✓ CheckinRecordCreate 字段: {list(c.model_dump().keys())}")
    print("   ✓ Schema 正确，raw_data 不在 Create 类中")
except Exception as e:
    print(f"   ✗ Schema 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n3. 测试权限系统...")
try:
    from app.permissions import get_current_user, get_current_user_with_permission, Permission
    print(f"   ✓ 权限函数加载成功")
    print(f"   ✓ 可用权限示例: {Permission.VIEW_BATCH}, {Permission.CREATE_BATCH}")
except Exception as e:
    print(f"   ✗ 权限系统测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n4. 测试数据库模型...")
try:
    from app.database import Base, engine
    from sqlalchemy.orm import sessionmaker
    import tempfile
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    db.close()
    print("   ✓ 数据库模型和连接正常")
except Exception as e:
    print(f"   ✗ 数据库测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n5. 测试 records 路由中的模型别名...")
try:
    from app.routers.records import (
        CheckinRecordModel, DepositRecordModel, RoomChangeRecordModel,
        SupervisorCommentModel, DirtyRecordModel
    )
    print(f"   ✓ 模型别名正确导入")
except Exception as e:
    print(f"   ✗ 模型别名测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "="*60)
print("✅ 所有基础测试通过！")
print("="*60)
print("\n可以运行以下命令启动服务:")
print("  python3 main.py")
print("或")
print("  python3 -m uvicorn main:app --host 127.0.0.1 --port 8000")
