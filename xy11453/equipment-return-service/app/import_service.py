import os
import json
import csv
import hashlib
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import pandas as pd

from app import crud, schemas
from app.models import ImportSource
from app.schemas import ImportResult, WarehouseOrderCreate, ReturnRecordCreate, RepairEstimateCreate


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMPORT_DIR = os.path.join(BASE_DIR, "..", "data", "imports")
os.makedirs(IMPORT_DIR, exist_ok=True)


def save_uploaded_file(file_content: bytes, filename: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{filename}"
    file_path = os.path.join(IMPORT_DIR, safe_filename)
    with open(file_path, "wb") as f:
        f.write(file_content)
    return file_path


def calculate_file_hash(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def read_csv_file(file_path: str) -> List[Dict[str, Any]]:
    rows = []
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            rows.append({"row_number": row_num, "data": row})
    return rows


def read_excel_file(file_path: str) -> List[Dict[str, Any]]:
    df = pd.read_excel(file_path)
    rows = []
    for row_num, (_, row) in enumerate(df.iterrows(), start=2):
        rows.append({"row_number": row_num, "data": row.to_dict()})
    return rows


def parse_warehouse_order(row_data: Dict[str, Any]) -> WarehouseOrderCreate:
    def get_value(keys, default=None):
        for key in keys:
            if key in row_data and row_data[key] not in (None, ""):
                return row_data[key]
        return default

    return WarehouseOrderCreate(
        order_no=str(get_value(["order_no", "出库单号", "订单号"], "")),
        customer_id=str(get_value(["customer_id", "客户ID", "客户编号"], "")),
        customer_name=str(get_value(["customer_name", "客户名称", "客户"], None)),
        equipment_type=str(get_value(["equipment_type", "设备类型", "型号"], None)),
        equipment_code=str(get_value(["equipment_code", "设备编号", "设备编码"], None)),
        quantity=int(get_value(["quantity", "数量"], 1)),
        deposit_amount=float(get_value(["deposit_amount", "押金金额", "押金"], 0.0)),
        daily_rental=float(get_value(["daily_rental", "日租金", "租金"], 0.0)),
        rental_days=int(get_value(["rental_days", "租赁天数", "天数"], 0)),
        operator=str(get_value(["operator", "操作员", "经办人"], None)),
        remark=str(get_value(["remark", "备注", "说明"], None))
    )


def parse_return_record(row_data: Dict[str, Any]) -> ReturnRecordCreate:
    def get_value(keys, default=None):
        for key in keys:
            if key in row_data and row_data[key] not in (None, ""):
                return row_data[key]
        return default

    return ReturnRecordCreate(
        return_no=str(get_value(["return_no", "归还单号", "归还编号"], "")),
        customer_id=str(get_value(["customer_id", "客户ID", "客户编号"], None)),
        return_quantity=int(get_value(["return_quantity", "归还数量", "数量"], 0)),
        returned_equipment_codes=str(get_value(["returned_equipment_codes", "归还设备编号"], None)),
        condition_status=str(get_value(["condition_status", "设备状态", "状态"], None)),
        damage_description=str(get_value(["damage_description", "损坏描述", "损坏情况"], None)),
        is_partial=bool(get_value(["is_partial", "是否分批"], False)),
        batch_number=int(get_value(["batch_number", "批次号"], 1)),
        operator=str(get_value(["operator", "操作员", "经办人"], None)),
        remark=str(get_value(["remark", "备注", "说明"], None))
    )


def parse_repair_estimate(row_data: Dict[str, Any]) -> RepairEstimateCreate:
    def get_value(keys, default=None):
        for key in keys:
            if key in row_data and row_data[key] not in (None, ""):
                return row_data[key]
        return default

    return RepairEstimateCreate(
        estimate_no=str(get_value(["estimate_no", "估价单号", "估价编号"], "")),
        equipment_code=str(get_value(["equipment_code", "设备编号", "设备编码"], None)),
        damage_type=str(get_value(["damage_type", "损坏类型"], None)),
        damage_description=str(get_value(["damage_description", "损坏描述"], None)),
        estimate_amount=float(get_value(["estimate_amount", "估价金额", "金额"], 0.0)),
        parts_cost=float(get_value(["parts_cost", "配件成本"], 0.0)),
        labor_cost=float(get_value(["labor_cost", "人工成本"], 0.0)),
        is_customer_liable=bool(get_value(["is_customer_liable", "客户承担"], True)),
        reviewer=str(get_value(["reviewer", "审核人"], None)),
        status=str(get_value(["status", "状态"], "pending")),
        remark=str(get_value(["remark", "备注", "说明"], None))
    )


def process_import_file(db: Session, file_path: str, import_type: str, operator: str = None) -> ImportResult:
    file_hash = calculate_file_hash(file_path)
    filename = os.path.basename(file_path)

    if file_path.endswith('.csv'):
        rows = read_csv_file(file_path)
        source_type = ImportSource.FILE_CSV
    elif file_path.endswith(('.xlsx', '.xls')):
        rows = read_excel_file(file_path)
        source_type = ImportSource.FILE_EXCEL
    else:
        raise ValueError(f"Unsupported file format: {file_path}")

    parser_map = {
        "warehouse_order": (parse_warehouse_order, crud.warehouse_order, "warehouse_orders"),
        "return_record": (parse_return_record, crud.return_record, "return_records"),
        "repair_estimate": (parse_repair_estimate, crud.repair_estimate, "repair_estimates"),
    }

    if import_type not in parser_map:
        raise ValueError(f"Unsupported import type: {import_type}")

    parse_func, crud_func, target_table = parser_map[import_type]

    total_count = len(rows)
    success_count = 0
    failed_count = 0
    failed_details = []
    batch_no = None

    for row in rows:
        row_number = row["row_number"]
        raw_data = json.dumps(row["data"], ensure_ascii=False)
        
        is_duplicate = crud.import_record.check_duplicate(db, file_hash, row_number, target_table)
        
        if is_duplicate:
            failed_count += 1
            failed_details.append({
                "row_number": row_number,
                "error": "Duplicate import record"
            })
            continue

        try:
            parsed_obj = parse_func(row["data"])
            parsed_data = parsed_obj.model_dump_json()

            import_record = crud.import_record.create(
                db,
                source_type=source_type,
                source_file_name=filename,
                source_file_path=file_path,
                source_file_hash=file_hash,
                row_number=row_number,
                raw_data=raw_data,
                parsed_data=parsed_data,
                target_table=target_table,
                is_success=True,
                operator=operator
            )
            
            if batch_no is None:
                batch_no = import_record.import_batch_no

            crud_func.create(db, parsed_obj, import_record_id=import_record.id)
            success_count += 1
        except Exception as e:
            failed_count += 1
            error_msg = f"{type(e).__name__}: {str(e)}"
            
            crud.import_record.create(
                db,
                source_type=source_type,
                source_file_name=filename,
                source_file_path=file_path,
                source_file_hash=file_hash,
                row_number=row_number,
                raw_data=raw_data,
                parsed_data=None,
                target_table=target_table,
                is_success=False,
                error_message=error_msg,
                operator=operator
            )
            
            failed_details.append({
                "row_number": row_number,
                "error": error_msg
            })

    return ImportResult(
        batch_no=batch_no or f"IMP{datetime.now().strftime('%Y%m%d%H%M%S')}",
        total_count=total_count,
        success_count=success_count,
        failed_count=failed_count,
        failed_details=failed_details
    )
