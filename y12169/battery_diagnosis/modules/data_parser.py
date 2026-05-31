import csv
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple, Union
import io

from ..core.models import (
    DataPacket, VehicleProfile, TripRecord, DiagnosisReport,
    DataSourceType
)


def make_source_ref(source_file: str, source_line: Optional[int] = None) -> str:
    if source_line:
        return f"{source_file}#L{source_line}"
    return source_file


def parse_datetime(value: str) -> Optional[datetime]:
    if not value or value.strip() == '':
        return None

    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y/%m/%d",
        "%Y%m%d%H%M%S",
        "%Y%m%d",
    ]

    value = value.strip()
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except (ValueError, TypeError):
            continue

    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        pass

    return None


def parse_float(value: Any, default: Optional[float] = None) -> Optional[float]:
    if value is None or value == '':
        return default
    try:
        s = str(value).replace(',', '').strip()
        return float(s)
    except (ValueError, TypeError):
        return default


def parse_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    if value is None or value == '':
        return default
    try:
        s = str(value).replace(',', '').strip()
        return int(float(s))
    except (ValueError, TypeError):
        return default


def parse_bool(value: Any, default: bool = False) -> bool:
    if value is None or value == '':
        return default
    s = str(value).strip().lower()
    if s in ('true', 'yes', 'y', '1', '是', '有'):
        return True
    if s in ('false', 'no', 'n', '0', '否', '无'):
        return False
    return default


