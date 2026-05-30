from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict
import json

from .models import (
    FlowRecord, TemperatureData, EquipmentProfile, EquipmentProfileHistory,
    COPResult, AnomalyRecord, DataStatus
)
from .schemas import (
    FlowRecordCreate, TemperatureDataCreate,
    EquipmentProfileCreate, EquipmentProfileUpdate,
    DataCollectionRequest, EfficiencyReport, EfficiencyReportItem
)
from .cop_calculator import COPCalculator


def create_flow_record(db: Session, flow_data: FlowRecordCreate) -> FlowRecord:
    status = DataStatus.PENDING.value if flow_data.is_missing or flow_data.flow_rate is None else DataStatus.CONFIRMED.value
    db_flow = FlowRecord(
        record_time=flow_data.record_time,
        equipment_id=flow_data.equipment_id,
        flow_rate=flow_data.flow_rate,
        is_missing=flow_data.is_missing,
        status=status
    )
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)
    return db_flow


def create_temperature_data(db: Session, temp_data: TemperatureDataCreate) -> TemperatureData:
    db_temp = TemperatureData(
        flow_record_id=temp_data.flow_record_id,
        record_time=temp_data.record_time,
        equipment_id=temp_data.equipment_id,
        inlet_water_temp=temp_data.inlet_water_temp,
        outlet_water_temp=temp_data.outlet_water_temp,
        outdoor_temp=temp_data.outdoor_temp,
        refrigerant_temp=temp_data.refrigerant_temp,
        compressor_temp=temp_data.compressor_temp,
        status=DataStatus.CONFIRMED.value
    )
    db.add(db_temp)
    db.commit()
    db.refresh(db_temp)
    return db_temp


def create_equipment_profile(db: Session, equipment: EquipmentProfileCreate) -> EquipmentProfile:
    db_equipment = EquipmentProfile(**equipment.model_dump())
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment


def update_equipment_profile(
    db: Session,
    equipment_id: str,
    equipment_update: EquipmentProfileUpdate
) -> Tuple[Optional[EquipmentProfile], Dict]:
    db_equipment = db.query(EquipmentProfile).filter(
        EquipmentProfile.equipment_id == equipment_id
    ).first()

    if not db_equipment:
        return None, {}

    old_values = {}
    new_values = {}
    changed_fields = []

    update_data = equipment_update.model_dump(exclude_unset=True)
    changed_by = update_data.pop("changed_by", None)
    change_remarks = update_data.pop("change_remarks", None)

    for field, new_value in update_data.items():
        old_value = getattr(db_equipment, field)
        if old_value != new_value:
            if isinstance(old_value, datetime):
                old_values[field] = old_value.isoformat()
            else:
                old_values[field] = old_value
            if isinstance(new_value, datetime):
                new_values[field] = new_value.isoformat()
            else:
                new_values[field] = new_value
            changed_fields.append(field)
            setattr(db_equipment, field, new_value)

    if changed_fields:
        db_equipment.version += 1

        history = EquipmentProfileHistory(
            equipment_id=equipment_id,
            version=db_equipment.version,
            changed_fields=json.dumps(changed_fields, ensure_ascii=False),
            old_values=json.dumps(old_values, ensure_ascii=False),
            new_values=json.dumps(new_values, ensure_ascii=False),
            changed_by=changed_by,
            remarks=change_remarks
        )
        db.add(history)

        calculator = COPCalculator(db)
        recalc_result = calculator.recalculate_after_equipment_update(db_equipment)
    else:
        recalc_result = {"affected_records": 0, "recalculated_records": 0, "pending_review": 0}

    db.commit()
    db.refresh(db_equipment)

    return db_equipment, {
        "changed_fields": changed_fields,
        "old_values": old_values,
        "new_values": new_values,
        "version": db_equipment.version,
        "recalculation": recalc_result
    }


def get_equipment_profile(db: Session, equipment_id: str) -> Optional[EquipmentProfile]:
    return db.query(EquipmentProfile).filter(
        EquipmentProfile.equipment_id == equipment_id
    ).first()


