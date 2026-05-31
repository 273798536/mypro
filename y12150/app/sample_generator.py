import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from .models import Inverter, ComponentPower, Irradiance, CurtailmentRecord


def generate_irradiance_curve(day_of_year: int = 150, latitude: float = 35.0) -> pd.DataFrame:
    """
    生成一天的辐照度曲线（5分钟间隔）
    基于简化的太阳位置模型
    """
    times = []
    irradiances = []

    for hour in range(24):
        for minute in range(0, 60, 5):
            t = hour + minute / 60
            times.append(datetime(2024, 1, 1, hour, minute))

            declination = 23.45 * np.sin(np.radians(360 * (day_of_year - 81) / 365))
            hour_angle = 15 * (t - 12)

            sin_elevation = (np.sin(np.radians(latitude)) * np.sin(np.radians(declination)) +
                             np.cos(np.radians(latitude)) * np.cos(np.radians(declination)) * np.cos(np.radians(hour_angle)))

            if sin_elevation > 0:
                solar_elevation = np.degrees(np.arcsin(sin_elevation))
                am = 1 / (sin_elevation + 0.50572 * (solar_elevation + 6.07995) ** (-1.6364))
                ghi = 1367 * (0.7 ** (am ** 0.678)) * sin_elevation
                irradiances.append(max(0, ghi))
            else:
                irradiances.append(0)

    df = pd.DataFrame({
        'timestamp': times,
        'global_irradiance': irradiances,
        'plane_irradiance': [g * 1.05 for g in irradiances]
    })
    return df


def generate_normal_scenario(
    inverter: Inverter,
    analysis_date: datetime
) -> Tuple[List[ComponentPower], List[Irradiance], List[CurtailmentRecord]]:
    """
    正常场景：晴天，无限发，轻微削峰
    """
    irr_df = generate_irradiance_curve()

    powers = []
    irradiances = []

    for _, row in irr_df.iterrows():
        t = analysis_date.replace(
            hour=row['timestamp'].hour,
            minute=row['timestamp'].minute,
            second=0,
            microsecond=0
        )

        expected_dc = (row['plane_irradiance'] / 1000) * inverter.dc_capacity
        module_temp = 25 + (row['plane_irradiance'] / 1000) * 30
        temp_factor = 1 + (inverter.temp_coefficient / 100) * (module_temp - inverter.nominal_temp)

        expected_ac = expected_dc * inverter.efficiency * max(temp_factor, 0.7)

        clipping_limit = inverter.rated_power * inverter.clipping_threshold
        actual_ac = min(expected_ac, clipping_limit)
        actual_dc = actual_ac / inverter.efficiency if inverter.efficiency > 0 else 0

        powers.append(ComponentPower(
            inverter_id=inverter.id,
            timestamp=t,
            dc_power=round(actual_dc, 3),
            ac_power=round(actual_ac, 3),
            module_temp=round(module_temp, 1),
            inverter_temp=round(35 + (row['plane_irradiance'] / 1000) * 25, 1)
        ))

        irradiances.append(Irradiance(
            inverter_id=inverter.id,
            timestamp=t,
            global_irradiance=round(row['global_irradiance'], 1),
            plane_irradiance=round(row['plane_irradiance'], 1),
            ambient_temp=round(20 + (row['plane_irradiance'] / 1000) * 15, 1),
            wind_speed=round(2 + np.random.random() * 3, 1)
        ))

    return powers, irradiances, []


