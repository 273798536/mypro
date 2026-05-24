import os
import json
import csv
import zipfile
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from io import BytesIO, StringIO
from pathlib import Path

import pandas as pd
from PIL import Image
from sqlalchemy.orm import Session

from app.models import SourceType, RawRecord
from app.schemas import ImportRecordCreate, WorkOrderCreate
from app.services import (
    create_import_record, create_raw_record, create_work_order,
    generate_work_order_no, get_user_by_id
)


class ImportError(Exception):
    pass


class PartialImportError(ImportError):
    def __init__(self, message: str, success_count: int, failed_count: int, errors: List[Dict[str, Any]]):
        super().__init__(message)
        self.success_count = success_count
        self.failed_count = failed_count
        self.errors = errors


def calculate_file_hash(file_content: bytes) -> str:
    return hashlib.sha256(file_content).hexdigest()


def detect_source_type(filename: str, content: bytes = None) -> SourceType:
    lower_name = filename.lower()
    if any(kw in lower_name for kw in ["巡检", "检查", "photo", "inspect", "image"]):
        return SourceType.INSPECTION_PHOTO
    if any(kw in lower_name for kw in ["热线", "hotline", "报修", "call"]):
        return SourceType.HOTLINE
    if any(kw in lower_name for kw in ["备件", "spare", "batch", "批次"]):
        return SourceType.SPARE_PART
    if any(kw in lower_name for kw in ["改价", "price", "manual", "手工"]):
        return SourceType.MANUAL_PRICE
    if any(kw in lower_name for kw in ["历史", "history", "archive", "备份"]):
        return SourceType.HISTORY_ARCHIVE
    return SourceType.HOTLINE


def parse_csv_content(content: bytes, encoding: str = "utf-8") -> List[Dict[str, Any]]:
    text = content.decode(encoding, errors="replace")
    reader = csv.DictReader(StringIO(text))
    return [dict(row) for row in reader]


def parse_excel_content(content: bytes) -> List[Dict[str, Any]]:
    df = pd.read_excel(BytesIO(content))
    return df.to_dict("records")


def parse_json_content(content: bytes) -> List[Dict[str, Any]]:
    data = json.loads(content.decode("utf-8"))
    if isinstance(data, list):
        return data
    return [data]


def parse_image_info(filename: str, content: bytes) -> Dict[str, Any]:
    try:
        img = Image.open(BytesIO(content))
        return {
            "filename": filename,
            "format": img.format,
            "size": img.size,
            "mode": img.mode,
            "file_size": len(content),
        }
    except Exception as e:
        return {
            "filename": filename,
            "error": str(e),
            "file_size": len(content),
        }


def extract_zip_content(content: bytes) -> List[Tuple[str, bytes, str]]:
    files = []
    with zipfile.ZipFile(BytesIO(content), "r") as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            try:
                file_content = zf.read(name)
                ext = os.path.splitext(name)[1].lower()
                files.append((name, file_content, ext))
            except Exception as e:
                files.append((name, f"读取失败: {str(e)}".encode(), ".error"))
    return files


def parse_file_content(filename: str, content: bytes) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    ext = os.path.splitext(filename)[1].lower()
    raw_records = []
    errors = []
    
    if ext in [".csv"]:
        try:
            records = parse_csv_content(content)
            for i, rec in enumerate(records):
                raw_records.append({
                    "line_number": i + 2,
                    "original_data": rec,
                    "parsed_data": rec,
                    "error": None,
                })
        except Exception as e:
            errors.append({"file": filename, "error": f"CSV解析失败: {str(e)}"})
    
    elif ext in [".xlsx", ".xls"]:
        try:
            records = parse_excel_content(content)
            for i, rec in enumerate(records):
                raw_records.append({
                    "line_number": i + 2,
                    "original_data": rec,
                    "parsed_data": rec,
                    "error": None,
                })
        except Exception as e:
            errors.append({"file": filename, "error": f"Excel解析失败: {str(e)}"})
    
    elif ext in [".json"]:
        try:
            records = parse_json_content(content)
            for i, rec in enumerate(records):
                raw_records.append({
                    "line_number": i + 1,
                    "original_data": rec,
                    "parsed_data": rec,
                    "error": None,
                })
        except Exception as e:
            errors.append({"file": filename, "error": f"JSON解析失败: {str(e)}"})
    
    elif ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp"]:
        info = parse_image_info(filename, content)
        raw_records.append({
            "line_number": 1,
            "original_data": {"filename": filename, "content_hash": calculate_file_hash(content)},
            "parsed_data": info,
            "error": None,
        })
    
    elif ext in [".zip", ".rar", ".7z"]:
        sub_files = extract_zip_content(content)
        for sub_name, sub_content, sub_ext in sub_files:
            sub_records, sub_errors = parse_file_content(sub_name, sub_content)
            raw_records.extend(sub_records)
            errors.extend(sub_errors)
    
    else:
        errors.append({"file": filename, "error": f"不支持的文件格式: {ext}"})
    
    return raw_records, errors


