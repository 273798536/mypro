import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from .models import Inverter, ComponentPower, Irradiance, CurtailmentRecord, AnalysisResult


def calculate_theoretical_power(
    irradiance: float,
    dc_capacity: float,
    efficiency: float,
    temp_coefficient: float,
    module_temp: float,
    nominal_temp: float = 25.0
) -> float:
    """
    计算理论功率
    P_theory = G * (G/1000) * P_rated * η * (1 + α * (T_mod - T_ref)
    """
    if irradiance <= 0:
        return 0.0

    temp_factor = 1 + (temp_coefficient / 100) * (module_temp - nominal_temp)
    power = (irradiance / 1000) * dc_capacity * efficiency * max(temp_factor, 0.7)
    return max(power, 0.0)


def is_in_curtailment_period(timestamp: datetime, curtailments: List[CurtailmentRecord]) -> Optional[CurtailmentRecord]:
    """检查时间点是否在限发时段内"""
    for cur in curtailments:
        if cur.start_time <= timestamp <= cur.end_time:
            return cur
    return None


def identify_clipping_periods(
    df: pd.DataFrame,
    clipping_threshold: float,
    min_duration_minutes: int = 15
) -> List[Dict[str, Any]]:
    """
    识别削峰时段
    当实际功率持续低于理论功率超过阈值且持续时间超过最小时长时，判定为削峰
    """
    clipping_periods = []
    current_period = None

    for i, row in df.iterrows():
        expected = row['expected_power']
        actual = row['ac_power']
        timestamp = row['timestamp']

        is_clipping = (
            expected > clipping_threshold * 0.5 and
            actual < expected * 0.95 and
            (expected - actual) > expected * 0.05
        )

        if is_clipping:
            if current_period is None:
                current_period = {
                    'start_time': timestamp,
                    'max_expected': expected,
                    'max_actual': actual,
                    'total_loss': 0,
                    'data_points': []
                }
            current_period['max_expected'] = max(current_period['max_expected'], expected)
            current_period['end_time'] = timestamp
            current_period['max_actual'] = max(current_period['max_actual'], actual)
            current_period['total_loss'] += (expected - actual) * (5 / 60)
            current_period['data_points'].append({
                'timestamp': timestamp,
                'expected': expected,
                'actual': actual,
                'loss': (expected - actual) * (5 / 60)
            })
        else:
            if current_period is not None:
                duration = (current_period['end_time'] - current_period['start_time']).total_seconds() / 60
                if duration >= min_duration_minutes:
                    current_period['duration_minutes'] = duration
                    current_period['cause'] = determine_clipping_cause(current_period, row)
                    clipping_periods.append(current_period)
                current_period = None

    if current_period is not None:
        duration = (current_period['end_time'] - current_period['start_time']).total_seconds() / 60
        if duration >= min_duration_minutes:
            current_period['duration_minutes'] = duration
            current_period['cause'] = determine_clipping_cause(current_period, df.iloc[-1])
            clipping_periods.append(current_period)

    return clipping_periods


def determine_clipping_cause(period: Dict[str, Any], last_row: pd.Series) -> str:
    """判断削峰原因"""
    if last_row.get('curtailment_active'):
        return '限发重叠'
    if last_row.get('module_temp', 25) > 55:
        return '温度过高'
    if last_row.get('irradiance_gap', False):
        return '辐照缺口'
    return '逆变器削峰'


def analyze_loss_breakdown(
    df: pd.DataFrame,
    clipping_periods: List[Dict[str, Any]],
    inverter: Inverter,
    curtailments: List[CurtailmentRecord]
) -> Dict[str, float]:
    """
    损失分项计算
    """
    clipping_loss = 0.0
    temperature_loss = 0.0
    curtailment_loss = 0.0
    irradiance_gap_loss = 0.0
    other_loss = 0.0

    for i, row in df.iterrows():
        expected = row['expected_power']
        actual = row['ac_power']
        loss = (expected - actual) * (5 / 60)

        if loss <= 0:
            continue

        if row.get('curtailment_active'):
            curtailment_loss += loss * 0.7
            other_loss += loss * 0.3
        elif row['module_temp'] > 55:
            temp_factor = 1 + (inverter.temp_coefficient / 100) * (row['module_temp'] - inverter.nominal_temp)
            if temp_factor < 0.9:
                temp_contribution = (1 - temp_factor) * expected * (5 / 60)
                temperature_loss += min(temp_contribution, loss)
                other_loss += max(0, loss - temp_contribution)
        elif row.get('irradiance_gap'):
            irradiance_gap_loss += loss
        else:
            clipping_loss += loss

    return {
        'clipping_loss': round(clipping_loss, 3),
        'temperature_loss': round(temperature_loss, 3),
        'curtailment_loss': round(curtailment_loss, 3),
        'irradiance_gap_loss': round(irradiance_gap_loss, 3),
        'other_loss': round(other_loss, 3)
    }


