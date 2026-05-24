#!/usr/bin/env python3
"""创建样例数据"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import (
    Batch, MaterialItem, LogisticsReceipt, BorrowRecord,
    SupplementRecord, StateRecord, DeviceTracking,
    MaterialStatus, BatchStatus, IdempotentAction
)
from app.schemas import BatchCreate, BatchDataImportRequest, MaterialItemCreate, \
    LogisticsReceiptCreate, BorrowRecordCreate, SupplementRecordCreate
from app.services.batch_service import BatchService
from app.services.state_machine import DeviceTrackingService


def create_sample_data():
    print("正在创建样例数据...")
    db = SessionLocal()
    
    try:
        batch_data = BatchCreate(
            batch_no="EXPO-2024-SH-001",
            exhibition_name="2024上海国际会展",
            idempotent_action=IdempotentAction.OVERWRITE,
            created_by="admin",
            remark="春季展会物料批次"
        )
        batch = BatchService.create_batch(db, batch_data)
        print(f"已创建批次: {batch.batch_no} - {batch.exhibition_name}")
        
        materials = [
            MaterialItemCreate(material_code="PROJ-001", material_name="投影仪A", category="设备", quantity=2, unit="台", warehouse_location="A-01"),
            MaterialItemCreate(material_code="PROJ-002", material_name="投影仪B", category="设备", quantity=1, unit="台", warehouse_location="A-02"),
            MaterialItemCreate(material_code="SCREEN-001", material_name="幕布大", category="配件", quantity=3, unit="块", warehouse_location="B-01"),
            MaterialItemCreate(material_code="SCREEN-002", material_name="幕布小", category="配件", quantity=5, unit="块", warehouse_location="B-02"),
            MaterialItemCreate(material_code="STAND-001", material_name="展架", category="展示", quantity=10, unit="个", warehouse_location="C-01"),
            MaterialItemCreate(material_code="BROCHURE-001", material_name="宣传册", category="资料", quantity=500, unit="本", warehouse_location="D-01"),
            MaterialItemCreate(material_code="GIFT-001", material_name="礼品U盘", category="礼品", quantity=100, unit="个", warehouse_location="E-01"),
            MaterialItemCreate(material_code="LAPTOP-001", material_name="演示笔记本", category="设备", quantity=3, unit="台", warehouse_location="A-03"),
        ]
        
        logistics = [
            LogisticsReceiptCreate(material_code="PROJ-001", waybill_no="SF1234567890", sender="仓库李", receiver="现场王", send_time=datetime.now()-timedelta(days=5), receive_time=datetime.now()-timedelta(days=3), is_received=True, received_quantity=2, receiver_signature="王XX"),
            LogisticsReceiptCreate(material_code="PROJ-002", waybill_no="SF1234567891", sender="仓库李", receiver="现场王", send_time=datetime.now()-timedelta(days=5), receive_time=datetime.now()-timedelta(days=3), is_received=True, received_quantity=1, receiver_signature="王XX"),
            LogisticsReceiptCreate(material_code="SCREEN-001", waybill_no="SF1234567892", sender="仓库李", receiver="现场王", send_time=datetime.now()-timedelta(days=5), receive_time=datetime.now()-timedelta(days=3), is_received=True, received_quantity=3, receiver_signature="王XX"),
            LogisticsReceiptCreate(material_code="SCREEN-002", waybill_no="SF1234567893", sender="仓库李", receiver="现场王", send_time=datetime.now()-timedelta(days=5), receive_time=datetime.now()-timedelta(days=3), is_received=True, received_quantity=5, receiver_signature="王XX"),
            LogisticsReceiptCreate(material_code="STAND-001", waybill_no="SF1234567894", sender="仓库李", receiver="现场王", send_time=datetime.now()-timedelta(days=5), receive_time=datetime.now()-timedelta(days=3), is_received=True, received_quantity=10, receiver_signature="王XX"),
            LogisticsReceiptCreate(material_code="BROCHURE-001", waybill_no="SF1234567895", sender="仓库李", receiver="现场王", send_time=datetime.now()-timedelta(days=5), receive_time=datetime.now()-timedelta(days=3), is_received=True, received_quantity=500, receiver_signature="王XX"),
            LogisticsReceiptCreate(material_code="GIFT-001", waybill_no="SF1234567896", sender="仓库李", receiver="现场王", send_time=datetime.now()-timedelta(days=5), receive_time=datetime.now()-timedelta(days=3), is_received=True, received_quantity=100, receiver_signature="王XX"),
            LogisticsReceiptCreate(material_code="LAPTOP-001", waybill_no="SF1234567897", sender="仓库李", receiver="现场王", send_time=datetime.now()-timedelta(days=5), receive_time=datetime.now()-timedelta(days=3), is_received=True, received_quantity=3, receiver_signature="王XX"),
        ]
        
        borrow_records = [
            BorrowRecordCreate(material_code="PROJ-001", borrower="张销售", borrower_phone="13800138001", borrower_department="销售部", borrow_time=datetime.now()-timedelta(days=2), expected_return_time=datetime.now()+timedelta(days=1), borrow_quantity=1, borrow_remark="客户演示用", witness="李经理", approval_by="王总监"),
            BorrowRecordCreate(material_code="LAPTOP-001", borrower="李技术", borrower_phone="13800138002", borrower_department="技术部", borrow_time=datetime.now()-timedelta(days=1), expected_return_time=datetime.now(), borrow_quantity=2, borrow_remark="现场调试", witness="赵主管", approval_by="王总监"),
            BorrowRecordCreate(material_code="PROJ-002", borrower="王市场", borrower_phone="13800138003", borrower_department="市场部", borrow_time=datetime.now()-timedelta(hours=8), expected_return_time=datetime.now()+timedelta(hours=4), borrow_quantity=1, borrow_remark="分会场使用", witness="陈助理", approval_by="王总监"),
        ]
        
        supplements = [
            SupplementRecordCreate(record_type="补录说明", content="部分物料临时调配至A区展位使用", supplementary_by="现场王", supplementary_time=datetime.now()-timedelta(days=2), reason="展会现场调整", related_material_codes=["PROJ-001", "LAPTOP-001"]),
        ]
        
        import_request = BatchDataImportRequest(
            materials=materials,
            logistics=logistics,
            borrow_records=borrow_records,
            supplements=supplements,
            imported_by="admin"
        )
        
        results = BatchService.import_batch_data(db, batch, import_request)
        print(f"数据导入结果: {results}")
        
        borrows = db.query(BorrowRecord).filter(BorrowRecord.batch_id == batch.id).all()
        for borrow in borrows:
            tracking = DeviceTrackingService.create_tracking(
                db=db,
                borrow_record_id=borrow.id,
                device_code=borrow.material.material_code,
                device_name=borrow.material.material_name,
                last_known_location=f"{batch.exhibition_name} - 展位A区",
                last_seen_by="现场巡检员",
                responsible_person=borrow.borrower,
                remark="展会现场使用中"
            )
            print(f"已创建设备追踪: {tracking.device_name} -> {tracking.responsible_person}")
        
        print("\n样例数据创建完成!")
        print(f"批次ID: {batch.id}")
        print(f"批次号: {batch.batch_no}")
        return batch.id
        
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_data()