def get_flow_records(
    db: Session,
    equipment_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[FlowRecord]:
    query = db.query(FlowRecord)
    if equipment_id:
        query = query.filter(FlowRecord.equipment_id == equipment_id)
    if start_time:
        query = query.filter(FlowRecord.record_time >= start_time)
    if end_time:
        query = query.filter(FlowRecord.record_time <= end_time)
    if status:
        query = query.filter(FlowRecord.status == status)
    return query.order_by(FlowRecord.record_time.desc()).offset(skip).limit(limit).all()


def get_cop_results(
    db: Session,
    equipment_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    has_anomaly: Optional[bool] = None,
    operating_mode: Optional[str] = None,
    operating_condition_group: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[COPResult]:
    query = db.query(COPResult)
    if equipment_id:
        query = query.filter(COPResult.equipment_id == equipment_id)
    if start_time:
        query = query.filter(COPResult.record_time >= start_time)
    if end_time:
        query = query.filter(COPResult.record_time <= end_time)
    if has_anomaly is not None:
        query = query.filter(COPResult.has_anomaly == has_anomaly)
    if operating_mode:
        query = query.filter(COPResult.operating_mode == operating_mode)
    if operating_condition_group:
        query = query.filter(COPResult.operating_condition_group == operating_condition_group)
    return query.order_by(COPResult.record_time.desc()).offset(skip).limit(limit).all()


def get_anomaly_records(
    db: Session,
    equipment_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    is_resolved: Optional[bool] = None,
    anomaly_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[AnomalyRecord]:
    query = db.query(AnomalyRecord)
    if equipment_id:
        query = query.filter(AnomalyRecord.equipment_id == equipment_id)
    if start_time:
        query = query.filter(AnomalyRecord.record_time >= start_time)
    if end_time:
        query = query.filter(AnomalyRecord.record_time <= end_time)
    if is_resolved is not None:
        query = query.filter(AnomalyRecord.is_resolved == is_resolved)
    if anomaly_type:
        query = query.filter(AnomalyRecord.anomaly_type == anomaly_type)
    return query.order_by(AnomalyRecord.record_time.desc()).offset(skip).limit(limit).all()


def get_equipment_history(
    db: Session,
    equipment_id: str,
    skip: int = 0,
    limit: int = 50
) -> List[EquipmentProfileHistory]:
    return db.query(EquipmentProfileHistory).filter(
        EquipmentProfileHistory.equipment_id == equipment_id
    ).order_by(EquipmentProfileHistory.version.desc()).offset(skip).limit(limit).all()


def process_data_collection(
    db: Session,
    request: DataCollectionRequest,
    allow_estimated: bool = False
) -> Tuple[Optional[COPResult], List[AnomalyRecord], str]:
    equipment = get_equipment_profile(db, request.equipment_id)
    if not equipment:
        return None, [], "设备档案不存在，请先创建设备档案"

    flow_create = FlowRecordCreate(
        record_time=request.record_time,
        equipment_id=request.equipment_id,
        flow_rate=request.flow_rate,
        is_missing=request.is_flow_missing or request.flow_rate is None
    )
    flow_record = create_flow_record(db, flow_create)

    temp_create = TemperatureDataCreate(
        flow_record_id=flow_record.id,
        record_time=request.record_time,
        equipment_id=request.equipment_id,
        inlet_water_temp=request.inlet_water_temp,
        outlet_water_temp=request.outlet_water_temp,
        outdoor_temp=request.outdoor_temp,
        refrigerant_temp=request.refrigerant_temp,
        compressor_temp=request.compressor_temp
    )
    temp_data = create_temperature_data(db, temp_create)

    calculator = COPCalculator(db)

    has_flow_error = flow_record.is_missing or flow_record.flow_rate is None
    use_estimated = allow_estimated and has_flow_error

    if has_flow_error and not allow_estimated:
        cop_result, anomalies = calculator.calculate(
            flow_record, temp_data, equipment, use_estimated_flow=False
        )
        if cop_result is None:
            return None, anomalies, "流量数据缺失，已记录待确认。设置allow_estimated=true可使用设计流量估算"
    else:
        cop_result, anomalies = calculator.calculate(
            flow_record, temp_data, equipment, use_estimated_flow=use_estimated
        )

    db.commit()

    if cop_result:
        db.refresh(cop_result)
    for anomaly in anomalies:
        db.refresh(anomaly)

    message = "计算完成"
    if anomalies:
        message += f"，检测到{len(anomalies)}个异常"
    if use_estimated:
        message += "（使用设计流量估算）"

    return cop_result, anomalies, message


def confirm_flow_record(
    db: Session,
    flow_record_id: int,
    flow_rate: float,
    confirmed_by: str
) -> Tuple[Optional[FlowRecord], Optional[COPResult], List[AnomalyRecord]]:
    flow_record = db.query(FlowRecord).filter(FlowRecord.id == flow_record_id).first()
    if not flow_record:
        return None, None, []

    flow_record.flow_rate = flow_rate
    flow_record.is_missing = False
    flow_record.status = DataStatus.CONFIRMED.value
    flow_record.confirmed_by = confirmed_by
    flow_record.confirmed_at = datetime.now()

    temp_data = db.query(TemperatureData).filter(
        TemperatureData.flow_record_id == flow_record_id
    ).first()

    equipment = get_equipment_profile(db, flow_record.equipment_id)

    anomalies = []
    cop_result = None

    if temp_data and equipment:
        unresolved_anomalies = db.query(AnomalyRecord).filter(
            AnomalyRecord.flow_record_id == flow_record_id,
            AnomalyRecord.anomaly_type == "流量缺采",
            AnomalyRecord.is_resolved == False
        ).all()

        for anomaly in unresolved_anomalies:
            anomaly.is_resolved = True
            anomaly.resolved_at = datetime.now()
            anomaly.resolved_by = confirmed_by
            anomaly.resolution = f"已补录流量数据：{flow_rate} m³/h"

        calculator = COPCalculator(db)
        cop_result, anomalies = calculator.calculate(
            flow_record, temp_data, equipment, use_estimated_flow=False
        )

    db.commit()

    if cop_result:
        db.refresh(cop_result)
    db.refresh(flow_record)

    return flow_record, cop_result, anomalies


def generate_efficiency_report(
    db: Session,
    start_time: datetime,
    end_time: datetime,
    equipment_id: Optional[str] = None
) -> EfficiencyReport:
    query = db.query(COPResult).filter(
        and_(COPResult.record_time >= start_time, COPResult.record_time <= end_time)
    )
    if equipment_id:
        query = query.filter(COPResult.equipment_id == equipment_id)

    cop_results = query.order_by(COPResult.record_time).all()

    items = []
    condition_summary = {}

    for result in cop_results:
        equipment = get_equipment_profile(db, result.equipment_id)
        equipment_name = equipment.equipment_name if equipment else "未知设备"

        anomalies = db.query(AnomalyRecord).filter(
            AnomalyRecord.cop_result_id == result.id
        ).all()

        anomaly_type = None
        anomaly_desc = None
        if anomalies:
            anomaly_type = anomalies[0].anomaly_type
            anomaly_desc = anomalies[0].anomaly_description

        item = EfficiencyReportItem(
            record_time=result.record_time,
            equipment_id=result.equipment_id,
            equipment_name=equipment_name,
            operating_mode=result.operating_mode,
            operating_condition_group=result.operating_condition_group or "未分组",
            outdoor_temp=result.outdoor_temp,
            water_temp_diff=result.water_temp_diff,
            flow_rate=result.flow_rate,
            heating_capacity=result.heating_capacity,
            power_consumption=result.power_consumption,
            cop=result.cop,
            rated_cop=result.rated_cop,
            cop_deviation=result.cop_deviation,
            has_anomaly=result.has_anomaly,
            is_estimated=result.is_estimated,
            anomaly_type=anomaly_type,
            anomaly_description=anomaly_desc,
            calculation_method=result.calculation_method,
            equipment_version=result.equipment_version
        )
        items.append(item)

        group_name = result.operating_condition_group or "未分组"
        if group_name not in condition_summary:
            condition_summary[group_name] = {
                "count": 0,
                "avg_cop": 0.0,
                "anomaly_count": 0
            }
        condition_summary[group_name]["count"] += 1
        condition_summary[group_name]["avg_cop"] += result.cop
        if result.has_anomaly:
            condition_summary[group_name]["anomaly_count"] += 1

    for group in condition_summary.values():
        if group["count"] > 0:
            group["avg_cop"] = round(group["avg_cop"] / group["count"], 3)

    total_records = len(items)
    valid_records = sum(1 for item in items if not item.has_anomaly)
    estimated_records = sum(1 for item in items if item.is_estimated)
    anomaly_records = sum(1 for item in items if item.has_anomaly)

    avg_cop = round(sum(item.cop for item in items) / total_records, 3) if total_records > 0 else 0.0
    rated_cops = [item.rated_cop for item in items if item.rated_cop is not None]
    avg_rated_cop = round(sum(rated_cops) / len(rated_cops), 3) if rated_cops else 0.0
    deviations = [item.cop_deviation for item in items if item.cop_deviation is not None]
    avg_deviation = round(sum(deviations) / len(deviations), 2) if deviations else 0.0

    report_period = f"{start_time.strftime('%Y-%m-%d')} 至 {end_time.strftime('%Y-%m-%d')}"

    return EfficiencyReport(
        report_period=report_period,
        start_time=start_time,
        end_time=end_time,
        total_records=total_records,
        valid_records=valid_records,
        estimated_records=estimated_records,
        anomaly_records=anomaly_records,
        average_cop=avg_cop,
        average_rated_cop=avg_rated_cop,
        average_deviation=avg_deviation,
        operating_condition_summary=condition_summary,
        items=items,
        generated_at=datetime.now()
    )
