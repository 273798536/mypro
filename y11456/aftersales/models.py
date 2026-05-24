import json
import hashlib
import sqlite3
import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional, Any
from .database import get_connection


def generate_batch_no() -> str:
    return f"BATCH{datetime.now().strftime('%Y%m%d%H%M%S')}"


def get_current_timestamp() -> str:
    return datetime.now().isoformat()


def create_batch(description: str = "") -> str:
    batch_no = generate_batch_no()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO batches (batch_no, created_at, description) VALUES (?, ?, ?)",
            (batch_no, get_current_timestamp(), description)
        )
        conn.commit()
    return batch_no


def get_batch(batch_no: str) -> Optional[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM batches WHERE batch_no = ?", (batch_no,))
        row = cursor.fetchone()
        return dict(row) if row else None


def list_batches(limit: int = 20) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM batches ORDER BY created_at DESC LIMIT ?",
            (limit,)
        )
        return [dict(row) for row in cursor.fetchall()]


def calculate_file_hash(file_path: str) -> str:
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def create_source_file(batch_id: int, file_type: str, file_name: str, 
                       file_path: str, total_rows: int) -> int:
    file_hash = calculate_file_hash(file_path)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO source_files 
               (batch_id, file_type, file_name, file_hash, imported_at, total_rows)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (batch_id, file_type, file_name, file_hash, 
             get_current_timestamp(), total_rows)
        )
        conn.commit()
        return cursor.lastrowid


def check_duplicate_file(batch_id: int, file_type: str, file_path: str) -> bool:
    file_hash = calculate_file_hash(file_path)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM source_files WHERE batch_id = ? AND file_type = ? AND file_hash = ?",
            (batch_id, file_type, file_hash)
        )
        return cursor.fetchone() is not None


def safe_str(value: Any) -> str:
    if value is None:
        return ''
    try:
        if pd.isna(value):
            return ''
    except:
        pass
    s = str(value).strip()
    if s.lower() == 'nan':
        return ''
    return s


def safe_float(value: Any) -> float:
    if value is None:
        return 0.0
    try:
        if pd.isna(value):
            return 0.0
    except:
        pass
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def safe_int(value: Any) -> int:
    if value is None:
        return 0
    try:
        if pd.isna(value):
            return 0
    except:
        pass
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return 0


def insert_raw_record(batch_id: int, source_file_id: int, source_type: str,
                      original_row_no: int, parsed_data: Dict, raw_data: str) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO raw_records 
               (batch_id, source_file_id, source_type, original_row_no, 
                order_no, sku_code, sku_name, refund_amount, warehouse_refund_amount,
                refund_reason, problem_type, quantity, user_remark, warehouse_remark, 
                leader_remark, external_receipt, receipt_description, 
                parsed_data, raw_data, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                batch_id, source_file_id, source_type, original_row_no,
                safe_str(parsed_data.get('order_no')),
                safe_str(parsed_data.get('sku_code')),
                safe_str(parsed_data.get('sku_name')),
                safe_float(parsed_data.get('refund_amount')),
                safe_float(parsed_data.get('warehouse_refund_amount')),
                safe_str(parsed_data.get('refund_reason')),
                safe_str(parsed_data.get('problem_type')),
                safe_int(parsed_data.get('quantity')),
                safe_str(parsed_data.get('user_remark')),
                safe_str(parsed_data.get('warehouse_remark')),
                safe_str(parsed_data.get('leader_remark')),
                safe_str(parsed_data.get('external_receipt')),
                safe_str(parsed_data.get('receipt_description')),
                json.dumps(parsed_data, ensure_ascii=False),
                raw_data,
                get_current_timestamp()
            )
        )
        conn.commit()
        return cursor.lastrowid


def get_raw_records_by_batch(batch_id: int) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT r.*, s.file_name, s.file_type 
               FROM raw_records r 
               JOIN source_files s ON r.source_file_id = s.id
               WHERE r.batch_id = ?
               ORDER BY r.original_row_no""",
            (batch_id,)
        )
        records = [dict(row) for row in cursor.fetchall()]
        for r in records:
            if r.get('parsed_data'):
                r['parsed_data'] = json.loads(r['parsed_data'])
        return records


def upsert_aftersales_order(batch_id: int, order_no: str, sku_code: str, 
                            **kwargs) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM aftersales_orders WHERE batch_id = ? AND order_no = ? AND sku_code = ?",
            (batch_id, order_no, sku_code)
        )
        existing = cursor.fetchone()
        
        now = get_current_timestamp()
        if existing:
            order_id = existing['id']
            update_fields = ", ".join([f"{k} = ?" for k in kwargs.keys()])
            values = list(kwargs.values()) + [now, order_id]
            cursor.execute(
                f"UPDATE aftersales_orders SET {update_fields}, updated_at = ? WHERE id = ?",
                values
            )
        else:
            fields = ['batch_id', 'order_no', 'sku_code', 'created_at', 'updated_at']
            placeholders = ['?', '?', '?', '?', '?']
            values = [batch_id, order_no, sku_code, now, now]
            for k, v in kwargs.items():
                fields.append(k)
                placeholders.append('?')
                values.append(v)
            cursor.execute(
                f"INSERT INTO aftersales_orders ({', '.join(fields)}) VALUES ({', '.join(placeholders)})",
                values
            )
            order_id = cursor.lastrowid
        
        conn.commit()
        return order_id


def get_aftersales_orders(batch_id: int, status: str = None) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM aftersales_orders WHERE batch_id = ?"
        params = [batch_id]
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY order_no, sku_code"
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def get_order_by_id(order_id: int) -> Optional[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM aftersales_orders WHERE id = ?", (order_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def add_check_result(order_id: int, check_type: str, check_result: str, 
                     detail: str = None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO check_results 
               (order_id, check_type, check_result, detail, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (order_id, check_type, check_result, detail, get_current_timestamp())
        )
        conn.commit()


def get_check_results(order_id: int) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM check_results WHERE order_id = ? ORDER BY created_at",
            (order_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


def insert_failed_record(batch_id: int, source_file_id: int, source_type: str,
                         original_row_no: int, order_no: str, sku_code: str,
                         sku_name: str, failure_type: str, error_message: str,
                         raw_data: str = None) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO failed_records 
               (batch_id, source_file_id, source_type, original_row_no,
                order_no, sku_code, sku_name, failure_type, error_message, 
                raw_data, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                batch_id, source_file_id, source_type, original_row_no,
                safe_str(order_no), safe_str(sku_code), safe_str(sku_name),
                failure_type, error_message, raw_data, get_current_timestamp()
            )
        )
        conn.commit()
        return cursor.lastrowid


def get_failed_records_by_batch(batch_id: int) -> List[Dict]:
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT fr.*, sf.file_name 
            FROM failed_records fr
            LEFT JOIN source_files sf ON fr.source_file_id = sf.id
            WHERE fr.batch_id = ? 
            ORDER BY fr.original_row_no
        """, (batch_id,))
        return [dict(row) for row in cursor.fetchall()]


