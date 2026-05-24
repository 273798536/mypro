#!/usr/bin/env python3
"""
验证修复的功能：
1. 手工改价表脱敏不崩溃
2. 核心追责台账逻辑
"""
import sys
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.price_adjustment import PriceAdjustment
from app.models.inspection import InspectionRecord
from app.models.rework import ReworkOrder
from app.models.machine_shift import MachineShift
from app.models.states import RecordStatus
from app.services.traceability import TraceabilityService
from app.api.price import _enrich_response_dict

def test_1_mask_sensitive_price():
    """测试1: 手工改价表脱敏不崩溃"""
    print("\n=== 测试1: 手工改价表脱敏 ===")
    db = SessionLocal()
    
    try:
        pa = PriceAdjustment(
            adjustment_no="PA-TEST-001",
            batch_no="BATCH-TEST-001",
            original_price=100.5,
            adjusted_price=95.0,
            price_difference=5.5,
            status=RecordStatus.DRAFT,
        )
        db.add(pa)
        db.commit()
        db.refresh(pa)
        
        operator = db.query(User).filter(User.role == UserRole.OPERATOR).first()
        manager = db.query(User).filter(User.role == UserRole.PRODUCTION_MANAGER).first()
        
        # 操作员访问 - 应该脱敏
        result_op = _enrich_response_dict(pa, db, operator)
        assert result_op["original_price"] == "***", f"操作员应该看到脱敏，实际: {result_op['original_price']}"
        assert result_op["adjusted_price"] == "***", "操作员应该看到脱敏"
        assert result_op["price_difference"] == "***", "操作员应该看到脱敏"
        assert result_op["is_masked"] == True, "应该标记为已脱敏"
        print("✅ 操作员访问: 价格字段正确脱敏为 '***'")
        
        # 生产经理访问 - 应该看到明文
        result_mgr = _enrich_response_dict(pa, db, manager)
        assert result_mgr["original_price"] == 100.5, f"经理应该看到明文，实际: {result_mgr['original_price']}"
        assert result_mgr["is_masked"] == False, "不应该标记为脱敏"
        print("✅ 生产经理访问: 看到明文字段")
        
        print("✅ 脱敏测试通过，无崩溃!")
        return True
    except Exception as e:
        print(f"❌ 脱敏测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_2_traceability_batch():
    """测试2: 批次追责链条"""
    print("\n=== 测试2: 批次追责链条 ===")
    db = SessionLocal()
    
    try:
        batch_no = "BATCH-TRACE-001"
        
        from datetime import date
        shift = MachineShift(
            machine_id="M001",
            shift_name="早班",
            shift_date=date.today(),
            total_output=1000,
            defect_output=50,
        )
        db.add(shift)
        db.commit()
        db.refresh(shift)
        
        insp = InspectionRecord(
            batch_no=batch_no,
            sample_size=100,
            defect_count=5,
            pass_count=95,
            yield_rate=95.0,
            original_yield_rate=95.0,
            machine_id="M001",
            shift_id=shift.id,
            status=RecordStatus.SUBMITTED,
        )
        db.add(insp)
        db.commit()
        db.refresh(insp)
        
        rw = ReworkOrder(
            rework_no="RW-001",
            batch_no=batch_no,
            rework_count=10,
            rework_pass_count=8,
            rework_fail_count=2,
            rework_times=1,
            responsible_shift_id=shift.id,
            status=RecordStatus.SUBMITTED,
        )
        db.add(rw)
        db.commit()
        
        result = TraceabilityService.get_batch_traceability(db, batch_no)
        
        assert result["batch_no"] == batch_no
        assert len(result["inspections"]) == 1, f"应该有1条抽检，实际: {len(result['inspections'])}"
        assert len(result["reworks"]) == 1, f"应该有1条返工，实际: {len(result['reworks'])}"
        assert len(result["shifts"]) == 1, f"应该有1个班次，实际: {len(result['shifts'])}"
        assert result["cross_validation"]["is_consistent"] == True, "一致性校验应该通过"
        assert len(result["responsibility_chain"]) > 0, "应该有责任链条"
        
        print(f"✅ 批次 {batch_no} 追责链条:")
        print(f"  - 抽检数: {len(result['inspections'])}")
        print(f"  - 返工单数: {len(result['reworks'])}")
        print(f"  - 班次: {len(result['shifts'])}")
        print(f"  - 一致性校验: {'通过' if result['cross_validation']['is_consistent'] else '失败'}")
        print(f"  - 责任链条数: {len(result['responsibility_chain'])}")
        return True
    except Exception as e:
        print(f"❌ 批次追责测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_3_risk_detection():
    """测试3: 重复返工风险检测"""
    print("\n=== 测试3: 重复返工风险检测 ===")
    db = SessionLocal()
    
    try:
        result = TraceabilityService.detect_rework_risk(db, days=30, rework_threshold=2)
        
        assert "summary" in result
        assert "high_risk_batches" in result
        assert "top_defect_types" in result
        assert "rework_trend" in result
        
        print(f"✅ 风险检测结果:")
        print(f"  - 分析天数: {result['analysis_period_days']}")
        print(f"  - 总返工数: {result['summary']['total_reworks']}")
        print(f"  - 高风险批次: {result['summary']['high_risk_batches']}")
        print(f"  - 高风险机台: {result['summary']['high_risk_machines']}")
        return True
    except Exception as e:
        print(f"❌ 风险检测测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_4_shift_report():
    """测试4: 责任班次报告"""
    print("\n=== 测试4: 责任班次追责报告 ===")
    db = SessionLocal()
    
    try:
        result = TraceabilityService.get_shift_responsibility_report(db)
        
        assert "period" in result
        assert "total_shifts" in result
        assert "shifts" in result
        
        if result["shifts"]:
            shift = result["shifts"][0]
            assert "risk_indicators" in shift
            assert "risk_score" in shift["risk_indicators"]
            assert "risk_level" in shift["risk_indicators"]
            
            print(f"✅ 班次报告结果:")
            print(f"  - 总班次: {result['total_shifts']}")
            print(f"  - 首个班次风险: {shift['risk_indicators']['risk_level']} (分数: {shift['risk_indicators']['risk_score']})")
            print(f"  - 风险因素: {shift['risk_indicators']['risk_factors']}")
        else:
            print("  - 暂无班次数据")
        
        return True
    except Exception as e:
        print(f"❌ 班次报告测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_5_yield_integrity():
    """测试5: 良率完整性校验"""
    print("\n=== 测试5: 良率完整性校验 ===")
    db = SessionLocal()
    
    try:
        result = TraceabilityService.get_yield_integrity_check(db, days=30)
        
        assert "summary" in result
        assert "suspicious_changes" in result
        assert "integrity_score" in result
        
        print(f"✅ 完整性校验结果:")
        print(f"  - 总字段变更: {result['summary']['total_field_changes']}")
        print(f"  - 可疑变更: {result['summary']['suspicious_changes']}")
        print(f"  - 人工改判: {result['summary']['manual_changes']}")
        print(f"  - 完整性分数: {result['integrity_score']}/100")
        return True
    except Exception as e:
        print(f"❌ 完整性校验测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("修复功能验证测试")
    print("=" * 60)
    
    tests = [
        test_1_mask_sensitive_price,
        test_2_traceability_batch,
        test_3_risk_detection,
        test_4_shift_report,
        test_5_yield_integrity,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)
    
    sys.exit(0 if failed == 0 else 1)
