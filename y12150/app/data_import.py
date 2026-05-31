import pandas as pd
import json
from datetime import datetime
from typing import List, Dict, Any, Tuple
from io import StringIO
from sqlalchemy.orm import Session
from .models import ComponentPower, Irradiance, CurtailmentRecord
from .config import UPLOAD_DIR


def parse_timestamp(ts_str: str) -> datetime:
    """解析时间戳，支持多种格式"""
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%Y/%m/%d %H:%M:%S',
        '%Y/%m/%d %H:%M',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%S.%f'
    ]
    for fmt in formats:
        try:
            return datetime.strptime(ts_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析时间戳: {ts_str}")


def import_component_power_csv(db: Session, inverter_id: int, content: str) -> Tuple[int, List[str]]:
    """导入组件功率CSV"""
    errors = []
    count = 0
    try:
        df = pd.read_csv(StringIO(content))

        required_cols = ['timestamp', 'ac_power']
        for col in required_cols:
            if col not in df.columns:
                errors.append(f"缺少必要列: {col}")
                return 0, errors

        for _, row in df.iterrows():
            try:
                ts = parse_timestamp(str(row['timestamp']))
                power = ComponentPower(
                    inverter_id=inverter_id,
                    timestamp=ts,
                    dc_power=float(row['dc_power']) if 'dc_power' in df.columns and pd.notna(row['dc_power']) else None,
                    ac_power=float(row['ac_power']) if pd.notna(row['ac_power']) else None,
                    module_temp=float(row['module_temp']) if 'module_temp' in df.columns and pd.notna(row['module_temp']) else None,
                    inverter_temp=float(row['inverter_temp']) if 'inverter_temp' in df.columns and pd.notna(row['inverter_temp']) else None
                )
                db.add(power)
                count += 1
            except Exception as e:
                errors.append(f"行 {_}: {str(e)}")

        db.commit()
    except Exception as e:
        errors.append(f"解析CSV失败: {str(e)}")

    return count, errors


def import_irradiance_csv(db: Session, inverter_id: int, content: str) -> Tuple[int, List[str]]:
    """导入辐照度CSV"""
    errors = []
    count = 0
    try:
        df = pd.read_csv(StringIO(content))

        required_cols = ['timestamp', 'plane_irradiance']
        for col in required_cols:
            if col not in df.columns:
                errors.append(f"缺少必要列: {col}")
                return 0, errors

        for _, row in df.iterrows():
            try:
                ts = parse_timestamp(str(row['timestamp']))
                irradiance = Irradiance(
                    inverter_id=inverter_id,
                    timestamp=ts,
                    global_irradiance=float(row['global_irradiance']) if 'global_irradiance' in df.columns and pd.notna(row['global_irradiance']) else None,
                    plane_irradiance=float(row['plane_irradiance']) if pd.notna(row['plane_irradiance']) else None,
                    ambient_temp=float(row['ambient_temp']) if 'ambient_temp' in df.columns and pd.notna(row['ambient_temp']) else None,
                    wind_speed=float(row['wind_speed']) if 'wind_speed' in df.columns and pd.notna(row['wind_speed']) else None
                )
                db.add(irradiance)
                count += 1
            except Exception as e:
                errors.append(f"行 {_}: {str(e)}")

        db.commit()
    except Exception as e:
        errors.append(f"解析CSV失败: {str(e)}")

    return count, errors


def import_curtailment_csv(db: Session, inverter_id: int, content: str) -> Tuple[int, List[str]]:
    """导入限发记录CSV"""
    errors = []
    count = 0
    try:
        df = pd.read_csv(StringIO(content))

        required_cols = ['start_time', 'end_time', 'curtailment_type']
        for col in required_cols:
            if col not in df.columns:
                errors.append(f"缺少必要列: {col}")
                return 0, errors

        for _, row in df.iterrows():
            try:
                start_ts = parse_timestamp(str(row['start_time']))
                end_ts = parse_timestamp(str(row['end_time']))
                record = CurtailmentRecord(
                    inverter_id=inverter_id,
                    start_time=start_ts,
                    end_time=end_ts,
                    curtailment_type=str(row['curtailment_type']),
                    reason=str(row['reason']) if 'reason' in df.columns and pd.notna(row['reason']) else None,
                    power_limit=float(row['power_limit']) if 'power_limit' in df.columns and pd.notna(row['power_limit']) else None,
                    approved_by=str(row['approved_by']) if 'approved_by' in df.columns and pd.notna(row['approved_by']) else None
                )
                db.add(record)
                count += 1
            except Exception as e:
                errors.append(f"行 {_}: {str(e)}")

        db.commit()
    except Exception as e:
        errors.append(f"解析CSV失败: {str(e)}")

    return count, errors


def import_json_data(db: Session, inverter_id: int, content: str) -> Dict[str, Any]:
    """导入JSON格式数据"""
    result = {
        'component_power_count': 0,
        'irradiance_count': 0,
        'curtailment_count': 0,
        'errors': []
    }
    try:
        data = json.loads(content)

        if 'component_powers' in data:
            for item in data['component_powers']:
                try:
                    ts = parse_timestamp(item['timestamp'])
                    power = ComponentPower(
                        inverter_id=inverter_id,
                        timestamp=ts,
                        dc_power=item.get('dc_power'),
                        ac_power=item.get('ac_power'),
                        module_temp=item.get('module_temp'),
                        inverter_temp=item.get('inverter_temp')
                    )
                    db.add(power)
                    result['component_power_count'] += 1
                except Exception as e:
                    result['errors'].append(f"功率数据错误: {str(e)}")

        if 'irradiances' in data:
            for item in data['irradiances']:
                try:
                    ts = parse_timestamp(item['timestamp'])
                    irr = Irradiance(
                        inverter_id=inverter_id,
                        timestamp=ts,
                        global_irradiance=item.get('global_irradiance'),
                        plane_irradiance=item.get('plane_irradiance'),
                        ambient_temp=item.get('ambient_temp'),
                        wind_speed=item.get('wind_speed')
                    )
                    db.add(irr)
                    result['irradiance_count'] += 1
                except Exception as e:
                    result['errors'].append(f"辐照度数据错误: {str(e)}")

        if 'curtailment_records' in data:
            for item in data['curtailment_records']:
                try:
                    start_ts = parse_timestamp(item['start_time'])
                    end_ts = parse_timestamp(item['end_time'])
                    record = CurtailmentRecord(
                        inverter_id=inverter_id,
                        start_time=start_ts,
                        end_time=end_ts,
                        curtailment_type=item['curtailment_type'],
                        reason=item.get('reason'),
                        power_limit=item.get('power_limit'),
                        approved_by=item.get('approved_by')
                    )
                    db.add(record)
                    result['curtailment_count'] += 1
                except Exception as e:
                    result['errors'].append(f"限发记录错误: {str(e)}")

        db.commit()
    except Exception as e:
        result['errors'].append(f"解析JSON失败: {str(e)}")

    return result
