"""
单元测试：验证数据校验、异常状态流转、计数守恒
"""
import os
import sys
import sqlite3
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.validator import validate_record, ValidationError
from src.models import RecordType, TaskStatus, PendingRecordStatus
from src.database import SessionLocal, init_db, engine
from src.repository import DataRepository, safe_json_dumps, safe_json_loads, _to_datetime
from src.data_importer import DataImporter
from src.task_processor import TaskProcessor
from src import models

import tempfile
import shutil

print("=" * 60)
print("UNIT TEST 1: 数据校验功能")
print("=" * 60)

# 测试正常库存数据
good_data = {
    "cabinet_id": "CAB001",
    "cell_id": "A01",
    "sku_id": "SKU001",
    "quantity": 10,
}
is_valid, error = validate_record(good_data, RecordType.INVENTORY)
assert is_valid, f"正常数据应通过校验，实际错误: {error}"
print("✅ 正常数据校验通过")

# 测试缺少柜机ID
bad_data = {"cell_id": "A01", "sku_id": "SKU001", "quantity": 10}
is_valid, error = validate_record(bad_data, RecordType.INVENTORY)
assert not is_valid, "缺少柜机ID应校验失败"
assert error and "cabinet_id" in str(error), f"错误应包含cabinet_id: {error}"
print(f"✅ 缺少柜机ID校验失败: {error}")

# 测试缺少格口ID
bad_data = {"cabinet_id": "CAB001", "sku_id": "SKU001", "quantity": 10}
is_valid, error = validate_record(bad_data, RecordType.INVENTORY)
assert not is_valid and "cell_id" in str(error)
print(f"✅ 缺少格口ID校验失败: {error}")

# 测试缺少SKU_ID
bad_data = {"cabinet_id": "CAB001", "cell_id": "A01", "quantity": 10}
is_valid, error = validate_record(bad_data, RecordType.INVENTORY)
assert not is_valid and "sku_id" in str(error)
print(f"✅ 缺少SKU_ID校验失败: {error}")

# 测试缺少数量
bad_data = {"cabinet_id": "CAB001", "cell_id": "A01", "sku_id": "SKU001"}
is_valid, error = validate_record(bad_data, RecordType.INVENTORY)
assert not is_valid and "quantity" in str(error)
print(f"✅ 缺少数量校验失败: {error}")

# 测试数量为负
bad_data = {"cabinet_id": "CAB001", "cell_id": "A01", "sku_id": "SKU001", "quantity": -1}
is_valid, error = validate_record(bad_data, RecordType.INVENTORY)
assert not is_valid and "非负整数" in str(error)
print(f"✅ 数量为负校验失败: {error}")

# 测试数量为字符串
bad_data = {"cabinet_id": "CAB001", "cell_id": "A01", "sku_id": "SKU001", "quantity": "10"}
is_valid, error = validate_record(bad_data, RecordType.INVENTORY)
assert not is_valid and "非负整数" in str(error)
print(f"✅ 数量为字符串校验失败: {error}")

print()
print("=" * 60)
print("UNIT TEST 2: DateTime 序列化/反序列化")
print("=" * 60)

original_dt = datetime(2026, 5, 25, 14, 30, 0)
original_data = {"cabinet_id": "CAB001", "record_time": original_dt}
encoded = safe_json_dumps(original_data)
print(f"编码后: {encoded}")
assert '"__type__":"datetime"' in encoded, "DateTime应带有类型标记"

decoded = safe_json_loads(encoded)
assert isinstance(decoded["record_time"], datetime), f"解码后应该是datetime类型，实际: {type(decoded['record_time'])}"
assert decoded["record_time"] == original_dt, "解码后datetime应与原值相等"
print(f"✅ DateTime 序列化/反序列化正常: {decoded['record_time']}")

# 测试字符串转datetime
converted = _to_datetime("2026-05-25T14:30:00")
assert isinstance(converted, datetime)
print(f"✅ 字符串转datetime正常: {converted}")

# 测试兼容格式
converted = _to_datetime("2026-05-25 14:30:00")
assert isinstance(converted, datetime)
print(f"✅ 兼容格式转换正常: {converted}")

print()
print("=" * 60)
print("UNIT TEST 3: 脏数据迁移模拟")
print("=" * 60)

# 使用临时数据库
temp_db = tempfile.mktemp(suffix=".db")
temp_db_url = f"sqlite:///{temp_db}"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

