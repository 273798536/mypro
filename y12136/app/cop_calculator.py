from datetime import datetime
from typing import Tuple, Optional, List, Dict
from .config import settings
from .models import (
    FlowRecord, TemperatureData, EquipmentProfile, COPResult,
    AnomalyRecord, AnomalyType, OperatingMode, DataStatus
)
from .schemas import OperatingConditionGroup
from sqlalchemy.orm import Session
import json


OPERATING_CONDITION_GROUPS = [
    OperatingConditionGroup(
        name="极寒工况",
        min_temp=-30.0,
        max_temp=-10.0,
        description="室外温度低于-10℃，属于极寒运行工况"
    ),
    OperatingConditionGroup(
        name="严寒工况",
        min_temp=-10.0,
        max_temp=0.0,
        description="室外温度-10℃~0℃，属于严寒运行工况"
    ),
    OperatingConditionGroup(
        name="寒冷工况",
        min_temp=0.0,
        max_temp=7.0,
        description="室外温度0℃~7℃，属于寒冷运行工况"
    ),
    OperatingConditionGroup(
        name="温工况",
        min_temp=7.0,
        max_temp=15.0,
        description="室外温度7℃~15℃，属于温和运行工况"
    ),
    OperatingConditionGroup(
        name="常温工况",
        min_temp=15.0,
        max_temp=25.0,
        description="室外温度15℃~25℃，属于常温运行工况"
    ),
    OperatingConditionGroup(
        name="高温工况",
        min_temp=25.0,
        max_temp=50.0,
        description="室外温度高于25℃，属于高温运行工况"
    ),
]