def generate_irradiance_gap_scenario(
    inverter: Inverter,
    analysis_date: datetime
) -> Tuple[List[ComponentPower], List[Irradiance], List[CurtailmentRecord]]:
    """
    辐照缺口场景：中午有云遮导致辐照度突降
    """
    irr_df = generate_irradiance_curve()

    powers = []
    irradiances = []

    gap_start_hour = 11
    gap_end_hour = 12

    for _, row in irr_df.iterrows():
        t = analysis_date.replace(
            hour=row['timestamp'].hour,
            minute=row['timestamp'].minute,
            second=0,
            microsecond=0
        )

        hour = row['timestamp'].hour
        minute = row['timestamp'].minute
        time_in_day = hour + minute / 60

        plane_irr = row['plane_irradiance']
        if gap_start_hour <= time_in_day < gap_end_hour:
            gap_factor = 0.3 + 0.3 * np.sin(np.pi * (time_in_day - gap_start_hour) / (gap_end_hour - gap_start_hour))
            plane_irr = plane_irr * gap_factor

        expected_dc = (plane_irr / 1000) * inverter.dc_capacity
        module_temp = 25 + (plane_irr / 1000) * 30
        temp_factor = 1 + (inverter.temp_coefficient / 100) * (module_temp - inverter.nominal_temp)

        expected_ac = expected_dc * inverter.efficiency * max(temp_factor, 0.7)

        clipping_limit = inverter.rated_power * inverter.clipping_threshold
        actual_ac = min(expected_ac, clipping_limit)
        actual_dc = actual_ac / inverter.efficiency if inverter.efficiency > 0 else 0

        powers.append(ComponentPower(
            inverter_id=inverter.id,
            timestamp=t,
            dc_power=round(actual_dc, 3),
            ac_power=round(actual_ac, 3),
            module_temp=round(module_temp, 1),
            inverter_temp=round(35 + (plane_irr / 1000) * 25, 1)
        ))

        irradiances.append(Irradiance(
            inverter_id=inverter.id,
            timestamp=t,
            global_irradiance=round(row['global_irradiance'] * (plane_irr / row['plane_irradiance'] if row['plane_irradiance'] > 0 else 1), 1),
            plane_irradiance=round(plane_irr, 1),
            ambient_temp=round(20 + (plane_irr / 1000) * 15, 1),
            wind_speed=round(3 + np.random.random() * 4, 1)
        ))

    return powers, irradiances, []


def generate_temperature_high_scenario(
    inverter: Inverter,
    analysis_date: datetime
) -> Tuple[List[ComponentPower], List[Irradiance], List[CurtailmentRecord]]:
    """
    温度过高场景：夏季高温，组件温度超过55℃，导致降额
    """
    irr_df = generate_irradiance_curve(day_of_year=200)

    powers = []
    irradiances = []

    for _, row in irr_df.iterrows():
        t = analysis_date.replace(
            hour=row['timestamp'].hour,
            minute=row['timestamp'].minute,
            second=0,
            microsecond=0
        )

        plane_irr = row['plane_irradiance']
        expected_dc = (plane_irr / 1000) * inverter.dc_capacity

        ambient_temp = 35 + (plane_irr / 1000) * 10
        module_temp = ambient_temp + (plane_irr / 1000) * 35

        temp_factor = 1 + (inverter.temp_coefficient / 100) * (module_temp - inverter.nominal_temp)
        expected_ac = expected_dc * inverter.efficiency * max(temp_factor, 0.7)

        clipping_limit = inverter.rated_power * inverter.clipping_threshold
        actual_ac = min(expected_ac, clipping_limit)
        actual_dc = actual_ac / inverter.efficiency if inverter.efficiency > 0 else 0

        powers.append(ComponentPower(
            inverter_id=inverter.id,
            timestamp=t,
            dc_power=round(actual_dc, 3),
            ac_power=round(actual_ac, 3),
            module_temp=round(module_temp, 1),
            inverter_temp=round(50 + (plane_irr / 1000) * 30, 1)
        ))

        irradiances.append(Irradiance(
            inverter_id=inverter.id,
            timestamp=t,
            global_irradiance=round(row['global_irradiance'], 1),
            plane_irradiance=round(plane_irr, 1),
            ambient_temp=round(ambient_temp, 1),
            wind_speed=round(0.5 + np.random.random() * 1.5, 1)
        ))

    return powers, irradiances, []


