from datetime import datetime
from typing import List, Dict
from models import db, DriverConfirmation, FuelRecord, Driver, Vehicle, Project


class DriverConfirmationService:
    def create_confirmation_task(self, fuel_record_id: int, driver_id: int = None) -> DriverConfirmation:
        fuel_record = FuelRecord.query.get(fuel_record_id)
        if not fuel_record:
            raise ValueError(f'Fuel record {fuel_record_id} not found')

        if not driver_id:
            driver_id = self._infer_driver_id(fuel_record)
            if not driver_id:
                raise ValueError(f'无法确定司机ID，请手动指定')

        existing = DriverConfirmation.query.filter_by(
            fuel_record_id=fuel_record_id,
            driver_id=driver_id,
            status='pending'
        ).first()

        if existing:
            return existing

        confirmation = DriverConfirmation(
            fuel_record_id=fuel_record_id,
            driver_id=driver_id,
            status='pending'
        )

        db.session.add(confirmation)
        db.session.commit()

        return confirmation

    def _infer_driver_id(self, fuel_record: FuelRecord) -> int:
        if fuel_record.driver_name:
            driver = Driver.query.filter_by(name=fuel_record.driver_name, is_active=True).first()
            if driver:
                return driver.id

        if fuel_record.plate_number:
            vehicle = Vehicle.query.filter_by(plate_number=fuel_record.plate_number, is_active=True).first()
            if vehicle and vehicle.driver_id:
                return vehicle.driver_id

        return None

    def batch_create_tasks(self, fuel_record_ids: List[int]) -> Dict:
        results = {
            'success': [],
            'failed': []
        }

        for record_id in fuel_record_ids:
            try:
                confirmation = self.create_confirmation_task(record_id)
                results['success'].append({
                    'fuel_record_id': record_id,
                    'confirmation_id': confirmation.id,
                    'driver_id': confirmation.driver_id
                })
            except Exception as e:
                results['failed'].append({
                    'fuel_record_id': record_id,
                    'reason': str(e)
                })

        return results

    def confirm_record(self, confirmation_id: int, driver_id: int,
                      confirmed: bool, driver_remark: str = None,
                      corrected_plate: str = None, corrected_project_id: int = None) -> DriverConfirmation:
        confirmation = DriverConfirmation.query.get(confirmation_id)
        if not confirmation:
            raise ValueError(f'Confirmation {confirmation_id} not found')

        if confirmation.driver_id != driver_id:
            raise ValueError('该确认任务不属于此司机')

        if confirmation.status != 'pending':
            raise ValueError(f'该确认任务状态为 {confirmation.status}，无法再次确认')

        confirmation.status = 'confirmed' if confirmed else 'disputed'
        confirmation.driver_remark = driver_remark
        confirmation.corrected_plate = corrected_plate
        confirmation.corrected_project_id = corrected_project_id
        confirmation.confirmed_at = datetime.utcnow()

        if confirmed:
            fuel_record = confirmation.fuel_record
            if corrected_plate:
                fuel_record.plate_number = corrected_plate
            if corrected_project_id:
                fuel_record.project_id = corrected_project_id
            fuel_record.status = 'confirmed'

        db.session.commit()

        from audit_logger import AuditLogger
        driver = Driver.query.get(driver_id)
        AuditLogger.log_driver_confirm(
            fuel_record_id=confirmation.fuel_record_id,
            driver_id=driver_id,
            status=confirmation.status,
            operator=driver.name if driver else f'Driver#{driver_id}'
        )

        return confirmation

    def get_pending_confirmations(self, driver_id: int = None) -> List[Dict]:
        query = DriverConfirmation.query.filter_by(status='pending')

        if driver_id:
            query = query.filter_by(driver_id=driver_id)

        confirmations = query.order_by(DriverConfirmation.created_at.desc()).all()

        result = []
        for conf in confirmations:
            fuel_record = conf.fuel_record
            driver = Driver.query.get(conf.driver_id)
            result.append({
                'confirmation_id': conf.id,
                'fuel_record_id': conf.fuel_record_id,
                'driver_id': conf.driver_id,
                'driver_name': driver.name if driver else '',
                'transaction_date': fuel_record.transaction_date.strftime('%Y-%m-%d %H:%M') if fuel_record.transaction_date else '',
                'plate_number': fuel_record.plate_number,
                'fuel_type': fuel_record.fuel_type,
                'quantity': fuel_record.quantity,
                'total_amount': fuel_record.total_amount,
                'station_name': fuel_record.station_name,
                'remark': fuel_record.remark,
                'created_at': conf.created_at.strftime('%Y-%m-%d %H:%M')
            })

        return result

    def get_confirmation_status(self, fuel_record_id: int) -> Dict:
        confirmations = DriverConfirmation.query.filter_by(fuel_record_id=fuel_record_id).all()

        if not confirmations:
            return {'has_confirmation': False}

        latest = max(confirmations, key=lambda c: c.created_at)
        driver = Driver.query.get(latest.driver_id)

        return {
            'has_confirmation': True,
            'status': latest.status,
            'driver_name': driver.name if driver else '',
            'confirmed_at': latest.confirmed_at.strftime('%Y-%m-%d %H:%M') if latest.confirmed_at else None,
            'driver_remark': latest.driver_remark,
            'corrected_plate': latest.corrected_plate,
            'corrected_project_id': latest.corrected_project_id
        }
