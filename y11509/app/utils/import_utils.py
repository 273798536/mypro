import os
import hashlib
import pandas as pd
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app
from app.models import (
    db,
    ImportSource,
    InspectionRecord,
    CalibrationCertificate,
    RepairQuotation,
    SupplementaryRecord,
    RecordType,
    RecordStatus,
    ActionType,
    CertificateStatus,
)
from app.utils.audit import create_audit_trail
from app.utils.validators import validate_date


def allowed_file(filename):
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


def calculate_file_hash(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def parse_inspection_row(row, row_num):
    errors = []
    record = {}
    record["original_data"] = row.to_dict()
    record["original_row_number"] = row_num

    try:
        record["record_no"] = str(row.get("记录编号", row.get("record_no", ""))).strip()
        if not record["record_no"]:
            errors.append("记录编号不能为空")

        record["device_name"] = str(row.get("设备名称", row.get("device_name", ""))).strip()
        if not record["device_name"]:
            errors.append("设备名称不能为空")

        record["department"] = str(row.get("科室", row.get("department", ""))).strip()
        if not record["department"]:
            errors.append("科室不能为空")

        date_val = row.get("巡检日期", row.get("inspection_date", ""))
        valid, err, dt = validate_date(date_val, "巡检日期")
        if not valid:
            errors.append(err or "巡检日期解析失败")
        elif dt:
            record["inspection_date"] = dt

        next_date_val = row.get("下次巡检日期", row.get("next_inspection_date", ""))
        valid, err, next_dt = validate_date(next_date_val, "下次巡检日期")
        if valid and next_dt:
            record["next_inspection_date"] = next_dt

        record["device_model"] = str(row.get("设备型号", row.get("device_model", ""))).strip() or None
        record["device_sn"] = str(row.get("设备序列号", row.get("device_sn", ""))).strip() or None
        record["inspector"] = str(row.get("巡检人员", row.get("inspector", ""))).strip() or None
        record["inspection_result"] = str(row.get("巡检结果", row.get("inspection_result", ""))).strip() or None
        record["issues_found"] = str(row.get("发现问题", row.get("issues_found", ""))).strip() or None
        record["certificate_no"] = str(row.get("证书编号", row.get("certificate_no", ""))).strip() or None

    except Exception as e:
        errors.append(f"解析异常: {str(e)}")

    record["parsed_data"] = {k: v for k, v in record.items() if k not in ["original_data", "original_row_number"]}
    return record, errors


def parse_calibration_row(row, row_num):
    errors = []
    record = {}
    record["original_data"] = row.to_dict()
    record["original_row_number"] = row_num

    try:
        record["record_no"] = str(row.get("记录编号", row.get("record_no", ""))).strip()
        if not record["record_no"]:
            errors.append("记录编号不能为空")

        record["device_name"] = str(row.get("设备名称", row.get("device_name", ""))).strip()
        if not record["device_name"]:
            errors.append("设备名称不能为空")

        record["department"] = str(row.get("科室", row.get("department", ""))).strip()
        if not record["department"]:
            errors.append("科室不能为空")

        record["certificate_no"] = str(row.get("证书编号", row.get("certificate_no", ""))).strip()
        if not record["certificate_no"]:
            errors.append("证书编号不能为空")

        date_val = row.get("校准日期", row.get("calibration_date", ""))
        valid, err, dt = validate_date(date_val, "校准日期")
        if valid and dt:
            record["calibration_date"] = dt

        valid_val = row.get("有效期至", row.get("valid_until", ""))
        valid, err, valid_dt = validate_date(valid_val, "有效期至")
        if valid and valid_dt:
            record["valid_until"] = valid_dt

        record["device_model"] = str(row.get("设备型号", row.get("device_model", ""))).strip() or None
        record["device_sn"] = str(row.get("设备序列号", row.get("device_sn", ""))).strip() or None
        record["calibration_agency"] = str(row.get("校准机构", row.get("calibration_agency", ""))).strip() or None
        record["calibration_result"] = str(row.get("校准结果", row.get("calibration_result", ""))).strip() or None

    except Exception as e:
        errors.append(f"解析异常: {str(e)}")

    record["parsed_data"] = {k: v for k, v in record.items() if k not in ["original_data", "original_row_number"]}
    return record, errors


def parse_repair_row(row, row_num):
    errors = []
    record = {}
    record["original_data"] = row.to_dict()
    record["original_row_number"] = row_num

    try:
        record["record_no"] = str(row.get("记录编号", row.get("record_no", ""))).strip()
        if not record["record_no"]:
            errors.append("记录编号不能为空")

        record["device_name"] = str(row.get("设备名称", row.get("device_name", ""))).strip()
        if not record["device_name"]:
            errors.append("设备名称不能为空")

        record["department"] = str(row.get("科室", row.get("department", ""))).strip()
        if not record["department"]:
            errors.append("科室不能为空")

        record["quotation_no"] = str(row.get("报价单号", row.get("quotation_no", ""))).strip()
        if not record["quotation_no"]:
            errors.append("报价单号不能为空")

        date_val = row.get("维修日期", row.get("repair_date", ""))
        valid, err, dt = validate_date(date_val, "维修日期")
        if valid and dt:
            record["repair_date"] = dt

        record["device_model"] = str(row.get("设备型号", row.get("device_model", ""))).strip() or None
        record["device_sn"] = str(row.get("设备序列号", row.get("device_sn", ""))).strip() or None
        record["fault_description"] = str(row.get("故障描述", row.get("fault_description", ""))).strip() or None
        record["repair_vendor"] = str(row.get("维修厂商", row.get("repair_vendor", ""))).strip() or None
        record["repair_status"] = str(row.get("维修状态", row.get("repair_status", ""))).strip() or None
        record["warranty_period"] = str(row.get("保修期", row.get("warranty_period", ""))).strip() or None

        try:
            amount = row.get("报价金额", row.get("quotation_amount", 0))
            record["quotation_amount"] = float(amount) if amount else None
        except (ValueError, TypeError):
            pass

    except Exception as e:
        errors.append(f"解析异常: {str(e)}")

    record["parsed_data"] = {k: v for k, v in record.items() if k not in ["original_data", "original_row_number"]}
    return record, errors


def parse_supplementary_row(row, row_num):
    errors = []
    record = {}
    record["original_data"] = row.to_dict()
    record["original_row_number"] = row_num

    try:
        record["record_no"] = str(row.get("记录编号", row.get("record_no", ""))).strip()
        if not record["record_no"]:
            errors.append("记录编号不能为空")

        record["device_name"] = str(row.get("设备名称", row.get("device_name", ""))).strip()
        if not record["device_name"]:
            errors.append("设备名称不能为空")

        record["department"] = str(row.get("科室", row.get("department", ""))).strip()
        if not record["department"]:
            errors.append("科室不能为空")

        record["supplementary_reason"] = str(row.get("补录原因", row.get("supplementary_reason", ""))).strip()
        if not record["supplementary_reason"]:
            errors.append("补录原因不能为空")

        record["device_model"] = str(row.get("设备型号", row.get("device_model", ""))).strip() or None
        record["device_sn"] = str(row.get("设备序列号", row.get("device_sn", ""))).strip() or None
        record["supplementary_type"] = str(row.get("补录类型", row.get("supplementary_type", ""))).strip() or None
        record["original_record_no"] = str(row.get("原记录编号", row.get("original_record_no", ""))).strip() or None
        record["supplementary_note"] = str(row.get("补录备注", row.get("supplementary_note", ""))).strip() or None

    except Exception as e:
        errors.append(f"解析异常: {str(e)}")

    record["parsed_data"] = {k: v for k, v in record.items() if k not in ["original_data", "original_row_number"]}
    return record, errors


def import_records_from_file(file_path, record_type: RecordType, user_id=1, user_name="系统管理员"):
    parse_funcs = {
        RecordType.INSPECTION: (parse_inspection_row, InspectionRecord),
        RecordType.CALIBRATION: (parse_calibration_row, CalibrationCertificate),
        RecordType.REPAIR: (parse_repair_row, RepairQuotation),
        RecordType.SUPPLEMENTARY: (parse_supplementary_row, SupplementaryRecord),
    }

    parse_func, model_class = parse_funcs[record_type]
    file_hash = calculate_file_hash(file_path)
    filename = os.path.basename(file_path)

    existing_source = ImportSource.query.filter_by(file_hash=file_hash, record_type=record_type).first()
    if existing_source:
        return None, None, f"文件已导入过，导入记录ID: {existing_source.id}"

    df = pd.read_excel(file_path) if filename.endswith((".xlsx", ".xls")) else pd.read_csv(file_path)
    total_rows = len(df)

    import_source = ImportSource(
        filename=filename,
        file_hash=file_hash,
        record_type=record_type,
        uploaded_by=user_id,
        total_rows=total_rows,
        status="processing",
    )
    db.session.add(import_source)
    db.session.flush()

    success_count = 0
    failed_count = 0
    failed_details = []

    for idx, row in df.iterrows():
        row_num = idx + 2
        record_data, errors = parse_func(row, row_num)

        if errors:
            failed_count += 1
            failed_details.append({
                "row": row_num,
                "record_no": record_data.get("record_no", ""),
                "errors": errors,
            })
            continue

        existing = model_class.query.filter_by(record_no=record_data["record_no"]).first()
        if existing:
            failed_count += 1
            failed_details.append({
                "row": row_num,
                "record_no": record_data["record_no"],
                "errors": ["记录编号已存在"],
            })
            continue

        try:
            record = model_class(
                **record_data,
                import_source_id=import_source.id,
                status=RecordStatus.DRAFT,
                created_by=user_id,
                updated_by=user_id,
            )

            if record_type == RecordType.CALIBRATION and hasattr(record, "valid_until") and record.valid_until:
                now = datetime.utcnow()
                warning_days = current_app.config.get("CERTIFICATE_WARNING_DAYS", 30)
                days_until = (record.valid_until - now).days
                if record.valid_until < now:
                    record.certificate_status = CertificateStatus.EXPIRED
                elif days_until <= warning_days:
                    record.certificate_status = CertificateStatus.ABOUT_TO_EXPIRE
                else:
                    record.certificate_status = CertificateStatus.VALID

            db.session.add(record)
            db.session.flush()

            create_audit_trail(
                record_type=record_type,
                record_id=record.id,
                record_no=record.record_no,
                action=ActionType.IMPORT,
                operator_id=user_id,
                operator_name=user_name,
                new_status=RecordStatus.DRAFT,
                change_reason=f"从文件导入: {filename}",
            )

            success_count += 1
        except Exception as e:
            failed_count += 1
            failed_details.append({
                "row": row_num,
                "record_no": record_data.get("record_no", ""),
                "errors": [f"保存失败: {str(e)}"],
            })
            db.session.rollback()

    import_source.success_rows = success_count
    import_source.failed_rows = failed_count
    import_source.status = "completed" if failed_count == 0 else "partial_failed"
    db.session.commit()

    result = {
        "import_source_id": import_source.id,
        "total": total_rows,
        "success": success_count,
        "failed": failed_count,
        "failed_details": failed_details[:100],
    }

    return result, import_source, None
