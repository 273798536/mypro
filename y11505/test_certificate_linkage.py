#!/usr/bin/env python3
"""复现证书过期联动巡检记录状态问题"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import init_db, SessionLocal
from app.core.constants import DuplicateStrategy, RecordStatus
from app.services import BatchService, ImportService
from app.schemas import BatchCreate
from app.models import InspectionRecord, CalibrationCertificate, Batch


def test_certificate_expiry_linkage():
    print("=" * 70)
    print("  测试：证书过期联动巡检记录状态")
    print("=" * 70)
    
    # 使用内存数据库测试
    from app.core.database import Base, engine
    Base.metadata.drop_all(bind=engine)
    init_db()
    
    db = SessionLocal()
    batch_service = BatchService(db)
    import_service = ImportService(db)
    
    # 创建批次
    batch_create = BatchCreate(
        batch_no="TEST-BATCH-001",
        name="测试批次-证书过期联动",
        department="测试科",
        operator="测试员",
        duplicate_strategy=DuplicateStrategy.OVERWRITE,
    )
    batch = batch_service.create_batch(batch_create)
    print(f"\n✓ 创建批次: {batch.batch_no}")
    
    yesterday = datetime.now() - timedelta(days=1)
    expired_date = yesterday - timedelta(days=30)
    
    # 导入巡检记录（正常）
    inspection_records = [
        {
            "record_no": "INSP-TEST-001",
            "device_code": "DEV-TEST-001",
            "device_name": "测试设备-过期证书联动",
            "inspection_date": "2024-01-15",
            "inspector": "测试员",
            "inspection_result": "正常",
        }
    ]
    
    # 导入同设备已过期的校准证书
    calibration_certificates = [
        {
            "certificate_no": "CERT-TEST-001",
            "device_code": "DEV-TEST-001",
            "device_name": "测试设备-过期证书联动",
            "calibration_agency": "测试计量所",
            "calibration_date": "2023-06-01",
            "effective_date": "2023-06-01",
            "expiry_date": expired_date.strftime("%Y-%m-%d"),
            "calibration_result": "合格",
        }
    ]
    
    print(f"\n导入数据（先巡检，后证书）:")
    print(f"  巡检记录: 1条（结果为正常）")
    print(f"  校准证书: 1条（已过期: {expired_date.strftime('%Y-%m-%d')}）")
    
    results = import_service.import_batch_data(
        batch=batch,
        inspection_records=inspection_records,
        calibration_certificates=calibration_certificates,
        repair_quotes=[],
        price_adjustments=[],
        operator="测试员",
    )
    
    batch_service.update_batch_stats(batch)
    
    print(f"\n导入结果:")
    print(f"  巡检记录: {results['inspection_records']}")
    print(f"  校准证书: {results['calibration_certificates']}")
    
    # 检查证书状态
    cert = db.query(CalibrationCertificate).filter(
        CalibrationCertificate.certificate_no == "CERT-TEST-001"
    ).first()
    print(f"\n证书状态:")
    print(f"  证书号: {cert.certificate_no}")
    print(f"  过期日期: {cert.expiry_date}")
    print(f"  是否已过期: {cert.is_expired}")
    
    # 检查巡检记录状态
    record = db.query(InspectionRecord).filter(
        InspectionRecord.record_no == "INSP-TEST-001"
    ).first()
    print(f"\n巡检记录状态:")
    print(f"  记录号: {record.record_no}")
    print(f"  设备: {record.device_name}")
    print(f"  巡检结果: {record.inspection_result}")
    print(f"  记录状态: {record.status}")
    print(f"  期望状态: {RecordStatus.CERTIFICATE_EXPIRED}")
    
    # 检查批次异常数
    print(f"\n批次统计:")
    print(f"  总记录数: {batch.record_count}")
    print(f"  异常数: {batch.abnormal_count}")
    print(f"  期望异常数: 1")
    
    # 验证结果
    test_passed = True
    
    if not cert.is_expired:
        print(f"\n✗ 失败: 证书状态未正确标记为过期")
        test_passed = False
    else:
        print(f"\n✓ 证书状态正确: 已过期")
    
    if record.status != RecordStatus.CERTIFICATE_EXPIRED:
        print(f"✗ 失败: 巡检记录状态未正确联动为 certificate_expired")
        print(f"  实际: {record.status}, 期望: {RecordStatus.CERTIFICATE_EXPIRED}")
        test_passed = False
    else:
        print(f"✓ 巡检记录状态正确: 已联动为 certificate_expired")
    
    if batch.abnormal_count != 1:
        print(f"✗ 失败: 批次异常数未正确统计")
        print(f"  实际: {batch.abnormal_count}, 期望: 1")
        test_passed = False
    else:
        print(f"✓ 批次异常数正确: {batch.abnormal_count}")
    
    db.close()
    
    if test_passed:
        print(f"\n{'=' * 70}")
        print("  ✓ 测试通过！证书过期已正确联动到巡检记录")
        print(f"{'=' * 70}")
        return 0
    else:
        print(f"\n{'=' * 70}")
        print("  ✗ 测试失败！证书过期联动存在问题")
        print(f"{'=' * 70}")
        return 1


if __name__ == "__main__":
    sys.exit(test_certificate_expiry_linkage())
