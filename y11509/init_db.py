import os
import sys
from datetime import datetime, timedelta
from app import create_app
from app.models import (
    db,
    User,
    Role,
    InspectionRecord,
    CalibrationCertificate,
    RepairQuotation,
    SupplementaryRecord,
    RecordStatus,
    CertificateStatus,
)

app = create_app()


def to_json_serializable(obj):
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    if hasattr(obj, "value"):
        return obj.value
    return obj


def init_database():
    with app.app_context():
        print("正在创建数据库表...")
        db.create_all()
        print("数据库表创建完成！")


def create_default_users():
    with app.app_context():
        print("\n正在创建默认用户...")

        users = [
            {"username": "admin", "real_name": "系统管理员", "role": Role.ADMIN, "department": "信息科"},
            {"username": "nurse_head", "real_name": "张护士长", "role": Role.DEPARTMENT_HEAD, "department": "内科"},
            {"username": "nurse1", "real_name": "李护士", "role": Role.NURSE, "department": "内科"},
            {"username": "tech1", "real_name": "王技术员", "role": Role.TECHNICIAN, "department": "设备科"},
            {"username": "auditor1", "real_name": "赵审计", "role": Role.AUDITOR, "department": "审计科"},
        ]

        created_count = 0
        for user_data in users:
            existing = User.query.filter_by(username=user_data["username"]).first()
            if not existing:
                user = User(**user_data)
                db.session.add(user)
                created_count += 1

        db.session.commit()
        print(f"已创建 {created_count} 个默认用户！")