def normalize_work_order_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    field_mapping = {
        "工单编号": "work_order_no",
        "工单号": "work_order_no",
        "order_no": "work_order_no",
        "标题": "title",
        "title": "title",
        "主题": "title",
        "描述": "description",
        "description": "description",
        "详情": "description",
        "地点": "location",
        "地址": "location",
        "location": "location",
        "address": "location",
        "备件批次": "spare_part_batch",
        "批次号": "spare_part_batch",
        "batch": "spare_part_batch",
        "热线电话": "hotline_number",
        "联系电话": "hotline_number",
        "phone": "hotline_number",
        "报修电话": "hotline_number",
        "照片编号": "inspection_photo_ref",
        "图片": "inspection_photo_ref",
        "photo": "inspection_photo_ref",
    }
    
    normalized = {}
    for key, value in raw_data.items():
        key_lower = str(key).lower().strip()
        if key_lower in field_mapping:
            normalized[field_mapping[key_lower]] = value
        else:
            normalized[key_lower] = value
    
    return normalized


def import_file(
    db: Session,
    filename: str,
    content: bytes,
    uploaded_by: int,
    source_type: Optional[SourceType] = None,
    auto_create_work_orders: bool = False
) -> Dict[str, Any]:
    if source_type is None:
        source_type = detect_source_type(filename, content)
    
    file_hash = calculate_file_hash(content)
    
    import_record = create_import_record(db, ImportRecordCreate(
        source_file=filename,
        source_type=source_type,
        file_hash=file_hash,
        uploaded_by=uploaded_by,
    ))
    
    raw_records, parse_errors = parse_file_content(filename, content)
    
    success_count = 0
    failed_count = len(parse_errors)
    created_work_order_ids = []
    
    for raw_rec in raw_records:
        try:
            parsed_data = normalize_work_order_data(raw_rec["parsed_data"] or {})
            
            db_raw = create_raw_record(
                db,
                import_record_id=import_record.id,
                line_number=raw_rec["line_number"],
                original_data=raw_rec["original_data"],
                parsed_data=parsed_data,
                parse_error=raw_rec["error"],
            )
            
            if auto_create_work_orders and db_raw.is_parsed:
                try:
                    title = parsed_data.get("title") or parsed_data.get("description") or f"导入工单-{filename}"
                    location = parsed_data.get("location", "")
                    
                    wo_data = WorkOrderCreate(
                        work_order_no=parsed_data.get("work_order_no") or generate_work_order_no(db),
                        title=str(title)[:200],
                        description=parsed_data.get("description"),
                        location=location,
                        spare_part_batch=parsed_data.get("spare_part_batch"),
                        hotline_number=parsed_data.get("hotline_number"),
                        inspection_photo_ref=parsed_data.get("inspection_photo_ref"),
                        creator_id=uploaded_by,
                        raw_record_id=db_raw.id,
                    )
                    
                    db_wo = create_work_order(db, wo_data)
                    created_work_order_ids.append(db_wo.id)
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    parse_errors.append({
                        "line": raw_rec["line_number"],
                        "error": f"创建工单失败: {str(e)}",
                        "data": raw_rec["original_data"],
                    })
            elif db_raw.is_parsed:
                success_count += 1
            else:
                failed_count += 1
                
        except Exception as e:
            failed_count += 1
            parse_errors.append({
                "line": raw_rec.get("line_number", 0),
                "error": f"处理原始记录失败: {str(e)}",
            })
    
    import_record.total_rows = len(raw_records)
    import_record.success_rows = success_count
    import_record.failed_rows = failed_count
    import_record.error_details = parse_errors
    db.commit()
    
    result = {
        "import_record_id": import_record.id,
        "source_file": filename,
        "source_type": source_type.value,
        "total": len(raw_records),
        "success": success_count,
        "failed": failed_count,
        "errors": parse_errors,
        "created_work_order_ids": created_work_order_ids,
    }
    
    if failed_count > 0 and success_count > 0:
        raise PartialImportError(
            f"部分导入成功: {success_count} 成功, {failed_count} 失败",
            success_count, failed_count, parse_errors
        )
    elif failed_count > 0:
        raise ImportError(f"导入失败: {parse_errors}")
    
    return result
