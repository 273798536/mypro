import os
import json
import csv
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT_DIR = os.path.join(BASE_DIR, "..", "data", "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)


def generate_export(
    db: Session,
    export_type: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    customer_id: Optional[str] = None,
    include_evidence: bool = True
) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{export_type}_{timestamp}.csv"
    file_path = os.path.join(EXPORT_DIR, filename)

    from app import crud

    if export_type == "warehouse_orders":
        _export_warehouse_orders(db, file_path, start_date, end_date, customer_id, include_evidence)
    elif export_type == "return_records":
        _export_return_records(db, file_path, start_date, end_date, customer_id, include_evidence)
    elif export_type == "repair_estimates":
        _export_repair_estimates(db, file_path, start_date, end_date, include_evidence)
    elif export_type == "deposit_deductions":
        _export_deposit_deductions(db, file_path, start_date, end_date, customer_id, include_evidence)
    elif export_type == "import_records":
        _export_import_records(db, file_path, start_date, end_date, include_evidence)
    elif export_type == "async_tasks":
        _export_async_tasks(db, file_path, start_date, end_date, include_evidence)
    elif export_type == "replay_exceptions":
        _export_replay_exceptions(db, file_path, start_date, end_date, include_evidence)
    elif export_type == "full_reconciliation":
        _export_full_reconciliation(db, file_path, start_date, end_date, customer_id, include_evidence)
    else:
        raise ValueError(f"Unsupported export type: {export_type}")

    return file_path


def _export_warehouse_orders(db, file_path, start_date, end_date, customer_id, include_evidence):
    from app import crud
    orders = crud.warehouse_order.get_multi(db, limit=10000)
    if customer_id:
        orders = [o for o in orders if o.customer_id == customer_id]

    with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['order_no', 'customer_id', 'customer_name', 'equipment_type', 
                      'equipment_code', 'quantity', 'deposit_amount', 'daily_rental',
                      'outbound_date', 'shift_code', 'operator', 'created_at']
        if include_evidence:
            fieldnames.extend(['import_batch_no', 'source_file'])
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for order in orders:
            row = {
                'order_no': order.order_no,
                'customer_id': order.customer_id,
                'customer_name': order.customer_name or '',
                'equipment_type': order.equipment_type or '',
                'equipment_code': order.equipment_code or '',
                'quantity': order.quantity,
                'deposit_amount': order.deposit_amount,
                'daily_rental': order.daily_rental,
                'outbound_date': order.outbound_date.isoformat() if order.outbound_date else '',
                'shift_code': order.shift_code or '',
                'operator': order.operator or '',
                'created_at': order.created_at.isoformat()
            }
            if include_evidence and order.import_record:
                row['import_batch_no'] = order.import_record.import_batch_no
                row['source_file'] = order.import_record.source_file_name or ''
            writer.writerow(row)


def _export_return_records(db, file_path, start_date, end_date, customer_id, include_evidence):
    from app import crud
    records = crud.return_record.get_multi(db, limit=10000)
    if customer_id:
        records = [r for r in records if r.customer_id == customer_id]

    with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['return_no', 'warehouse_order_no', 'customer_id', 'return_date',
                      'return_quantity', 'condition_status', 'is_partial', 'batch_number',
                      'operator', 'created_at']
        if include_evidence:
            fieldnames.extend(['photo_count', 'import_batch_no', 'source_file'])
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for record in records:
            row = {
                'return_no': record.return_no,
                'warehouse_order_no': record.warehouse_order.order_no if record.warehouse_order else '',
                'customer_id': record.customer_id or '',
                'return_date': record.return_date.isoformat() if record.return_date else '',
                'return_quantity': record.return_quantity,
                'condition_status': record.condition_status or '',
                'is_partial': record.is_partial,
                'batch_number': record.batch_number,
                'operator': record.operator or '',
                'created_at': record.created_at.isoformat()
            }
            if include_evidence:
                row['photo_count'] = len(record.photos)
                if record.import_record:
                    row['import_batch_no'] = record.import_record.import_batch_no
                    row['source_file'] = record.import_record.source_file_name or ''
            writer.writerow(row)


def _export_repair_estimates(db, file_path, start_date, end_date, include_evidence):
    from app import crud
    estimates = db.query(crud.RepairEstimate).all()

    with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['estimate_no', 'warehouse_order_no', 'return_no', 'equipment_code',
                      'damage_type', 'estimate_amount', 'parts_cost', 'labor_cost',
                      'is_customer_liable', 'status', 'reviewer', 'created_at']
        if include_evidence:
            fieldnames.extend(['import_batch_no', 'source_file'])
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for estimate in estimates:
            row = {
                'estimate_no': estimate.estimate_no,
                'warehouse_order_no': estimate.warehouse_order.order_no if estimate.warehouse_order else '',
                'return_no': '',
                'equipment_code': estimate.equipment_code or '',
                'damage_type': estimate.damage_type or '',
                'estimate_amount': estimate.estimate_amount,
                'parts_cost': estimate.parts_cost,
                'labor_cost': estimate.labor_cost,
                'is_customer_liable': estimate.is_customer_liable,
                'status': estimate.status or '',
                'reviewer': estimate.reviewer or '',
                'created_at': estimate.created_at.isoformat()
            }
            if include_evidence and estimate.import_record:
                row['import_batch_no'] = estimate.import_record.import_batch_no
                row['source_file'] = estimate.import_record.source_file_name or ''
            writer.writerow(row)


def _export_deposit_deductions(db, file_path, start_date, end_date, customer_id, include_evidence):
    from app import crud
    deductions = crud.deposit_deduction.get_multi(db, limit=10000)
    if customer_id:
        deductions = [d for d in deductions if d.customer_id == customer_id]

    with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['deduction_no', 'warehouse_order_no', 'return_no', 'customer_id',
                      'deduction_type', 'deduction_amount', 'deduction_reason',
                      'is_manual_adjusted', 'operator', 'created_at']
        if include_evidence:
            fieldnames.append('evidence_chain')
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for ded in deductions:
            row = {
                'deduction_no': ded.deduction_no,
                'warehouse_order_no': ded.warehouse_order_no or '',
                'return_no': ded.return_record.return_no if ded.return_record else '',
                'customer_id': ded.customer_id or '',
                'deduction_type': ded.deduction_type or '',
                'deduction_amount': ded.deduction_amount,
                'deduction_reason': ded.deduction_reason or '',
                'is_manual_adjusted': ded.is_manual_adjusted,
                'operator': ded.operator or '',
                'created_at': ded.created_at.isoformat()
            }
            if include_evidence:
                row['evidence_chain'] = ded.evidence_chain or ''
            writer.writerow(row)


def _export_import_records(db, file_path, start_date, end_date, include_evidence):
    from app import crud
    records = crud.import_record.get_multi(db, limit=10000)

    with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['import_batch_no', 'source_type', 'source_file_name', 'row_number',
                      'target_table', 'is_success', 'error_message', 'operator', 'created_at']
        if include_evidence:
            fieldnames.extend(['raw_data', 'parsed_data'])
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for rec in records:
            row = {
                'import_batch_no': rec.import_batch_no,
                'source_type': rec.source_type.value if rec.source_type else '',
                'source_file_name': rec.source_file_name or '',
                'row_number': rec.row_number or '',
                'target_table': rec.target_table or '',
                'is_success': rec.is_success,
                'error_message': rec.error_message or '',
                'operator': rec.operator or '',
                'created_at': rec.created_at.isoformat()
            }
            if include_evidence:
                row['raw_data'] = rec.raw_data or ''
                row['parsed_data'] = rec.parsed_data or ''
            writer.writerow(row)


def _export_async_tasks(db, file_path, start_date, end_date, include_evidence):
    from app import crud
    tasks = db.query(crud.AsyncTask).all()

    with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['task_id', 'task_type', 'status', 'retry_count', 'max_retries',
                      'error_message', 'created_at', 'completed_at']
        if include_evidence:
            fieldnames.extend(['payload', 'result'])
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for task in tasks:
            row = {
                'task_id': task.task_id,
                'task_type': task.task_type,
                'status': task.status.value if task.status else '',
                'retry_count': task.retry_count,
                'max_retries': task.max_retries,
                'error_message': task.error_message or '',
                'created_at': task.created_at.isoformat(),
                'completed_at': task.completed_at.isoformat() if task.completed_at else ''
            }
            if include_evidence:
                row['payload'] = task.payload or ''
                row['result'] = task.result or ''
            writer.writerow(row)


def _export_replay_exceptions(db, file_path, start_date, end_date, include_evidence):
    from app import crud
    exceptions = crud.replay_exception.get_unresolved(db, limit=10000)

    with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['exception_no', 'replay_context', 'exception_type', 'exception_message',
                      'is_resolved', 'created_at']
        if include_evidence:
            fieldnames.extend(['stack_trace', 'data_snapshot'])
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for exc in exceptions:
            row = {
                'exception_no': exc.exception_no,
                'replay_context': exc.replay_context or '',
                'exception_type': exc.exception_type or '',
                'exception_message': exc.exception_message or '',
                'is_resolved': exc.is_resolved,
                'created_at': exc.created_at.isoformat()
            }
            if include_evidence:
                row['stack_trace'] = exc.stack_trace or ''
                row['data_snapshot'] = exc.data_snapshot or ''
            writer.writerow(row)


def _export_full_reconciliation(db, file_path, start_date, end_date, customer_id, include_evidence):
    from app import crud
    from app.business_logic import reconcile_partial_returns

    orders = crud.warehouse_order.get_multi(db, limit=10000)
    if customer_id:
        orders = [o for o in orders if o.customer_id == customer_id]

    with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['order_no', 'customer_id', 'customer_name', 'total_quantity',
                      'total_returned', 'remaining_quantity', 'is_fully_returned',
                      'batches_count', 'total_deducted', 'deposit_amount', 'remaining_deposit']
        if include_evidence:
            fieldnames.append('evidence_summary')
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for order in orders:
            recon = reconcile_partial_returns(db, order.order_no)
            remaining_deposit = order.deposit_amount - recon['total_deducted']
            
            row = {
                'order_no': order.order_no,
                'customer_id': order.customer_id,
                'customer_name': order.customer_name or '',
                'total_quantity': recon['total_quantity'],
                'total_returned': recon['total_returned'],
                'remaining_quantity': recon['remaining_quantity'],
                'is_fully_returned': recon['is_fully_returned'],
                'batches_count': recon['batches_count'],
                'total_deducted': recon['total_deducted'],
                'deposit_amount': order.deposit_amount,
                'remaining_deposit': max(0, remaining_deposit)
            }
            if include_evidence:
                row['evidence_summary'] = f"{recon['batches_count']}批次归还, {recon['existing_deductions_count']}次扣款记录"
            writer.writerow(row)
