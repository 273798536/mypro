import os
from datetime import datetime
from sqlalchemy.orm import Session
from tabulate import tabulate
import pandas as pd
from .database import WorkOrder, ImportRecord, AsyncTask


class Reporter:
    def __init__(self, db_session: Session, config: dict):
        self.db = db_session
        self.config = config
    
    def generate_report(self, batch_id=None, output_format='txt'):
        report_data = self._collect_report_data(batch_id)
        
        if batch_id:
            filename = f'report_{batch_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        else:
            filename = f'report_full_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        
        output_dir = self.config['report']['output_dir']
        os.makedirs(output_dir, exist_ok=True)
        
        if output_format == 'txt':
            return self._generate_txt_report(report_data, os.path.join(output_dir, f'{filename}.txt'))
        elif output_format == 'csv':
            return self._generate_csv_report(report_data, os.path.join(output_dir, f'{filename}.csv'))
        elif output_format == 'xlsx':
            return self._generate_xlsx_report(report_data, os.path.join(output_dir, f'{filename}.xlsx'))
        
        return report_data
    
    def _collect_report_data(self, batch_id=None):
        query = self.db.query(WorkOrder)
        if batch_id:
            query = query.join(WorkOrder.import_record).filter(
                WorkOrder.import_record.has(batch_id=batch_id)
            )
        
        work_orders = query.all()
        
        import_records = self.db.query(ImportRecord).all()
        if batch_id:
            import_records = [r for r in import_records if r.batch_id == batch_id]
        
        failed_wo = [wo for wo in work_orders if wo.check_status == 'failed']
        passed_wo = [wo for wo in work_orders if wo.check_status == 'passed']
        unchecked_wo = [wo for wo in work_orders if wo.check_status == 'unchecked']
        
        pending_manual = self.db.query(AsyncTask).filter(
            AsyncTask.status == 'pending_manual'
        ).all()
        
        if batch_id:
            pending_manual = [t for t in pending_manual if t.work_order and 
                            t.work_order.import_record and 
                            t.work_order.import_record.batch_id == batch_id]
        
        return {
            'batch_id': batch_id,
            'generated_at': datetime.now(),
            'summary': {
                'total_work_orders': len(work_orders),
                'passed': len(passed_wo),
                'failed': len(failed_wo),
                'unchecked': len(unchecked_wo),
                'pending_manual': len(pending_manual),
                'import_batches': len(import_records)
            },
            'import_records': import_records,
            'failed_work_orders': failed_wo,
            'pending_manual_tasks': pending_manual,
            'all_work_orders': work_orders
        }
    
    def _generate_txt_report(self, data, output_path):
        lines = []
        
        lines.append('=' * 80)
        lines.append('城市照明抢修巡检报告')
        lines.append('=' * 80)
        lines.append(f'报告生成时间: {data["generated_at"].strftime("%Y-%m-%d %H:%M:%S")}')
        if data['batch_id']:
            lines.append(f'批次ID: {data["batch_id"]}')
        lines.append('')
        
        lines.append('--- 汇总统计 ---')
        summary = data['summary']
        lines.append(f'总工单数量: {summary["total_work_orders"]}')
        lines.append(f'校验通过: {summary["passed"]}')
        lines.append(f'校验失败: {summary["failed"]}')
        lines.append(f'未校验: {summary["unchecked"]}')
        lines.append(f'待人工处理: {summary["pending_manual"]}')
        lines.append(f'导入批次: {summary["import_batches"]}')
        lines.append('')
        
        lines.append('--- 导入批次详情 ---')
        if data['import_records']:
            table_data = []
            for rec in data['import_records']:
                table_data.append([
                    rec.batch_id,
                    rec.source_type,
                    rec.file_name,
                    rec.import_strategy,
                    rec.imported_at.strftime('%Y-%m-%d %H:%M') if rec.imported_at else '',
                    rec.total_rows,
                    rec.success_count,
                    rec.failed_count,
                    rec.skipped_count,
                    rec.status
                ])
            headers = ['批次ID', '来源类型', '文件名', '导入策略', '导入时间', '总行数', '成功', '失败', '跳过', '状态']
            lines.append(tabulate(table_data, headers=headers, tablefmt='simple'))
        lines.append('')
        
        lines.append('--- 失败工单清单 (市政负责人重点关注) ---')
        lines.append('')
        if data['failed_work_orders']:
            table_data = []
            for wo in data['failed_work_orders']:
                table_data.append([
                    wo.id,
                    wo.fact_id,
                    wo.original_line_number or 'N/A',
                    wo.location,
                    wo.road_section or '',
                    wo.issue_type or '',
                    wo.check_error_type or '',
                    wo.check_error or ''
                ])
            headers = ['ID', '事实ID', '原始行号', '位置', '路段', '故障类型', '错误类型', '错误详情']
            lines.append(tabulate(table_data, headers=headers, tablefmt='simple'))
        else:
            lines.append('无失败工单')
        lines.append('')
        
        lines.append('--- 待人工处理任务 ---')
        if data['pending_manual_tasks']:
            table_data = []
            for task in data['pending_manual_tasks']:
                wo = task.work_order
                table_data.append([
                    task.id,
                    wo.id if wo else 'N/A',
                    wo.location if wo else 'N/A',
                    wo.original_line_number if wo else 'N/A',
                    task.last_error or '',
                    task.queued_at.strftime('%Y-%m-%d %H:%M') if task.queued_at else ''
                ])
            headers = ['任务ID', '工单ID', '位置', '原始行号', '错误信息', '排队时间']
            lines.append(tabulate(table_data, headers=headers, tablefmt='simple'))
        else:
            lines.append('无待人工处理任务')
        lines.append('')
        
        lines.append('--- 修正后再导入指引 ---')
        lines.append('1. 根据"原始行号"在源文件中定位问题数据')
        lines.append('2. 使用 lighting fix --id <工单ID> --field <字段> --value <新值> 修正数据')
        lines.append('3. 运行 lighting check 重新校验')
        lines.append('4. 运行 lighting report 查看最新结果')
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        
        return {'path': output_path, 'format': 'txt'}
    
    def _generate_csv_report(self, data, output_path):
        rows = []
        for wo in data['all_work_orders']:
            rows.append({
                '工单ID': wo.id,
                '事实ID': wo.fact_id,
                '原始行号': wo.original_line_number,
                '位置': wo.location,
                '路段': wo.road_section,
                '灯杆编号': wo.pole_number,
                '故障类型': wo.issue_type,
                '描述': wo.description,
                '严重程度': wo.severity,
                '校验状态': wo.check_status,
                '错误类型': wo.check_error_type,
                '错误详情': wo.check_error,
                '创建时间': wo.created_at.strftime('%Y-%m-%d %H:%M:%S') if wo.created_at else ''
            })
        
        df = pd.DataFrame(rows)
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        return {'path': output_path, 'format': 'csv'}
    
    def _generate_xlsx_report(self, data, output_path):
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            summary_df = pd.DataFrame([{
                '总工单数量': data['summary']['total_work_orders'],
                '校验通过': data['summary']['passed'],
                '校验失败': data['summary']['failed'],
                '未校验': data['summary']['unchecked'],
                '待人工处理': data['summary']['pending_manual']
            }])
            summary_df.to_excel(writer, sheet_name='汇总', index=False)
            
            failed_rows = []
            for wo in data['failed_work_orders']:
                failed_rows.append({
                    '工单ID': wo.id,
                    '事实ID': wo.fact_id,
                    '原始行号': wo.original_line_number,
                    '位置': wo.location,
                    '路段': wo.road_section,
                    '故障类型': wo.issue_type,
                    '错误类型': wo.check_error_type,
                    '错误详情': wo.check_error
                })
            pd.DataFrame(failed_rows).to_excel(writer, sheet_name='失败清单', index=False)
            
            all_rows = []
            for wo in data['all_work_orders']:
                all_rows.append({
                    '工单ID': wo.id,
                    '事实ID': wo.fact_id,
                    '原始行号': wo.original_line_number,
                    '位置': wo.location,
                    '路段': wo.road_section,
                    '灯杆编号': wo.pole_number,
                    '故障类型': wo.issue_type,
                    '校验状态': wo.check_status
                })
            pd.DataFrame(all_rows).to_excel(writer, sheet_name='全部工单', index=False)
        
        return {'path': output_path, 'format': 'xlsx'}
