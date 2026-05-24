#!/usr/bin/env python3
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.enums import DataSourceType
from app.services.import_service import ImportService
from app.services.ledger_service import LedgerService
from app.data.sample_data import (
    SAMPLE_TRANSFERS,
    SAMPLE_SIZE_MODIFICATIONS,
    SAMPLE_FABRIC_INVENTORY,
    SAMPLE_MANUAL_PRICINGS,
    SAMPLE_LEDGER_RECORDS,
    SAMPLE_STYLE_CODE
)


def load_sample_data():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("开始加载样例数据...")
        print("=" * 60)

        import_service = ImportService(db)
        ledger_service = LedgerService(db)

        print("\n[1/5] 导入样衣流转单...")
        try:
            batch = import_service.batch_import(
                DataSourceType.SAMPLE_TRANSFER,
                "样衣流转单_202401.xlsx",
                SAMPLE_TRANSFERS,
                "系统管理员"
            )
            print(f"  成功: {batch.success_count} 条, 失败: {batch.failed_count} 条")
        except Exception as e:
            print(f"  结果: {e}")

        print("\n[2/5] 导入尺码修改意见...")
        try:
            batch = import_service.batch_import(
                DataSourceType.SIZE_MODIFICATION,
                "尺码修改意见_202401.xlsx",
                SAMPLE_SIZE_MODIFICATIONS,
                "系统管理员"
            )
            print(f"  成功: {batch.success_count} 条, 失败: {batch.failed_count} 条")
        except Exception as e:
            print(f"  结果: {e}")

        print("\n[3/5] 导入面料出入库记录...")
        try:
            batch = import_service.batch_import(
                DataSourceType.FABRIC_INVENTORY,
                "面料出入库台账_202401.xlsx",
                SAMPLE_FABRIC_INVENTORY,
                "系统管理员"
            )
            print(f"  成功: {batch.success_count} 条, 失败: {batch.failed_count} 条")
        except Exception as e:
            print(f"  结果: {e}")

        print("\n[4/5] 导入手工改价表...")
        try:
            batch = import_service.batch_import(
                DataSourceType.MANUAL_PRICING,
                "手工改价审批表_202401.xlsx",
                SAMPLE_MANUAL_PRICINGS,
                "系统管理员"
            )
            print(f"  成功: {batch.success_count} 条, 失败: {batch.failed_count} 条")
        except Exception as e:
            print(f"  结果: {e}")

        print("\n[5/5] 创建台账记录...")
        ledger_ids = []
        for idx, record_data in enumerate(SAMPLE_LEDGER_RECORDS):
            record = ledger_service.create_ledger_record(record_data, "系统初始化")
            ledger_ids.append(record.id)
            print(f"  创建台账: {record.record_no} (版本 {record.version})")

        print("\n" + "=" * 60)
        print("样例数据加载完成！")
        print("=" * 60)
        print(f"\n测试款号: {SAMPLE_STYLE_CODE}")
        print(f"台账记录ID: {ledger_ids}")
        print(f"\n后续可以运行:")
        print(f"  python scripts/run_full_demo.py  - 运行完整演示流程")
        print(f"  python main.py                   - 启动API服务")

        return ledger_ids

    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    load_sample_data()