def generate_curtailment_overlap_scenario(
    inverter: Inverter,
    analysis_date: datetime
) -> Tuple[List[ComponentPower], List[Irradiance], List[CurtailmentRecord]]:
    """
    限发重叠场景：调度限发与逆变器削峰同时发生
    """
    irr_df = generate_irradiance_curve()

    powers = []
    irradiances = []

    curtailment_start = analysis_date.replace(hour=10, minute=30)
    curtailment_end = analysis_date.replace(hour=14, minute=30)
    power_limit = inverter.rated_power * 0.7

    curtailments = [CurtailmentRecord(
        inverter_id=inverter.id,
        start_time=curtailment_start,
        end_time=curtailment_end,
        curtailment_type='调度限发',
        reason='电网调峰要求',
        power_limit=power_limit,
        approved_by='电网调度中心'
    )]

    for _, row in irr_df.iterrows():
        t = analysis_date.replace(
            hour=row['timestamp'].hour,
            minute=row['timestamp'].minute,
            second=0,
            microsecond=0
        )

        plane_irr = row['plane_irradiance']
        expected_dc = (plane_irr / 1000) * inverter.dc_capacity
        module_temp = 25 + (plane_irr / 1000) * 30
        temp_factor = 1 + (inverter.temp_coefficient / 100) * (module_temp - inverter.nominal_temp)

        expected_ac = expected_dc * inverter.efficiency * max(temp_factor, 0.7)

        clipping_limit = inverter.rated_power * inverter.clipping_threshold

        is_curtailed = curtailment_start <= t <= curtailment_end
        if is_curtailed:
            actual_ac = min(expected_ac, clipping_limit, power_limit)
        else:
            actual_ac = min(expected_ac, clipping_limit)

        actual_dc = actual_ac / inverter.efficiency if inverter.efficiency > 0 else 0

        powers.append(ComponentPower(
            inverter_id=inverter.id,
            timestamp=t,
            dc_power=round(actual_dc, 3),
            ac_power=round(actual_ac, 3),
            module_temp=round(module_temp, 1),
            inverter_temp=round(35 + (plane_irr / 1000) * 25, 1)
        ))

        irradiances.append(Irradiance(
            inverter_id=inverter.id,
            timestamp=t,
            global_irradiance=round(row['global_irradiance'], 1),
            plane_irradiance=round(plane_irr, 1),
            ambient_temp=round(20 + (plane_irr / 1000) * 15, 1),
            wind_speed=round(2 + np.random.random() * 3, 1)
        ))

    return powers, irradiances, curtailments


SCENARIO_GENERATORS = {
    'normal': generate_normal_scenario,
    'irradiance_gap': generate_irradiance_gap_scenario,
    'temperature_high': generate_temperature_high_scenario,
    'curtailment_overlap': generate_curtailment_overlap_scenario
}


def generate_sample_data(
    db: Session,
    scenario: str,
    inverter_name: str = None,
    analysis_date: datetime = None
) -> Dict[str, Any]:
    """
    生成样例数据并保存到数据库
    """
    if scenario not in SCENARIO_GENERATORS:
        raise ValueError(f"未知场景: {scenario}")

    if analysis_date is None:
        analysis_date = datetime(2024, 5, 15)

    if inverter_name is None:
        scenario_names = {
            'normal': '演示逆变器-正常',
            'irradiance_gap': '演示逆变器-辐照缺口',
            'temperature_high': '演示逆变器-温度过高',
            'curtailment_overlap': '演示逆变器-限发重叠'
        }
        inverter_name = scenario_names.get(scenario, f'演示逆变器-{scenario}')

    inverter = Inverter(
        name=inverter_name,
        model='SUN-100K-G03',
        rated_power=100.0,
        dc_capacity=130.0,
        efficiency=0.96,
        temp_coefficient=-0.41,
        nominal_temp=25.0,
        clipping_threshold=0.98,
        install_date=datetime(2023, 6, 1)
    )
    db.add(inverter)
    db.flush()

    generator = SCENARIO_GENERATORS[scenario]
    powers, irradiances, curtailments = generator(inverter, analysis_date)

    db.bulk_save_objects(powers)
    db.bulk_save_objects(irradiances)
    if curtailments:
        db.bulk_save_objects(curtailments)

    db.commit()

    return {
        'inverter_id': inverter.id,
        'inverter_name': inverter.name,
        'scenario': scenario,
        'analysis_date': analysis_date.isoformat(),
        'component_power_count': len(powers),
        'irradiance_count': len(irradiances),
        'curtailment_count': len(curtailments)
    }
