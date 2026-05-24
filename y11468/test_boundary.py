#!/usr/bin/env python3
"""
边界测试脚本：
1. 跨日/跨批次数据隔离
2. 状态冻结后修改保护
3. 坏数据隔离机制
"""
import sys
import json
from datetime import datetime, timedelta

from app.database import SessionLocal, init_db
from app.services import (
    StyleOrderService, FabricService, SizeModificationService,
    ScanService, ReplayService, UserService
)
from app.models import FabricAction, OrderStatus

init_db()


def test_cross_batch_isolation():
    """测试跨批次数据隔离"""
    print("\n" + "=" * 60)
    print("测试 1: 跨批次数据隔离")
    print("=" * 60)
    
    db = SessionLocal()
    UserService.init_default_users(db)
    operator = "entry_clerk"
    supervisor = "supervisor_wang"
    
    try:
        order_data_1 = {
            "order_no": "SO202405_A001",
            "style_code": "STYLE_A001",
            "style_name": "A批次连衣裙",
            "batch_no": "BATCH202405_A"
        }
        order_1 = StyleOrderService.create(db, order_data_1, operator)
        
        FabricService.add_transaction(db, order_1.id, {
            "fabric_code": "FAB_A001",
            "fabric_name": "A批次面料",
            "action": FabricAction.IN,
            "quantity": 200.0,
            "warehouse": "A仓"
        }, operator)
        
        FabricService.add_transaction(db, order_1.id, {
            "fabric_code": "FAB_A001",
            "fabric_name": "A批次面料",
            "action": FabricAction.OUT,
            "quantity": 50.0,
            "warehouse": "A仓"
        }, supervisor)
        
        order_data_2 = {
            "order_no": "SO202405_B001",
            "style_code": "STYLE_B001",
            "style_name": "B批次连衣裙",
            "batch_no": "BATCH202405_B"
        }
        order_2 = StyleOrderService.create(db, order_data_2, operator)
        
        FabricService.add_transaction(db, order_2.id, {
            "fabric_code": "FAB_A001",
            "fabric_name": "B批次面料",
            "action": FabricAction.IN,
            "quantity": 150.0,
            "warehouse": "B仓"
        }, operator)
        
        balance_1 = FabricService.get_fabric_balance(db, "FAB_A001", order_1.id)
        balance_2 = FabricService.get_fabric_balance(db, "FAB_A001", order_2.id)
        total_balance = FabricService.get_fabric_balance(db, "FAB_A001")
        
        print(f"批次A库存: {balance_1}m (期望: 150m)")
        print(f"批次B库存: {balance_2}m (期望: 150m)")
        print(f"总库存: {total_balance}m (期望: 300m)")
        
        assert balance_1 == 150.0, f"批次A库存错误: {balance_1}"
        assert balance_2 == 150.0, f"批次B库存错误: {balance_2}"
        assert total_balance == 300.0, f"总库存错误: {total_balance}"
        
        db.commit()
        print("✓ 跨批次数据隔离测试通过")
        return True
        
    except AssertionError as e:
        db.rollback()
        print(f"✗ 测试失败: {e}")
        return False
    finally:
        db.close()


def test_freeze_protection():
    """测试冻结后修改保护"""
    print("\n" + "=" * 60)
    print("测试 2: 状态冻结后修改保护")
    print("=" * 60)
    
    db = SessionLocal()
    UserService.init_default_users(db)
    operator = "entry_clerk"
    supervisor = "supervisor_wang"
    
    try:
        order_data = {
            "order_no": "SO_FREEZE_TEST",
            "style_code": "STYLE_FREEZE",
            "style_name": "冻结测试款",
            "batch_no": "BATCH_FREEZE"
        }
        order = StyleOrderService.create(db, order_data, operator)
        order_id = order.id
        
        FabricService.add_transaction(db, order.id, {
            "fabric_code": "FAB_FREEZE",
            "fabric_name": "冻结测试面料",
            "action": FabricAction.IN,
            "quantity": 100.0
        }, operator)
        
        order = StyleOrderService.freeze(db, order.id, supervisor)
        assert order.status == OrderStatus.FROZEN, "冻结状态设置失败"
        print(f"订单已冻结: {order.status.value}")
        
        try:
            StyleOrderService.update(db, order_id, {"style_name": "非法修改"}, operator)
            print("✗ 错误: 冻结订单被修改了!")
            db.rollback()
            return False
        except ValueError as e:
            print(f"✓ 正确拦截修改: {e}")
        
        tx = FabricService.add_transaction(db, order_id, {
            "fabric_code": "FAB_FREEZE",
            "action": FabricAction.OUT,
            "quantity": 10.0
        }, operator)
        
        if tx is not None:
            print("✗ 错误: 冻结订单添加了面料交易!")
            db.rollback()
            return False
        else:
            print("✓ 正确拦截冻结订单的面料交易")
        
        db.commit()
        print("✓ 冻结保护测试通过")
        return True
        
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"✗ 测试异常: {e}")
        return False
    finally:
        db.close()


