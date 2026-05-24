import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
import pandas as pd
from .database import WorkOrder, ImportRecord, AuditLog


class DataExporter:
    def __init__(self, db_session: Session, config: dict):
        self.db = db_session
        self.config = config
    
    def export_work_orders(self, output_format='csv', batch_id=None, status=None, output_path=None):
        query = self.db.query(WorkOrder)
        
        if batch_id:
            query = query.join(WorkOrder.import_record).filter(
                WorkOrder.import_record.has(batch_id=batch_id)
            )
        
        if status:
            query = query.filter(WorkOrder.check_status == status)
        
        work_orders = query.all()
        
        if output_path is None:
            output_dir = self.config['export']['output_dir']
            os.makedirs(output_dir, exist_ok=True)
            filename = f'work_orders_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
            output_path = os.path.join(output_dir, f'{filename}.{output_format}')
        
        data = []
        for wo in work_orders:
            data.append({
                'id': wo.id,
                'fact_id': wo.fact_id,
                'original_line_number': wo.original_line_number,
                'location': wo.location,
                'road_section': wo.road_section,
                'pole_number': wo.pole_number,
                'issue_type': wo.issue_type,
                'description': wo.description,
                'severity': wo.severity,
                'photo_path': wo.photo_path,
                'hotline_caller': wo.hotline_caller,
                'hotline_phone': wo.hotline_phone,
                'hotline_time': wo.hotline_time.strftime('%Y-%m-%d %H:%M:%S') if wo.hotline_time else None,
                'spare_part_batch': wo.spare_part_batch,
                'spare_part_name': wo.spare_part_name,
                'spare_part_quantity': wo.spare_part_quantity,
                'approval_email_subject': wo.approval_email_subject,
                'approval_email_from': wo.approval_email_from,
                'approval_status': wo.approval_status,
                'check_status': wo.check_status,
                'check_error': wo.check_error,
                'check_error_type': wo.check_error_type,
                'created_at': wo.created_at.strftime('%Y-%m-%d %H:%M:%S') if wo.created_at else None,
                'updated_at': wo.updated_at.strftime('%Y-%m-%d %H:%M:%S') if wo.updated_at else None
            })
        
        if output_format == 'csv':
            df = pd.DataFrame(data)
            df.to_csv(output_path, index=False, encoding='utf-8-sig')
        elif output_format == 'xlsx':
            df = pd.DataFrame(data)
            df.to_excel(output_path, index=False, engine='openpyxl')
        elif output_format == 'json':
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        
        return {'path': output_path, 'count': len(data), 'format': output_format}
