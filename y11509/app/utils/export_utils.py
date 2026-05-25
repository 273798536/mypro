import os
import hashlib
import pandas as pd
from datetime import datetime
from flask import current_app
from app.models import (
    db,
    ExportLog,
    InspectionRecord,
    CalibrationCertificate,
    RepairQuotation,
    SupplementaryRecord,
    RecordType,
    RecordStatus,
    CertificateStatus,
)
from app.utils.validators import mask_sensitive_data, mask_record_list


def generate_export_filename(export_type, is_masked=True):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mask_suffix = "_masked" if is_masked else ""
    return f"{export_type}_export_{timestamp}{mask_suffix}.xlsx"


def calculate_file_hash(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def get_record_model(record_type: RecordType):
    models = {
        RecordType.INSPECTION: InspectionRecord,
        RecordType.CALIBRATION: CalibrationCertificate,
        RecordType.REPAIR: RepairQuotation,
        RecordType.SUPPLEMENTARY: SupplementaryRecord,
    }
    return models.get(record_type)


def export_records_to_excel(record_type: RecordType, filters: dict = None, user_role: str = "admin", user_id: int = 1):
    is_masked = user_role not in ["admin", "auditor"]
    Model = get_record_model(record_type)
    if not Model:
        return None, "无效的记录类型"

    query = Model.query

    if filters:
        if filters.get("department"):
            query = query.filter(Model.department.like(f"%{filters['department']}%"))
        if filters.get("status"):
            try:
                query = query.filter(Model.status == RecordStatus(filters["status"]))
            except ValueError:
                pass
        if filters.get("start_date"):
            try:
                start_dt = datetime.strptime(filters["start_date"], "%Y-%m-%d")
                if hasattr(Model, "inspection_date"):
                    query = query.filter(Model.inspection_date >= start_dt)
                elif hasattr(Model, "calibration_date"):
                    query = query.filter(Model.calibration_date >= start_dt)
            except ValueError:
                pass
        if filters.get("end_date"):
            try:
                end_dt = datetime.strptime(filters["end_date"], "%Y-%m-%d")
                if hasattr(Model, "inspection_date"):
                    query = query.filter(Model.inspection_date <= end_dt)
                elif hasattr(Model, "calibration_date"):
                    query = query.filter(Model.calibration_date <= end_dt)
            except ValueError:
                pass

    records = query.order_by(Model.created_at.desc()).all()
    record_count = len(records)

    if record_type == RecordType.INSPECTION:
        data = []
        for r in records:
            item = {
                "记录编号": r.record_no,
                "设备名称": r.device_name,
                "设备型号": r.device_model or "",
                "设备序列号": r.device_sn or "",
                "科室": r.department,
                "状态": r.status.value if r.status else "",
                "证书状态": r.certificate_status.value if r.certificate_status else "",
                "巡检日期": r.inspection_date.strftime("%Y-%m-%d") if r.inspection_date else "",
                "巡检人员": r.inspector or "",
                "巡检结果": r.inspection_result or "",
                "下次巡检日期": r.next_inspection_date.strftime("%Y-%m-%d") if r.next_inspection_date else "",
                "发现问题": r.issues_found or "",
                "证书编号": r.certificate_no or "",
                "人工改判": "是" if r.is_manually_edited else "否",
                "改判说明": r.manual_judgment_note or "",
                "来源行号": r.original_row_number or "",
                "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            }
            if is_masked:
                item = mask_sensitive_data(item, user_role)
            data.append(item)
    elif record_type == RecordType.CALIBRATION:
        data = []
        for r in records:
            item = {
                "记录编号": r.record_no,
                "设备名称": r.device_name,
                "设备型号": r.device_model or "",
                "设备序列号": r.device_sn or "",
                "科室": r.department,
                "状态": r.status.value if r.status else "",
                "证书状态": r.certificate_status.value if r.certificate_status else "",
                "证书编号": r.certificate_no,
                "校准日期": r.calibration_date.strftime("%Y-%m-%d") if r.calibration_date else "",
                "有效期至": r.valid_until.strftime("%Y-%m-%d") if r.valid_until else "",
                "校准机构": r.calibration_agency or "",
                "校准结果": r.calibration_result or "",
                "人工改判": "是" if r.is_manually_edited else "否",
                "改判说明": r.manual_judgment_note or "",
                "来源行号": r.original_row_number or "",
                "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            }
            if is_masked:
                item = mask_sensitive_data(item, user_role)
            data.append(item)
    elif record_type == RecordType.REPAIR:
        data = []
        for r in records:
            item = {
                "记录编号": r.record_no,
                "设备名称": r.device_name,
                "设备型号": r.device_model or "",
                "设备序列号": r.device_sn or "",
                "科室": r.department,
                "状态": r.status.value if r.status else "",
                "报价单号": r.quotation_no,
                "故障描述": r.fault_description or "",
                "维修日期": r.repair_date.strftime("%Y-%m-%d") if r.repair_date else "",
                "维修厂商": r.repair_vendor or "",
                "报价金额": float(r.quotation_amount) if r.quotation_amount else "",
                "维修状态": r.repair_status or "",
                "保修期": r.warranty_period or "",
                "人工改判": "是" if r.is_manually_edited else "否",
                "改判说明": r.manual_judgment_note or "",
                "来源行号": r.original_row_number or "",
                "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            }
            if is_masked:
                item = mask_sensitive_data(item, user_role)
            data.append(item)
    elif record_type == RecordType.SUPPLEMENTARY:
        data = []
        for r in records:
            item = {
                "记录编号": r.record_no,
                "设备名称": r.device_name,
                "设备型号": r.device_model or "",
                "设备序列号": r.device_sn or "",
                "科室": r.department,
                "状态": r.status.value if r.status else "",
                "补录原因": r.supplementary_reason,
                "补录类型": r.supplementary_type or "",
                "原记录编号": r.original_record_no or "",
                "补录备注": r.supplementary_note or "",
                "人工改判": "是" if r.is_manually_edited else "否",
                "改判说明": r.manual_judgment_note or "",
                "来源行号": r.original_row_number or "",
                "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            }
            if is_masked:
                item = mask_sensitive_data(item, user_role)
            data.append(item)
    else:
        data = []

    filename = generate_export_filename(record_type.value, is_masked)
    file_path = os.path.join(current_app.config["EXPORT_FOLDER"], filename)

    df = pd.DataFrame(data)
    df.to_excel(file_path, index=False, engine="openpyxl")

    file_hash = calculate_file_hash(file_path)

    export_log = ExportLog(
        export_type=record_type.value,
        exported_by=user_id,
        record_count=record_count,
        is_masked=is_masked,
        filters_applied=filters,
        filename=filename,
        file_hash=file_hash,
    )
    db.session.add(export_log)
    db.session.commit()

    return {
        "export_log_id": export_log.id,
        "filename": filename,
        "file_path": file_path,
        "file_hash": file_hash,
        "record_count": record_count,
        "is_masked": is_masked,
    }, None


def export_summary_report(department=None, user_role="admin", user_id=1):
    is_masked = user_role not in ["admin", "auditor"]

    summary = {
        "巡检记录": {
            "草稿": InspectionRecord.query.filter_by(status=RecordStatus.DRAFT).count(),
            "已提交": InspectionRecord.query.filter_by(status=RecordStatus.SUBMITTED).count(),
            "已驳回": InspectionRecord.query.filter_by(status=RecordStatus.REJECTED).count(),
            "已确认": InspectionRecord.query.filter_by(status=RecordStatus.CONFIRMED).count(),
            "已撤回": InspectionRecord.query.filter_by(status=RecordStatus.WITHDRAWN).count(),
            "已冻结": InspectionRecord.query.filter_by(status=RecordStatus.FROZEN).count(),
        },
        "校准证书": {
            "草稿": CalibrationCertificate.query.filter_by(status=RecordStatus.DRAFT).count(),
            "已提交": CalibrationCertificate.query.filter_by(status=RecordStatus.SUBMITTED).count(),
            "已驳回": CalibrationCertificate.query.filter_by(status=RecordStatus.REJECTED).count(),
            "已确认": CalibrationCertificate.query.filter_by(status=RecordStatus.CONFIRMED).count(),
            "有效": CalibrationCertificate.query.filter_by(certificate_status=CertificateStatus.VALID).count(),
            "即将过期": CalibrationCertificate.query.filter_by(certificate_status=CertificateStatus.ABOUT_TO_EXPIRE).count(),
            "已过期": CalibrationCertificate.query.filter_by(certificate_status=CertificateStatus.EXPIRED).count(),
            "已停用": CalibrationCertificate.query.filter_by(certificate_status=CertificateStatus.DEACTIVATED).count(),
        },
        "维修报价": {
            "草稿": RepairQuotation.query.filter_by(status=RecordStatus.DRAFT).count(),
            "已提交": RepairQuotation.query.filter_by(status=RecordStatus.SUBMITTED).count(),
            "已确认": RepairQuotation.query.filter_by(status=RecordStatus.CONFIRMED).count(),
        },
        "临时补录": {
            "草稿": SupplementaryRecord.query.filter_by(status=RecordStatus.DRAFT).count(),
            "已提交": SupplementaryRecord.query.filter_by(status=RecordStatus.SUBMITTED).count(),
            "已确认": SupplementaryRecord.query.filter_by(status=RecordStatus.CONFIRMED).count(),
        },
    }

    data = []
    for category, stats in summary.items():
        for status, count in stats.items():
            data.append({
                "类别": category,
                "状态": status,
                "数量": count,
            })

    filename = generate_export_filename("summary", is_masked)
    file_path = os.path.join(current_app.config["EXPORT_FOLDER"], filename)

    df = pd.DataFrame(data)
    df.to_excel(file_path, index=False, engine="openpyxl")

    file_hash = calculate_file_hash(file_path)

    export_log = ExportLog(
        export_type="summary",
        exported_by=user_id,
        record_count=len(data),
        is_masked=is_masked,
        filters_applied={"department": department},
        filename=filename,
        file_hash=file_hash,
    )
    db.session.add(export_log)
    db.session.commit()

    return {
        "export_log_id": export_log.id,
        "filename": filename,
        "file_path": file_path,
        "file_hash": file_hash,
        "record_count": len(data),
        "is_masked": is_masked,
        "summary": summary,
    }, None
