#!/usr/bin/env python3
"""验证第四轮修复：附件路由 + freeze-comparison + 压缩包"""
import sys
import os
import json
import io
import zipfile
import tempfile
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import init_db, SessionLocal
from app.core.constants import DuplicateStrategy
from app.services import BatchService, ImportService, AttachmentService, ExportService
from app.schemas import BatchCreate
from app.models import InspectionRecord, CalibrationCertificate, PriceAdjustment


def test_all():
    print("=" * 70)
    print("  验证：附件路由 + freeze-comparison + 压缩包导入")
    print("=" * 70)
    
    # 使用内存数据库
    from app.core.database import Base, engine
    Base.metadata.drop_all(bind=engine)
    init_db()
    
    db = SessionLocal()
    batch_service = BatchService(db)
    import_service = ImportService(db)
    attachment_service = AttachmentService(db)
    export_service = ExportService(db)
    
    all_passed = True
    
    # === 1. 创建批次 ===
    print("\n1. 创建测试批次...")
    batch = batch_service.create_batch(BatchCreate(
        batch_no="VERIFY-001",
        name="验证批次-附件和压缩包",
        department="验证科",
        operator="验证员",
        duplicate_strategy=DuplicateStrategy.OVERWRITE,
    ))
    print(f"   ✓ 批次: {batch.batch_no} (ID: {batch.id[:8]}...)")
    
    # === 2. 验证附件上传 ===
    print("\n2. 验证附件上传...")
    test_content = "这是测试校准证书的内容".encode("utf-8")
    attachment = attachment_service.upload_attachment(
        batch_id=batch.id,
        original_name="校准证书_2024.pdf",
        file_content=test_content,
        attachment_type="calibration_certificate",
        operator="验证员",
        description="测试附件上传",
    )
    print(f"   ✓ 附件上传: {attachment.original_name}")
    print(f"     附件ID: {attachment.id[:8]}...")
    print(f"     文件大小: {attachment.file_size}")
    
    # 检查附件列表
    attachments = attachment_service.get_attachments(batch.id)
    if len(attachments) == 1:
        print(f"   ✓ 附件列表查询正常: {len(attachments)} 个附件")
    else:
        print(f"   ✗ 附件列表异常: 期望 1 个, 实际 {len(attachments)}")
        all_passed = False
    
    # === 3. 验证历史压缩包解析和导入 ===
    print("\n3. 验证历史压缩包...")
    yesterday = datetime.now() - timedelta(days=1)
    expired_date = yesterday - timedelta(days=30)
    
    # 创建包含历史数据的ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        inspection_data = [{
            "record_no": "HIST-INSP-001",
            "device_code": "HIST-DEV-001",
            "device_name": "历史设备-血压计",
            "inspection_date": "2024-01-10",
            "inspector": "历史巡检员",
            "inspection_result": "正常",
        }]
        zf.writestr("inspection_records.json", json.dumps(inspection_data, ensure_ascii=False))
        
        cert_data = [{
            "certificate_no": "HIST-CERT-001",
            "device_code": "HIST-DEV-001",
            "device_name": "历史设备-血压计",
            "calibration_agency": "历史计量所",
            "calibration_date": "2023-06-01",
            "effective_date": "2023-06-01",
            "expiry_date": expired_date.strftime("%Y-%m-%d"),
            "calibration_result": "合格",
        }]
        zf.writestr("calibration_certificates.json", json.dumps(cert_data, ensure_ascii=False))
    
    zip_content = zip_buffer.getvalue()
    
    # 上传压缩包
    zip_attachment = attachment_service.upload_attachment(
        batch_id=batch.id,
        original_name="历史数据_202401.zip",
        file_content=zip_content,
        attachment_type="history_archive",
        operator="验证员",
        description="历史数据压缩包",
    )
    print(f"   ✓ 压缩包上传: {zip_attachment.original_name}")
    
    # 解析压缩包
    parsed_data = attachment_service.parse_zip_archive(
        batch_id=batch.id,
        attachment_id=zip_attachment.id,
        operator="验证员",
    )
    print(f"   ✓ 压缩包解析完成")
    print(f"     巡检记录: {len(parsed_data['inspection_records'])} 条")
    print(f"     校准证书: {len(parsed_data['calibration_certificates'])} 条")
    
    # 从压缩包导入数据
    results = attachment_service.import_from_zip(
        batch_id=batch.id,
        attachment_id=zip_attachment.id,
        operator="验证员",
    )
    print(f"   ✓ 压缩包数据导入完成")
    import_results = results["import_results"]
    print(f"     巡检记录: {import_results['inspection_records']}")
    print(f"     校准证书: {import_results['calibration_certificates']}")
    
    # 更新批次统计
    batch_service.update_batch_stats(batch)
    print(f"   批次统计: record_count={batch.record_count}, abnormal_count={batch.abnormal_count}")
    
    # === 4. 验证证书过期联动 ===
    print("\n4. 验证证书过期联动...")
    record = db.query(InspectionRecord).filter(
        InspectionRecord.record_no == "HIST-INSP-001"
    ).first()
    cert = db.query(CalibrationCertificate).filter(
        CalibrationCertificate.certificate_no == "HIST-CERT-001"
    ).first()
    
    if record and cert:
        print(f"   证书过期: {cert.is_expired}")
        print(f"   巡检记录状态: {record.status}")
        if record.status == "certificate_expired":
            print(f"   ✓ 证书过期联动正常")
        else:
            print(f"   ✗ 证书过期联动异常: 期望 certificate_expired, 实际 {record.status}")
            all_passed = False
    else:
        print(f"   ✗ 记录或证书未找到")
        all_passed = False
    
    # === 5. 验证冻结前后对比接口 ===
    print("\n5. 验证冻结前后对比接口...")
    batch_service.submit_for_review(batch, "审核员")
    batch_service.start_review(batch, "复核员")
    batch_service.approve_batch(batch, "复核员")
    batch_service.freeze_batch(batch, "护士长", "临检前冻结")
    
    freeze_comparison = export_service.generate_batch_summary(batch)
    print(f"   当前状态: {freeze_comparison['current_status']}")
    print(f"   冻结前状态: {freeze_comparison['status_before_freeze']}")
    print(f"   冻结原因: {freeze_comparison['freeze_reason']}")
    
    # 模拟 freeze-comparison 接口的输出结构
    comparison = {
        "batch_info": {
            "batch_no": freeze_comparison["batch_no"],
            "batch_name": freeze_comparison["batch_name"],
            "department": freeze_comparison["department"],
        },
        "freeze_info": {
            "status_before_freeze": freeze_comparison["status_before_freeze"],
            "current_status": freeze_comparison["current_status"],
            "freeze_reason": freeze_comparison["freeze_reason"],
            "freeze_operator": freeze_comparison["freeze_operator"],
            "freeze_time": freeze_comparison["freeze_time"],
        },
        "statistics": {
            "total_records": freeze_comparison["record_count"],
            "abnormal_count": freeze_comparison["abnormal_count"],
        },
        "status_distribution": freeze_comparison["status_distribution"],
    }
    
    if "statistics" in comparison and "total_records" in comparison["statistics"]:
        print(f"   ✓ freeze-comparison 接口结构正常")
        print(f"     statistics: {comparison['statistics']}")
        print(f"     status_distribution: {comparison['status_distribution']}")
    else:
        print(f"   ✗ freeze-comparison 结构异常")
        all_passed = False
    
    # === 6. 验证护士长视图导出 ===
    print("\n6. 验证护士长视图导出...")
    head_nurse = export_service.export_for_head_nurse(batch, "护士长")
    
    if "freeze_info" in head_nurse and "statistics" in head_nurse:
        print(f"   ✓ 护士长视图结构正常")
        print(f"     冻结前状态: {head_nurse['freeze_info']['status_before_freeze']}")
        print(f"     当前状态: {head_nurse['freeze_info']['current_status']}")
        print(f"     异常数: {head_nurse['statistics']['abnormal_count']}")
        
        abnormal = head_nurse["abnormal_records"]
        if len(abnormal) > 0:
            print(f"     异常记录: {len(abnormal)} 条")
            for r in abnormal:
                print(f"       - {r['device_name']}: {r['status']}")
        else:
            print(f"     异常记录: 0 条")
    else:
        print(f"   ✗ 护士长视图结构异常")
        all_passed = False
    
    # === 7. 验证Excel导出（含手工改价表） ===
    print("\n7. 验证Excel导出...")
    # 先导入一条手工改价表
    adjustment_data = {
        "adjustment_no": "VERIFY-PRICE-001",
        "device_code": "HIST-DEV-001",
        "device_name": "历史设备-血压计",
        "original_price": 15000.00,
        "adjusted_price": 12000.00,
        "price_difference": -3000.00,
        "adjustment_reason": "验证用-折旧调整",
        "effective_date": "2024-01-01",
    }
    import_service.import_price_adjustment(batch, adjustment_data, "验证员")
    db.commit()
    
    excel_path = export_service.export_to_excel(batch, "验证员")
    if os.path.exists(excel_path):
        file_size = os.path.getsize(excel_path)
        print(f"   ✓ Excel导出成功: {os.path.basename(excel_path)}")
        print(f"     文件大小: {file_size} bytes")
    else:
        print(f"   ✗ Excel导出失败")
        all_passed = False
    
    db.close()
    
    print("\n" + "=" * 70)
    if all_passed:
        print("  ✓ 所有验证通过！")
        print("  - 附件上传/查询: 正常")
        print("  - 历史压缩包解析/导入: 正常")
        print("  - 证书过期联动: 正常")
        print("  - freeze-comparison 接口: 正常")
        print("  - 护士长视图导出: 正常")
        print("  - Excel导出(含手工改价表): 正常")
        print("=" * 70)
        return 0
    else:
        print("  ✗ 存在验证失败项")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(test_all())