class DataParser:
    def __init__(self):
        self.vehicle_keywords = ['vin', '车辆识别码', '车架号', 'brand', '品牌', 'model', '车型', '标称续航', '电池容量']
        self.trip_keywords = ['trip_id', '行程', 'start_time', '开始时间', 'soc', 'distance', '距离', 'speed', '速度', 'temp', '温度']
        self.diagnosis_keywords = ['report_id', '报告', 'battery_health', '电池健康', 'fault', '故障', 'technician', '工程师']

    def detect_data_type(self, headers: List[str]) -> Optional[DataSourceType]:
        header_str = ' '.join(str(h).lower() for h in headers)

        vehicle_matches = sum(1 for k in self.vehicle_keywords if k.lower() in header_str)
        trip_matches = sum(1 for k in self.trip_keywords if k.lower() in header_str)
        diagnosis_matches = sum(1 for k in self.diagnosis_keywords if k.lower() in header_str)

        matches = [
            (vehicle_matches, DataSourceType.VEHICLE_PROFILE),
            (trip_matches, DataSourceType.TRIP_DATA),
            (diagnosis_matches, DataSourceType.DIAGNOSIS_REPORT),
        ]
        matches.sort(key=lambda x: x[0], reverse=True)

        if matches[0][0] >= 2:
            return matches[0][1]
        return None

    def _normalize_keys(self, row: Dict[str, Any]) -> Dict[str, Any]:
        normalized = {}
        key_mapping = {
            'vin': 'vin',
            '车辆识别码': 'vin',
            '车架号': 'vin',
            'brand': 'brand',
            '品牌': 'brand',
            'model': 'model',
            '车型': 'model',
            'production_date': 'production_date',
            '生产日期': 'production_date',
            '出厂日期': 'production_date',
            'nominal_range_km': 'nominal_range_km',
            '标称续航': 'nominal_range_km',
            '标称续航(km)': 'nominal_range_km',
            '标称续航里程': 'nominal_range_km',
            'battery_capacity_kwh': 'battery_capacity_kwh',
            '电池容量': 'battery_capacity_kwh',
            '电池容量(kwh)': 'battery_capacity_kwh',
            'initial_battery_health': 'initial_battery_health',
            '初始电池健康度': 'initial_battery_health',
            'purchase_date': 'purchase_date',
            '购买日期': 'purchase_date',
            '购车日期': 'purchase_date',
            'total_odometer_km': 'total_odometer_km',
            '总里程': 'total_odometer_km',
            'trip_id': 'trip_id',
            '行程id': 'trip_id',
            'start_time': 'start_time',
            '开始时间': 'start_time',
            'end_time': 'end_time',
            '结束时间': 'end_time',
            'start_soc': 'start_soc',
            '起始soc': 'start_soc',
            '开始电量': 'start_soc',
            'end_soc': 'end_soc',
            '结束soc': 'end_soc',
            '结束电量': 'end_soc',
            'distance_km': 'distance_km',
            'distance': 'distance_km',
            '行驶距离': 'distance_km',
            '里程': 'distance_km',
            'avg_speed_kmh': 'avg_speed_kmh',
            'avg_speed': 'avg_speed_kmh',
            '平均速度': 'avg_speed_kmh',
            'avg_temp_c': 'avg_temp_c',
            'avg_temp': 'avg_temp_c',
            '平均温度': 'avg_temp_c',
            '平均气温': 'avg_temp_c',
            'min_temp_c': 'min_temp_c',
            'min_temp': 'min_temp_c',
            '最低温度': 'min_temp_c',
            'max_temp_c': 'max_temp_c',
            'max_temp': 'max_temp_c',
            '最高温度': 'max_temp_c',
            'elevation_gain_m': 'elevation_gain_m',
            '海拔提升': 'elevation_gain_m',
            '爬坡高度': 'elevation_gain_m',
            'ac_usage_hours': 'ac_usage_hours',
            '空调使用时长': 'ac_usage_hours',
            '空调使用时间': 'ac_usage_hours',
            'fast_charged_before': 'fast_charged_before',
            '行程前快充': 'fast_charged_before',
            '充电_count_7d': 'charging_count_7d',
            'charging_count_7d': 'charging_count_7d',
            '7天充电次数': 'charging_count_7d',
            'fast_charging_count_7d': 'fast_charging_count_7d',
            '7天快充次数': 'fast_charging_count_7d',
            'report_id': 'report_id',
            '报告id': 'report_id',
            'report_date': 'report_date',
            '报告日期': 'report_date',
            'current_battery_health': 'current_battery_health',
            '当前电池健康度': 'current_battery_health',
            '电池健康度': 'current_battery_health',
            'estimated_range_km': 'estimated_range_km',
            '估算续航': 'estimated_range_km',
            'fault_codes': 'fault_codes',
            '故障码': 'fault_codes',
            'technician_notes': 'technician_notes',
            '工程师备注': 'technician_notes',
            '技师备注': 'technician_notes',
        }

        for key, value in row.items():
            key_lower = str(key).strip().lower()
            if key_lower in key_mapping:
                normalized[key_mapping[key_lower]] = value
            else:
                for cn_key, mapped_key in key_mapping.items():
                    if cn_key in str(key) and mapped_key not in normalized:
                        normalized[mapped_key] = value
                        break
                else:
                    normalized[key_lower] = value

        return normalized

    def parse_vehicle_profile(self, row: Dict[str, Any], source_file: str, source_line: int) -> Optional[VehicleProfile]:
        try:
            norm = self._normalize_keys(row)

            if not norm.get('vin'):
                return None

            production_date = parse_datetime(str(norm.get('production_date', '')))
            if not production_date:
                return None

            nominal_range = parse_float(norm.get('nominal_range_km'))
            battery_capacity = parse_float(norm.get('battery_capacity_kwh'))

            if nominal_range is None or battery_capacity is None:
                return None

            return VehicleProfile(
                vin=str(norm['vin']).strip(),
                brand=str(norm.get('brand', '未知品牌')).strip(),
                model=str(norm.get('model', '未知车型')).strip(),
                production_date=production_date,
                nominal_range_km=nominal_range,
                battery_capacity_kwh=battery_capacity,
                initial_battery_health=parse_float(norm.get('initial_battery_health'), 100.0) or 100.0,
                purchase_date=parse_datetime(str(norm.get('purchase_date', ''))),
                total_odometer_km=parse_float(norm.get('total_odometer_km')),
                source_file=source_file,
                source_line=source_line
            )
        except Exception as e:
            print(f"Warning: Failed to parse vehicle profile at line {source_line}: {e}")
            return None

    def parse_trip_record(self, row: Dict[str, Any], source_file: str, source_line: int) -> Optional[TripRecord]:
        try:
            norm = self._normalize_keys(row)

            required_fields = ['vin', 'trip_id', 'start_time', 'end_time', 'start_soc', 'end_soc', 'distance_km', 'avg_speed_kmh', 'avg_temp_c']
            for field in required_fields:
                if field not in norm or norm[field] is None or str(norm[field]).strip() == '':
                    return None

            start_time = parse_datetime(str(norm['start_time']))
            end_time = parse_datetime(str(norm['end_time']))

            if not start_time or not end_time:
                return None

            return TripRecord(
                trip_id=str(norm['trip_id']).strip(),
                vin=str(norm['vin']).strip(),
                start_time=start_time,
                end_time=end_time,
                start_soc=parse_float(norm['start_soc'], 0.0) or 0.0,
                end_soc=parse_float(norm['end_soc'], 0.0) or 0.0,
                distance_km=parse_float(norm['distance_km'], 0.0) or 0.0,
                avg_speed_kmh=parse_float(norm['avg_speed_kmh'], 0.0) or 0.0,
                avg_temp_c=parse_float(norm['avg_temp_c'], 0.0) or 0.0,
                min_temp_c=parse_float(norm.get('min_temp_c')),
                max_temp_c=parse_float(norm.get('max_temp_c')),
                elevation_gain_m=parse_float(norm.get('elevation_gain_m')),
                ac_usage_hours=parse_float(norm.get('ac_usage_hours')),
                fast_charged_before=parse_bool(norm.get('fast_charged_before', False)),
                charging_count_7d=parse_int(norm.get('charging_count_7d'), 0) or 0,
                fast_charging_count_7d=parse_int(norm.get('fast_charging_count_7d'), 0) or 0,
                source_file=source_file,
                source_line=source_line
            )
        except Exception as e:
            print(f"Warning: Failed to parse trip record at line {source_line}: {e}")
            return None

    def parse_diagnosis_report(self, row: Dict[str, Any], source_file: str, source_line: int) -> Optional[DiagnosisReport]:
        try:
            norm = self._normalize_keys(row)

            required_fields = ['vin', 'report_id', 'report_date', 'current_battery_health']
            for field in required_fields:
                if field not in norm or norm[field] is None or str(norm[field]).strip() == '':
                    return None

            report_date = parse_datetime(str(norm['report_date']))
            if not report_date:
                return None

            fault_codes = None
            if norm.get('fault_codes'):
                fc = str(norm['fault_codes'])
                fault_codes = [code.strip() for code in re.split(r'[,，;；\s]+', fc) if code.strip()]

            return DiagnosisReport(
                report_id=str(norm['report_id']).strip(),
                vin=str(norm['vin']).strip(),
                report_date=report_date,
                current_battery_health=parse_float(norm['current_battery_health'], 100.0) or 100.0,
                estimated_range_km=parse_float(norm.get('estimated_range_km')),
                fault_codes=fault_codes,
                technician_notes=str(norm.get('technician_notes', '')).strip() or None,
                source_file=source_file,
                source_line=source_line
            )
        except Exception as e:
            print(f"Warning: Failed to parse diagnosis report at line {source_line}: {e}")
            return None

    def parse_csv(self, file_path: Union[str, Path]) -> DataPacket:
        file_path = Path(file_path)
        packet = DataPacket(
            packet_id=str(uuid.uuid4()),
            raw_files=[file_path.name]
        )

        with open(file_path, 'r', encoding='utf-8-sig') as f:
            content = f.read()

        if len(content) > 0:
            try:
                dialect = csv.Sniffer().sniff(content[:1024])
                if dialect.delimiter not in [',', ';', '\t', '|']:
                    dialect = csv.excel
            except Exception:
                dialect = csv.excel
        else:
            dialect = csv.excel
        reader = csv.DictReader(io.StringIO(content), dialect=dialect)

        headers = reader.fieldnames or []
        data_type = self.detect_data_type(headers)

        for line_num, row in enumerate(reader, start=2):
            if all(v is None or str(v).strip() == '' for v in row.values()):
                continue

            if data_type == DataSourceType.VEHICLE_PROFILE:
                profile = self.parse_vehicle_profile(row, file_path.name, line_num)
                if profile:
                    packet.vehicle_profile = profile
            elif data_type == DataSourceType.TRIP_DATA:
                trip = self.parse_trip_record(row, file_path.name, line_num)
                if trip:
                    packet.trip_records.append(trip)
            elif data_type == DataSourceType.DIAGNOSIS_REPORT:
                report = self.parse_diagnosis_report(row, file_path.name, line_num)
                if report:
                    packet.diagnosis_reports.append(report)
            else:
                vp = self.parse_vehicle_profile(row, file_path.name, line_num)
                if vp:
                    packet.vehicle_profile = vp
                    continue
                tr = self.parse_trip_record(row, file_path.name, line_num)
                if tr:
                    packet.trip_records.append(tr)
                    continue
                dr = self.parse_diagnosis_report(row, file_path.name, line_num)
                if dr:
                    packet.diagnosis_reports.append(dr)

        return packet

    def parse_json(self, file_path: Union[str, Path]) -> DataPacket:
        file_path = Path(file_path)
        packet = DataPacket(
            packet_id=str(uuid.uuid4()),
            raw_files=[file_path.name]
        )

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if isinstance(data, dict):
            sections = data.items()
        elif isinstance(data, list):
            sections = [('records', data)]
        else:
            return packet

        line_counter = 1
        for section_name, section_data in sections:
            if isinstance(section_data, dict):
                if 'vin' in section_data:
                    profile = self.parse_vehicle_profile(section_data, file_path.name, line_counter)
                    if profile:
                        packet.vehicle_profile = profile
                    line_counter += 1
            elif isinstance(section_data, list):
                for idx, item in enumerate(section_data):
                    line_num = line_counter + idx
                    if isinstance(item, dict):
                        if 'trip_id' in item:
                            trip = self.parse_trip_record(item, file_path.name, line_num)
                            if trip:
                                packet.trip_records.append(trip)
                        elif 'report_id' in item:
                            report = self.parse_diagnosis_report(item, file_path.name, line_num)
                            if report:
                                packet.diagnosis_reports.append(report)
                        elif 'vin' in item and 'production_date' in item:
                            profile = self.parse_vehicle_profile(item, file_path.name, line_num)
                            if profile:
                                packet.vehicle_profile = profile
                line_counter += len(section_data)

        return packet

    def parse_mixed_packet(self, file_paths: List[Union[str, Path]]) -> DataPacket:
        packets = []
        for file_path in file_paths:
            file_path = Path(file_path)
            suffix = file_path.suffix.lower()
            if suffix == '.csv':
                p = self.parse_csv(file_path)
            elif suffix == '.json':
                p = self.parse_json(file_path)
            else:
                continue
            packets.append(p)

        if not packets:
            return DataPacket(packet_id=str(uuid.uuid4()))

        merged = DataPacket(
            packet_id=packets[0].packet_id,
            raw_files=[f for p in packets for f in p.raw_files]
        )

        vins = set()
        for p in packets:
            if p.vehicle_profile:
                merged.vehicle_profile = p.vehicle_profile
                vins.add(p.vehicle_profile.vin)
            merged.trip_records.extend(p.trip_records)
            merged.diagnosis_reports.extend(p.diagnosis_reports)
            for t in p.trip_records:
                vins.add(t.vin)
            for d in p.diagnosis_reports:
                vins.add(d.vin)

        if not merged.vehicle_profile and merged.trip_records:
            first_trip = merged.trip_records[0]
            merged.vehicle_profile = VehicleProfile(
                vin=first_trip.vin,
                brand="未知",
                model="未知",
                production_date=first_trip.start_time,
                nominal_range_km=500.0,
                battery_capacity_kwh=70.0,
                source_file=first_trip.source_file,
                source_line=first_trip.source_line
            )

        return merged


def parse_packet(file_paths: List[Union[str, Path]]) -> DataPacket:
    parser = DataParser()
    return parser.parse_mixed_packet(file_paths)