def test_bad_data_isolation():
    """测试坏数据隔离机制"""
    print("\n" + "=" * 60)
    print("测试 3: 坏数据隔离机制")
    print("=" * 60)
    
    db = SessionLocal()
    UserService.init_default_users(db)
    operator = "entry_clerk"
    supervisor = "supervisor_wang"
    
    try:
        order_data = {
            "order_no": "SO_BADDATA_TEST",
            "style_code": "STYLE_BADDATA",
            "style_name": "坏数据测试款",
            "batch_no": "BATCH_BADDATA"
        }
        order = StyleOrderService.create(db, order_data, operator)
        
        FabricService.add_transaction(db, order.id, {
            "fabric_code": "FAB_BAD",
            "fabric_name": "坏数据测试面料",
            "action": FabricAction.IN,
            "quantity": 50.0
        }, operator)
        
        scan_data = [
            {"scan_code": "GOOD001", "style_order_id": order.id, "fabric_code": "FAB_BAD", "quantity": 10},
            {"scan_code": "BAD001", "style_order_id": order.id, "fabric_code": "FAB_BAD", "quantity": 100},
            {"scan_code": "BAD002", "style_order_id": 99999, "fabric_code": "FAB_BAD", "quantity": 5},
            {"scan_code": "GOOD002", "style_order_id": order.id, "fabric_code": "FAB_BAD", "quantity": 15}
        ]
        
        result = ScanService.import_scan(db, scan_data, supervisor, "boundary_test")
        print(f"导入结果: 成功={result['success']}, 失败={result['failed']}")
        
        from app.models import ScanRecord, FailedRecord
        valid_scans = db.query(ScanRecord).filter(
            ScanRecord.style_order_id == order.id,
            ScanRecord.is_valid == True
        ).count()
        
        failed_records = db.query(FailedRecord).filter(
            FailedRecord.source == "boundary_test"
        ).count()
        
        print(f"有效扫码记录: {valid_scans} (期望: 2)")
        print(f"失败记录: {failed_records} (期望: 2)")
        
        assert result['success'] == 2, f"成功数量错误: {result['success']}"
        assert result['failed'] == 2, f"失败数量错误: {result['failed']}"
        assert valid_scans == 2, f"有效记录错误: {valid_scans}"
        assert failed_records >= 2, f"失败记录不足: {failed_records}"
        
        balance = FabricService.get_fabric_balance(db, "FAB_BAD", order.id)
        print(f"面料库存: {balance}m (期望: 50m, 坏数据不影响汇总)")
        assert balance == 50.0, f"坏数据影响了汇总: {balance}"
        
        db.commit()
        print("✓ 坏数据隔离测试通过")
        return True
        
    except AssertionError as e:
        db.rollback()
        print(f"✗ 测试失败: {e}")
        return False
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"✗ 测试异常: {e}")
        return False
    finally:
        db.close()


def test_version_tracking():
    """测试多版本面料追踪"""
    print("\n" + "=" * 60)
    print("测试 4: 同一款多轮修改后面料版本追踪")
    print("=" * 60)
    
    db = SessionLocal()
    UserService.init_default_users(db)
    operator = "entry_clerk"
    supervisor = "supervisor_wang"
    
    try:
        order_data = {
            "order_no": "SO_VERSION_V1",
            "style_code": "STYLE_VERSION",
            "style_name": "多版本测试款 V1",
            "batch_no": "BATCH_VER_A"
        }
        order_v1 = StyleOrderService.create(db, order_data, operator)
        
        FabricService.add_transaction(db, order_v1.id, {
            "fabric_code": "FAB_VER",
            "fabric_name": "版本测试面料",
            "action": FabricAction.IN,
            "quantity": 100.0
        }, operator)
        
        FabricService.add_transaction(db, order_v1.id, {
            "fabric_code": "FAB_VER",
            "fabric_name": "版本测试面料",
            "action": FabricAction.OUT,
            "quantity": 30.0
        }, supervisor)
        
        order_v2 = StyleOrderService.create_new_version(db, order_v1.id, supervisor)
        
        FabricService.add_transaction(db, order_v2.id, {
            "fabric_code": "FAB_VER",
            "fabric_name": "版本测试面料",
            "action": FabricAction.OUT,
            "quantity": 20.0
        }, supervisor)
        
        balance_v1 = FabricService.get_fabric_balance(db, "FAB_VER", order_v1.id)
        balance_v2 = FabricService.get_fabric_balance(db, "FAB_VER", order_v2.id)
        
        print(f"V1版本库存: {balance_v1}m (期望: 70m)")
        print(f"V2版本库存: {balance_v2}m (期望: 50m)")
        
        diff = ReplayService.compare_versions(db, order_v1.id, order_v2.id)
        print(f"版本差异: V1({diff['order_v1']['version']}) -> V2({diff['order_v2']['version']})")
        print(f"面料差异: {diff['fabric_diff']['FAB_VER']['diff']:+}m")
        
        assert balance_v1 == 70.0, f"V1库存错误: {balance_v1}"
        assert balance_v2 == 50.0, f"V2库存错误: {balance_v2}"
        assert diff['fabric_diff']['FAB_VER']['diff'] == -20.0, "差异计算错误"
        
        db.commit()
        print("✓ 多版本面料追踪测试通过")
        return True
        
    except AssertionError as e:
        db.rollback()
        print(f"✗ 测试失败: {e}")
        return False
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"✗ 测试异常: {e}")
        return False
    finally:
        db.close()


def main():
    print("边界测试套件")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    results.append(("跨批次数据隔离", test_cross_batch_isolation()))
    results.append(("冻结保护", test_freeze_protection()))
    results.append(("坏数据隔离", test_bad_data_isolation()))
    results.append(("版本追踪", test_version_tracking()))
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {name}: {status}")
    
    print(f"\n总计: {passed}/{total} 通过")
    
    if passed == total:
        print("\n✓ 所有测试通过!")
        sys.exit(0)
    else:
        print("\n✗ 部分测试失败!")
        sys.exit(1)


if __name__ == "__main__":
    main()
