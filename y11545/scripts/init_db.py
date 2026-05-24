#!/usr/bin/env python3
"""初始化数据库"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine
from app.models import (
    Batch, MaterialItem, LogisticsReceipt, BorrowRecord,
    SupplementRecord, StateRecord, DeviceTracking,
    Attachment, AuditLog, AsyncTask
)


def init_database():
    print("正在初始化数据库...")
    
    db_path = engine.url.database
    if os.path.exists(db_path):
        print(f"删除旧数据库: {db_path}")
        os.remove(db_path)
    
    Base.metadata.create_all(bind=engine)
    print("数据库表创建完成!")
    
    print("\n已创建的表:")
    for table in Base.metadata.tables.keys():
        print(f"  - {table}")
    
    print("\n数据库初始化完成!")


if __name__ == "__main__":
    init_database()