class COPCalculator:
    def __init__(self, db: Session):
        self.db = db
        self.water_specific_heat = settings.WATER_SPECIFIC_HEAT
        self.unit_conversion = settings.UNIT_CONVERSION

    def calculate_water_temp_diff(self, inlet_temp: float, outlet_temp: float) -> float:
        return abs(outlet_temp - inlet_temp)

    def calculate_heating_capacity(
        self,
        flow_rate: float,
        temp_diff: float,
        density: float = 1000.0
    ) -> float:
        volume_flow = flow_rate / 3600.0
        mass_flow = volume_flow * density
        heat_capacity_kj_s = mass_flow * self.water_specific_heat * temp_diff
        heat_capacity_kw = heat_capacity_kj_s
        return round(heat_capacity_kw, 3)

    def calculate_cop(self, heating_capacity: float, power_consumption: float) -> Optional[float]:
        if power_consumption <= 0:
            return None
        return round(heating_capacity / power_consumption, 3)

    def determine_operating_mode(
        self,
        inlet_temp: float,
        outlet_temp: float,
        outdoor_temp: float
    ) -> OperatingMode:
        if outdoor_temp < settings.DEFROST_CYCLE_MIN_TEMP:
            temp_diff = abs(outlet_temp - inlet_temp)
            if temp_diff < 3.0:
                return OperatingMode.DEFROST

        if outlet_temp > inlet_temp:
            return OperatingMode.HEATING
        elif outlet_temp < inlet_temp:
            return OperatingMode.COOLING
        else:
            return OperatingMode.STANDBY

    def determine_operating_condition_group(self, outdoor_temp: float) -> OperatingConditionGroup:
        for group in OPERATING_CONDITION_GROUPS:
            if group.min_temp <= outdoor_temp < group.max_temp:
                return group
        return OPERATING_CONDITION_GROUPS[-1]

    def check_temperature_sensor_error(
        self,
        inlet_temp: float,
        outlet_temp: float,
        outdoor_temp: float
    ) -> Tuple[bool, str]:
        temp_diff = abs(outlet_temp - inlet_temp)
        if temp_diff > settings.TEMP_SENSOR_ERROR_THRESHOLD * 10:
            return True, f"进出水温差过大（{temp_diff:.1f}℃），可能存在传感器故障"

        if inlet_temp < -20 or inlet_temp > 80:
            return True, f"进水温度异常（{inlet_temp:.1f}℃），超出正常范围"

        if outlet_temp < -20 or outlet_temp > 80:
            return True, f"出水温度异常（{outlet_temp:.1f}℃），超出正常范围"

        if outdoor_temp < -40 or outdoor_temp > 55:
            return True, f"室外温度异常（{outdoor_temp:.1f}℃），超出正常范围"

        return False, ""

    def check_defrost_cycle(
        self,
        outdoor_temp: float,
        inlet_temp: float,
        outlet_temp: float,
        record_time: datetime
    ) -> Tuple[bool, str]:
        if settings.DEFROST_CYCLE_MIN_TEMP <= outdoor_temp < settings.DEFROST_CYCLE_MAX_TEMP:
            temp_diff = abs(outlet_temp - inlet_temp)
            if temp_diff < 2.0:
                return True, f"室外温度{outdoor_temp:.1f}℃，进出水温差仅{temp_diff:.1f}℃，可能处于除霜周期"

        return False, ""

    def check_flow_missing(self, flow_record: FlowRecord) -> Tuple[bool, str]:
        if flow_record.is_missing or flow_record.flow_rate is None:
            return True, "流量数据缺失，需要人工确认"
        if flow_record.flow_rate <= settings.FLOW_MISSING_THRESHOLD:
            return True, f"流量数据异常（{flow_record.flow_rate}），需要人工确认"
        return False, ""

    def get_equipment_contact(self, equipment: EquipmentProfile) -> Tuple[str, str]:
        if equipment.contact_person and equipment.contact_phone:
            return equipment.contact_person, equipment.contact_phone
        return "设备管理员", "请查看设备档案"

    def create_anomaly_record(
        self,
        anomaly_type: AnomalyType,
        description: str,
        equipment: EquipmentProfile,
        record_time: datetime,
        flow_record: Optional[FlowRecord] = None,
        temp_data: Optional[TemperatureData] = None,
        cop_result: Optional[COPResult] = None,
        severity: str = "warning"
    ) -> AnomalyRecord:
        responsible_person, contact_phone = self.get_equipment_contact(equipment)

        next_actions = {
            AnomalyType.FLOW_MISSING: f"请联系{responsible_person}（{contact_phone}）核实流量计读数，补录流量数据后系统将自动重新计算",
            AnomalyType.TEMP_SENSOR_ERROR: f"请联系{responsible_person}（{contact_phone}）检查温度传感器，必要时进行校准或更换",
            AnomalyType.DEFROST_CYCLE: f"请联系{responsible_person}（{contact_phone}）确认除霜周期设置是否正常，除霜期间COP数据可能偏低",
            AnomalyType.EQUIPMENT_MISMATCH: f"请联系{responsible_person}（{contact_phone}）核对设备档案参数，参数更新后已处理的记录将自动标记为待重新计算",
            AnomalyType.OTHER: f"请联系{responsible_person}（{contact_phone}）进行进一步排查"
        }

        anomaly = AnomalyRecord(
            flow_record_id=flow_record.id if flow_record else None,
            temperature_data_id=temp_data.id if temp_data else None,
            cop_result_id=cop_result.id if cop_result else None,
            equipment_id=equipment.equipment_id,
            record_time=record_time,
            anomaly_type=anomaly_type.value,
            anomaly_description=description,
            severity=severity,
            next_action=next_actions.get(anomaly_type, next_actions[AnomalyType.OTHER]),
            responsible_person=responsible_person,
            contact_phone=contact_phone,
            is_resolved=False
        )
        self.db.add(anomaly)
        return anomaly

    def calculate(
        self,
        flow_record: FlowRecord,
        temp_data: TemperatureData,
        equipment: EquipmentProfile,
        use_estimated_flow: bool = False
    ) -> Tuple[Optional[COPResult], List[AnomalyRecord]]:
        anomalies = []

        has_flow_error, flow_desc = self.check_flow_missing(flow_record)
        if has_flow_error:
            if not use_estimated_flow:
                anomalies.append(self.create_anomaly_record(
                    AnomalyType.FLOW_MISSING, flow_desc, equipment,
                    flow_record.record_time, flow_record=flow_record,
                    severity="critical"
                ))
                return None, anomalies
            else:
                flow_rate = equipment.design_flow_rate
                anomalies.append(self.create_anomaly_record(
                    AnomalyType.FLOW_MISSING,
                    f"{flow_desc}，已使用设计流量{flow_rate}m³/h进行估算",
                    equipment, flow_record.record_time,
                    flow_record=flow_record, severity="warning"
                ))
        else:
            flow_rate = flow_record.flow_rate

        has_sensor_error, sensor_desc = self.check_temperature_sensor_error(
            temp_data.inlet_water_temp, temp_data.outlet_water_temp, temp_data.outdoor_temp
        )
        if has_sensor_error:
            anomalies.append(self.create_anomaly_record(
                AnomalyType.TEMP_SENSOR_ERROR, sensor_desc, equipment,
                temp_data.record_time, temp_data=temp_data, severity="critical"
            ))
            temp_data.has_sensor_error = True

        has_defrost, defrost_desc = self.check_defrost_cycle(
            temp_data.outdoor_temp, temp_data.inlet_water_temp,
            temp_data.outlet_water_temp, temp_data.record_time
        )
        if has_defrost:
            anomalies.append(self.create_anomaly_record(
                AnomalyType.DEFROST_CYCLE, defrost_desc, equipment,
                temp_data.record_time, temp_data=temp_data, severity="warning"
            ))

        temp_diff = self.calculate_water_temp_diff(
            temp_data.inlet_water_temp, temp_data.outlet_water_temp
        )
        heating_capacity = self.calculate_heating_capacity(flow_rate, temp_diff)
        power_consumption = equipment.rated_power
        cop = self.calculate_cop(heating_capacity, power_consumption)

        if cop is None:
            anomalies.append(self.create_anomaly_record(
                AnomalyType.OTHER, "无法计算COP，功率消耗数据异常",
                equipment, temp_data.record_time, severity="critical"
            ))
            return None, anomalies

        operating_mode = self.determine_operating_mode(
            temp_data.inlet_water_temp, temp_data.outlet_water_temp, temp_data.outdoor_temp
        )
        condition_group = self.determine_operating_condition_group(temp_data.outdoor_temp)

        rated_cop = None
        cop_deviation = None
        if operating_mode == OperatingMode.HEATING and equipment.rated_cop_heating:
            rated_cop = equipment.rated_cop_heating
            cop_deviation = round((cop - rated_cop) / rated_cop * 100, 2)
        elif operating_mode == OperatingMode.COOLING and equipment.rated_cop_cooling:
            rated_cop = equipment.rated_cop_cooling
            cop_deviation = round((cop - rated_cop) / rated_cop * 100, 2)

        calc_method = "实测计算" if not use_estimated_flow and not has_sensor_error else "估算计算"
        if use_estimated_flow:
            calc_method += "(流量估算)"
        if has_sensor_error:
            calc_method += "(传感器异常)"

        cop_result = COPResult(
            flow_record_id=flow_record.id,
            temperature_data_id=temp_data.id,
            equipment_id=equipment.equipment_id,
            record_time=temp_data.record_time,
            operating_mode=operating_mode.value,
            water_temp_diff=round(temp_diff, 2),
            flow_rate=round(flow_rate, 3),
            heating_capacity=heating_capacity,
            power_consumption=power_consumption,
            cop=cop,
            rated_cop=rated_cop,
            cop_deviation=cop_deviation,
            operating_condition_group=condition_group.name,
            outdoor_temp=temp_data.outdoor_temp,
            has_anomaly=len(anomalies) > 0,
            is_estimated=use_estimated_flow or has_sensor_error,
            calculation_method=calc_method,
            equipment_version=equipment.version,
            status=DataStatus.CALCULATED.value
        )

        self.db.add(cop_result)
        self.db.flush()

        for anomaly in anomalies:
            anomaly.cop_result_id = cop_result.id

        flow_record.status = DataStatus.CALCULATED.value
        temp_data.status = DataStatus.CALCULATED.value

        return cop_result, anomalies

    def recalculate_after_equipment_update(
        self,
        equipment: EquipmentProfile,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, int]:
        query = self.db.query(COPResult).filter(
            COPResult.equipment_id == equipment.equipment_id,
            COPResult.equipment_version < equipment.version
        )
        if start_time:
            query = query.filter(COPResult.record_time >= start_time)
        if end_time:
            query = query.filter(COPResult.record_time <= end_time)

        old_results = query.all()
        recalculated_count = 0
        affected_count = len(old_results)

        for old_result in old_results:
            old_result.remarks = f"设备档案已从版本{old_result.equipment_version}更新到版本{equipment.version}，结论可能已变动"
            old_result.status = DataStatus.PENDING.value

            flow_record = old_result.flow_record
            temp_data = old_result.temperature_data

            if flow_record and temp_data:
                use_estimated = old_result.is_estimated and flow_record.is_missing
                new_result, anomalies = self.calculate(
                    flow_record, temp_data, equipment,
                    use_estimated_flow=use_estimated
                )
                if new_result:
                    new_result.recalculated_at = datetime.now()
                    new_result.remarks = f"重新计算：原版本{old_result.equipment_version}，新版本{equipment.version}"
                    recalculated_count += 1

        self.db.commit()

        return {
            "affected_records": affected_count,
            "recalculated_records": recalculated_count,
            "pending_review": affected_count - recalculated_count
        }
