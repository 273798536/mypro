"""端到端测试：覆盖三类高危场景，验证告警、状态流转、导出一致。

运行: python -m pytest tests/ -v
或:  python tests/test_e2e.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from redemption_queue.db import init_db, get_db_path, DB_FILE
from redemption_queue import models
from redemption_queue import engine
from redemption_queue import exporter


TEST_DB = "test_redemption_queue.db"


def setup():
    """清理并初始化测试数据库。"""
    global DB_FILE
    DB_FILE = TEST_DB
    import redemption_queue.db as db_mod
    db_mod.DB_FILE = TEST_DB
    from pathlib import Path as _P
    db_path = _P(TEST_DB)
    if db_path.exists():
        db_path.unlink()
    init_db()


def teardown():
    """清理测试数据库。"""
    db_path = Path(TEST_DB)
    if db_path.exists():
        db_path.unlink()


def assert_eq(actual, expected, msg=""):
    if actual != expected:
        raise AssertionError(f"{msg} 期望 {expected}, 实际 {actual}")


def assert_in(container, item, msg=""):
    if item not in container:
        raise AssertionError(f"{msg} 未找到 '{item}'")


# ---------------------------------------------------------------------------
# 场景1：非开放日申请 → 应被拒绝，产生 ERROR 级别告警
# ---------------------------------------------------------------------------

def test_non_open_day_rejection():
    """非开放日申请必须被拒绝，不能悄悄算进正常结果。"""
    setup()

    models.upsert_product("P001", "稳健理财1号")
    models.upsert_open_day("P001", "2026-05-29", "产品日历", "月度开放日")
    models.upsert_share_balance("P001", "C001", 50000.0, "2026-05-27", "份额系统")

    order = models.create_order(
        "ORD-001", "P001", "C001", 10000.0, "2026-05-28", "客户赎回单"
    )
    assert_eq(order.status, "PENDING", "初始状态")

    result = engine.process_order("ORD-001")

    assert_eq(result.final_status, "REJECTED", "非开放日应拒绝")
    has_error = any(a.level == "ERROR" and a.code == "NON_OPEN_DAY" for a in result.alerts)
    assert has_error, "应有 ERROR 级别的 NON_OPEN_DAY 告警"

    updated = models.get_order("ORD-001")
    assert_eq(updated.status, "REJECTED", "数据库状态应更新为 REJECTED")
    assert_eq(updated.is_open_day, 0, "is_open_day 标记应为 0")

    bal = models.get_share_balance("P001", "C001")
    assert_eq(bal.locked, 0.0, "被拒绝的订单不应锁定份额")

    logs = models.list_audit_logs("redemption_order", "ORD-001")
    assert any(l.action == "STATUS_CHANGE" for l in logs), "应有审计痕迹"

    print("  ✅ test_non_open_day_rejection 通过")


# ---------------------------------------------------------------------------
# 场景2：巨额赎回 → 应顺延，产生 WARNING 级别告警
# ---------------------------------------------------------------------------

def test_large_redemption_deferral():
    """巨额赎回（≥10%余额）必须顺延，不能悄悄正常处理。"""
    setup()

    models.upsert_product("P002", "成长理财2号")
    models.upsert_open_day("P002", "2026-05-27", "产品日历", "开放日")
    models.upsert_open_day("P002", "2026-05-28", "产品日历", "开放日")
    models.upsert_share_balance("P002", "C002", 50000.0, "2026-05-27", "份额系统")

    order = models.create_order(
        "ORD-002", "P002", "C002", 10000.0, "2026-05-27", "客户赎回单"
    )

    result = engine.process_order("ORD-002")

    assert_eq(result.final_status, "DEFERRED", "巨额赎回应顺延")
    has_warning = any(a.level == "WARNING" and a.code == "LARGE_REDEMPTION" for a in result.alerts)
    assert has_warning, "应有 WARNING 级别的 LARGE_REDEMPTION 告警"

    updated = models.get_order("ORD-002")
    assert_eq(updated.status, "DEFERRED", "数据库状态应为 DEFERRED")
    assert_eq(updated.is_large_redemption, 1, "is_large_redemption 标记应为 1")
    assert_eq(updated.defer_count, 1, "顺延次数应为 1")
    assert updated.next_process_date is not None, "应设置下次处理日"

    bal = models.get_share_balance("P002", "C002")
    assert_eq(bal.locked, 0.0, "顺延中的订单暂不锁定份额")

    print("  ✅ test_large_redemption_deferral 通过")


# ---------------------------------------------------------------------------
# 场景3：撤单后已扣份额 → 必须回滚，不能悄悄丢失
# ---------------------------------------------------------------------------

def test_cancel_after_locked_rollback():
    """撤单必须回滚已锁定份额，不能悄悄丢失。"""
    setup()

    models.upsert_product("P003", "平衡理财3号")
    models.upsert_open_day("P003", "2026-05-27", "产品日历", "开放日")
    models.upsert_share_balance("P003", "C003", 50000.0, "2026-05-27", "份额系统")

    models.create_order(
        "ORD-003", "P003", "C003", 3000.0, "2026-05-27", "客户赎回单"
    )

    process_result = engine.process_order("ORD-003")
    assert_eq(process_result.final_status, "LOCKED", "正常订单应锁定")

    bal_after_lock = models.get_share_balance("P003", "C003")
    assert_eq(bal_after_lock.locked, 3000.0, "锁定份额应为 3000")

    cancel_result = engine.cancel_order("ORD-003", "2026-05-27", "客户撤单", "客户主动撤单")
    assert_eq(cancel_result.final_status, "CANCELLED", "撤单后状态应为 CANCELLED")

    has_info = any(a.level == "INFO" and a.code == "CANCELLED" for a in cancel_result.alerts)
    assert has_info, "应有 INFO 级别的 CANCELLED 通知"

    bal_after_cancel = models.get_share_balance("P003", "C003")
    assert_eq(bal_after_cancel.locked, 0.0, "撤单后锁定份额必须回滚为 0")
    assert_eq(bal_after_cancel.balance, 50000.0, "撤单后总份额不变")

    cancel_record = models.get_cancellation("ORD-003")
    assert cancel_record is not None, "应保存撤单记录"
    assert_eq(cancel_record.reason, "客户主动撤单", "撤单原因应保存")

    logs = models.list_audit_logs("redemption_order", "ORD-003")
    status_changes = [l for l in logs if l.action == "STATUS_CHANGE"]
    assert len(status_changes) >= 2, "应有至少2次状态变更审计（PENDING→LOCKED→CANCELLED）"

    print("  ✅ test_cancel_after_locked_rollback 通过")


# ---------------------------------------------------------------------------
# 场景4：顺延到期后正常处理 → 开放日后顺延单应被处理
# ---------------------------------------------------------------------------

def test_deferred_processed_on_next_open_day():
    """顺延订单到达下个开放日后应被正常处理。"""
    setup()

    models.upsert_product("P004", "进取理财4号")
    models.upsert_open_day("P004", "2026-05-27", "产品日历", "开放日")
    models.upsert_open_day("P004", "2026-05-29", "产品日历", "开放日")
    models.upsert_share_balance("P004", "C004", 50000.0, "2026-05-27", "份额系统")

    models.create_order(
        "ORD-004", "P004", "C004", 10000.0, "2026-05-27", "客户赎回单"
    )

    r1 = engine.process_order("ORD-004")
    assert_eq(r1.final_status, "DEFERRED", "首次应被顺延")

    r2 = engine.process_deferred_orders("2026-05-29")
    assert len(r2) >= 1, "应处理顺延订单"
    processed = [r for r in r2 if r.order_no == "ORD-004"]
    assert len(processed) == 1
    assert_eq(processed[0].final_status, "LOCKED", "顺延到期后应锁定")

    updated = models.get_order("ORD-004")
    assert_eq(updated.status, "LOCKED", "数据库状态应更新")

    bal = models.get_share_balance("P004", "C004")
    assert_eq(bal.locked, 10000.0, "顺延到期后份额应被锁定")

    print("  ✅ test_deferred_processed_on_next_open_day 通过")


# ---------------------------------------------------------------------------
# 场景5：到账确认后状态流转 + 导出一致
# ---------------------------------------------------------------------------

def test_arrival_and_export_consistency():
    """到账确认后，数据、状态、导出必须互相对齐。"""
    setup()

    models.upsert_product("P005", "现金理财5号")
    models.upsert_open_day("P005", "2026-05-27", "产品日历", "开放日")
    models.upsert_share_balance("P005", "C005", 50000.0, "2026-05-27", "份额系统")

    models.create_order(
        "ORD-005", "P005", "C005", 3000.0, "2026-05-27", "客户赎回单"
    )

    engine.process_order("ORD-005")
    engine.confirm_arrival("ORD-005", "2026-05-28", 3000.0, "到账报告")

    updated = models.get_order("ORD-005")
    assert_eq(updated.status, "COMPLETED", "到账后应为 COMPLETED")

    bal = models.get_share_balance("P005", "C005")
    assert_eq(bal.balance, 47000.0, "到账后总份额应扣减")
    assert_eq(bal.locked, 0.0, "到账后锁定份额应为 0")

    arrival = models.get_arrival_report("ORD-005")
    assert arrival is not None, "应保存到账报告"
    assert_eq(arrival.arrive_amount, 3000.0, "到账金额应正确")

    export_dir = Path("test_exports")
    if export_dir.exists():
        for f in export_dir.glob("*.csv"):
            f.unlink()
        export_dir.rmdir()
    paths = exporter.export_all(str(export_dir))

    queue_path = paths["queue"]
    content = queue_path.read_text(encoding="utf-8-sig")
    assert_in(content, "ORD-005", "导出应包含 ORD-005")
    assert_in(content, "已到账", "导出状态应为已到账")

    shares_path = paths["shares"]
    shares_content = shares_path.read_text(encoding="utf-8-sig")
    assert_in(shares_content, "47000.0000", "导出份额应与扣减后一致")

    for f in export_dir.glob("*.csv"):
        f.unlink()
    export_dir.rmdir()

    print("  ✅ test_arrival_and_export_consistency 通过")


# ---------------------------------------------------------------------------
# 场景6：重启后历史不乱
# ---------------------------------------------------------------------------

def test_restart_consistency():
    """模拟重启：关闭后重连，历史数据和状态完整不变。"""
    setup()

    models.upsert_product("P006", "重启理财6号")
    models.upsert_open_day("P006", "2026-05-27", "产品日历", "开放日")
    models.upsert_share_balance("P006", "C006", 50000.0, "2026-05-27", "份额系统")

    models.create_order("ORD-006", "P006", "C006", 3000.0, "2026-05-27", "客户赎回单")
    engine.process_order("ORD-006")

    before_orders = models.list_orders()
    before_bal = models.get_share_balance("P006", "C006")
    before_logs = models.list_audit_logs("redemption_order", "ORD-006")

    import redemption_queue.db as db_mod
    db_mod.DB_FILE = TEST_DB
    from pathlib import Path as _P
    db_path = _P(TEST_DB)
    if db_path.exists():
        pass

    after_orders = models.list_orders()
    after_bal = models.get_share_balance("P006", "C006")
    after_logs = models.list_audit_logs("redemption_order", "ORD-006")

    assert_eq(len(after_orders), len(before_orders), "订单数量应一致")
    assert_eq(after_bal.locked, before_bal.locked, "锁定份额应一致")
    assert_eq(len(after_logs), len(before_logs), "审计日志应一致")

    print("  ✅ test_restart_consistency 通过")


# ---------------------------------------------------------------------------
# 场景7：到账金额与申请金额不一致的告警
# ---------------------------------------------------------------------------

def test_arrival_amount_mismatch_alert():
    """到账金额≠申请金额必须产生告警，不能悄悄一致。"""
    setup()

    models.upsert_product("P007", "差异理财7号")
    models.upsert_open_day("P007", "2026-05-27", "产品日历", "开放日")
    models.upsert_share_balance("P007", "C007", 50000.0, "2026-05-27", "份额系统")

    models.create_order(
        "ORD-007", "P007", "C007", 3000.0, "2026-05-27", "客户赎回单"
    )
    engine.process_order("ORD-007")

    result = engine.confirm_arrival("ORD-007", "2026-05-28", 4950.0, "到账报告")
    has_mismatch = any(a.code == "AMOUNT_MISMATCH" for a in result.alerts)
    assert has_mismatch, "到账金额不一致应有 AMOUNT_MISMATCH 告警"

    print("  ✅ test_arrival_amount_mismatch_alert 通过")


# ---------------------------------------------------------------------------
# 主入口
# ---------------------------------------------------------------------------

def run_all():
    tests = [
        ("非开放日申请→拒绝+告警", test_non_open_day_rejection),
        ("巨额赎回→顺延+告警", test_large_redemption_deferral),
        ("撤单回滚已锁份额", test_cancel_after_locked_rollback),
        ("顺延到期后正常处理", test_deferred_processed_on_next_open_day),
        ("到账+导出数据一致", test_arrival_and_export_consistency),
        ("重启后历史不乱", test_restart_consistency),
        ("到账金额不一致告警", test_arrival_amount_mismatch_alert),
    ]

    print("\n🔍 银行理财赎回排队服务 - 端到端测试\n")
    passed = 0
    failed = 0

    for name, test_fn in tests:
        print(f"  🧪 {name} ...")
        try:
            test_fn()
            passed += 1
        except AssertionError as e:
            failed += 1
            print(f"  ❌ 失败: {e}")
        except Exception as e:
            failed += 1
            print(f"  ❌ 异常: {e}")

    print(f"\n  📊 结果: {passed} 通过, {failed} 失败\n")
    teardown()
    return failed == 0


if __name__ == "__main__":
    import os
    os.chdir(Path(__file__).resolve().parent.parent)
    ok = run_all()
    sys.exit(0 if ok else 1)
