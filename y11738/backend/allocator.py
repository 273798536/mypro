from datetime import datetime
from typing import List, Dict, Tuple
from models import db, FuelRecord, Vehicle, Project, Allocation, Driver


class ProjectAllocator:
    def __init__(self):
        pass

    def auto_allocate_project(self, record: Dict) -> Tuple[int, str]:
        plate_number = record.get('plate_number', '')
        driver_name = record.get('driver_name', '')
        transaction_date = record.get('transaction_date')

        project_id = None
        method = 'unknown'

        if plate_number:
            vehicle = Vehicle.query.filter_by(plate_number=plate_number, is_active=True).first()
            if vehicle and vehicle.default_project_id:
                project = Project.query.get(vehicle.default_project_id)
                if project and project.is_active:
                    if self._check_project_date(project, transaction_date):
                        project_id = project.id
                        method = 'vehicle_default'
                    else:
                        method = 'vehicle_default_date_mismatch'

        if not project_id and driver_name:
            driver = Driver.query.filter_by(name=driver_name, is_active=True).first()
            if driver:
                vehicles = Vehicle.query.filter_by(driver_id=driver.id, is_active=True).all()
                for v in vehicles:
                    if v.default_project_id:
                        project = Project.query.get(v.default_project_id)
                        if project and project.is_active:
                            if self._check_project_date(project, transaction_date):
                                project_id = project.id
                                method = 'driver_vehicle'
                                break

        if not project_id:
            default_project = Project.query.filter_by(project_code='DEFAULT').first()
            if default_project and default_project.is_active:
                project_id = default_project.id
                method = 'fallback_default'

        return project_id, method

    def _check_project_date(self, project: Project, transaction_date) -> bool:
        if not transaction_date:
            return True
        
        trans_date = transaction_date.date() if isinstance(transaction_date, datetime) else transaction_date
        
        if project.start_date and trans_date < project.start_date:
            return False
        if project.end_date and trans_date > project.end_date:
            return False
        
        return True

    def create_allocation(self, fuel_record_id: int, project_id: int, 
                         amount: float, method: str = 'auto') -> Allocation:
        fuel_record = FuelRecord.query.get(fuel_record_id)
        if not fuel_record:
            raise ValueError(f'Fuel record {fuel_record_id} not found')

        period = fuel_record.transaction_date.strftime('%Y-%m')

        allocation = Allocation(
            fuel_record_id=fuel_record_id,
            project_id=project_id,
            allocated_amount=amount,
            allocation_ratio=1.0,
            allocation_method=method,
            period=period
        )

        db.session.add(allocation)

        fuel_record.project_id = project_id
        fuel_record.status = 'allocated'

        db.session.commit()

        return allocation

    def batch_allocate(self, fuel_record_ids: List[int], operator: str = 'system') -> Dict:
        results = {
            'success': [],
            'failed': [],
            'already_allocated': []
        }

        for record_id in fuel_record_ids:
            try:
                fuel_record = FuelRecord.query.get(record_id)
                if not fuel_record:
                    results['failed'].append({'id': record_id, 'reason': '记录不存在'})
                    continue

                if fuel_record.status == 'allocated' and fuel_record.project_id:
                    results['already_allocated'].append(record_id)
                    continue

                record_dict = {
                    'plate_number': fuel_record.plate_number,
                    'driver_name': fuel_record.driver_name,
                    'transaction_date': fuel_record.transaction_date
                }

                project_id, method = self.auto_allocate_project(record_dict)

                if not project_id:
                    results['failed'].append({'id': record_id, 'reason': '无法匹配项目'})
                    continue

                self.create_allocation(
                    fuel_record_id=record_id,
                    project_id=project_id,
                    amount=fuel_record.total_amount,
                    method=method
                )

                from audit_logger import AuditLogger
                AuditLogger.log_action(
                    fuel_record_id=record_id,
                    action='auto_allocate',
                    field_name='project_id',
                    old_value=None,
                    new_value=str(project_id),
                    operator=operator,
                    operator_role='system',
                    remark=f'自动分摊到项目，方法: {method}'
                )

                results['success'].append({
                    'id': record_id,
                    'project_id': project_id,
                    'method': method
                })

            except Exception as e:
                results['failed'].append({'id': record_id, 'reason': str(e)})

        return results

    def manual_allocate(self, fuel_record_id: int, project_id: int, 
                       operator: str, amount: float = None) -> Allocation:
        fuel_record = FuelRecord.query.get(fuel_record_id)
        if not fuel_record:
            raise ValueError(f'Fuel record {fuel_record_id} not found')

        project = Project.query.get(project_id)
        if not project or not project.is_active:
            raise ValueError(f'Project {project_id} not found or inactive')

        allocated_amount = amount if amount is not None else fuel_record.total_amount

        existing = Allocation.query.filter_by(fuel_record_id=fuel_record_id).first()
        if existing:
            old_project_id = existing.project_id
            existing.project_id = project_id
            existing.allocated_amount = allocated_amount
            existing.allocation_method = 'manual'
            existing.confirmed = False
        else:
            period = fuel_record.transaction_date.strftime('%Y-%m')
            existing = Allocation(
                fuel_record_id=fuel_record_id,
                project_id=project_id,
                allocated_amount=allocated_amount,
                allocation_ratio=1.0,
                allocation_method='manual',
                period=period
            )
            db.session.add(existing)
            old_project_id = None

        fuel_record.project_id = project_id
        fuel_record.status = 'allocated'

        db.session.commit()

        from audit_logger import AuditLogger
        AuditLogger.log_action(
            fuel_record_id=fuel_record_id,
            action='manual_allocate',
            field_name='project_id',
            old_value=str(old_project_id) if old_project_id else None,
            new_value=str(project_id),
            operator=operator,
            operator_role='admin',
            remark='手动调整分摊项目'
        )

        return existing

    def get_allocation_summary(self, period: str = None) -> List[Dict]:
        query = db.session.query(
            Allocation.project_id,
            Project.project_code,
            Project.project_name,
            db.func.sum(Allocation.allocated_amount).label('total_amount'),
            db.func.count(Allocation.id).label('record_count')
        ).join(Project)

        if period:
            query = query.filter(Allocation.period == period)

        results = query.group_by(
            Allocation.project_id,
            Project.project_code,
            Project.project_name
        ).all()

        return [
            {
                'project_id': r.project_id,
                'project_code': r.project_code,
                'project_name': r.project_name,
                'total_amount': float(r.total_amount or 0),
                'record_count': r.record_count
            }
            for r in results
        ]

    def get_unallocated_records(self) -> List[FuelRecord]:
        return FuelRecord.query.filter(
            (FuelRecord.status != 'allocated') | (FuelRecord.project_id.is_(None))
        ).all()