def calculate_inverter_params(inverter: Inverter, df: pd.DataFrame, clipping_periods: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    计算逆变器参数结论，确保导出文件、界面、终端摘要一致
    """
    max_actual = df['ac_power'].max() if len(df) > 0 else 0
    avg_efficiency = (df['ac_power'].sum() / df['dc_power'].sum() * 100) if df['dc_power'].sum() > 0 else 0
    clipping_duration = sum(p['duration_minutes'] for p in clipping_periods)

    return {
        'inverter_name': inverter.name,
        'rated_power': inverter.rated_power,
        'dc_capacity': inverter.dc_capacity,
        'dc_ac_ratio': round(inverter.dc_capacity / inverter.rated_power, 2),
        'max_actual_power': round(max_actual, 2),
        'clipping_ratio': round(max_actual / inverter.rated_power * 100, 2),
        'avg_efficiency': round(avg_efficiency, 2),
        'clipping_duration_minutes': round(clipping_duration, 1),
        'clipping_count': len(clipping_periods),
        'temperature_coefficient': inverter.temp_coefficient,
        'nominal_temp': inverter.nominal_temp,
        'clipping_threshold': inverter.clipping_threshold
    }


def generate_summary(
    inverter_params: Dict[str, Any],
    loss_breakdown: Dict[str, float],
    total_expected: float,
    total_actual: float,
    total_loss: float,
    clipping_periods: List[Dict[str, Any]],
    scenario: str
) -> str:
    """生成分析摘要"""
    loss_rate = (total_loss / total_expected * 100) if total_expected > 0 else 0

    parts = [
        f"逆变器 {inverter_params['inverter_name']} 削峰分析完成。",
        f"容配比: {inverter_params['dc_ac_ratio']}:1,",
        f"理论发电量: {total_expected:.2f} kWh,",
        f"实际发电量: {total_actual:.2f} kWh,",
        f"损失电量: {total_loss:.2f} kWh,",
        f"损失率: {loss_rate:.2f}%。"
    ]

    if clipping_periods:
        parts.append(f"识别削峰时段 {len(clipping_periods)} 处,")
        for p in clipping_periods:
            parts.append(f"{p['start_time'].strftime('%H:%M')}-{p['end_time'].strftime('%H:%M')}({p['cause']})")

    parts.append(f"损失分项:")
    parts.append(f"削峰损失{loss_breakdown['clipping_loss']:.2f}kWh")
    parts.append(f"温度损失{loss_breakdown['temperature_loss']:.2f}kWh")
    parts.append(f"限发损失{loss_breakdown['curtailment_loss']:.2f}kWh")
    parts.append(f"辐照缺口{loss_breakdown['irradiance_gap_loss']:.2f}kWh")

    scenario_desc = {
        'normal': '【正常场景】运行正常，无明显异常。',
        'irradiance_gap': '【辐照缺口】存在云遮导致的功率下降，非逆变器问题。',
        'temperature_high': '【温度过高】组件温度超标导致降额，建议检查散热系统。',
        'curtailment_overlap': '【限发重叠】存在调度限发与逆变器削峰同时发生，需分别核算。'
    }
    parts.append(scenario_desc.get(scenario, ''))

    return ''.join(parts)


def analyze_inverter(
    db: Session,
    inverter_id: int,
    analysis_date: datetime,
    scenario: str = 'normal'
) -> AnalysisResult:
    """
    执行逆变器削峰分析
    """
    inverter = db.query(Inverter).filter(Inverter.id == inverter_id).first()
    if not inverter:
        raise ValueError(f"逆变器不存在")

    start_of_day = analysis_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    powers = db.query(ComponentPower).filter(
        ComponentPower.inverter_id == inverter_id,
        ComponentPower.timestamp >= start_of_day,
        ComponentPower.timestamp < end_of_day
    ).order_by(ComponentPower.timestamp).all()

    irradiances = db.query(Irradiance).filter(
        Irradiance.inverter_id == inverter_id,
        Irradiance.timestamp >= start_of_day,
        Irradiance.timestamp < end_of_day
    ).order_by(Irradiance.timestamp).all()

    curtailments = db.query(CurtailmentRecord).filter(
        CurtailmentRecord.inverter_id == inverter_id,
        CurtailmentRecord.end_time >= start_of_day,
        CurtailmentRecord.start_time < end_of_day
    ).all()

    if not powers or not irradiances:
        raise ValueError("缺少功率或辐照度数据")

    power_df = pd.DataFrame([{
        'timestamp': p.timestamp,
        'dc_power': p.dc_power or 0,
        'ac_power': p.ac_power or 0,
        'module_temp': p.module_temp or 25.0
    } for p in powers])

    irr_df = pd.DataFrame([{
        'timestamp': i.timestamp,
        'plane_irradiance': i.plane_irradiance or 0,
        'ambient_temp': i.ambient_temp or 25.0
    } for i in irradiances])

    df = pd.merge_asof(
        power_df.sort_values('timestamp'),
        irr_df.sort_values('timestamp'),
        on='timestamp',
        direction='nearest',
        tolerance=pd.Timedelta(minutes=3)
    )

    df['expected_power'] = df.apply(
        lambda row: calculate_theoretical_power(
            row['plane_irradiance'],
            inverter.dc_capacity,
            inverter.efficiency,
            inverter.temp_coefficient,
            row['module_temp'],
            inverter.nominal_temp
        ),
        axis=1
    )

    df['curtailment_active'] = df['timestamp'].apply(
        lambda t: is_in_curtailment_period(t, curtailments) is not None
    )

    df['irradiance_gap'] = df['plane_irradiance'] < df['plane_irradiance'].max() * 0.5

    clipping_threshold = inverter.rated_power * inverter.clipping_threshold

    clipping_periods = identify_clipping_periods(df, clipping_threshold)

    loss = analyze_loss_breakdown(df, clipping_periods, inverter, curtailments)

    total_expected = (df['expected_power'] * (5 / 60)).sum()
    total_actual = (df['ac_power'] * (5 / 60)).sum()
    total_loss = total_expected - total_actual

    inverter_params = calculate_inverter_params(inverter, df, clipping_periods)

    summary = generate_summary(
        inverter_params, loss, total_expected, total_actual, total_loss, clipping_periods, scenario
    )

    power_curve_data = {
        'timestamps': [t.isoformat() for t in df['timestamp'].tolist()],
        'expected_power': df['expected_power'].round(3).tolist(),
        'actual_power': df['ac_power'].round(3).tolist(),
        'dc_power': df['dc_power'].round(3).tolist(),
        'irradiance': df['plane_irradiance'].round(1).tolist(),
        'module_temp': df['module_temp'].round(1).tolist()
    }

    clipping_details = {
        'periods': [{
            'start_time': p['start_time'].isoformat(),
            'end_time': p['end_time'].isoformat(),
            'duration_minutes': p['duration_minutes'],
            'max_expected_power': round(p['max_expected'], 3),
            'max_actual_power': round(p['max_actual'], 3),
            'clipping_loss': round(p['total_loss'], 3),
            'cause': p['cause']
        } for p in clipping_periods],
        'threshold': clipping_threshold
    }

    loss_analysis = {
        'by_hour': {},
        'details': []
    }

    for i, row in df.iterrows():
        hour = row['timestamp'].hour
        key = f"{hour:02d}:00"
        if key not in loss_analysis['by_hour']:
            loss_analysis['by_hour'][key] = 0
        loss_analysis['by_hour'][key] += round((row['expected_power'] - row['ac_power']) * (5 / 60), 3)
        loss_analysis['details'].append({
            'timestamp': row['timestamp'].isoformat(),
            'expected': round(row['expected_power'], 3),
            'actual': round(row['ac_power'], 3),
            'loss': round((row['expected_power'] - row['ac_power']) * (5 / 60), 3),
            'curtailment_active': bool(row['curtailment_active']),
            'module_temp': round(row['module_temp'], 1),
            'cause': determine_loss_cause(row)
        })

    result = AnalysisResult(
        inverter_id=inverter_id,
        analysis_date=start_of_day,
        scenario=scenario,
        status='completed',
        total_expected_energy=round(total_expected, 3),
        total_actual_energy=round(total_actual, 3),
        total_loss_energy=round(total_loss, 3),
        loss_rate=round(total_loss / total_expected * 100 if total_expected > 0 else 0, 2),
        clipping_loss=loss['clipping_loss'],
        temperature_loss=loss['temperature_loss'],
        curtailment_loss=loss['curtailment_loss'],
        irradiance_gap_loss=loss['irradiance_gap_loss'],
        other_loss=loss['other_loss'],
        peak_clipping_periods=clipping_details['periods'],
        clipping_details=clipping_details,
        power_curve_data=power_curve_data,
        loss_analysis=loss_analysis,
        summary=summary,
        inverter_params=inverter_params
    )

    return result


def determine_loss_cause(row: pd.Series) -> str:
    """判断损失原因"""
    if row['curtailment_active']:
        return '限发'
    if row['module_temp'] > 55:
        return '温度过高'
    if row['irradiance_gap']:
        return '辐照缺口'
    if row['expected_power'] > row['ac_power'] * 1.05:
        return '削峰'
    return '正常'
