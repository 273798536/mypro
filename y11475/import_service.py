import json
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from io import BytesIO
import uuid

import pandas as pd
from sqlalchemy.orm import Session

from models import (
    Batch, AbnormalRecord, OriginalFile, OriginalEvidence,
    DataSource, BatchState, RecordState
)
from state_machine import transition_batch_state
from schemas import ImportResult


class ImportError(Exception):
    def __init__(self, message: str, row: int = None, details: Dict = None):
        self.message = message
        self.row = row
        self.details = details or {}
        super().__init__(message)


def generate_record_id() -> str:
    return f"REC_{uuid.uuid4().hex[:12].upper()}"


def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def parse_datetime(value: Any) -> Optional[datetime]:
    if pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in [
            "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M", "%Y-%m-%d", "%Y/%m/%d"
        ]:
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
    return None


def parse_bool(value: Any) -> Optional[bool]:
    if pd.isna(value):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        v = value.strip().lower()
        if v in ("是", "true", "yes", "1", "有"):
            return True
        if v in ("否", "false", "no", "0", "无"):
            return False
    return None


def parse_int(value: Any) -> Optional[int]:
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def parse_calendar_row(row_data: pd.Series, row_num: int) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    evidences = []
    record_data = {"source": DataSource.CALENDAR}

    def add_evidence(field: str, original: Any, parsed: Any, note: str = ""):
        if pd.notna(original):
            evidences.append({
                "original_row_number": row_num,
                "original_value": str(original),
                "parsed_field": field,
                "parsed_value": str(parsed) if parsed is not None else None,
                "parse_note": note
            })

    room_code = row_data.get("会议室编码") or row_data.get("room_code")
    if pd.isna(room_code):
        raise ImportError("会议室编码不能为空", row=row_num)
    record_data["room_code"] = str(room_code).strip()
    add_evidence("room_code", room_code, record_data["room_code"])

    room_name = row_data.get("会议室名称") or row_data.get("room_name")
    if pd.notna(room_name):
        record_data["room_name"] = str(room_name).strip()
        add_evidence("room_name", room_name, record_data["room_name"])

    appt_date = row_data.get("预约日期") or row_data.get("appointment_date")
    parsed_date = parse_datetime(appt_date)
    if not parsed_date:
        raise ImportError("预约日期格式无效", row=row_num)
    record_data["appointment_date"] = parsed_date
    add_evidence("appointment_date", appt_date, parsed_date.isoformat())

    appt_id = row_data.get("预约ID") or row_data.get("appointment_id")
    if pd.notna(appt_id):
        record_data["appointment_id"] = str(appt_id).strip()
        add_evidence("appointment_id", appt_id, record_data["appointment_id"])

    subject = row_data.get("会议主题") or row_data.get("subject")
    if pd.notna(subject):
        record_data["appointment_subject"] = str(subject).strip()
        add_evidence("appointment_subject", subject, record_data["appointment_subject"])

    start_time = row_data.get("开始时间") or row_data.get("start_time")
    parsed_start = parse_datetime(start_time)
    if parsed_start:
        record_data["start_time"] = parsed_start
        add_evidence("start_time", start_time, parsed_start.isoformat())

    end_time = row_data.get("结束时间") or row_data.get("end_time")
    parsed_end = parse_datetime(end_time)
    if parsed_end:
        record_data["end_time"] = parsed_end
        add_evidence("end_time", end_time, parsed_end.isoformat())

    booker = row_data.get("预约人") or row_data.get("booker")
    if pd.notna(booker):
        record_data["booker"] = str(booker).strip()
        add_evidence("booker", booker, record_data["booker"])

    booker_dept = row_data.get("预约部门") or row_data.get("booker_dept")
    if pd.notna(booker_dept):
        record_data["booker_dept"] = str(booker_dept).strip()
        add_evidence("booker_dept", booker_dept, record_data["booker_dept"])

    est_cost = row_data.get("预估费用") or row_data.get("estimated_cost")
    parsed_cost = parse_int(est_cost)
    if parsed_cost is not None:
        record_data["estimated_cost"] = parsed_cost
        add_evidence("estimated_cost", est_cost, parsed_cost)

    return record_data, evidences


