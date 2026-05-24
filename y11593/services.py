from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from database import (
    WaveOrder, PickDifference, ReviewScan, TempSupplement, ShiftRecord,
    ImportSource, AsyncTask, ReplayRecord, ExceptionRecord, PerformanceSnapshot, OperationLog
)
from utils import (
    generate_unique_hash, generate_id, parse_datetime, safe_int, safe_str,
    calculate_diff, calculate_wave_diff, get_fail_type, calculate_next_retry_time,
    model_to_dict, setup_logger
)
import pandas as pd
import json

logger = setup_logger("services")

class DuplicateChecker:
    def __init__(self, db: Session):
        self.db = db
    
    def check_wave_duplicate(self, data: Dict) -> Tuple[bool, Optional[int]]:
        unique_hash = generate_unique_hash(data, ['id', 'created_at', 'updated_at', 'source_file', 'source_line', 'raw_data'])
        existing = self.db.query(WaveOrder).filter(WaveOrder.unique_hash == unique_hash).first()
        if existing:
            return True, existing.id
        return False, None
    
    def check_pick_diff_duplicate(self, data: Dict) -> Tuple[bool, Optional[int]]:
        unique_hash = generate_unique_hash(data, ['id', 'created_at', 'updated_at', 'source_file', 'source_line', 'raw_data'])
        existing = self.db.query(PickDifference).filter(PickDifference.unique_hash == unique_hash).first()
        if existing:
            return True, existing.id
        return False, None
    
    def check_review_scan_duplicate(self, data: Dict) -> Tuple[bool, Optional[int]]:
        unique_hash = generate_unique_hash(data, ['id', 'created_at', 'updated_at', 'source_file', 'source_line', 'raw_data'])
        existing = self.db.query(ReviewScan).filter(ReviewScan.unique_hash == unique_hash).first()
        if existing:
            return True, existing.id
        return False, None
    
    def check_supplement_duplicate(self, data: Dict) -> Tuple[bool, Optional[int]]:
        unique_hash = generate_unique_hash(data, ['id', 'created_at', 'updated_at', 'source_file', 'source_line', 'raw_data'])
        existing = self.db.query(TempSupplement).filter(TempSupplement.unique_hash == unique_hash).first()
        if existing:
            return True, existing.id
        return False, None
    
    def check_shift_duplicate(self, data: Dict) -> Tuple[bool, Optional[int]]:
        unique_hash = generate_unique_hash(data, ['id', 'created_at', 'updated_at', 'source_file', 'source_line', 'raw_data'])
        existing = self.db.query(ShiftRecord).filter(ShiftRecord.unique_hash == unique_hash).first()
        if existing:
            return True, existing.id
        return False, None