def create_sample_data():
    with app.app_context():
        print("\n正在创建样例数据...")

        admin = User.query.filter_by(username="admin").first()
        admin_id = admin.id if admin else 1

        sample_count = 0

        if InspectionRecord.query.count() == 0:
            inspections = [
                {
                    "record_no": "INSP-2024-001",
                    "device_name": "心电图机",
                    "device_model": "ECG-2020",
                    "device_sn": "ECG12345678",
                    "department": "内科",
                    "inspection_date": datetime.now() - timedelta(days=5),
                    "inspector": "王技术员",
                    "inspection_result": "合格",
                    "next_inspection_date": datetime.now() + timedelta(days=360),
                    "issues_found": None,
                    "certificate_no": "CAL-2024-001",
                    "status": RecordStatus.CONFIRMED,
                },
                {
                    "record_no": "INSP-2024-002",
                    "device_name": "血压计",
                    "device_model": "BP-3000",
                    "device_sn": "BP87654321",
                    "department": "内科",
                    "inspection_date": datetime.now() - timedelta(days=3),
                    "inspector": "王技术员",
                    "inspection_result": "需校准",
                    "next_inspection_date": datetime.now() + timedelta(days=180),
                    "issues_found": "读数偏差约5mmHg",
                    "certificate_no": "CAL-2024-002",
                    "status": RecordStatus.SUBMITTED,
                },
                {
                    "record_no": "INSP-2024-003",
                    "device_name": "体温计",
                    "device_model": "TEMP-100",
                    "device_sn": "TEMP11223344",
                    "department": "外科",
                    "inspection_date": datetime.now() - timedelta(days=10),
                    "inspector": "李护士",
                    "inspection_result": "不合格",
                    "next_inspection_date": None,
                    "issues_found": "测量误差超出范围",
                    "certificate_no": None,
                    "status": RecordStatus.REJECTED,
                    "rejection_reason": "设备已损坏，建议报废",
                },
                {
                    "record_no": "INSP-2024-004",
                    "device_name": "除颤仪",
                    "device_model": "DEFIB-5000",
                    "device_sn": "DEFIB99887766",
                    "department": "急诊科",
                    "inspection_date": datetime.now() - timedelta(days=1),
                    "inspector": "王技术员",
                    "inspection_result": "待定",
                    "next_inspection_date": datetime.now() + timedelta(days=90),
                    "issues_found": "电池性能下降",
                    "certificate_no": "CAL-2024-003",
                    "status": RecordStatus.DRAFT,
                },
            ]

            for data in inspections:
                record_data = data.copy()
                original_data = {k: to_json_serializable(v) for k, v in data.items()}
                parsed_data = {k: to_json_serializable(v) for k, v in data.items()}
                record = InspectionRecord(
                    **record_data,
                    original_data=original_data,
                    parsed_data=parsed_data,
                    created_by=admin_id,
                    updated_by=admin_id,
                )
                db.session.add(record)
                sample_count += 1

        if CalibrationCertificate.query.count() == 0:
            calibrations = [
                {
                    "record_no": "CAL-REC-001",
                    "device_name": "心电图机",
                    "device_model": "ECG-2020",
                    "device_sn": "ECG12345678",
                    "department": "内科",
                    "certificate_no": "CAL-2024-001",
                    "calibration_date": datetime.now() - timedelta(days=60),
                    "valid_until": datetime.now() + timedelta(days=305),
                    "calibration_agency": "市计量测试研究院",
                    "calibration_result": "合格",
                    "status": RecordStatus.CONFIRMED,
                    "certificate_status": CertificateStatus.VALID,
                },
                {
                    "record_no": "CAL-REC-002",
                    "device_name": "血压计",
                    "device_model": "BP-3000",
                    "device_sn": "BP87654321",
                    "department": "内科",
                    "certificate_no": "CAL-2024-002",
                    "calibration_date": datetime.now() - timedelta(days=100),
                    "valid_until": datetime.now() - timedelta(days=5),
                    "calibration_agency": "市计量测试研究院",
                    "calibration_result": "合格",
                    "status": RecordStatus.CONFIRMED,
                    "certificate_status": CertificateStatus.EXPIRED,
                },
                {
                    "record_no": "CAL-REC-003",
                    "device_name": "除颤仪",
                    "device_model": "DEFIB-5000",
                    "device_sn": "DEFIB99887766",
                    "department": "急诊科",
                    "certificate_no": "CAL-2024-003",
                    "calibration_date": datetime.now() - timedelta(days=350),
                    "valid_until": datetime.now() + timedelta(days=15),
                    "calibration_agency": "市计量测试研究院",
                    "calibration_result": "合格",
                    "status": RecordStatus.SUBMITTED,
                    "certificate_status": CertificateStatus.ABOUT_TO_EXPIRE,
                },
                {
                    "record_no": "CAL-REC-004",
                    "device_name": "呼吸机",
                    "device_model": "VENT-2000",
                    "device_sn": "VENT55667788",
                    "department": "ICU",
                    "certificate_no": "CAL-2024-004",
                    "calibration_date": datetime.now() - timedelta(days=10),
                    "valid_until": datetime.now() + timedelta(days=355),
                    "calibration_agency": "市计量测试研究院",
                    "calibration_result": "待定",
                    "status": RecordStatus.DRAFT,
                    "certificate_status": CertificateStatus.VALID,
                },
            ]

            for data in calibrations:
                record_data = data.copy()
                original_data = {k: to_json_serializable(v) for k, v in data.items()}
                parsed_data = {k: to_json_serializable(v) for k, v in data.items()}
                record = CalibrationCertificate(
                    **record_data,
                    original_data=original_data,
                    parsed_data=parsed_data,
                    created_by=admin_id,
                    updated_by=admin_id,
                )
                db.session.add(record)
                sample_count += 1

        if RepairQuotation.query.count() == 0:
            repairs = [
                {
                    "record_no": "REP-2024-001",
                    "device_name": "心电图机",
                    "device_model": "ECG-2020",
                    "device_sn": "ECG12345678",
                    "department": "内科",
                    "quotation_no": "QUO-2024-001",
                    "fault_description": "导联线接触不良，信号偶尔中断",
                    "repair_date": datetime.now() - timedelta(days=20),
                    "repair_vendor": "医疗设备维修服务中心",
                    "quotation_amount": 2500.00,
                    "repair_status": "已完成",
                    "warranty_period": "6个月",
                    "status": RecordStatus.CONFIRMED,
                },
                {
                    "record_no": "REP-2024-002",
                    "device_name": "超声诊断仪",
                    "device_model": "US-3000",
                    "device_sn": "US11223344",
                    "department": "超声科",
                    "quotation_no": "QUO-2024-002",
                    "fault_description": "探头老化，图像模糊",
                    "repair_date": datetime.now() - timedelta(days=5),
                    "repair_vendor": "原厂维修中心",
                    "quotation_amount": 15000.00,
                    "repair_status": "维修中",
                    "warranty_period": "12个月",
                    "status": RecordStatus.SUBMITTED,
                },
            ]

            for data in repairs:
                record_data = data.copy()
                original_data = {k: to_json_serializable(v) for k, v in data.items()}
                parsed_data = {k: to_json_serializable(v) for k, v in data.items()}
                record = RepairQuotation(
                    **record_data,
                    original_data=original_data,
                    parsed_data=parsed_data,
                    created_by=admin_id,
                    updated_by=admin_id,
                )
                db.session.add(record)
                sample_count += 1

        if SupplementaryRecord.query.count() == 0:
            supplementary = [
                {
                    "record_no": "SUPP-2024-001",
                    "device_name": "输液泵",
                    "device_model": "PUMP-1000",
                    "device_sn": "PUMP998877",
                    "department": "内科",
                    "supplementary_reason": "巡检记录遗漏，补录上月设备检查情况",
                    "supplementary_type": "巡检补录",
                    "original_record_no": "INSP-2024-000",
                    "supplementary_note": "经护士长确认，设备运行正常",
                    "status": RecordStatus.CONFIRMED,
                },
            ]

            for data in supplementary:
                record_data = data.copy()
                original_data = {k: to_json_serializable(v) for k, v in data.items()}
                parsed_data = {k: to_json_serializable(v) for k, v in data.items()}
                record = SupplementaryRecord(
                    **record_data,
                    original_data=original_data,
                    parsed_data=parsed_data,
                    created_by=admin_id,
                    updated_by=admin_id,
                )
                db.session.add(record)
                sample_count += 1

        db.session.commit()
        print(f"已创建 {sample_count} 条样例数据！")


if __name__ == "__main__":
    print("=" * 50)
    print("医疗器械巡检权限追责台账系统 - 数据库初始化")
    print("=" * 50)

    init_database()
    create_default_users()
    create_sample_data()

    print("\n" + "=" * 50)
    print("初始化完成！")
    print("默认账号：admin / 系统管理员")
    print("启动命令：python run.py")
    print("API地址：http://localhost:5000/api/health")
    print("=" * 50)