def get_failed_records_by_source(source_file_id: int) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM failed_records WHERE source_file_id = ? ORDER BY original_row_no",
            (source_file_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


def get_failed_stats(batch_id: int) -> Dict:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT failure_type, COUNT(*) as count
            FROM failed_records 
            WHERE batch_id = ? 
            GROUP BY failure_type
        """, (batch_id,))
        stats = {}
        for row in cursor.fetchall():
            stats[row['failure_type']] = row['count']
        return {
            'total': sum(stats.values()),
            'by_type': stats
        }


def add_adjustment(order_id: int, adjust_type: str, old_value: str, 
                   new_value: str, operator: str = None, reason: str = None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO adjustments 
               (order_id, adjust_type, old_value, new_value, operator, reason, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (order_id, adjust_type, old_value, new_value, 
             operator, reason, get_current_timestamp())
        )
        conn.commit()


def get_adjustments(order_id: int) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM adjustments WHERE order_id = ? ORDER BY created_at",
            (order_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


def freeze_order(order_id: int, operator: str = None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE aftersales_orders SET is_frozen = 1, updated_at = ? WHERE id = ?",
            (get_current_timestamp(), order_id)
        )
        conn.commit()
        add_adjustment(order_id, 'freeze', 'unfrozen', 'frozen', operator, '导出前冻结')


def unfreeze_order(order_id: int, operator: str = None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE aftersales_orders SET is_frozen = 0, updated_at = ? WHERE id = ?",
            (get_current_timestamp(), order_id)
        )
        conn.commit()
        add_adjustment(order_id, 'unfreeze', 'frozen', 'unfrozen', operator, '解除冻结')


def mark_exported(order_ids: List[int], export_type: str, file_path: str, 
                  batch_id: int, operator: str = None) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO export_records 
               (batch_id, export_time, export_type, record_count, file_path, operator)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (batch_id, get_current_timestamp(), export_type, 
             len(order_ids), file_path, operator)
        )
        export_id = cursor.lastrowid
        
        for order_id in order_ids:
            cursor.execute(
                "UPDATE aftersales_orders SET is_exported = 1, updated_at = ? WHERE id = ?",
                (get_current_timestamp(), order_id)
            )
        
        conn.commit()
        return export_id


def get_export_records(batch_id: int) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM export_records WHERE batch_id = ? ORDER BY export_time DESC",
            (batch_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


def get_source_files(batch_id: int) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM source_files WHERE batch_id = ? ORDER BY imported_at",
            (batch_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


def delete_source_file_records(source_file_id: int, operator: str = None) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, order_no, sku_code FROM raw_records WHERE source_file_id = ?",
            (source_file_id,)
        )
        raw_records = cursor.fetchall()
        
        cursor.execute(
            "DELETE FROM raw_records WHERE source_file_id = ?",
            (source_file_id,)
        )
        deleted_count = cursor.rowcount
        
        cursor.execute(
            "DELETE FROM source_files WHERE id = ?",
            (source_file_id,)
        )
        
        conn.commit()
        return deleted_count


def get_batch_stats(batch_id: int) -> Dict:
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT COUNT(*) as total, "
            "SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed, "
            "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed, "
            "SUM(CASE WHEN status = 'manual' THEN 1 ELSE 0 END) as manual, "
            "SUM(CASE WHEN is_frozen = 1 THEN 1 ELSE 0 END) as frozen, "
            "SUM(CASE WHEN is_exported = 1 THEN 1 ELSE 0 END) as exported "
            "FROM aftersales_orders WHERE batch_id = ?",
            (batch_id,)
        )
        order_stats = dict(cursor.fetchone())
        
        cursor.execute(
            "SELECT COUNT(*) as raw_count FROM raw_records WHERE batch_id = ?",
            (batch_id,)
        )
        raw_count = cursor.fetchone()['raw_count']
        
        return {
            **order_stats,
            'raw_records': raw_count
        }
