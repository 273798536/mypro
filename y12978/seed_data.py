from audit_tool.database import SessionLocal
from audit_tool import models
from datetime import datetime
import hashlib


def gen_hash(table, row, col, val):
    return hashlib.md5(f"{table}|{row or 0}|{col}|{val}".encode()).hexdigest()


def seed():
    db = SessionLocal()
    try:
        if db.query(models.DataDictionary).count() > 0:
            print("数据已存在，跳过导入。如需重跑请删除 audit.db")
            return

        dict_data = [
            {"table_name": "user_login", "column_name": "login_time", "data_type": "DATETIME", "expected_timezone": "Asia/Shanghai", "description": "用户登录时间"},
            {"table_name": "order_main", "column_name": "create_time", "data_type": "DATETIME", "expected_timezone": "UTC", "description": "订单创建时间"},
            {"table_name": "class_schedule", "column_name": "start_time", "data_type": "DATETIME", "expected_timezone": "Asia/Shanghai", "description": "课程开始时间"},
            {"table_name": "payment_flow", "column_name": "paid_at", "data_type": "DATETIME", "expected_timezone": "UTC", "description": "支付时间"},
        ]
        for d in dict_data:
            db.add(models.DataDictionary(**d))

        source_data = [
            {
                "source_table": "user_login", "source_row_number": 101,
                "source_file": "user_login_20260601.csv", "source_remark": "日常导入批次 2026-06-01",
                "import_batch": "BATCH-20260601-01", "column_name": "login_time",
                "column_value": "2026-06-01 08:30:00+08:00", "detected_timezone": "Asia/Shanghai",
                "is_supplement": False
            },
            {
                "source_table": "user_login", "source_row_number": None,
                "source_file": "user_login_snapshot补录.png", "source_remark": "表结构快照补录,原始行号丢失",
                "import_batch": "BATCH-20260615-SNAP", "column_name": "login_time",
                "column_value": "2026-06-10 14:20:00", "detected_timezone": "UTC",
                "is_supplement": True
            },
            {
                "source_table": "order_main", "source_row_number": 523,
                "source_file": "order_main_20260605.csv", "source_remark": "订单主表",
                "import_batch": "BATCH-20260605-02", "column_name": "create_time",
                "column_value": "2026-06-05T10:00:00Z", "detected_timezone": "UTC",
                "is_supplement": False
            },
            {
                "source_table": "order_main", "source_row_number": 523,
                "source_file": "order_main_20260605.csv", "source_remark": "重复导入 - 与 BATCH-20260605-02 第523行重复",
                "import_batch": "BATCH-20260610-RETRY", "column_name": "create_time",
                "column_value": "2026-06-05T10:00:00Z", "detected_timezone": "UTC",
                "is_supplement": False
            },
            {
                "source_table": "class_schedule", "source_row_number": 88,
                "source_file": "class_schedule_20260612.csv", "source_remark": "课前数据导入",
                "import_batch": "BATCH-20260612-CLASS", "column_name": "start_time",
                "column_value": "2026-06-15 09:00:00+00:00", "detected_timezone": "UTC",
                "is_supplement": False
            },
            {
                "source_table": "payment_flow", "source_row_number": 3001,
                "source_file": "payment_flow_20260616.csv", "source_remark": "支付流水",
                "import_batch": "BATCH-20260616-PAY", "column_name": "paid_at",
                "column_value": "2026-06-16 16:45:30+08:00", "detected_timezone": "Asia/Shanghai",
                "is_supplement": False
            },
            {
                "source_table": "payment_flow", "source_row_number": 3002,
                "source_file": "payment_flow补录_0617.xlsx", "source_remark": "缺失流水补录",
                "import_batch": "BATCH-20260617-SUPP", "column_name": "paid_at",
                "column_value": "2026-06-16 18:00:00Z", "detected_timezone": "UTC",
                "is_supplement": True
            },
        ]

        source_ids = []
        for s in source_data:
            s["record_hash"] = gen_hash(s["source_table"], s["source_row_number"], s["column_name"], s["column_value"])
            src = models.SourceRecord(**s)
            db.add(src)
            db.flush()
            source_ids.append(src.id)

        process_data = [
            {"source_record_id": source_ids[0], "process_type": "import", "process_batch": "BATCH-20260601-01",
             "operator": "data_pipeline", "before_value": None, "after_value": "2026-06-01 08:30:00+08:00",
             "timezone_before": None, "timezone_after": "Asia/Shanghai", "remark": "首次导入"},
            {"source_record_id": source_ids[1], "process_type": "supplement", "process_batch": "BATCH-20260615-SNAP",
             "operator": "snapshot_repair", "before_value": None, "after_value": "2026-06-10 14:20:00",
             "timezone_before": None, "timezone_after": "UTC", "remark": "快照补录, 原始行号已丢失"},
            {"source_record_id": source_ids[2], "process_type": "import", "process_batch": "BATCH-20260605-02",
             "operator": "data_pipeline", "before_value": None, "after_value": "2026-06-05T10:00:00Z",
             "timezone_before": None, "timezone_after": "UTC", "remark": "首次导入"},
            {"source_record_id": source_ids[3], "process_type": "import", "process_batch": "BATCH-20260610-RETRY",
             "operator": "data_pipeline_retry", "before_value": None, "after_value": "2026-06-05T10:00:00Z",
             "timezone_before": None, "timezone_after": "UTC", "remark": "任务重跑导致的二次导入"},
            {"source_record_id": source_ids[3], "process_type": "deduplicate", "process_batch": "BATCH-20260610-RETRY",
             "operator": "audit_bot", "before_value": "2026-06-05T10:00:00Z", "after_value": "2026-06-05T10:00:00Z",
             "timezone_before": "UTC", "timezone_after": "UTC", "remark": f"检测到与源记录 #{source_ids[2]} 重复"},
            {"source_record_id": source_ids[4], "process_type": "import", "process_batch": "BATCH-20260612-CLASS",
             "operator": "class_admin", "before_value": None, "after_value": "2026-06-15 09:00:00+00:00",
             "timezone_before": None, "timezone_after": "UTC", "remark": "课前数据导入"},
            {"source_record_id": source_ids[5], "process_type": "import", "process_batch": "BATCH-20260616-PAY",
             "operator": "payment_sync", "before_value": None, "after_value": "2026-06-16 16:45:30+08:00",
             "timezone_before": None, "timezone_after": "Asia/Shanghai", "remark": "支付流水同步"},
            {"source_record_id": source_ids[6], "process_type": "supplement", "process_batch": "BATCH-20260617-SUPP",
             "operator": "ops_support", "before_value": None, "after_value": "2026-06-16 18:00:00Z",
             "timezone_before": None, "timezone_after": "UTC", "remark": "缺失流水人工补录"},
        ]
        for p in process_data:
            db.add(models.ProcessLog(**p))

        conclusion_data = [
            {"source_record_id": source_ids[0], "dictionary_id": 1, "audit_type": "backup",
             "status": "pass", "conclusion": "时区字段校验通过, 登录时间 Asia/Shanghai 匹配字典",
             "index_valid": True, "is_duplicate": False, "auditor": "daily_check"},
            {"source_record_id": source_ids[1], "dictionary_id": 1, "audit_type": "backup",
             "status": "index_invalid", "conclusion": "快照补录后原始行号丢失, 索引失效, 无法唯一溯源",
             "index_valid": False, "is_duplicate": False, "auditor": "daily_check"},
            {"source_record_id": source_ids[2], "dictionary_id": 2, "audit_type": "backup",
             "status": "pass", "conclusion": "订单创建时间 UTC 符合预期",
             "index_valid": True, "is_duplicate": False, "auditor": "daily_check"},
            {"source_record_id": source_ids[3], "dictionary_id": 2, "audit_type": "backup",
             "status": "pass", "conclusion": "订单创建时间 UTC 符合预期",
             "index_valid": True, "is_duplicate": True, "duplicate_of_id": 3, "auditor": "daily_check"},
            {"source_record_id": source_ids[4], "dictionary_id": 3, "audit_type": "backup",
             "status": "timezone_mismatch", "conclusion": "课程开始时间期望 Asia/Shanghai, 实际 UTC",
             "index_valid": True, "is_duplicate": False, "auditor": "daily_check"},
            {"source_record_id": source_ids[5], "dictionary_id": 4, "audit_type": "backup",
             "status": "timezone_mismatch", "conclusion": "支付时间期望 UTC, 实际 Asia/Shanghai",
             "index_valid": True, "is_duplicate": False, "auditor": "daily_check"},
            {"source_record_id": source_ids[6], "dictionary_id": 4, "audit_type": "backup",
             "status": "pass", "conclusion": "补录支付时间 UTC 符合预期",
             "index_valid": True, "is_duplicate": False, "auditor": "daily_check"},
            {"source_record_id": source_ids[0], "dictionary_id": 1, "audit_type": "permission",
             "status": "pass", "conclusion": "导入批次 BATCH-20260601-01 已授权, 操作人 data_pipeline",
             "index_valid": True, "is_duplicate": False, "auditor": "security_review"},
            {"source_record_id": source_ids[2], "dictionary_id": 2, "audit_type": "permission",
             "status": "pass", "conclusion": "导入批次 BATCH-20260605-02 已授权",
             "index_valid": True, "is_duplicate": False, "auditor": "security_review"},
            {"source_record_id": source_ids[4], "dictionary_id": 3, "audit_type": "permission",
             "status": "pass", "conclusion": "课前导入 BATCH-20260612-CLASS 已授权",
             "index_valid": True, "is_duplicate": False, "auditor": "security_review"},
            {"source_record_id": source_ids[6], "dictionary_id": 4, "audit_type": "permission",
             "status": "pending", "conclusion": "补录批次 BATCH-20260617-SUPP 待人工复核",
             "index_valid": True, "is_duplicate": False, "auditor": None},
            {"source_record_id": source_ids[1], "dictionary_id": 1, "audit_type": "timezone",
             "status": "index_invalid", "conclusion": "快照补录原始行号丢失, 无法对比时区一致性",
             "index_valid": False, "is_duplicate": False, "auditor": "audit_bot"},
        ]
        for c in conclusion_data:
            db.add(models.AuditConclusion(**c))

        db.commit()
        print("示例数据导入完成!")
        print(f"  - 数据字典: {db.query(models.DataDictionary).count()} 条")
        print(f"  - 源记录: {db.query(models.SourceRecord).count()} 条 (含补录{db.query(models.SourceRecord).filter_by(is_supplement=True).count()}条)")
        print(f"  - 处理日志: {db.query(models.ProcessLog).count()} 条")
        print(f"  - 审计结论: {db.query(models.AuditConclusion).count()} 条")
        print("")
        print("验收提示:")
        print("  - 索引失效记录: source_record_id =", source_ids[1], ", conclusion_id = 2, 12")
        print("  - 重复导入记录: source_record_id =", source_ids[3], ", duplicate_of_id = 3")
        print("  - 补录记录: source_record_id =", source_ids[1], source_ids[6])
        print("  - 时区不匹配: source_record_id =", source_ids[4], source_ids[5])
    finally:
        db.close()


if __name__ == "__main__":
    seed()
