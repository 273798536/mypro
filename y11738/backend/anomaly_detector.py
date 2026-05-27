from datetime import datetime
from typing import List, Dict, Tuple
from models import db, FuelRecord, Vehicle, Project, FuelType, Anomaly, Driver


class AnomalyDetector:
    def __init__(self):
        self.authorized_plates = set()
        self.authorized_fuels = set()
        self.active_projects = {}
        self._loaded = False

    def _load_reference_data(self):
        vehicles = Vehicle.query.filter_by(is_active=True).all()
        self.authorized_plates = {v.plate_number for v in vehicles}

        fuels = FuelType.query.filter_by(is_authorized=True).all()
        self.authorized_fuels = {f.code for f in fuels}

        projects = Project.query.filter_by(is_active=True).all()
        self.active_projects = {p.id: (p.start_date, p.end_date) for p in projects}

    def reload_reference_data(self):
        self._load_reference_data()

    def detect_plate_anomaly(self, record: Dict) -> Dict:
        plate = record.get('plate_number', '')
        
        if not plate:
            return {
                'type': 'plate_missing',
                'severity': 'error',
                'description': '车牌号为空，无法匹配车辆',
                'suggestion': '请补充车牌号信息'
            }

        if plate not in self.authorized_plates:
            similar = self._find_similar_plates(plate)
            suggestion = f'该车牌不在授权列表中。请检查是否录入错误'
            if similar:
                suggestion += f'。相似车牌: {", ".join(similar)}'
            return {
                'type': 'plate_unauthorized',
                'severity': 'warning',
                'description': f'车牌 {plate} 未在车辆档案中登记',
                'suggestion': suggestion
            }

        return None

    def _find_similar_plates(self, plate: str) -> List[str]:
        if len(plate) < 5:
            return []
        
        similar = []
        for authorized in self.authorized_plates:
            if len(authorized) == len(plate):
                diff = sum(1 for a, b in zip(plate, authorized) if a != b)
                if diff <= 2:
                    similar.append(authorized)
        return similar[:3]

    def detect_fuel_anomaly(self, record: Dict) -> Dict:
        fuel_type = record.get('fuel_type', '')
        
        if not fuel_type:
            return {
                'type': 'fuel_missing',
                'severity': 'warning',
                'description': '油品类型为空',
                'suggestion': '请补充油品类型信息'
            }

        if fuel_type not in self.authorized_fuels:
            return {
                'type': 'fuel_unauthorized',
                'severity': 'error',
                'description': f'油品 {fuel_type} 不在授权油品列表中',
                'suggestion': '请确认为授权油品，或联系管理员添加'
            }

        plate = record.get('plate_number', '')
        if plate in self.authorized_plates:
            vehicle = Vehicle.query.filter_by(plate_number=plate).first()
            if vehicle and vehicle.allowed_fuel_types:
                import json
                try:
                    allowed = json.loads(vehicle.allowed_fuel_types)
                    if fuel_type not in allowed:
                        return {
                            'type': 'fuel_vehicle_mismatch',
                            'severity': 'warning',
                            'description': f'车辆 {plate} 不允许使用 {fuel_type}',
                            'suggestion': f'该车辆允许油品: {", ".join(allowed)}'
                        }
                except:
                    pass

        return None

    def detect_project_cross_month(self, record: Dict, project_id: int) -> Dict:
        if project_id not in self.active_projects:
            return {
                'type': 'project_inactive',
                'severity': 'error',
                'description': '关联的项目未激活或不存在',
                'suggestion': '请检查项目编码是否正确'
            }

        start_date, end_date = self.active_projects[project_id]
        transaction_date = record.get('transaction_date')
        
        if transaction_date:
            trans_date = transaction_date.date() if isinstance(transaction_date, datetime) else transaction_date
            
            if start_date and trans_date < start_date:
                return {
                    'type': 'project_before_start',
                    'severity': 'warning',
                    'description': f'加油日期早于项目开始日期（{start_date}）',
                    'suggestion': '请确认是否应计入该项目'
                }
            
            if end_date and trans_date > end_date:
                return {
                    'type': 'project_after_end',
                    'severity': 'warning',
                    'description': f'加油日期晚于项目结束日期（{end_date}）',
                    'suggestion': '请确认是否应计入该项目'
                }

        return None

    def detect_amount_anomaly(self, record: Dict) -> Dict:
        quantity = record.get('quantity', 0)
        total_amount = record.get('total_amount', 0)
        unit_price = record.get('unit_price', 0)

        if quantity <= 0:
            return {
                'type': 'quantity_zero',
                'severity': 'error',
                'description': '加油数量为0或负数',
                'suggestion': '请检查数据录入'
            }

        if total_amount <= 0:
            return {
                'type': 'amount_zero',
                'severity': 'error',
                'description': '消费金额为0或负数',
                'suggestion': '请检查数据录入'
            }

        if unit_price > 0:
            calculated = quantity * unit_price
            if abs(calculated - total_amount) > max(total_amount * 0.05, 10):
                return {
                    'type': 'amount_mismatch',
                    'severity': 'warning',
                    'description': f'金额偏差超过5%: 计算值={calculated:.2f}, 实际={total_amount:.2f}',
                    'suggestion': '请核实单价和金额'
                }

        if quantity > 200:
            return {
                'type': 'quantity_abnormal',
                'severity': 'warning',
                'description': f'加油量异常大: {quantity}升',
                'suggestion': '请确认是否为真实消费'
            }

        if unit_price > 15 or unit_price < 3:
            return {
                'type': 'price_abnormal',
                'severity': 'warning',
                'description': f'单价异常: {unit_price}元/升',
                'suggestion': '请核实单价'
            }

        return None

    def detect_driver_anomaly(self, record: Dict) -> Dict:
        driver_name = record.get('driver_name', '')
        plate = record.get('plate_number', '')

        if not driver_name:
            return {
                'type': 'driver_missing',
                'severity': 'info',
                'description': '司机姓名为空',
                'suggestion': '建议补充司机信息以便确认'
            }

        if plate in self.authorized_plates:
            vehicle = Vehicle.query.filter_by(plate_number=plate).first()
            if vehicle and vehicle.driver_id:
                driver = Driver.query.get(vehicle.driver_id)
                if driver and driver.name != driver_name:
                    return {
                        'type': 'driver_mismatch',
                        'severity': 'info',
                        'description': f'登记司机为{driver.name}，实际记录为{driver_name}',
                        'suggestion': '请司机确认是否为代驾'
                    }

        return None

    def detect_all(self, record: Dict, project_id: int = None) -> List[Dict]:
        if not self._loaded:
            self._load_reference_data()
            self._loaded = True
        anomalies = []

        detectors = [
            self.detect_plate_anomaly,
            self.detect_fuel_anomaly,
            self.detect_amount_anomaly,
            self.detect_driver_anomaly
        ]

        for detector in detectors:
            anomaly = detector(record)
            if anomaly:
                anomalies.append(anomaly)

        if project_id:
            project_anomaly = self.detect_project_cross_month(record, project_id)
            if project_anomaly:
                anomalies.append(project_anomaly)

        return anomalies

    def save_anomalies(self, fuel_record_id: int, anomalies: List[Dict]):
        for anomaly_data in anomalies:
            anomaly = Anomaly(
                fuel_record_id=fuel_record_id,
                anomaly_type=anomaly_data['type'],
                severity=anomaly_data['severity'],
                description=anomaly_data['description'],
                suggestion=anomaly_data.get('suggestion', '')
            )
            db.session.add(anomaly)
        db.session.commit()


def detect_and_save_anomalies(fuel_record: FuelRecord) -> List[Anomaly]:
    detector = AnomalyDetector()
    record_dict = {
        'plate_number': fuel_record.plate_number,
        'fuel_type': fuel_record.fuel_type,
        'quantity': fuel_record.quantity,
        'unit_price': fuel_record.unit_price,
        'total_amount': fuel_record.total_amount,
        'driver_name': fuel_record.driver_name,
        'transaction_date': fuel_record.transaction_date
    }
    
    anomalies_data = detector.detect_all(record_dict, fuel_record.project_id)
    
    for anomaly_data in anomalies_data:
        anomaly = Anomaly(
            fuel_record_id=fuel_record.id,
            anomaly_type=anomaly_data['type'],
            severity=anomaly_data['severity'],
            description=anomaly_data['description'],
            suggestion=anomaly_data.get('suggestion', '')
        )
        db.session.add(anomaly)
    
    db.session.commit()
    
    return Anomaly.query.filter_by(fuel_record_id=fuel_record.id, is_resolved=False).all()