def parse_access_card_row(row_data: pd.Series, row_num: int) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    evidences = []
    record_data = {"source": DataSource.ACCESS_CARD}

    def add_evidence(field: str, original: Any, parsed: Any, note: str = ""):
        if pd.notna(original):
            evidences.append({
                "original_row_number": row_num,
                "original_value": str(original),
                "parsed_field": field,
                "parsed_value": str(parsed) if parsed is not None else None,
                "parse_note": note
            })

    room_code = row_data.get("会议室编码") or row_data.get("room_code")
    if pd.isna(room_code):
        raise ImportError("会议室编码不能为空", row=row_num)
    record_data["room_code"] = str(room_code).strip()
    add_evidence("room_code", room_code, record_data["room_code"])

    appt_date = row_data.get("预约日期") or row_data.get("appointment_date")
    parsed_date = parse_datetime(appt_date)
    if not parsed_date:
        raise ImportError("预约日期格式无效", row=row_num)
    record_data["appointment_date"] = parsed_date
    add_evidence("appointment_date", appt_date, parsed_date.isoformat())

    has_access = row_data.get("有门禁记录") or row_data.get("has_access_record")
    record_data["has_access_record"] = parse_bool(has_access)
    add_evidence("has_access_record", has_access, record_data["has_access_record"])

    access_person = row_data.get("刷卡人") or row_data.get("access_person")
    if pd.notna(access_person):
        record_data["access_person"] = str(access_person).strip()
        add_evidence("access_person", access_person, record_data["access_person"])

    access_time = row_data.get("刷卡时间") or row_data.get("access_time")
    parsed_time = parse_datetime(access_time)
    if parsed_time:
        record_data["access_time"] = parsed_time
        add_evidence("access_time", access_time, parsed_time.isoformat())

    record_data["appointment_id"] = str(row_data.get("预约ID") or row_data.get("appointment_id") or "")
    if record_data["appointment_id"]:
        add_evidence("appointment_id", row_data.get("预约ID"), record_data["appointment_id"])

    return record_data, evidences


def parse_cancel_message_row(row_data: pd.Series, row_num: int) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    evidences = []
    record_data = {"source": DataSource.CANCEL_MESSAGE}

    def add_evidence(field: str, original: Any, parsed: Any, note: str = ""):
        if pd.notna(original):
            evidences.append({
                "original_row_number": row_num,
                "original_value": str(original),
                "parsed_field": field,
                "parsed_value": str(parsed) if parsed is not None else None,
                "parse_note": note
            })

    room_code = row_data.get("会议室编码") or row_data.get("room_code")
    if pd.isna(room_code):
        raise ImportError("会议室编码不能为空", row=row_num)
    record_data["room_code"] = str(room_code).strip()
    add_evidence("room_code", room_code, record_data["room_code"])

    appt_date = row_data.get("预约日期") or row_data.get("appointment_date")
    parsed_date = parse_datetime(appt_date)
    if not parsed_date:
        raise ImportError("预约日期格式无效", row=row_num)
    record_data["appointment_date"] = parsed_date
    add_evidence("appointment_date", appt_date, parsed_date.isoformat())

    has_cancel = row_data.get("有取消消息") or row_data.get("has_cancel_message")
    record_data["has_cancel_message"] = parse_bool(has_cancel)
    add_evidence("has_cancel_message", has_cancel, record_data["has_cancel_message"])

    cancel_time = row_data.get("取消时间") or row_data.get("cancel_time")
    parsed_time = parse_datetime(cancel_time)
    if parsed_time:
        record_data["cancel_time"] = parsed_time
        add_evidence("cancel_time", cancel_time, parsed_time.isoformat())

    cancel_op = row_data.get("取消操作人") or row_data.get("cancel_operator")
    if pd.notna(cancel_op):
        record_data["cancel_operator"] = str(cancel_op).strip()
        add_evidence("cancel_operator", cancel_op, record_data["cancel_operator"])

    record_data["appointment_id"] = str(row_data.get("预约ID") or row_data.get("appointment_id") or "")
    if record_data["appointment_id"]:
        add_evidence("appointment_id", row_data.get("预约ID"), record_data["appointment_id"])

    return record_data, evidences


