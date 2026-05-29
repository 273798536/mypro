from datetime import date, datetime
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from models import (
    AttendanceRecord, AcceptanceRecord, RateSnapshot, Staff,
    Dispute, VerificationResult, VerificationStatus, DisputeType
)
from data_store import DataStore


class AttendanceVerifier:
    def __init__(self, data_store: DataStore):
        self.data_store = data_store
    
    def verify_period(self, start_date: date, end_date: date, 
                     operator: str = "system") -> VerificationResult:
        attendance_records = self.data_store.get_attendance_by_period(start_date, end_date)
        
        if not attendance_records:
            return VerificationResult(
                result_id=DataStore.generate_id(),
                version=1,
                attendance_ids=[],
                created_at=datetime.now(),
                created_by=operator
            )
        
        latest_result = self.data_store.get_latest_result()
        version = latest_result.version + 1 if latest_result else 1
        
        result = VerificationResult(
            result_id=DataStore.generate_id(),
            version=version,
            attendance_ids=[r.attendance_id for r in attendance_records],
            created_at=datetime.now(),
            created_by=operator
        )
        
        disputes = []
        
        disputes.extend(self._check_duplicate_days(attendance_records))
        disputes.extend(self._check_missing_fields(attendance_records))
        disputes.extend(self._check_missing_acceptance(attendance_records))
        disputes.extend(self._check_rate_changes(attendance_records))
        
        result.disputes = disputes
        self._calculate_totals(result, attendance_records)
        self._count_disputes(result)
        
        return result
    
    def _check_duplicate_days(self, records: List[AttendanceRecord]) -> List[Dispute]:
        disputes = []
        
        day_groups = defaultdict(list)
        for record in records:
            key = (record.staff_id, record.work_date.isoformat())
            day_groups[key].append(record)
        
        for (staff_id, work_date_str), group in day_groups.items():
            if len(group) > 1:
                total_hours = sum(r.hours for r in group)
                work_date = date.fromisoformat(work_date_str)
                
                duplicate_hours = total_hours - 8.0
                duplicate_days = round(duplicate_hours / 8.0, 2)
                
                staff = self.data_store.staff.get(staff_id)
                staff_name = staff.name if staff else staff_id
                
                if duplicate_hours > 0:
                    source_info = ', '.join([f'{r.source or "未知来源"}(ID:{r.attendance_id})' for r in group])
                    ids_info = ', '.join([r.attendance_id for r in group])
                    dispute = Dispute(
                        dispute_id=DataStore.generate_id(),
                        dispute_type=DisputeType.DUPLICATE_DAYS,
                        status=VerificationStatus.ERROR,
                        attendance_ids=[r.attendance_id for r in group],
                        staff_id=staff_id,
                        work_date=work_date,
                        description=f"人员【{staff_name}】在 {work_date_str} 存在重复人天，共 {len(group)} 条记录，总工时 {total_hours:.1f} 小时，超出 {duplicate_hours:.1f} 小时（约 {duplicate_days} 人天）",
                        suggestion=f"请核对考勤记录来源：{source_info}。建议保留其中一条有效记录或调整工时，重复部分涉及记录ID：{ids_info}"
                    )
                    disputes.append(dispute)
        
        return disputes
    
    def _check_missing_fields(self, records: List[AttendanceRecord]) -> List[Dispute]:
        disputes = []
        
        for record in records:
            missing_fields = []
            
            if not record.project_code:
                missing_fields.append("项目编号")
            if not record.hours or record.hours <= 0:
                missing_fields.append("工时")
            if not record.source:
                missing_fields.append("数据来源")
            
            if missing_fields:
                staff = self.data_store.staff.get(record.staff_id)
                staff_name = staff.name if staff else record.staff_id
                
                dispute = Dispute(
                    dispute_id=DataStore.generate_id(),
                    dispute_type=DisputeType.FIELD_MISSING,
                    status=VerificationStatus.WARNING,
                    attendance_ids=[record.attendance_id],
                    staff_id=record.staff_id,
                    work_date=record.work_date,
                    description=f"人员【{staff_name}】在 {record.work_date} 的考勤记录缺少字段：{', '.join(missing_fields)}",
                    suggestion=f"请补充以下字段信息：{', '.join(missing_fields)}。"
                               f"可在考勤系统中更新记录（ID：{record.attendance_id}）"
                )
                disputes.append(dispute)
        
        return disputes
    
    def _check_missing_acceptance(self, records: List[AttendanceRecord]) -> List[Dispute]:
        disputes = []
        
        today = date.today()
        
        for record in records:
            acceptance = self.data_store.get_acceptance_for_date(
                record.staff_id, record.work_date
            )
            
            days_since_work = (today - record.work_date).days
            
            if not acceptance:
                if days_since_work > 3:
                    staff = self.data_store.staff.get(record.staff_id)
                    staff_name = staff.name if staff else record.staff_id
                    
                    dispute = Dispute(
                        dispute_id=DataStore.generate_id(),
                        dispute_type=DisputeType.MISSING_ACCEPTANCE,
                        status=VerificationStatus.WARNING,
                        attendance_ids=[record.attendance_id],
                        staff_id=record.staff_id,
                        work_date=record.work_date,
                        description=f"人员【{staff_name}】在 {record.work_date} 的考勤缺少交付验收记录，已逾期 {days_since_work} 天",
                        suggestion=f"请联系项目经理 {record.project_code or '未知项目'} 尽快提交验收。"
                                   f"如已验收，请在系统中补录验收记录并关联考勤ID：{record.attendance_id}"
                    )
                    disputes.append(dispute)
            elif not acceptance.accepted_at and days_since_work > 7:
                staff = self.data_store.staff.get(record.staff_id)
                staff_name = staff.name if staff else record.staff_id
                
                dispute = Dispute(
                    dispute_id=DataStore.generate_id(),
                    dispute_type=DisputeType.MISSING_ACCEPTANCE,
                    status=VerificationStatus.ERROR,
                    attendance_ids=[record.attendance_id],
                    staff_id=record.staff_id,
                    work_date=record.work_date,
                    description=f"人员【{staff_name}】在 {record.work_date} 的验收已逾期 {days_since_work} 天未确认",
                    suggestion=f"验收单 {acceptance.acceptance_id} 已提交但未确认，请催促相关人员确认。"
                               f"超期未验收的费用将暂停支付"
                )
                disputes.append(dispute)
        
        return disputes
    
    def _check_rate_changes(self, records: List[AttendanceRecord]) -> List[Dispute]:
        disputes = []
        
        staff_dates = defaultdict(list)
        for record in records:
            staff_dates[record.staff_id].append(record)
        
        for staff_id, staff_records in staff_dates.items():
            rates_used = {}
            for record in staff_records:
                rate = self.data_store.get_rate_for_date(staff_id, record.work_date)
                if rate:
                    rates_used[rate.rate_id] = rate
            
            if len(rates_used) > 1:
                staff = self.data_store.staff.get(staff_id)
                staff_name = staff.name if staff else staff_id
                
                rate_list = sorted(rates_used.values(), key=lambda r: r.effective_date)
                
                for i in range(len(rate_list) - 1):
                    old_rate = rate_list[i]
                    new_rate = rate_list[i + 1]
                    
                    affected_records = [
                        r for r in staff_records 
                        if r.work_date >= new_rate.effective_date
                    ]
                    
                    if affected_records:
                        dispute = Dispute(
                            dispute_id=DataStore.generate_id(),
                            dispute_type=DisputeType.RATE_CHANGED,
                            status=VerificationStatus.PENDING,
                            attendance_ids=[r.attendance_id for r in affected_records],
                            staff_id=staff_id,
                            work_date=new_rate.effective_date,
                            description=f"人员【{staff_name}】的日费率在 {new_rate.effective_date} 发生变更",
                            suggestion=f"费率从 {old_rate.daily_rate:.2f} 元/天 变更为 {new_rate.daily_rate:.2f} 元/天。"
                                       f"请确认费率变更是否经过审批。涉及 {len(affected_records)} 条考勤记录，"
                                       f"费用差额约 {abs(new_rate.daily_rate - old_rate.daily_rate) * len(affected_records):.2f} 元",
                            old_value=f"{old_rate.daily_rate:.2f}",
                            new_value=f"{new_rate.daily_rate:.2f}"
                        )
                        disputes.append(dispute)
        
        return disputes
    
    def _calculate_totals(self, result: VerificationResult, records: List[AttendanceRecord]):
        total_days = 0.0
        total_amount = 0.0
        duplicate_days = 0.0
        duplicate_amount = 0.0
        
        day_groups = defaultdict(list)
        for record in records:
            key = (record.staff_id, record.work_date.isoformat())
            day_groups[key].append(record)
        
        for group in day_groups.values():
            days = sum(r.hours for r in group) / 8.0
            
            rate = self.data_store.get_rate_for_date(group[0].staff_id, group[0].work_date)
            daily_rate = rate.daily_rate if rate else 0
            
            if days > 1:
                duplicate_days += days - 1
                duplicate_amount += (days - 1) * daily_rate
            
            total_days += days
            total_amount += days * daily_rate
        
        result.total_days = round(total_days, 2)
        result.total_amount = round(total_amount, 2)
        result.duplicate_days = round(duplicate_days, 2)
        result.duplicate_amount = round(duplicate_amount, 2)
    
    def _count_disputes(self, result: VerificationResult):
        result.missing_acceptance_count = sum(
            1 for d in result.disputes if d.dispute_type == DisputeType.MISSING_ACCEPTANCE
        )
        result.rate_change_count = sum(
            1 for d in result.disputes if d.dispute_type == DisputeType.RATE_CHANGED
        )
