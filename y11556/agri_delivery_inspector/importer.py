import os
import json
import hashlib
import pandas as pd
from datetime import datetime
from pathlib import Path
from .config import get_session, SOURCE_TYPES, SOURCE_TYPE_NAMES
from .models import ImportBatch, ImportRecord, RawData, StandardData


def generate_batch_no(source_type):
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{source_type.upper()[:3]}-{timestamp}"


def calculate_file_hash(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def check_duplicate_file(session, file_hash, source_type):
    existing = session.query(ImportBatch).filter(
        ImportBatch.file_hash == file_hash,
        ImportBatch.source_type == source_type,
        ImportBatch.is_frozen == False
    ).first()
    return existing is not None, existing


def parse_excel(file_path, source_type):
    df = pd.read_excel(file_path, dtype=str)
    df = df.where(pd.notnull(df), None)
    return df


def parse_csv(file_path, source_type):
    df = pd.read_csv(file_path, dtype=str, low_memory=False)
    df = df.where(pd.notnull(df), None)
    return df


def parse_file(file_path, source_type):
    ext = Path(file_path).suffix.lower()
    if ext in ['.xlsx', '.xls']:
        return parse_excel(file_path, source_type)
    elif ext == '.csv':
        return parse_csv(file_path, source_type)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def standardize_store_order(row, row_idx):
    std = StandardData(
        data_type="store_order",
        order_no=str(row.get("订单号") or row.get("order_no") or "").strip(),
        store_code=str(row.get("门店编码") or row.get("store_code") or "").strip(),
        store_name=str(row.get("门店名称") or row.get("store_name") or "").strip(),
        product_code=str(row.get("商品编码") or row.get("product_code") or "").strip(),
        product_name=str(row.get("商品名称") or row.get("product_name") or "").strip(),
        quantity=float(row.get("数量") or row.get("quantity") or 0),
        unit=str(row.get("单位") or row.get("unit") or "").strip(),
        price=float(row.get("单价") or row.get("price") or 0),
        amount=float(row.get("金额") or row.get("amount") or 0),
        delivery_date=parse_datetime(row.get("配送日期") or row.get("delivery_date")),
        is_credit=str(row.get("是否赊销") or row.get("is_credit") or "").lower() in ["是", "true", "1", "yes"],
        credit_amount=float(row.get("赊销金额") or row.get("credit_amount") or 0)
    )
    return std


def standardize_driver_track(row, row_idx):
    std = StandardData(
        data_type="driver_track",
        order_no=str(row.get("订单号") or row.get("order_no") or "").strip(),
        driver_name=str(row.get("司机姓名") or row.get("driver_name") or "").strip(),
        driver_phone=str(row.get("司机电话") or row.get("driver_phone") or "").strip(),
        vehicle_no=str(row.get("车牌号") or row.get("vehicle_no") or "").strip(),
        store_code=str(row.get("门店编码") or row.get("store_code") or "").strip(),
        store_name=str(row.get("门店名称") or row.get("store_name") or "").strip(),
        product_code=str(row.get("商品编码") or row.get("product_code") or "").strip(),
        product_name=str(row.get("商品名称") or row.get("product_name") or "").strip(),
        quantity=float(row.get("数量") or row.get("quantity") or 0),
        delivery_date=parse_datetime(row.get("配送日期") or row.get("delivery_date"))
    )
    return std


def standardize_sign_receipt(row, row_idx):
    std = StandardData(
        data_type="sign_receipt",
        order_no=str(row.get("订单号") or row.get("order_no") or "").strip(),
        store_code=str(row.get("门店编码") or row.get("store_code") or "").strip(),
        store_name=str(row.get("门店名称") or row.get("store_name") or "").strip(),
        product_code=str(row.get("商品编码") or row.get("product_code") or "").strip(),
        product_name=str(row.get("商品名称") or row.get("product_name") or "").strip(),
        quantity=float(row.get("数量") or row.get("quantity") or 0),
        amount=float(row.get("金额") or row.get("amount") or 0),
        sign_date=parse_datetime(row.get("签收日期") or row.get("sign_date")),
        sign_person=str(row.get("签收人") or row.get("sign_person") or "").strip(),
        sign_remark=str(row.get("备注") or row.get("remark") or "").strip(),
        is_credit=str(row.get("是否赊销") or row.get("is_credit") or "").lower() in ["是", "true", "1", "yes"],
        credit_amount=float(row.get("赊销金额") or row.get("credit_amount") or 0),
        is_substitute=str(row.get("是否替代") or row.get("is_substitute") or "").lower() in ["是", "true", "1", "yes"],
        substitute_from=str(row.get("原商品") or row.get("substitute_from") or "").strip(),
        substitute_to=str(row.get("替代商品") or row.get("substitute_to") or "").strip()
    )
    return std


def standardize_second_confirm(row, row_idx):
    std = StandardData(
        data_type="second_confirm",
        order_no=str(row.get("订单号") or row.get("order_no") or "").strip(),
        store_code=str(row.get("门店编码") or row.get("store_code") or "").strip(),
        store_name=str(row.get("门店名称") or row.get("store_name") or "").strip(),
        product_code=str(row.get("商品编码") or row.get("product_code") or "").strip(),
        product_name=str(row.get("商品名称") or row.get("product_name") or "").strip(),
        quantity=float(row.get("数量") or row.get("quantity") or 0),
        amount=float(row.get("金额") or row.get("amount") or 0),
        second_confirm_date=parse_datetime(row.get("二次确认日期") or row.get("second_confirm_date")),
        sign_person=str(row.get("确认人") or row.get("confirm_person") or "").strip(),
        is_credit=str(row.get("是否赊销") or row.get("is_credit") or "").lower() in ["是", "true", "1", "yes"],
        credit_amount=float(row.get("赊销金额") or row.get("credit_amount") or 0)
    )
    return std


def parse_datetime(value):
    if value is None or pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value
    try:
        return pd.to_datetime(str(value)).to_pydatetime()
    except:
        return None


STANDARDIZERS = {
    "store_order": standardize_store_order,
    "driver_track": standardize_driver_track,
    "sign_receipt": standardize_sign_receipt,
    "second_confirm": standardize_second_confirm
}


def import_file(file_path, source_type, operator="system", remark="", db_path=None):
    if source_type not in SOURCE_TYPES:
        return {
            "success": False,
            "message": f"无效的来源类型: {source_type}，可选值: {', '.join(SOURCE_TYPES)}"
        }
    
    if not os.path.exists(file_path):
        return {
            "success": False,
            "message": f"文件不存在: {file_path}"
        }
    
    session = get_session(db_path=db_path)
    
    try:
        file_hash = calculate_file_hash(file_path)
        is_dup, dup_batch = check_duplicate_file(session, file_hash, source_type)
        
        if is_dup:
            return {
                "success": False,
                "message": f"文件已重复导入，批次号: {dup_batch.batch_no}，导入时间: {dup_batch.imported_at}",
                "duplicate_batch": dup_batch.batch_no
            }
        
        df = parse_file(file_path, source_type)
        standardizer = STANDARDIZERS.get(source_type)
        
        batch_no = generate_batch_no(source_type)
        batch = ImportBatch(
            batch_no=batch_no,
            source_type=source_type,
            source_file=os.path.abspath(file_path),
            file_hash=file_hash,
            imported_by=operator,
            total_rows=len(df),
            remark=remark
        )
        session.add(batch)
        session.flush()
        
        success_count = 0
        fail_count = 0
        errors = []
        
        for idx, (_, row) in enumerate(df.iterrows()):
            row_num = idx + 2
            try:
                record = ImportRecord(
                    batch_id=batch.id,
                    source_row=row_num
                )
                session.add(record)
                session.flush()
                
                raw_json = json.dumps(row.to_dict(), ensure_ascii=False, default=str)
                raw_data = RawData(
                    record_id=record.id,
                    raw_json=raw_json,
                    source_file=os.path.abspath(file_path),
                    source_row=row_num
                )
                session.add(raw_data)
                
                std_data = standardizer(row, row_num)
                std_data.record_id = record.id
                session.add(std_data)
                
                success_count += 1
                
            except Exception as e:
                fail_count += 1
                errors.append({
                    "row": row_num,
                    "error": str(e)
                })
        
        batch.success_rows = success_count
        batch.failed_rows = fail_count
        session.commit()
        
        return {
            "success": True,
            "message": f"导入完成: 成功 {success_count} 条，失败 {fail_count} 条",
            "batch_no": batch_no,
            "source_type": source_type,
            "source_type_name": SOURCE_TYPE_NAMES[source_type],
            "source_file": os.path.abspath(file_path),
            "total_rows": len(df),
            "success_rows": success_count,
            "failed_rows": fail_count,
            "errors": errors[:20],
            "imported_at": batch.imported_at.isoformat()
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"导入失败: {str(e)}"
        }
    finally:
        session.close()


def reimport_file(file_path, source_type, original_batch_no, operator="system", db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        original_batch = session.query(ImportBatch).filter(
            ImportBatch.batch_no == original_batch_no
        ).first()
        
        if not original_batch:
            return {
                "success": False,
                "message": f"原批次不存在: {original_batch_no}"
            }
        
        result = import_file(file_path, source_type, operator, f"重导入，原批次: {original_batch_no}", db_path)
        
        if result["success"]:
            new_batch = session.query(ImportBatch).filter(
                ImportBatch.batch_no == result["batch_no"]
            ).first()
            if new_batch:
                new_batch.parent_batch_id = original_batch.id
                session.commit()
                result["parent_batch"] = original_batch_no
        
        return result
        
    finally:
        session.close()


def withdraw_batch(batch_no, reason, operator="system", db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        batch = session.query(ImportBatch).filter(
            ImportBatch.batch_no == batch_no
        ).first()
        
        if not batch:
            return {
                "success": False,
                "message": f"批次不存在: {batch_no}"
            }
        
        if batch.is_frozen:
            return {
                "success": False,
                "message": f"批次已冻结，无法撤回"
            }
        
        for record in batch.records:
            record.is_deleted = True
            record.deleted_at = datetime.now()
            record.deleted_reason = reason
        
        batch.status = "withdrawn"
        session.commit()
        
        return {
            "success": True,
            "message": f"批次 {batch_no} 已撤回",
            "batch_no": batch_no,
            "withdrawn_at": datetime.now().isoformat(),
            "reason": reason,
            "record_count": len(batch.records)
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"撤回失败: {str(e)}"
        }
    finally:
        session.close()


def list_batches(source_type=None, status=None, limit=50, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        query = session.query(ImportBatch).order_by(ImportBatch.imported_at.desc())
        
        if source_type:
            query = query.filter(ImportBatch.source_type == source_type)
        if status:
            query = query.filter(ImportBatch.status == status)
        
        batches = query.limit(limit).all()
        
        result = []
        for batch in batches:
            result.append({
                "batch_no": batch.batch_no,
                "source_type": batch.source_type,
                "source_type_name": SOURCE_TYPE_NAMES.get(batch.source_type, batch.source_type),
                "source_file": batch.source_file,
                "imported_at": batch.imported_at.isoformat(),
                "total_rows": batch.total_rows,
                "success_rows": batch.success_rows,
                "failed_rows": batch.failed_rows,
                "status": batch.status,
                "is_frozen": batch.is_frozen
            })
        
        return {
            "success": True,
            "batches": result,
            "count": len(result)
        }
        
    finally:
        session.close()
