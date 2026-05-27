import pandas as pd
from datetime import datetime
from io import BytesIO
from models import db, FuelRecord, Project, Allocation, Anomaly, Vehicle, Driver, AuditLog
from sqlalchemy import func


class ReportExporter:
    @staticmethod
    def export_fuel_records(records, filename='加油流水明细'):
        data = []
        for r in records:
            project = Project.query.get(r.project_id) if r.project_id else None
            anomalies = Anomaly.query.filter_by(fuel_record_id=r.id, is_resolved=False).all()
            
            data.append({
                '记录ID': r.id,
                '交易日期': r.transaction_date.strftime('%Y-%m-%d %H:%M:%S') if r.transaction_date else '',
                '卡号': r.card_number or '',
                '车牌号': r.plate_number or '',
                '司机': r.driver_name or '',
                '油品': r.fuel_type or '',
                '数量(升)': r.quantity,
                '单价(元)': r.unit_price,
                '金额(元)': r.total_amount,
                '加油站': r.station_name or '',
                '项目编码': project.project_code if project else '',
                '项目名称': project.project_name if project else '',
                '状态': r.status,
                '异常数': len(anomalies),
                '备注': r.remark or '',
                '导入时间': r.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        df = pd.DataFrame(data)
        return ReportExporter._to_excel(df, f'{filename}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')

    @staticmethod
    def export_allocation_report(period=None, filename='分摊报告'):
        allocations = Allocation.query
        if period:
            allocations = allocations.filter_by(period=period)
        
        data = []
        for alloc in allocations.all():
            record = FuelRecord.query.get(alloc.fuel_record_id)
            project = Project.query.get(alloc.project_id)
            
            data.append({
                '分摊ID': alloc.id,
                '记录ID': alloc.fuel_record_id,
                '交易日期': record.transaction_date.strftime('%Y-%m-%d') if record.transaction_date else '',
                '车牌号': record.plate_number or '',
                '司机': record.driver_name or '',
                '油品': record.fuel_type or '',
                '数量(升)': record.quantity,
                '金额(元)': record.total_amount,
                '分摊金额(元)': alloc.allocated_amount,
                '分摊比例': f'{alloc.allocation_ratio * 100:.0f}%',
                '分摊方式': alloc.allocation_method,
                '项目编码': project.project_code if project else '',
                '项目名称': project.project_name if project else '',
                '会计期间': alloc.period,
                '确认状态': '已确认' if alloc.confirmed else '未确认',
                '确认时间': alloc.confirmed_at.strftime('%Y-%m-%d %H:%M') if alloc.confirmed_at else ''
            })

        df = pd.DataFrame(data)
        return ReportExporter._to_excel(df, f'{filename}_{period or "全期"}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')

    @staticmethod
    def export_anomaly_report(period=None, filename='异常报告'):
        query = Anomaly.query.join(FuelRecord)
        
        if period:
            query = query.filter(
                func.strftime('%Y-%m', FuelRecord.transaction_date) == period
            )
        
        data = []
        for anomaly in query.all():
            record = FuelRecord.query.get(anomaly.fuel_record_id)
            
            severity_map = {'info': '提示', 'warning': '警告', 'error': '错误'}
            
            data.append({
                '异常ID': anomaly.id,
                '记录ID': anomaly.fuel_record_id,
                '交易日期': record.transaction_date.strftime('%Y-%m-%d') if record.transaction_date else '',
                '车牌号': record.plate_number or '',
                '司机': record.driver_name or '',
                '金额(元)': record.total_amount,
                '异常类型': anomaly.anomaly_type,
                '严重程度': severity_map.get(anomaly.severity, anomaly.severity),
                '异常描述': anomaly.description,
                '处理建议': anomaly.suggestion or '',
                '处理状态': '已处理' if anomaly.is_resolved else '待处理',
                '处理人': anomaly.resolved_by or '',
                '处理时间': anomaly.resolved_at.strftime('%Y-%m-%d %H:%M') if anomaly.resolved_at else '',
                '处理备注': anomaly.resolution_note or ''
            })

        df = pd.DataFrame(data)
        return ReportExporter._to_excel(df, f'{filename}_{period or "全期"}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')

    @staticmethod
    def export_project_summary(period=None, filename='项目汇总'):
        from allocator import ProjectAllocator
        allocator = ProjectAllocator()
        summary = allocator.get_allocation_summary(period)

        df = pd.DataFrame(summary)
        df.columns = ['项目ID', '项目编码', '项目名称', '总金额(元)', '记录数']
        
        if not df.empty:
            total_row = pd.DataFrame([{
                '项目ID': '',
                '项目编码': '合计',
                '项目名称': '',
                '总金额(元)': df['总金额(元)'].sum(),
                '记录数': df['记录数'].sum()
            }])
            df = pd.concat([df, total_row], ignore_index=True)

        return ReportExporter._to_excel(df, f'{filename}_{period or "全期"}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')

    @staticmethod
    def export_audit_log(fuel_record_id=None, filename='审计日志'):
        query = AuditLog.query
        if fuel_record_id:
            query = query.filter_by(fuel_record_id=fuel_record_id)
        
        data = []
        for log in query.order_by(AuditLog.created_at.desc()).all():
            action_map = {
                'import': '导入',
                'edit': '编辑',
                'anomaly_detected': '异常检测',
                'anomaly_resolved': '异常处理',
                'auto_allocate': '自动分摊',
                'manual_allocate': '手动分摊',
                'driver_confirm': '司机确认'
            }
            
            data.append({
                '日志ID': log.id,
                '记录ID': log.fuel_record_id or '',
                '操作类型': action_map.get(log.action, log.action),
                '操作字段': log.field_name or '',
                '原值': log.old_value or '',
                '新值': log.new_value or '',
                '操作人': log.operator or '',
                '角色': log.operator_role or '',
                '备注': log.remark or '',
                '操作时间': log.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        df = pd.DataFrame(data)
        return ReportExporter._to_excel(df, f'{filename}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')

    @staticmethod
    def _to_excel(df, filename):
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Sheet1')
            
            worksheet = writer.sheets['Sheet1']
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width

        output.seek(0)
        return output, filename

    @staticmethod
    def get_dashboard_data(period=None):
        query = FuelRecord.query
        if period:
            query = query.filter(
                func.strftime('%Y-%m', FuelRecord.transaction_date) == period
            )
        
        total_records = query.count()
        total_amount = db.session.query(func.sum(FuelRecord.total_amount)).scalar() or 0
        if period:
            total_amount = query.with_entities(func.sum(FuelRecord.total_amount)).scalar() or 0

        anomaly_query = Anomaly.query.filter_by(is_resolved=False).join(FuelRecord)
        if period:
            anomaly_query = anomaly_query.filter(
                func.strftime('%Y-%m', FuelRecord.transaction_date) == period
            )
        anomaly_count = anomaly_query.count()

        error_count = anomaly_query.filter(Anomaly.severity == 'error').count()
        warning_count = anomaly_query.filter(Anomaly.severity == 'warning').count()

        allocated_count = query.filter(FuelRecord.status == 'allocated').count()
        confirmed_count = query.filter(FuelRecord.status == 'confirmed').count()
        pending_count = query.filter(
            (FuelRecord.status == 'pending') | (FuelRecord.status == 'anomaly')
        ).count()

        from allocator import ProjectAllocator
        allocator = ProjectAllocator()
        project_summary = allocator.get_allocation_summary(period)

        fuel_type_query = query.with_entities(
            FuelRecord.fuel_type,
            func.sum(FuelRecord.total_amount).label('amount'),
            func.count(FuelRecord.id).label('count')
        ).filter(FuelRecord.fuel_type.isnot(None)).group_by(FuelRecord.fuel_type).all()

        daily_query = query.with_entities(
            func.date(FuelRecord.transaction_date).label('date'),
            func.sum(FuelRecord.total_amount).label('amount'),
            func.count(FuelRecord.id).label('count')
        ).filter(FuelRecord.transaction_date.isnot(None)).group_by(
            func.date(FuelRecord.transaction_date)
        ).order_by('date').all()

        return {
            'overview': {
                'total_records': total_records,
                'total_amount': float(total_amount),
                'anomaly_count': anomaly_count,
                'error_count': error_count,
                'warning_count': warning_count,
                'allocated_count': allocated_count,
                'confirmed_count': confirmed_count,
                'pending_count': pending_count
            },
            'project_summary': project_summary,
            'fuel_type_stats': [
                {'fuel_type': f[0], 'amount': float(f[1] or 0), 'count': f[2]}
                for f in fuel_type_query if f[0]
            ],
            'daily_stats': [
                {'date': d[0], 'amount': float(d[1] or 0), 'count': d[2]}
                for d in daily_query if d[0]
            ]
        }
