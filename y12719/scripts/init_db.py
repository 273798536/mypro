import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from var_backtest.database import Base, engine, SessionLocal
from var_backtest import models
from var_backtest.validator import IncrementalValidator


def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表已创建")

    db = SessionLocal()
    try:
        validator = IncrementalValidator(db)
        validator.ensure_rules_exist()
        print("✅ 默认校验规则已载入")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    print("🚀 初始化完成")
