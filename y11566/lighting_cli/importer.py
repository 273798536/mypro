import os
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from .database import WorkOrder, ImportRecord, AuditLog
from .utils import generate_fact_id, generate_batch_id, extract_photo_exif, parse_datetime, safe_str, safe_int


class DataImporter:
    def __init__(self, db_session: Session, config: dict):
        self.db = db_session
        self.config = config
    
    def _clean_value(self, value):
        if value is None:
            return ''
        if isinstance(value, float):
            import math
            if math.isnan(value):
                return ''
            if value.is_integer():
                return str(int(value))
        val_str = str(value).strip()
        if val_str.lower() in ['nan', 'none', 'null', '']:
            return ''
        return val_str
    
    def import_data(self, source_type, source_path, strategy='ignore', imported_by='system'):
        batch_id = generate_batch_id()
        import_record = ImportRecord(
            batch_id=batch_id,
            source_type=source_type,
            file_name=os.path.basename(source_path) if os.path.isfile(source_path) else source_path,
            import_strategy=strategy,
            imported_by=imported_by,
            status='importing'
        )
        self.db.add(import_record)
        self.db.flush()
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        total_rows = 0
        
        try:
            if source_type == 'photo':
                rows = self._parse_photos(source_path)
            elif source_type == 'hotline':
                rows = self._parse_hotline_csv(source_path)
            elif source_type == 'spare_part':
                rows = self._parse_spare_parts(source_path)
            elif source_type == 'approval_email':
                rows = self._parse_approval_emails(source_path)
            else:
                raise ValueError(f'Unknown source type: {source_type}')
            
            total_rows = len(rows)
            
            for idx, row_data in enumerate(rows, 1):
                row_data['original_line_number'] = idx
                result = self._import_single_row(row_data, import_record.id, strategy, batch_id, imported_by)
                if result == 'success':
                    success_count += 1
                elif result == 'skipped':
                    skipped_count += 1
                else:
                    failed_count += 1
            
            import_record.status = 'completed'
        except Exception as e:
            import_record.status = 'failed'
            import_record.check_error = str(e)
            raise
        finally:
            import_record.total_rows = total_rows
            import_record.success_count = success_count
            import_record.failed_count = failed_count
            import_record.skipped_count = skipped_count
            self.db.commit()
        
        return {
            'batch_id': batch_id,
            'total': total_rows,
            'success': success_count,
            'failed': failed_count,
            'skipped': skipped_count
        }
    
    def _import_single_row(self, row_data, import_record_id, strategy, batch_id, imported_by):
        fact_id = self._generate_fact_id_for_row(row_data)
        
        existing = self.db.query(WorkOrder).filter(WorkOrder.fact_id == fact_id).first()
        
        if not existing and strategy == 'append':
            existing = self._find_by_location(row_data)
        
        if existing:
            if strategy == 'ignore':
                return 'skipped'
            elif strategy == 'append':
                return self._merge_work_order(existing, row_data, batch_id, imported_by)
            elif strategy == 'overwrite':
                return self._overwrite_work_order(existing, row_data, batch_id, imported_by)
        else:
            return self._create_work_order(fact_id, row_data, import_record_id)
    
    def _find_by_location(self, row_data):
        location = self._clean_value(row_data.get('location', ''))
        road_section = self._clean_value(row_data.get('road_section', ''))
        pole_number = self._clean_value(row_data.get('pole_number', ''))
        
        if not location and not road_section:
            return None
        
        query = self.db.query(WorkOrder)
        filters = []
        
        if location:
            filters.append(WorkOrder.location == location)
        if road_section:
            filters.append(WorkOrder.road_section == road_section)
        if pole_number:
            filters.append(WorkOrder.pole_number == pole_number)
        
        if filters:
            query = query.filter(*filters)
            return query.order_by(WorkOrder.created_at.desc()).first()
        
        return None
    
    def _generate_fact_id_for_row(self, row_data):
        location = self._clean_value(row_data.get('location', ''))
        road_section = self._clean_value(row_data.get('road_section', ''))
        pole_number = self._clean_value(row_data.get('pole_number', ''))
        issue_type = self._clean_value(row_data.get('issue_type', ''))
        
        id_fields = [location, road_section, pole_number, issue_type]
        return generate_fact_id('fact', id_fields)
    
    def _create_work_order(self, fact_id, row_data, import_record_id):
        try:
            work_order = WorkOrder(
                fact_id=fact_id,
                import_record_id=import_record_id,
                original_line_number=row_data.get('original_line_number'),
                location=safe_str(row_data.get('location', '')),
                road_section=safe_str(row_data.get('road_section')),
                pole_number=safe_str(row_data.get('pole_number')),
                issue_type=safe_str(row_data.get('issue_type')),
                description=safe_str(row_data.get('description')),
                severity=safe_str(row_data.get('severity', 'normal')),
                photo_path=safe_str(row_data.get('photo_path')),
                photo_exif_data=safe_str(row_data.get('photo_exif_data')),
                hotline_caller=safe_str(row_data.get('hotline_caller')),
                hotline_phone=safe_str(row_data.get('hotline_phone')),
                hotline_time=parse_datetime(row_data.get('hotline_time')),
                spare_part_batch=safe_str(row_data.get('spare_part_batch')),
                spare_part_name=safe_str(row_data.get('spare_part_name')),
                spare_part_quantity=safe_int(row_data.get('spare_part_quantity')),
                approval_email_subject=safe_str(row_data.get('approval_email_subject')),
                approval_email_from=safe_str(row_data.get('approval_email_from')),
                approval_email_time=parse_datetime(row_data.get('approval_email_time')),
                approval_status=safe_str(row_data.get('approval_status'))
            )
            self.db.add(work_order)
            self.db.commit()
            return 'success'
        except Exception as e:
            self.db.rollback()
            return 'failed'
    
    def _merge_work_order(self, work_order, row_data, batch_id, imported_by):
        changed = False
        fields = ['description', 'severity', 'photo_path', 'photo_exif_data',
                  'hotline_caller', 'hotline_phone', 'hotline_time',
                  'spare_part_batch', 'spare_part_name', 'spare_part_quantity',
                  'approval_email_subject', 'approval_email_from', 'approval_email_time', 'approval_status']
        for field in fields:
            new_value = row_data.get(field)
            old_value = getattr(work_order, field)
            new_val_str = str(new_value) if new_value else ''
            old_val_str = str(old_value) if old_value else ''
            if new_val_str.strip() and new_val_str.strip() != old_val_str.strip():
                self._log_audit(work_order.id, field, old_val_str, new_val_str, batch_id, imported_by, 'merge_import')
                if 'time' in field:
                    setattr(work_order, field, parse_datetime(new_value))
                elif 'quantity' in field:
                    setattr(work_order, field, safe_int(new_value))
                else:
                    setattr(work_order, field, safe_str(new_value))
                changed = True
        
        if changed:
            work_order.check_status = 'needs_recheck'
            self.db.commit()
            return 'success'
        return 'skipped'
    
    def _overwrite_work_order(self, work_order, row_data, batch_id, imported_by):
        field_mappings = {
            'location': 'location',
            'road_section': 'road_section',
            'pole_number': 'pole_number',
            'issue_type': 'issue_type',
            'description': 'description',
            'severity': 'severity',
            'photo_path': 'photo_path',
            'photo_exif_data': 'photo_exif_data',
            'hotline_caller': 'hotline_caller',
            'hotline_phone': 'hotline_phone',
            'hotline_time': 'hotline_time',
            'spare_part_batch': 'spare_part_batch',
            'spare_part_name': 'spare_part_name',
            'spare_part_quantity': 'spare_part_quantity',
            'approval_email_subject': 'approval_email_subject',
            'approval_email_from': 'approval_email_from',
            'approval_email_time': 'approval_email_time',
            'approval_status': 'approval_status'
        }
        
        for field, col_name in field_mappings.items():
            new_value = row_data.get(field)
            old_value = getattr(work_order, col_name)
            new_val_str = str(new_value) if new_value else ''
            old_val_str = str(old_value) if old_value else ''
            if new_val_str != old_val_str:
                self._log_audit(work_order.id, field, old_val_str, new_val_str, batch_id, imported_by, 'overwrite_import')
                if 'time' in field:
                    setattr(work_order, col_name, parse_datetime(new_value))
                elif 'quantity' in field:
                    setattr(work_order, col_name, safe_int(new_value))
                else:
                    setattr(work_order, col_name, safe_str(new_value))
        
        work_order.check_status = 'needs_recheck'
        work_order.original_line_number = row_data.get('original_line_number')
        self.db.commit()
        return 'success'
    
    def _log_audit(self, work_order_id, field_name, old_value, new_value, batch_id, changed_by, reason):
        audit = AuditLog(
            work_order_id=work_order_id,
            batch_id=batch_id,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            changed_by=changed_by,
            change_reason=reason
        )
        self.db.add(audit)
    
    def _parse_photos(self, dir_path):
        rows = []
        photo_exts = tuple(self.config['import']['photo_extensions'])
        for root, _, files in os.walk(dir_path):
            for file in files:
                if file.lower().endswith(photo_exts):
                    photo_path = os.path.join(root, file)
                    filename = os.path.splitext(file)[0]
                    parts = filename.split('_')
                    
                    location = ''
                    road_section = ''
                    pole_number = ''
                    
                    if len(parts) >= 3:
                        road_section = parts[0]
                        pole_number = parts[1]
                        location = f'{road_section}_{pole_number}'
                    elif len(parts) == 2:
                        road_section = parts[0]
                        location = road_section
                    
                    exif = extract_photo_exif(photo_path)
                    
                    rows.append({
                        'source_type': 'photo',
                        'location': location,
                        'road_section': road_section,
                        'pole_number': pole_number,
                        'issue_type': 'lighting_failure',
                        'description': f'巡检照片: {filename}',
                        'photo_path': photo_path,
                        'photo_exif_data': exif,
                        'severity': 'high'
                    })
        return rows
    
    def _parse_hotline_csv(self, csv_path):
        df = pd.read_csv(csv_path, dtype=str, keep_default_na=False, na_values=[''])
        rows = []
        
        column_mapping = {
            '来电时间': 'hotline_time',
            '来电人': 'hotline_caller',
            '联系电话': 'hotline_phone',
            '故障地点': 'location',
            '路段': 'road_section',
            '灯杆编号': 'pole_number',
            '故障类型': 'issue_type',
            '问题描述': 'description',
            '严重程度': 'severity'
        }
        
        for _, row in df.iterrows():
            row_data = {'source_type': 'hotline'}
            for cn_col, en_col in column_mapping.items():
                if cn_col in df.columns:
                    row_data[en_col] = self._clean_value(row[cn_col])
            
            if not row_data.get('location') and row_data.get('road_section'):
                row_data['location'] = row_data['road_section']
            
            rows.append(row_data)
        return rows
    
    def _parse_spare_parts(self, file_path):
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, dtype=str, keep_default_na=False, na_values=[''])
        else:
            df = pd.read_excel(file_path, dtype=str, keep_default_na=False, na_values=[''])
        
        rows = []
        
        column_mapping = {
            '批次号': 'spare_part_batch',
            '备件名称': 'spare_part_name',
            '数量': 'spare_part_quantity',
            '使用地点': 'location',
            '路段': 'road_section',
            '灯杆编号': 'pole_number',
            '故障类型': 'issue_type'
        }
        
        for _, row in df.iterrows():
            row_data = {'source_type': 'spare_part'}
            for cn_col, en_col in column_mapping.items():
                if cn_col in df.columns:
                    row_data[en_col] = self._clean_value(row[cn_col])
            
            if not row_data.get('issue_type'):
                row_data['issue_type'] = 'replacement'
            
            rows.append(row_data)
        return rows
    
    def _parse_approval_emails(self, file_path):
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, dtype=str, keep_default_na=False, na_values=[''])
        else:
            df = pd.read_excel(file_path, dtype=str, keep_default_na=False, na_values=[''])
        rows = []
        
        column_mapping = {
            '邮件主题': 'approval_email_subject',
            '发件人': 'approval_email_from',
            '发送时间': 'approval_email_time',
            '审批状态': 'approval_status',
            '故障地点': 'location',
            '路段': 'road_section',
            '灯杆编号': 'pole_number',
            '故障类型': 'issue_type'
        }
        
        for _, row in df.iterrows():
            row_data = {'source_type': 'approval_email'}
            for cn_col, en_col in column_mapping.items():
                if cn_col in df.columns:
                    row_data[en_col] = self._clean_value(row[cn_col])
            rows.append(row_data)
        return rows