def import_file_to_batch(
    db: Session,
    batch_id: str,
    file_content: bytes,
    file_name: str,
    source_type: DataSource,
    uploaded_by: str
) -> ImportResult:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise ImportError(f"批次 {batch_id} 不存在")

    if batch.state not in (BatchState.CREATED, BatchState.IMPORTING, BatchState.PARTIAL_FAILED):
        raise ImportError(f"批次状态 {batch.state.value} 不允许导入数据")

    file_hash = compute_file_hash(file_content)

    existing_file = db.query(OriginalFile).filter(
        OriginalFile.batch_id == batch_id,
        OriginalFile.file_hash == file_hash
    ).first()
    if existing_file:
        raise ImportError(f"文件已存在于该批次: {existing_file.file_name}")

    try:
        df = pd.read_excel(BytesIO(file_content))
    except Exception as e:
        raise ImportError(f"Excel文件解析失败: {str(e)}")

    if batch.state == BatchState.CREATED:
        transition_batch_state(
            db, batch, BatchState.IMPORTING, uploaded_by,
            "开始导入数据", {"file": file_name}
        )

    original_file = OriginalFile(
        batch_id=batch_id,
        file_name=file_name,
        file_hash=file_hash,
        file_size=len(file_content),
        source_type=source_type,
        uploaded_by=uploaded_by,
        total_rows=len(df),
        success_rows=0,
        failed_rows=0
    )
    db.add(original_file)
    db.flush()

    parser_map = {
        DataSource.CALENDAR: parse_calendar_row,
        DataSource.ACCESS_CARD: parse_access_card_row,
        DataSource.CANCEL_MESSAGE: parse_cancel_message_row,
    }
    parser = parser_map.get(source_type)
    if not parser:
        raise ImportError(f"不支持的数据源类型: {source_type.value}")

    success_count = 0
    failed_count = 0
    failed_details = []

    for idx, row in df.iterrows():
        row_num = idx + 2
        try:
            record_data, evidences = parser(row, row_num)

            record_id = generate_record_id()
            record = AbnormalRecord(
                id=record_id,
                batch_id=batch_id,
                state=RecordState.DRAFT,
                **record_data
            )
            db.add(record)
            db.flush()

            for ev in evidences:
                evidence = OriginalEvidence(
                    record_id=record_id,
                    source_file_id=original_file.id,
                    **ev
                )
                db.add(evidence)

            success_count += 1

        except ImportError as e:
            failed_count += 1
            failed_details.append({
                "row": row_num,
                "error": e.message,
                "details": e.details
            })
        except Exception as e:
            failed_count += 1
            failed_details.append({
                "row": row_num,
                "error": f"未知错误: {str(e)}",
                "details": {}
            })

    original_file.success_rows = success_count
    original_file.failed_rows = failed_count

    if failed_count == 0:
        new_state = BatchState.PENDING_REVIEW
        reason = "数据导入完成，待复核"
    else:
        new_state = BatchState.PARTIAL_FAILED
        reason = f"数据导入完成，{success_count}条成功，{failed_count}条失败"

    transition_batch_state(
        db, batch, new_state, uploaded_by, reason,
        {"success": success_count, "failed": failed_count}
    )

    db.commit()

    return ImportResult(
        total=len(df),
        success=success_count,
        failed=failed_count,
        failed_details=failed_details
    )
