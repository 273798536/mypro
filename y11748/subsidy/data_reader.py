import csv
import json
from datetime import date, datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from .models import (
    VehicleRecord, MileageRecord, ChargingRecord,
    OperationCalendar, SubsidyRule
)


class DataReader:
    @staticmethod
    def _parse_date(date_str: str) -> date:
        for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%d-%m-%Y', '%Y%m%d']:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        raise ValueError(f"无法解析日期: {date_str}")
    
    @staticmethod
    def _parse_datetime(dt_str: str) -> Optional[datetime]:
        if not dt_str or dt_str.strip() == '':
            return None
        for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y/%m/%d %H:%M:%S']:
            try:
                return datetime.strptime(dt_str.strip(), fmt)
            except ValueError:
                continue
        return None
    
    @staticmethod
    def _parse_float(val: str, default: float = 0.0) -> float:
        if not val or val.strip() == '':
            return default
        try:
            return float(val.strip())
        except ValueError:
            return default
    
    @staticmethod
    def _parse_int(val: str, default: int = 0) -> int:
        if not val or val.strip() == '':
            return default
        try:
            return int(val.strip())
        except ValueError:
            return default
    
    @staticmethod
    def _parse_bool(val: str) -> bool:
        if not val:
            return False
        val = val.strip().lower()
        return val in ['true', '1', 'yes', '是', '营运', '在线']

    @classmethod
    def read_vehicles_csv(cls, file_path: str) -> List[VehicleRecord]:
        vehicles = []
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                exit_date = row.get('exit_date', '')
                vehicles.append(VehicleRecord(
                    vehicle_id=row.get('vehicle_id', row.get('车辆ID', '')).strip(),
                    plate_number=row.get('plate_number', row.get('车牌号', '')).strip(),
                    vehicle_type=row.get('vehicle_type', row.get('车型', '')).strip(),
                    battery_capacity=cls._parse_float(row.get('battery_capacity', row.get('电池容量', '0'))),
                    join_date=cls._parse_date(row.get('join_date', row.get('入网日期', ''))),
                    exit_date=cls._parse_date(exit_date) if exit_date else None,
                    source=f"vehicle_archive:{Path(file_path).name}"
                ))
        return vehicles
    
    @classmethod
    def read_mileage_csv(cls, file_path: str) -> List[MileageRecord]:
        records = []
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                raw_data = dict(row)
                records.append(MileageRecord(
                    vehicle_id=row.get('vehicle_id', row.get('车辆ID', '')).strip(),
                    record_date=cls._parse_date(row.get('record_date', row.get('日期', ''))),
                    start_mileage=cls._parse_float(row.get('start_mileage', row.get('开始里程', '0'))),
                    end_mileage=cls._parse_float(row.get('end_mileage', row.get('结束里程', '0'))),
                    source=f"mileage_reader:{Path(file_path).name}",
                    raw_data=raw_data
                ))
        return records
    
    @classmethod
    def read_charging_csv(cls, file_path: str) -> List[ChargingRecord]:
        records = []
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(ChargingRecord(
                    vehicle_id=row.get('vehicle_id', row.get('车辆ID', '')).strip(),
                    charge_date=cls._parse_date(row.get('charge_date', row.get('充电日期', ''))),
                    charge_start_time=cls._parse_datetime(row.get('start_time', row.get('开始时间', ''))),
                    charge_end_time=cls._parse_datetime(row.get('end_time', row.get('结束时间', ''))),
                    charged_kwh=cls._parse_float(row.get('charged_kwh', row.get('充电量', '0'))),
                    start_soc=cls._parse_float(row.get('start_soc', row.get('起始SOC', '')), None) if row.get('start_soc', row.get('起始SOC', '')) else None,
                    end_soc=cls._parse_float(row.get('end_soc', row.get('结束SOC', '')), None) if row.get('end_soc', row.get('结束SOC', '')) else None,
                    source=f"charging_station:{Path(file_path).name}"
                ))
        return records
    
    @classmethod
    def read_operation_calendar_csv(cls, file_path: str) -> List[OperationCalendar]:
        records = []
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(OperationCalendar(
                    vehicle_id=row.get('vehicle_id', row.get('车辆ID', '')).strip(),
                    operation_date=cls._parse_date(row.get('operation_date', row.get('日期', ''))),
                    is_operating=cls._parse_bool(row.get('is_operating', row.get('是否营运', '0'))),
                    online_hours=cls._parse_float(row.get('online_hours', row.get('在线时长', '0'))),
                    source=f"operation_system:{Path(file_path).name}"
                ))
        return records
    
    @classmethod
    def read_subsidy_rules_csv(cls, file_path: str) -> List[SubsidyRule]:
        rules = []
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rules.append(SubsidyRule(
                    rule_id=row.get('rule_id', row.get('规则ID', '')).strip(),
                    effective_date=cls._parse_date(row.get('effective_date', row.get('生效日期', ''))),
                    expiry_date=cls._parse_date(row.get('expiry_date', row.get('截止日期', ''))),
                    min_daily_mileage=cls._parse_float(row.get('min_daily_mileage', row.get('最低日里程', '0'))),
                    min_monthly_days=cls._parse_int(row.get('min_monthly_days', row.get('最低营运天数', '0'))),
                    subsidy_per_km=cls._parse_float(row.get('subsidy_per_km', row.get('每公里补贴', '0'))),
                    max_monthly_subsidy=cls._parse_float(row.get('max_monthly_subsidy', row.get('月补贴上限', '0'))),
                    min_charge_ratio=cls._parse_float(row.get('min_charge_ratio', row.get('最低充电比', '0.8'))),
                    source=f"subsidy_policy:{Path(file_path).name}"
                ))
        return rules
    
    @classmethod
    def read_sample_data(cls, data_dir: str) -> Dict[str, List]:
        dir_path = Path(data_dir)
        result = {
            'vehicles': [],
            'mileage': [],
            'charging': [],
            'calendar': [],
            'rules': []
        }
        
        vehicle_file = dir_path / 'vehicles.csv'
        if vehicle_file.exists():
            result['vehicles'] = cls.read_vehicles_csv(str(vehicle_file))
        
        mileage_file = dir_path / 'mileage.csv'
        if mileage_file.exists():
            result['mileage'] = cls.read_mileage_csv(str(mileage_file))
        
        charging_file = dir_path / 'charging.csv'
        if charging_file.exists():
            result['charging'] = cls.read_charging_csv(str(charging_file))
        
        calendar_file = dir_path / 'calendar.csv'
        if calendar_file.exists():
            result['calendar'] = cls.read_operation_calendar_csv(str(calendar_file))
        
        rules_file = dir_path / 'rules.csv'
        if rules_file.exists():
            result['rules'] = cls.read_subsidy_rules_csv(str(rules_file))
        
        return result