class ImportService:
    def __init__(self, db: Session):
        self.db = db
        self.duplicate_checker = DuplicateChecker(db)
    
    def import_wave_orders(self, file_path: str, source_file: str) -> Dict:
        df = pd.read_excel(file_path) if file_path.endswith(('.xlsx', '.xls')) else pd.read_csv(file_path)
        df = df.fillna('')
        
        import_source = ImportSource(
            source_file=source_file,
            source_type='wave_order',
            total_rows=len(df)
        )
        self.db.add(import_source)
        self.db.flush()
        
        success_count = 0
        duplicate_count = 0
        failed_count = 0
        
        for idx, row in df.iterrows():
            try:
                raw_data = row.to_dict()
                data = {
                    'wave_no': safe_str(row.get('波次号', row.get('wave_no', ''))),
                    'order_no': safe_str(row.get('订单号', row.get('order_no', ''))),
                    'sku_code': safe_str(row.get('商品编码', row.get('sku_code', ''))),
                    'sku_name': safe_str(row.get('商品名称', row.get('sku_name', ''))),
                    'plan_qty': safe_int(row.get('计划数量', row.get('plan_qty', 0))),
                    'pick_qty': safe_int(row.get('拣货数量', row.get('pick_qty', 0))),
                    'review_qty': safe_int(row.get('复核数量', row.get('review_qty', 0))),
                    'shortage_qty': safe_int(row.get('缺货数量', row.get('shortage_qty', 0))),
                    'status': safe_str(row.get('状态', row.get('status', 'pending'))),
                    'warehouse': safe_str(row.get('仓库', row.get('warehouse', ''))),
                    'picker': safe_str(row.get('拣货员', row.get('picker', ''))),
                    'reviewer': safe_str(row.get('复核员', row.get('reviewer', ''))),
                    'shift_code': safe_str(row.get('班次', row.get('shift_code', ''))),
                    'is_split': bool(row.get('是否拆单', row.get('is_split', False))),
                    'parent_wave_no': safe_str(row.get('原波次号', row.get('parent_wave_no', ''))),
                    'split_reason': safe_str(row.get('拆单原因', row.get('split_reason', ''))),
                }
                
                is_dup, dup_of = self.duplicate_checker.check_wave_duplicate(data)
                unique_hash = generate_unique_hash(data)
                
                wave = WaveOrder(
                    **data,
                    source_file=source_file,
                    source_line=idx + 2,
                    raw_data=json.dumps(raw_data, ensure_ascii=False),
                    unique_hash=unique_hash,
                    is_duplicate=is_dup,
                    duplicate_of=dup_of
                )
                self.db.add(wave)
                
                if is_dup:
                    duplicate_count += 1
                else:
                    success_count += 1
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"导入波次单第{idx+2}行失败: {str(e)}")
        
        import_source.success_rows = success_count
        import_source.failed_rows = failed_count
        self.db.commit()
        
        return {
            'total': len(df),
            'success': success_count,
            'duplicate': duplicate_count,
            'failed': failed_count,
            'source_id': import_source.id
        }
    
    def import_pick_differences(self, file_path: str, source_file: str) -> Dict:
        df = pd.read_excel(file_path) if file_path.endswith(('.xlsx', '.xls')) else pd.read_csv(file_path)
        df = df.fillna('')
        
        import_source = ImportSource(
            source_file=source_file,
            source_type='pick_difference',
            total_rows=len(df)
        )
        self.db.add(import_source)
        self.db.flush()
        
        success_count = 0
        duplicate_count = 0
        failed_count = 0
        
        for idx, row in df.iterrows():
            try:
                raw_data = row.to_dict()
                data = {
                    'diff_no': safe_str(row.get('差异单号', row.get('diff_no', ''))),
                    'wave_no': safe_str(row.get('波次号', row.get('wave_no', ''))),
                    'order_no': safe_str(row.get('订单号', row.get('order_no', ''))),
                    'sku_code': safe_str(row.get('商品编码', row.get('sku_code', ''))),
                    'plan_qty': safe_int(row.get('计划数量', row.get('plan_qty', 0))),
                    'actual_pick_qty': safe_int(row.get('实际拣货', row.get('actual_pick_qty', 0))),
                    'diff_qty': safe_int(row.get('差异数量', row.get('diff_qty', 0))),
                    'diff_type': safe_str(row.get('差异类型', row.get('diff_type', ''))),
                    'reason_code': safe_str(row.get('原因编码', row.get('reason_code', ''))),
                    'reason_desc': safe_str(row.get('原因描述', row.get('reason_desc', ''))),
                    'handler': safe_str(row.get('处理人', row.get('handler', ''))),
                    'handle_time': parse_datetime(row.get('处理时间', row.get('handle_time', None))),
                    'handle_result': safe_str(row.get('处理结果', row.get('handle_result', ''))),
                }
                
                is_dup, dup_of = self.duplicate_checker.check_pick_diff_duplicate(data)
                unique_hash = generate_unique_hash(data)
                
                diff = PickDifference(
                    **data,
                    source_file=source_file,
                    source_line=idx + 2,
                    raw_data=json.dumps(raw_data, ensure_ascii=False),
                    unique_hash=unique_hash,
                    is_duplicate=is_dup,
                    duplicate_of=dup_of
                )
                self.db.add(diff)
                
                if is_dup:
                    duplicate_count += 1
                else:
                    success_count += 1
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"导入拣货差异第{idx+2}行失败: {str(e)}")
        
        import_source.success_rows = success_count
        import_source.failed_rows = failed_count
        self.db.commit()
        
        return {
            'total': len(df),
            'success': success_count,
            'duplicate': duplicate_count,
            'failed': failed_count,
            'source_id': import_source.id
        }
    
    def import_review_scans(self, file_path: str, source_file: str) -> Dict:
        df = pd.read_excel(file_path) if file_path.endswith(('.xlsx', '.xls')) else pd.read_csv(file_path)
        df = df.fillna('')
        
        import_source = ImportSource(
            source_file=source_file,
            source_type='review_scan',
            total_rows=len(df)
        )
        self.db.add(import_source)
        self.db.flush()
        
        success_count = 0
        duplicate_count = 0
        failed_count = 0
        
        for idx, row in df.iterrows():
            try:
                raw_data = row.to_dict()
                data = {
                    'scan_no': safe_str(row.get('扫描单号', row.get('scan_no', ''))),
                    'wave_no': safe_str(row.get('波次号', row.get('wave_no', ''))),
                    'order_no': safe_str(row.get('订单号', row.get('order_no', ''))),
                    'sku_code': safe_str(row.get('商品编码', row.get('sku_code', ''))),
                    'scan_qty': safe_int(row.get('扫描数量', row.get('scan_qty', 0))),
                    'scan_time': parse_datetime(row.get('扫描时间', row.get('scan_time', None))),
                    'scanner': safe_str(row.get('扫描员', row.get('scanner', ''))),
                    'review_result': safe_str(row.get('复核结果', row.get('review_result', ''))),
                    'is_pass': bool(row.get('是否通过', row.get('is_pass', True))),
                    'fail_reason': safe_str(row.get('失败原因', row.get('fail_reason', ''))),
                }
                
                is_dup, dup_of = self.duplicate_checker.check_review_scan_duplicate(data)
                unique_hash = generate_unique_hash(data)
                
                scan = ReviewScan(
                    **data,
                    source_file=source_file,
                    source_line=idx + 2,
                    raw_data=json.dumps(raw_data, ensure_ascii=False),
                    unique_hash=unique_hash,
                    is_duplicate=is_dup,
                    duplicate_of=dup_of
                )
                self.db.add(scan)
                
                if is_dup:
                    duplicate_count += 1
                else:
                    success_count += 1
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"导入复核扫描第{idx+2}行失败: {str(e)}")
        
        import_source.success_rows = success_count
        import_source.failed_rows = failed_count
        self.db.commit()
        
        return {
            'total': len(df),
            'success': success_count,
            'duplicate': duplicate_count,
            'failed': failed_count,
            'source_id': import_source.id
        }
    
    def import_temp_supplements(self, file_path: str, source_file: str) -> Dict:
        df = pd.read_excel(file_path) if file_path.endswith(('.xlsx', '.xls')) else pd.read_csv(file_path)
        df = df.fillna('')
        
        import_source = ImportSource(
            source_file=source_file,
            source_type='temp_supplement',
            total_rows=len(df)
        )
        self.db.add(import_source)
        self.db.flush()
        
        success_count = 0
        duplicate_count = 0
        failed_count = 0
        
        for idx, row in df.iterrows():
            try:
                raw_data = row.to_dict()
                data = {
                    'supplement_no': safe_str(row.get('补录单号', row.get('supplement_no', ''))),
                    'wave_no': safe_str(row.get('波次号', row.get('wave_no', ''))),
                    'order_no': safe_str(row.get('订单号', row.get('order_no', ''))),
                    'sku_code': safe_str(row.get('商品编码', row.get('sku_code', ''))),
                    'supplement_qty': safe_int(row.get('补录数量', row.get('supplement_qty', 0))),
                    'supplement_type': safe_str(row.get('补录类型', row.get('supplement_type', ''))),
                    'reason_code': safe_str(row.get('原因编码', row.get('reason_code', ''))),
                    'reason_desc': safe_str(row.get('原因描述', row.get('reason_desc', ''))),
                    'operator': safe_str(row.get('操作人', row.get('operator', ''))),
                    'operate_time': parse_datetime(row.get('操作时间', row.get('operate_time', None))),
                }
                
                is_dup, dup_of = self.duplicate_checker.check_supplement_duplicate(data)
                unique_hash = generate_unique_hash(data)
                
                supplement = TempSupplement(
                    **data,
                    source_file=source_file,
                    source_line=idx + 2,
                    raw_data=json.dumps(raw_data, ensure_ascii=False),
                    unique_hash=unique_hash,
                    is_duplicate=is_dup,
                    duplicate_of=dup_of
                )
                self.db.add(supplement)
                
                if is_dup:
                    duplicate_count += 1
                else:
                    success_count += 1
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"导入临时补录第{idx+2}行失败: {str(e)}")
        
        import_source.success_rows = success_count
        import_source.failed_rows = failed_count
        self.db.commit()
        
        return {
            'total': len(df),
            'success': success_count,
            'duplicate': duplicate_count,
            'failed': failed_count,
            'source_id': import_source.id
        }
    
    def import_shift_records(self, file_path: str, source_file: str) -> Dict:
        df = pd.read_excel(file_path) if file_path.endswith(('.xlsx', '.xls')) else pd.read_csv(file_path)
        df = df.fillna('')
        
        import_source = ImportSource(
            source_file=source_file,
            source_type='shift_record',
            total_rows=len(df)
        )
        self.db.add(import_source)
        self.db.flush()
        
        success_count = 0
        duplicate_count = 0
        failed_count = 0
        
        for idx, row in df.iterrows():
            try:
                raw_data = row.to_dict()
                data = {
                    'shift_code': safe_str(row.get('班次编码', row.get('shift_code', ''))),
                    'shift_date': safe_str(row.get('班次日期', row.get('shift_date', ''))),
                    'shift_type': safe_str(row.get('班次类型', row.get('shift_type', ''))),
                    'warehouse': safe_str(row.get('仓库', row.get('warehouse', ''))),
                    'team_leader': safe_str(row.get('班组长', row.get('team_leader', ''))),
                    'staff_count': safe_int(row.get('人员数量', row.get('staff_count', 0))),
                    'start_time': parse_datetime(row.get('开始时间', row.get('start_time', None))),
                    'end_time': parse_datetime(row.get('结束时间', row.get('end_time', None))),
                    'performance_target': safe_int(row.get('绩效目标', row.get('performance_target', 0))),
                    'actual_performance': safe_int(row.get('实际绩效', row.get('actual_performance', 0))),
                }
                
                is_dup, dup_of = self.duplicate_checker.check_shift_duplicate(data)
                unique_hash = generate_unique_hash(data)
                
                shift = ShiftRecord(
                    **data,
                    source_file=source_file,
                    source_line=idx + 2,
                    raw_data=json.dumps(raw_data, ensure_ascii=False),
                    unique_hash=unique_hash,
                    is_duplicate=is_dup,
                    duplicate_of=dup_of
                )
                self.db.add(shift)
                
                if is_dup:
                    duplicate_count += 1
                else:
                    success_count += 1
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"导入班次记录第{idx+2}行失败: {str(e)}")
        
        import_source.success_rows = success_count
        import_source.failed_rows = failed_count
        self.db.commit()
        
        return {
            'total': len(df),
            'success': success_count,
            'duplicate': duplicate_count,
            'failed': failed_count,
            'source_id': import_source.id
        }