test_engine = create_engine(temp_db_url, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

models.Base.metadata.create_all(bind=test_engine)

# 手动插入脏数据（task_be8a84837e774e31）
conn = sqlite3.connect(temp_db)
cursor = conn.cursor()
cursor.execute("""
    INSERT INTO import_tasks 
    (task_id, record_type, source_type, source_file, status, total_count, success_count, duplicate_count, error_count, retry_times, max_retry_times, created_at, updated_at)
    VALUES 
    ('task_be8a84837e774e31', 'inventory', 'api', NULL, 'completed', 1, 0, 0, 1, 0, 3, datetime('now'), datetime('now'))
""")
conn.commit()
conn.close()

print("插入脏数据: task_be8a84837e774e31 (status=completed, total=1, success=0, error=1, 无pending记录)")

# 执行修复
from src.database import _fix_dirty_data, _migrate_pending_records, _create_pending_records_table

_create_pending_records_table(test_engine)

db = TestSession()
try:
    _fix_dirty_data(db)
    _migrate_pending_records(db)

    task = db.query(models.ImportTask).filter(models.ImportTask.task_id == "task_be8a84837e774e31").first()
    print(f"修复后状态: {task.status.value}")
    print(f"修复后计数: total={task.total_count}, success={task.success_count}, error={task.error_count}")

    pending_records = db.query(models.PendingRecord).filter(models.PendingRecord.task_id == task.id).all()
    print(f"pending记录数: {len(pending_records)}")
    for pr in pending_records:
        print(f"  行{pr.source_row_number}: {pr.status.value}")

    assert task.status == TaskStatus.WAITING_MANUAL, f"状态应为waiting_manual，实际: {task.status.value}"
    assert len(pending_records) == 1, f"应有1条pending记录，实际: {len(pending_records)}"
    assert pending_records[0].status == PendingRecordStatus.WAITING_MANUAL, f"pending记录应为waiting_manual状态"
    print("✅ 脏数据修复正确")

finally:
    db.close()

os.unlink(temp_db)

print()
print("=" * 60)
print("UNIT TEST 4: 完整导入处理流程（异常数据）")
print("=" * 60)

# 使用内存数据库进行完整测试
temp_db2 = tempfile.mktemp(suffix=".db")
temp_db_url2 = f"sqlite:///{temp_db2}"

test_engine2 = create_engine(temp_db_url2, connect_args={"check_same_thread": False})
TestSession2 = sessionmaker(autocommit=False, autoflush=False, bind=test_engine2)

models.Base.metadata.create_all(bind=test_engine2)

db = TestSession2()

importer = DataImporter(db)

# 导入混合数据：1条正常，2条异常
data = [
    {"cabinet_id": "CAB001", "cell_id": "A01", "sku_id": "SKU001", "quantity": 10},
    {"cell_id": "A02", "sku_id": "SKU002", "quantity": 5},
    {"cabinet_id": "CAB001", "cell_id": "A03", "quantity": 8},
]

task = importer.import_from_api(RecordType.INVENTORY, data)
print(f"任务创建: {task.task_id}, status={task.status.value}, total={task.total_count}")
print(f"pending记录数: {len(task.pending_records)}")

# 手动处理任务
processor = TaskProcessor()
processor._process_task(task, DataRepository(db))

db.refresh(task)
print()
print(f"处理完成: status={task.status.value}, success={task.success_count}, duplicate={task.duplicate_count}, error={task.error_count}")
calc_total = task.success_count + task.duplicate_count + task.error_count
assert calc_total == task.total_count, f"计数不守恒: {calc_total} != {task.total_count}"
print(f"计数守恒: {calc_total} == {task.total_count} ✅")

assert task.status == TaskStatus.WAITING_MANUAL, f"任务状态应为waiting_manual，实际: {task.status.value}"
assert task.success_count == 1, f"应有1条成功，实际: {task.success_count}"
assert task.error_count == 2, f"应有2条错误，实际: {task.error_count}"

pending_records = task.pending_records
success_pr = [pr for pr in pending_records if pr.status == PendingRecordStatus.SUCCESS]
manual_pr = [pr for pr in pending_records if pr.status == PendingRecordStatus.WAITING_MANUAL]
assert len(success_pr) == 1, f"应有1条成功pending记录"
assert len(manual_pr) == 2, f"应有2条等待人工pending记录"

print()
print("行级状态:")
for pr in pending_records:
    err = f" - {pr.error_message}" if pr.error_message else ""
    print(f"  行{pr.source_row_number}: {pr.status.value}{err}")

print()
print("✅ 完整导入处理流程正常（异常数据进入等人工状态）")

db.close()
os.unlink(temp_db2)

print()
print("=" * 60)
print("ALL UNIT TESTS PASSED ✅✅✅")
print("=" * 60)
