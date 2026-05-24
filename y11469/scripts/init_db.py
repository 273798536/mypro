#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import Base, engine
from app.models.ledger import (
    LedgerRecord, StatusHistory, SampleTransfer, SizeModification,
    FabricInventory, ManualPricing, ShiftRecord, ImportBatch, ProcessingChain
)

def init_database():
    print("正在初始化数据库...")
    Base.metadata.create_all(bind=engine)
    print("数据库表创建完成！")

if __name__ == "__main__":
    init_database()
