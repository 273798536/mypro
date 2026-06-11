import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine


def init_empty_database():
    print("=" * 60)
    print("ABS现金流异常回放 - 初始化空数据库")
    print("=" * 60)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("\n数据库表结构已重建（无预填数据）")
    print("请通过前端'导入操作'Tab导入审批邮件包来触发完整流程")
    print("=" * 60)


if __name__ == "__main__":
    init_empty_database()