class AsyncTaskService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_task(self, task_type: str, task_name: str, payload: Dict, priority: int = 0) -> AsyncTask:
        task = AsyncTask(
            task_id=generate_id('TASK'),
            task_type=task_type,
            task_name=task_name,
            payload=json.dumps(payload, ensure_ascii=False),
            priority=priority
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task
    
    def get_pending_tasks(self) -> List[AsyncTask]:
        from sqlalchemy import and_, or_
        now = datetime.utcnow()
        return self.db.query(AsyncTask).filter(
            or_(
                AsyncTask.status == 'pending',
                and_(
                    AsyncTask.status == 'retry',
                    AsyncTask.next_retry_time <= now
                )
            )
        ).order_by(AsyncTask.priority.desc(), AsyncTask.created_at.asc()).all()
    
    def execute_task(self, task: AsyncTask) -> AsyncTask:
        task.started_at = datetime.utcnow()
        task.status = 'running'
        self.db.commit()
        
        try:
            payload = json.loads(task.payload) if task.payload else {}
            
            if task.task_type == 'replay_wave':
                result = self._replay_wave_task(payload)
            elif task.task_type == 'reconciliation':
                result = self._reconciliation_task(payload)
            elif task.task_type == 'export_report':
                result = self._export_report_task(payload)
            else:
                raise ValueError(f"未知任务类型: {task.task_type}")
            
            task.result = json.dumps(result, ensure_ascii=False)
            task.status = 'completed'
            task.completed_at = datetime.utcnow()
            task.error_message = None
            task.fail_type = None
            
        except Exception as e:
            task.error_message = str(e)
            task.retry_count += 1
            task.fail_type = get_fail_type(str(e), task.retry_count, task.max_retries)
            
            if task.fail_type == 'retry':
                task.status = 'retry'
                task.next_retry_time = calculate_next_retry_time(task.retry_count)
            elif task.fail_type == 'manual':
                task.status = 'manual'
            else:
                task.status = 'failed'
        
        self.db.commit()
        self.db.refresh(task)
        return task
    
    def _replay_wave_task(self, payload: Dict) -> Dict:
        wave_no = payload.get('wave_no')
        operator = payload.get('operator', 'system')
        reason = payload.get('reason', '')
        
        replay_service = ReplayService(self.db)
        result = replay_service.replay_wave(wave_no, operator, reason)
        return result
    
    def _reconciliation_task(self, payload: Dict) -> Dict:
        wave_no = payload.get('wave_no')
        recon_service = ReconciliationService(self.db)
        result = recon_service.reconcile_wave(wave_no)
        return result
    
    def _export_report_task(self, payload: Dict) -> Dict:
        report_type = payload.get('report_type')
        params = payload.get('params', {})
        export_service = ExportService(self.db)
        result = export_service.export_report(report_type, params)
        return result
    
    def resume_failed_tasks(self) -> List[AsyncTask]:
        manual_tasks = self.db.query(AsyncTask).filter(
            AsyncTask.status == 'manual'
        ).all()
        
        for task in manual_tasks:
            task.status = 'pending'
            task.retry_count = 0
            task.fail_type = None
            task.next_retry_time = None
        
        self.db.commit()
        return manual_tasks

class ReplayService:
    def __init__(self, db: Session):
        self.db = db
    
    def replay_wave(self, wave_no: str, operator: str, reason: str) -> Dict:
        before_waves = self.db.query(WaveOrder).filter(
            WaveOrder.wave_no == wave_no,
            WaveOrder.is_duplicate == False
        ).all()
        before_data = [model_to_dict(w) for w in before_waves]
        
        before_pick = self.db.query(PickDifference).filter(
            PickDifference.wave_no == wave_no,
            PickDifference.is_duplicate == False
        ).all()
        before_pick_data = [model_to_dict(p) for p in before_pick]
        
        before_review = self.db.query(ReviewScan).filter(
            ReviewScan.wave_no == wave_no,
            ReviewScan.is_duplicate == False
        ).all()
        before_review_data = [model_to_dict(r) for r in before_review]
        
        before_state = {
            'wave_orders': before_data,
            'pick_differences': before_pick_data,
            'review_scans': before_review_data
        }
        
        for wave in before_waves:
            if wave.is_split and wave.parent_wave_no:
                original_wave = self.db.query(WaveOrder).filter(
                    WaveOrder.wave_no == wave.parent_wave_no
                ).first()
                if original_wave:
                    snapshot = PerformanceSnapshot(
                        snapshot_id=generate_id('SS'),
                        wave_no=wave_no,
                        snapshot_type='split_replay',
                        before_split=json.dumps(model_to_dict(original_wave), ensure_ascii=False),
                        after_split=json.dumps(model_to_dict(wave), ensure_ascii=False),
                        split_reason=wave.split_reason or reason,
                        operator=operator
                    )
                    self.db.add(snapshot)
        
        after_waves = self.db.query(WaveOrder).filter(
            WaveOrder.wave_no == wave_no,
            WaveOrder.is_duplicate == False
        ).all()
        after_data = [model_to_dict(w) for w in after_waves]
        
        diff_summary = calculate_wave_diff(before_data, after_data)
        
        replay = ReplayRecord(
            replay_id=generate_id('RP'),
            replay_type='wave_replay',
            wave_no=wave_no,
            before_state=json.dumps(before_state, ensure_ascii=False),
            after_state=json.dumps({'wave_orders': after_data}, ensure_ascii=False),
            diff_summary=json.dumps(diff_summary, ensure_ascii=False),
            operator=operator,
            reason=reason
        )
        self.db.add(replay)
        self.db.commit()
        
        return {
            'replay_id': replay.replay_id,
            'wave_no': wave_no,
            'diff_summary': diff_summary
        }
    
    def get_wave_history(self, wave_no: str) -> List[Dict]:
        replays = self.db.query(ReplayRecord).filter(
            ReplayRecord.wave_no == wave_no
        ).order_by(ReplayRecord.operate_time.desc()).all()
        
        return [model_to_dict(r) for r in replays]

class ReconciliationService:
    def __init__(self, db: Session):
        self.db = db
    
    def reconcile_wave(self, wave_no: str) -> Dict:
        waves = self.db.query(WaveOrder).filter(
            WaveOrder.wave_no == wave_no,
            WaveOrder.is_duplicate == False
        ).all()
        
        pick_diffs = self.db.query(PickDifference).filter(
            PickDifference.wave_no == wave_no,
            PickDifference.is_duplicate == False
        ).all()
        
        review_scans = self.db.query(ReviewScan).filter(
            ReviewScan.wave_no == wave_no,
            ReviewScan.is_duplicate == False
        ).all()
        
        supplements = self.db.query(TempSupplement).filter(
            TempSupplement.wave_no == wave_no,
            TempSupplement.is_duplicate == False
        ).all()
        
        discrepancies = []
        
        wave_map = {}
        for w in waves:
            key = f"{w.order_no}_{w.sku_code}"
            wave_map[key] = w
        
        pick_map = {}
        for p in pick_diffs:
            key = f"{p.order_no}_{p.sku_code}"
            pick_map[key] = p
        
        review_map = {}
        for r in review_scans:
            key = f"{r.order_no}_{r.sku_code}"
            review_map[key] = r
        
        for key, wave in wave_map.items():
            pick = pick_map.get(key)
            review = review_map.get(key)
            
            if pick:
                expected_pick = wave.plan_qty - wave.shortage_qty
                if pick.actual_pick_qty != expected_pick:
                    discrepancies.append({
                        'type': 'pick_qty_mismatch',
                        'order_no': wave.order_no,
                        'sku_code': wave.sku_code,
                        'expected': expected_pick,
                        'actual': pick.actual_pick_qty,
                        'diff': expected_pick - pick.actual_pick_qty
                    })
            
            if review:
                expected_review = wave.pick_qty
                if review.scan_qty != expected_review:
                    discrepancies.append({
                        'type': 'review_qty_mismatch',
                        'order_no': wave.order_no,
                        'sku_code': wave.sku_code,
                        'expected': expected_review,
                        'actual': review.scan_qty,
                        'diff': expected_review - review.scan_qty
                    })
        
        result = {
            'wave_no': wave_no,
            'wave_count': len(waves),
            'pick_diff_count': len(pick_diffs),
            'review_scan_count': len(review_scans),
            'supplement_count': len(supplements),
            'discrepancies': discrepancies,
            'is_balanced': len(discrepancies) == 0
        }
        
        if discrepancies:
            for d in discrepancies:
                exception = ExceptionRecord(
                    exception_id=generate_id('EX'),
                    wave_no=wave_no,
                    order_no=d['order_no'],
                    sku_code=d['sku_code'],
                    exception_type=d['type'],
                    exception_level='high' if abs(d['diff']) > 10 else 'normal',
                    description=f"数量不一致: 期望{d['expected']}, 实际{d['actual']}",
                    source='reconciliation',
                    original_data=json.dumps(d, ensure_ascii=False)
                )
                self.db.add(exception)
        
        self.db.commit()
        return result

class ExportService:
    def __init__(self, db: Session):
        self.db = db
    
    def export_report(self, report_type: str, params: Dict) -> Dict:
        from config import EXPORT_DIR
        import os
        from datetime import datetime
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{report_type}_{timestamp}.xlsx"
        filepath = os.path.join(EXPORT_DIR, filename)
        
        if report_type == 'wave_orders':
            result = self._export_wave_orders(filepath, params)
        elif report_type == 'pick_differences':
            result = self._export_pick_differences(filepath, params)
        elif report_type == 'review_scans':
            result = self._export_review_scans(filepath, params)
        elif report_type == 'exception_records':
            result = self._export_exception_records(filepath, params)
        elif report_type == 'replay_history':
            result = self._export_replay_history(filepath, params)
        else:
            raise ValueError(f"未知报表类型: {report_type}")
        
        return {
            'filepath': filepath,
            'filename': filename,
            'row_count': result.get('row_count', 0)
        }
    
    def _export_wave_orders(self, filepath: str, params: Dict) -> Dict:
        query = self.db.query(WaveOrder).filter(WaveOrder.is_duplicate == False)
        
        if params.get('wave_no'):
            query = query.filter(WaveOrder.wave_no == params['wave_no'])
        if params.get('shift_code'):
            query = query.filter(WaveOrder.shift_code == params['shift_code'])
        
        waves = query.all()
        
        data = []
        for w in waves:
            data.append({
                '波次号': w.wave_no,
                '订单号': w.order_no,
                '商品编码': w.sku_code,
                '商品名称': w.sku_name,
                '计划数量': w.plan_qty,
                '拣货数量': w.pick_qty,
                '复核数量': w.review_qty,
                '缺货数量': w.shortage_qty,
                '状态': w.status,
                '仓库': w.warehouse,
                '拣货员': w.picker,
                '复核员': w.reviewer,
                '班次': w.shift_code,
                '是否拆单': '是' if w.is_split else '否',
                '原波次号': w.parent_wave_no,
                '拆单原因': w.split_reason,
                '来源文件': w.source_file,
                '来源行号': w.source_line
            })
        
        df = pd.DataFrame(data)
        df.to_excel(filepath, index=False)
        
        return {'row_count': len(data)}
    
    def _export_pick_differences(self, filepath: str, params: Dict) -> Dict:
        query = self.db.query(PickDifference).filter(PickDifference.is_duplicate == False)
        
        if params.get('wave_no'):
            query = query.filter(PickDifference.wave_no == params['wave_no'])
        
        diffs = query.all()
        
        data = []
        for d in diffs:
            data.append({
                '差异单号': d.diff_no,
                '波次号': d.wave_no,
                '订单号': d.order_no,
                '商品编码': d.sku_code,
                '计划数量': d.plan_qty,
                '实际拣货': d.actual_pick_qty,
                '差异数量': d.diff_qty,
                '差异类型': d.diff_type,
                '原因编码': d.reason_code,
                '原因描述': d.reason_desc,
                '处理人': d.handler,
                '处理结果': d.handle_result,
                '来源文件': d.source_file,
                '来源行号': d.source_line
            })
        
        df = pd.DataFrame(data)
        df.to_excel(filepath, index=False)
        
        return {'row_count': len(data)}
    
    def _export_review_scans(self, filepath: str, params: Dict) -> Dict:
        query = self.db.query(ReviewScan).filter(ReviewScan.is_duplicate == False)
        
        if params.get('wave_no'):
            query = query.filter(ReviewScan.wave_no == params['wave_no'])
        
        scans = query.all()
        
        data = []
        for s in scans:
            data.append({
                '扫描单号': s.scan_no,
                '波次号': s.wave_no,
                '订单号': s.order_no,
                '商品编码': s.sku_code,
                '扫描数量': s.scan_qty,
                '扫描时间': s.scan_time,
                '扫描员': s.scanner,
                '复核结果': s.review_result,
                '是否通过': '是' if s.is_pass else '否',
                '失败原因': s.fail_reason,
                '来源文件': s.source_file,
                '来源行号': s.source_line
            })
        
        df = pd.DataFrame(data)
        df.to_excel(filepath, index=False)
        
        return {'row_count': len(data)}
    
    def _export_exception_records(self, filepath: str, params: Dict) -> Dict:
        query = self.db.query(ExceptionRecord)
        
        if params.get('wave_no'):
            query = query.filter(ExceptionRecord.wave_no == params['wave_no'])
        if params.get('status'):
            query = query.filter(ExceptionRecord.status == params['status'])
        
        exceptions = query.all()
        
        data = []
        for e in exceptions:
            data.append({
                '异常单号': e.exception_id,
                '波次号': e.wave_no,
                '订单号': e.order_no,
                '商品编码': e.sku_code,
                '异常类型': e.exception_type,
                '异常级别': e.exception_level,
                '描述': e.description,
                '来源': e.source,
                '状态': e.status,
                '修正原因': e.correction_reason,
                '修正人': e.corrected_by,
                '修正时间': e.corrected_at,
                '创建时间': e.created_at
            })
        
        df = pd.DataFrame(data)
        df.to_excel(filepath, index=False)
        
        return {'row_count': len(data)}
    
    def _export_replay_history(self, filepath: str, params: Dict) -> Dict:
        query = self.db.query(ReplayRecord)
        
        if params.get('wave_no'):
            query = query.filter(ReplayRecord.wave_no == params['wave_no'])
        
        replays = query.all()
        
        data = []
        for r in replays:
            diff_summary = json.loads(r.diff_summary) if r.diff_summary else {}
            data.append({
                '回放单号': r.replay_id,
                '回放类型': r.replay_type,
                '波次号': r.wave_no,
                '操作人': r.operator,
                '操作时间': r.operate_time,
                '原因': r.reason,
                '新增数量': diff_summary.get('added_count', 0),
                '删除数量': diff_summary.get('removed_count', 0),
                '修改数量': diff_summary.get('modified_count', 0),
                '备注': r.remark
            })
        
        df = pd.DataFrame(data)
        df.to_excel(filepath, index=False)
        
        return {'row_count': len(data)}

class ExceptionService:
    def __init__(self, db: Session):
        self.db = db
    
    def correct_exception(self, exception_id: str, corrected_data: Dict, reason: str, operator: str) -> Dict:
        exception = self.db.query(ExceptionRecord).filter(
            ExceptionRecord.exception_id == exception_id
        ).first()
        
        if not exception:
            raise ValueError(f"异常记录不存在: {exception_id}")
        
        original_data = json.loads(exception.original_data) if exception.original_data else {}
        
        exception.corrected_data = json.dumps(corrected_data, ensure_ascii=False)
        exception.correction_reason = reason
        exception.corrected_by = operator
        exception.corrected_at = datetime.utcnow()
        exception.status = 'corrected'
        
        diff = calculate_diff(original_data, corrected_data)
        
        log = OperationLog(
            log_id=generate_id('LOG'),
            operation_type='exception_correction',
            operator=operator,
            module='exception',
            action='correct',
            before_data=json.dumps(original_data, ensure_ascii=False),
            after_data=json.dumps(corrected_data, ensure_ascii=False),
            request_info=json.dumps({'exception_id': exception_id, 'reason': reason}, ensure_ascii=False)
        )
        self.db.add(log)
        self.db.commit()
        
        return {
            'exception_id': exception_id,
            'diff': diff,
            'reason': reason
        }
    
    def get_exception_detail(self, exception_id: str) -> Dict:
        exception = self.db.query(ExceptionRecord).filter(
            ExceptionRecord.exception_id == exception_id
        ).first()
        
        if not exception:
            raise ValueError(f"异常记录不存在: {exception_id}")
        
        result = model_to_dict(exception)
        
        logs = self.db.query(OperationLog).filter(
            OperationLog.operation_type == 'exception_correction',
            OperationLog.request_info.like(f'%{exception_id}%')
        ).order_by(OperationLog.created_at.desc()).all()
        
        result['correction_history'] = [model_to_dict(log) for log in logs]
        
        return result
