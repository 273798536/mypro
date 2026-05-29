import json
import uuid
from datetime import date, datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from models import (
    Staff, RateSnapshot, AttendanceRecord, AcceptanceRecord,
    Dispute, VerificationResult, VerificationSummary,
    VerificationStatus, DisputeType
)


class DataStore:
    def __init__(self, storage_path: str = "data"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        
        self.staff: Dict[str, Staff] = {}
        self.rates: Dict[str, RateSnapshot] = {}
        self.attendance: Dict[str, AttendanceRecord] = {}
        self.acceptance: Dict[str, AcceptanceRecord] = {}
        self.verification_results: Dict[str, VerificationResult] = {}
        self.summaries: Dict[str, VerificationSummary] = {}
        
        self._load_all()
    
    def _load_all(self):
        for file_name in ["staff.json", "rates.json", "attendance.json", 
                         "acceptance.json", "results.json", "summaries.json"]:
            file_path = self.storage_path / file_name
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._parse_data(file_name, data)
    
    def _parse_data(self, file_name: str, data: dict):
        if file_name == "staff.json":
            for k, v in data.items():
                self.staff[k] = Staff(**v)
        elif file_name == "rates.json":
            for k, v in data.items():
                v['effective_date'] = date.fromisoformat(v['effective_date'])
                if v.get('end_date'):
                    v['end_date'] = date.fromisoformat(v['end_date'])
                v['created_at'] = datetime.fromisoformat(v['created_at'])
                self.rates[k] = RateSnapshot(**v)
        elif file_name == "attendance.json":
            for k, v in data.items():
                v['work_date'] = date.fromisoformat(v['work_date'])
                v['created_at'] = datetime.fromisoformat(v['created_at'])
                v['updated_at'] = datetime.fromisoformat(v['updated_at'])
                self.attendance[k] = AttendanceRecord(**v)
        elif file_name == "acceptance.json":
            for k, v in data.items():
                v['work_date'] = date.fromisoformat(v['work_date'])
                if v.get('accepted_at'):
                    v['accepted_at'] = datetime.fromisoformat(v['accepted_at'])
                self.acceptance[k] = AcceptanceRecord(**v)
        elif file_name == "results.json":
            for k, v in data.items():
                v['created_at'] = datetime.fromisoformat(v['created_at'])
                v['disputes'] = [self._parse_dispute(d) for d in v['disputes']]
                self.verification_results[k] = VerificationResult(**v)
        elif file_name == "summaries.json":
            for k, v in data.items():
                v['period_start'] = date.fromisoformat(v['period_start'])
                v['period_end'] = date.fromisoformat(v['period_end'])
                self.summaries[k] = VerificationSummary(**v)
    
    def _parse_dispute(self, d: dict) -> Dispute:
        d['dispute_type'] = DisputeType(d['dispute_type'])
        d['status'] = VerificationStatus(d['status'])
        d['work_date'] = date.fromisoformat(d['work_date']) if d.get('work_date') else None
        if d.get('resolved_at'):
            d['resolved_at'] = datetime.fromisoformat(d['resolved_at'])
        d['created_at'] = datetime.fromisoformat(d['created_at'])
        return Dispute(**d)
    
    def save_all(self):
        data_map = {
            "staff.json": self.staff,
            "rates.json": self.rates,
            "attendance.json": self.attendance,
            "acceptance.json": self.acceptance,
            "results.json": self.verification_results,
            "summaries.json": self.summaries
        }
        
        for file_name, data in data_map.items():
            file_path = self.storage_path / file_name
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump({k: self._to_dict(v) for k, v in data.items()}, 
                         f, ensure_ascii=False, default=str, indent=2)
    
    def _to_dict(self, obj: Any) -> dict:
        if hasattr(obj, '__dataclass_fields__'):
            result = {}
            for field in obj.__dataclass_fields__:
                value = getattr(obj, field)
                if isinstance(value, (date, datetime)):
                    result[field] = value.isoformat()
                elif isinstance(value, (DisputeType, VerificationStatus)):
                    result[field] = value.value
                elif hasattr(value, '__dataclass_fields__'):
                    result[field] = self._to_dict(value)
                elif isinstance(value, list) and value and hasattr(value[0], '__dataclass_fields__'):
                    result[field] = [self._to_dict(item) for item in value]
                else:
                    result[field] = value
            return result
        return obj
    
    @staticmethod
    def generate_id() -> str:
        return str(uuid.uuid4())[:8]
    
    def add_staff(self, staff: Staff) -> str:
        if not staff.staff_id:
            staff.staff_id = self.generate_id()
        self.staff[staff.staff_id] = staff
        self.save_all()
        return staff.staff_id
    
    def add_rate(self, rate: RateSnapshot) -> str:
        if not rate.rate_id:
            rate.rate_id = self.generate_id()
        self.rates[rate.rate_id] = rate
        self.save_all()
        return rate.rate_id
    
    def add_attendance(self, record: AttendanceRecord) -> str:
        if not record.attendance_id:
            record.attendance_id = self.generate_id()
        self.attendance[record.attendance_id] = record
        self.save_all()
        return record.attendance_id
    
    def add_acceptance(self, record: AcceptanceRecord) -> str:
        if not record.acceptance_id:
            record.acceptance_id = self.generate_id()
        self.acceptance[record.acceptance_id] = record
        self.save_all()
        return record.acceptance_id
    
    def add_verification_result(self, result: VerificationResult) -> str:
        if not result.result_id:
            result.result_id = self.generate_id()
        self.verification_results[result.result_id] = result
        self.save_all()
        return result.result_id
    
    def get_rate_for_date(self, staff_id: str, work_date: date) -> Optional[RateSnapshot]:
        matching_rates = [
            r for r in self.rates.values()
            if r.staff_id == staff_id and r.effective_date <= work_date
            and (r.end_date is None or r.end_date >= work_date)
        ]
        if matching_rates:
            return max(matching_rates, key=lambda r: r.version)
        return None
    
    def get_acceptance_for_date(self, staff_id: str, work_date: date) -> Optional[AcceptanceRecord]:
        for a in self.acceptance.values():
            if a.staff_id == staff_id and a.work_date == work_date:
                return a
        return None
    
    def get_attendance_by_period(self, start_date: date, end_date: date) -> List[AttendanceRecord]:
        return [
            a for a in self.attendance.values()
            if start_date <= a.work_date <= end_date
        ]
    
    def get_latest_result(self) -> Optional[VerificationResult]:
        if not self.verification_results:
            return None
        return max(self.verification_results.values(), key=lambda r: r.created_at)
    
    def get_previous_result(self, current_result_id: str) -> Optional[VerificationResult]:
        results = sorted(self.verification_results.values(), key=lambda r: r.created_at)
        for i, r in enumerate(results):
            if r.result_id == current_result_id and i > 0:
                return results[i - 1]
        return None
