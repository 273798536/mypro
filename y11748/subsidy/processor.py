from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from .models import (
    VehicleRecord, MileageRecord, ChargingRecord,
    OperationCalendar, SubsidyRule, ProcessedResult,
    DailySummary, Anomaly, AnomalyType, CorrectionTrace, CorrectionType
)


class SubsidyProcessor:
    def __init__(self,
                 vehicles: List[VehicleRecord],
                 mileage_records: List[MileageRecord],
                 charging_records: List[ChargingRecord],
                 calendar_records: List[OperationCalendar],
                 rules: List[SubsidyRule],
                 period_start: date,
                 period_end: date):
        self.vehicles = {v.vehicle_id: v for v in vehicles}
        self.period_start = period_start
        self.period_end = period_end
        self.rules = sorted(rules, key=lambda r: r.effective_date)
        
        self._group_mileage(mileage_records)
        self._group_charging(charging_records)
        self._group_calendar(calendar_records)
    
    def _group_mileage(self, records: List[MileageRecord]):
        self.mileage_by_vehicle: Dict[str, Dict[date, MileageRecord]] = defaultdict(dict)
        for r in records:
            if self.period_start <= r.record_date <= self.period_end:
                self.mileage_by_vehicle[r.vehicle_id][r.record_date] = r
    
    def _group_charging(self, records: List[ChargingRecord]):
        self.charging_by_vehicle_date: Dict[str, Dict[date, List[ChargingRecord]]] = defaultdict(lambda: defaultdict(list))
        for r in records:
            if self.period_start <= r.charge_date <= self.period_end:
                self.charging_by_vehicle_date[r.vehicle_id][r.charge_date].append(r)
    
    def _group_calendar(self, records: List[OperationCalendar]):
        self.calendar_by_vehicle: Dict[str, Dict[date, OperationCalendar]] = defaultdict(dict)
        for r in records:
            if self.period_start <= r.operation_date <= self.period_end:
                self.calendar_by_vehicle[r.vehicle_id][r.operation_date] = r
    
    def _get_applicable_rule(self, check_date: date) -> Optional[SubsidyRule]:
        for rule in reversed(self.rules):
            if rule.effective_date <= check_date <= rule.expiry_date:
                return rule
        return None
    
    def _validate_mileage_chain(self, vehicle_id: str) -> Tuple[Dict[date, float], List[Anomaly], List[CorrectionTrace]]:
        daily_mileage: Dict[date, float] = {}
        anomalies: List[Anomaly] = []
        corrections: List[CorrectionTrace] = []
        
        vehicle_mileage = self.mileage_by_vehicle.get(vehicle_id, {})
        if not vehicle_mileage:
            return daily_mileage, anomalies, corrections
        
        sorted_dates = sorted(vehicle_mileage.keys())
        prev_end_mileage: Optional[float] = None
        
        for i, curr_date in enumerate(sorted_dates):
            record = vehicle_mileage[curr_date]
            raw_daily = record.end_mileage - record.start_mileage
            
            if raw_daily < 0:
                anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.MILEAGE_DECREASE,
                    vehicle_id=vehicle_id,
                    date=curr_date,
                    description=f"里程倒挂: 结束里程({record.end_mileage}) < 开始里程({record.start_mileage})",
                    severity="error",
                    raw_value=raw_daily,
                    expected_value=0
                ))
                daily_mileage[curr_date] = 0
                corrections.append(CorrectionTrace(
                    vehicle_id=vehicle_id,
                    correction_type=CorrectionType.OUTLIER_REMOVAL,
                    date=curr_date,
                    original_value=raw_daily,
                    corrected_value=0,
                    reason="里程倒挂数据归零",
                    source_record=record.source
                ))
                continue
            
            if prev_end_mileage is not None and record.start_mileage < prev_end_mileage:
                anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.MILEAGE_DECREASE,
                    vehicle_id=vehicle_id,
                    date=curr_date,
                    description=f"跨日里程倒挂: 当日起始({record.start_mileage}) < 前一日结束({prev_end_mileage})",
                    severity="warning",
                    raw_value=record.start_mileage,
                    expected_value=prev_end_mileage
                ))
            
            if raw_daily > 800:
                anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.SUSPICIOUS_MILEAGE,
                    vehicle_id=vehicle_id,
                    date=curr_date,
                    description=f"里程异常偏高: {raw_daily}km 超出合理范围",
                    severity="warning",
                    raw_value=raw_daily,
                    expected_value=400
                ))
            
            daily_mileage[curr_date] = raw_daily
            prev_end_mileage = record.end_mileage
        
        for i, curr_date in enumerate(sorted_dates):
            if curr_date not in daily_mileage or daily_mileage[curr_date] == 0:
                prev_date = sorted_dates[i-1] if i > 0 else None
                next_date = sorted_dates[i+1] if i < len(sorted_dates) - 1 else None
                
                if prev_date and next_date and prev_date in daily_mileage and next_date in daily_mileage:
                    days_between = (next_date - prev_date).days
                    if days_between > 0:
                        estimated = (daily_mileage[next_date] + daily_mileage[prev_date]) / (2 * days_between)
                        if estimated > 0:
                            anomalies.append(Anomaly(
                                anomaly_type=AnomalyType.MILEAGE_GAP,
                                vehicle_id=vehicle_id,
                                date=curr_date,
                                description=f"里程缺口: 使用前后日插值估算 {estimated:.1f}km",
                                severity="info",
                                raw_value=0,
                                expected_value=estimated
                            ))
                            corrections.append(CorrectionTrace(
                                vehicle_id=vehicle_id,
                                correction_type=CorrectionType.MILEAGE_INTERPOLATION,
                                date=curr_date,
                                original_value=0,
                                corrected_value=estimated,
                                reason="前后日里程插值补全",
                                source_record="mileage_processor"
                            ))
                            daily_mileage[curr_date] = estimated
        
        return daily_mileage, anomalies, corrections
    
    def _validate_charging(self, vehicle_id: str, daily_mileage: Dict[date, float], 
                          vehicle: VehicleRecord) -> Tuple[Dict[date, float], List[Anomaly], List[CorrectionTrace]]:
        daily_charge: Dict[date, float] = defaultdict(float)
        anomalies: List[Anomaly] = []
        corrections: List[CorrectionTrace] = []
        
        charging_by_date = self.charging_by_vehicle_date.get(vehicle_id, {})
        for charge_date, records in charging_by_date.items():
            daily_charge[charge_date] = sum(r.charged_kwh for r in records)
        
        expected_consumption = 0.15
        for record_date, mileage in daily_mileage.items():
            if mileage <= 0:
                continue
            
            expected_kwh = mileage * expected_consumption
            actual_kwh = daily_charge.get(record_date, 0)
            
            if actual_kwh < expected_kwh * 0.5 and mileage > 100:
                anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.CHARGING_GAP,
                    vehicle_id=vehicle_id,
                    date=record_date,
                    description=f"充电缺口: 里程{mileage:.1f}km预计需电{expected_kwh:.1f}kWh，实际仅充电{actual_kwh:.1f}kWh",
                    severity="warning",
                    raw_value=actual_kwh,
                    expected_value=expected_kwh
                ))
        
        return dict(daily_charge), anomalies, corrections
    
    def _validate_operation(self, vehicle_id: str, daily_mileage: Dict[date, float]) -> Tuple[Dict[date, Tuple[bool, float]], List[Anomaly], List[CorrectionTrace]]:
        operation_status: Dict[date, Tuple[bool, float]] = {}
        anomalies: List[Anomaly] = []
        corrections: List[CorrectionTrace] = []
        
        calendar = self.calendar_by_vehicle.get(vehicle_id, {})
        
        for d in self._date_range():
            cal_record = calendar.get(d)
            mileage = daily_mileage.get(d, 0)
            
            if cal_record:
                is_operating = cal_record.is_operating
                online_hours = cal_record.online_hours
                
                if mileage > 50 and not is_operating:
                    anomalies.append(Anomaly(
                        anomaly_type=AnomalyType.INVALID_OPERATION_DAY,
                        vehicle_id=vehicle_id,
                        date=d,
                        description=f"停运日误计: 日历标记停运但实际有里程{mileage:.1f}km，已修正为营运",
                        severity="error",
                        raw_value=0,
                        expected_value=1
                    ))
                    corrections.append(CorrectionTrace(
                        vehicle_id=vehicle_id,
                        correction_type=CorrectionType.OPERATION_DAY_ADJUST,
                        date=d,
                        original_value=0,
                        corrected_value=1,
                        reason="实际里程证明当日营运",
                        source_record=cal_record.source
                    ))
                    is_operating = True
                
                if mileage <= 5 and is_operating and online_hours < 1:
                    anomalies.append(Anomaly(
                        anomaly_type=AnomalyType.INVALID_OPERATION_DAY,
                        vehicle_id=vehicle_id,
                        date=d,
                        description=f"营运日异常: 日历标记营运但里程和在线时长都很低",
                        severity="warning",
                        raw_value=mileage,
                        expected_value=50
                    ))
                
                operation_status[d] = (is_operating, online_hours)
            else:
                implied_operating = mileage > 50
                operation_status[d] = (implied_operating, 0)
                
                if implied_operating:
                    anomalies.append(Anomaly(
                        anomaly_type=AnomalyType.INVALID_OPERATION_DAY,
                        vehicle_id=vehicle_id,
                        date=d,
                        description=f"日历缺失: 根据里程{mileage:.1f}km推断当日营运",
                        severity="info",
                        raw_value=mileage,
                        expected_value=None
                    ))
        
        return operation_status, anomalies, corrections
    
    def _date_range(self):
        for n in range(int((self.period_end - self.period_start).days) + 1):
            yield self.period_start + timedelta(n)
    
    def process_vehicle(self, vehicle_id: str) -> Optional[ProcessedResult]:
        vehicle = self.vehicles.get(vehicle_id)
        if not vehicle:
            return None
        
        if vehicle.exit_date and vehicle.exit_date < self.period_start:
            return None
        
        daily_mileage, mileage_anomalies, mileage_corrections = self._validate_mileage_chain(vehicle_id)
        daily_charge, charging_anomalies, charging_corrections = self._validate_charging(vehicle_id, daily_mileage, vehicle)
        operation_status, op_anomalies, op_corrections = self._validate_operation(vehicle_id, daily_mileage)
        
        rule = self._get_applicable_rule(self.period_start)
        
        daily_summaries: List[DailySummary] = []
        all_anomalies = mileage_anomalies + charging_anomalies + op_anomalies
        all_corrections = mileage_corrections + charging_corrections + op_corrections
        
        for d in self._date_range():
            mileage = daily_mileage.get(d, 0)
            charge = daily_charge.get(d, 0)
            is_operating, online_hours = operation_status.get(d, (False, 0))
            
            day_anomalies = [a for a in all_anomalies if a.date == d]
            day_corrections = [c for c in all_corrections if c.date == d]
            
            mileage_valid = mileage > 0 and not any(
                a.anomaly_type in [AnomalyType.MILEAGE_DECREASE] 
                and a.severity == "error" for a in day_anomalies
            )
            
            charging_valid = True
            operation_valid = is_operating or mileage <= 5
            
            daily_summaries.append(DailySummary(
                vehicle_id=vehicle_id,
                summary_date=d,
                mileage=mileage,
                charged_kwh=charge,
                is_operating=is_operating,
                online_hours=online_hours,
                mileage_valid=mileage_valid,
                charging_valid=charging_valid,
                operation_valid=operation_valid,
                anomalies=day_anomalies,
                corrections=day_corrections
            ))
        
        total_mileage = sum(s.mileage for s in daily_summaries)
        valid_mileage = sum(s.mileage for s in daily_summaries if s.is_valid_day)
        total_charged = sum(s.charged_kwh for s in daily_summaries)
        operating_days = sum(1 for s in daily_summaries if s.is_operating)
        valid_days = sum(1 for s in daily_summaries if s.is_valid_day)
        
        estimated_subsidy = 0
        if rule:
            eligible_mileage = sum(
                s.mileage for s in daily_summaries 
                if s.is_valid_day and s.mileage >= rule.min_daily_mileage
            )
            estimated_subsidy = min(
                eligible_mileage * rule.subsidy_per_km,
                rule.max_monthly_subsidy
            )
            
            if valid_days < rule.min_monthly_days:
                estimated_subsidy = 0
        
        return ProcessedResult(
            vehicle_id=vehicle_id,
            period_start=self.period_start,
            period_end=self.period_end,
            total_mileage=round(total_mileage, 2),
            valid_mileage=round(valid_mileage, 2),
            total_charged_kwh=round(total_charged, 2),
            operating_days=operating_days,
            valid_days=valid_days,
            estimated_subsidy=round(estimated_subsidy, 2),
            daily_summaries=daily_summaries,
            all_anomalies=all_anomalies,
            all_corrections=all_corrections,
            subsidy_rule_applied=rule
        )
    
    def process_all(self) -> List[ProcessedResult]:
        results = []
        for vehicle_id in self.vehicles.keys():
            result = self.process_vehicle(vehicle_id)
            if result:
                results.append(result)
        return results
