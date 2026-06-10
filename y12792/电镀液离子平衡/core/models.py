import uuid
import json
import os
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any
import copy


@dataclass
class SpectrumData:
    wavelength: float
    absorbance: float
    concentration: Optional[float] = None


@dataclass
class ReagentRecord:
    reagent_name: str
    reagent_batch: str
    concentration: float
    unit: str
    volume_used: float
    supplier: str = ""
    expiry_date: str = ""


@dataclass
class WeighingRecord:
    sample_name: str
    weight: float
    weight_unit: str
    operator: str = ""
    weigh_time: str = ""


@dataclass
class AnalysisResult:
    ion_name: str
    concentration: float
    unit: str
    status: str = "normal"
    remark: str = ""
    spectrum_points: List[SpectrumData] = field(default_factory=list)
    calculation_formula: str = ""


@dataclass
class BatchRecord:
    batch_no: str
    sample_name: str = ""
    process_date: str = ""
    temperature: float = 0.0
    temperature_unit: str = "℃"
    ph_value: float = 0.0
    operator: str = ""
    
    weighing_records: List[WeighingRecord] = field(default_factory=list)
    reagent_records: List[ReagentRecord] = field(default_factory=list)
    spectrum_data: List[SpectrumData] = field(default_factory=list)
    analysis_results: List[AnalysisResult] = field(default_factory=list)
    
    analysis_opinion: str = ""
    review_opinion: str = ""
    overall_status: str = "pending"
    
    run_id: str = ""
    run_time: str = ""
    is_latest: bool = True
    
    source_file: str = ""
    remark: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    def copy_for_new_run(self) -> 'BatchRecord':
        new_record = copy.deepcopy(self)
        new_record.run_id = str(uuid.uuid4())[:8]
        new_record.run_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_record.is_latest = True
        new_record.analysis_results = []
        new_record.analysis_opinion = ""
        new_record.review_opinion = ""
        new_record.overall_status = "pending"
        return new_record


class BatchManager:
    def __init__(self):
        self._batches: Dict[str, List[BatchRecord]] = {}
    
    def add_batch(self, record: BatchRecord) -> BatchRecord:
        if record.batch_no not in self._batches:
            self._batches[record.batch_no] = []
        
        if not record.run_id:
            record.run_id = str(uuid.uuid4())[:8]
        if not record.run_time:
            record.run_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        for old in self._batches[record.batch_no]:
            old.is_latest = False
        
        record.is_latest = True
        self._batches[record.batch_no].append(record)
        return record
    
    def get_latest(self, batch_no: str) -> Optional[BatchRecord]:
        if batch_no in self._batches and self._batches[batch_no]:
            for record in reversed(self._batches[batch_no]):
                if record.is_latest:
                    return record
        return None
    
    def get_all_versions(self, batch_no: str) -> List[BatchRecord]:
        return self._batches.get(batch_no, [])
    
    def get_all_latest(self) -> List[BatchRecord]:
        result = []
        for batch_no in self._batches:
            latest = self.get_latest(batch_no)
            if latest:
                result.append(latest)
        return result
    
    def get_abnormal_batches(self) -> List[BatchRecord]:
        abnormal = []
        for batch in self.get_all_latest():
            if batch.overall_status == "abnormal":
                abnormal.append(batch)
            else:
                for r in batch.analysis_results:
                    if r.status == "abnormal":
                        abnormal.append(batch)
                        break
        return abnormal
    
    def batch_exists(self, batch_no: str) -> bool:
        return batch_no in self._batches and len(self._batches[batch_no]) > 0
    
    def get_batch_count(self) -> int:
        return len(self._batches)
    
    def get_total_record_count(self) -> int:
        return sum(len(records) for records in self._batches.values())
    
    def save(self, file_path: str) -> None:
        data = {}
        for batch_no, records in self._batches.items():
            data[batch_no] = [r.to_dict() for r in records]
        
        os.makedirs(os.path.dirname(file_path) or '.', exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, file_path: str) -> bool:
        if not os.path.exists(file_path):
            return False
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self._batches = {}
        for batch_no, records in data.items():
            self._batches[batch_no] = []
            for r in records:
                record = self._dict_to_batch_record(r)
                self._batches[batch_no].append(record)
        
        return True
    
    def _dict_to_batch_record(self, d: Dict[str, Any]) -> BatchRecord:
        weighing = [WeighingRecord(**w) for w in d.get('weighing_records', [])]
        reagents = [ReagentRecord(**r) for r in d.get('reagent_records', [])]
        spectrum = [SpectrumData(**s) for s in d.get('spectrum_data', [])]
        results = []
        for r in d.get('analysis_results', []):
            points = [SpectrumData(**p) for p in r.get('spectrum_points', [])]
            r_copy = {k: v for k, v in r.items() if k != 'spectrum_points'}
            r_copy['spectrum_points'] = points
            results.append(AnalysisResult(**r_copy))
        
        record = BatchRecord(
            batch_no=d.get('batch_no', ''),
            sample_name=d.get('sample_name', ''),
            process_date=d.get('process_date', ''),
            temperature=d.get('temperature', 0.0),
            temperature_unit=d.get('temperature_unit', '℃'),
            ph_value=d.get('ph_value', 0.0),
            operator=d.get('operator', ''),
            weighing_records=weighing,
            reagent_records=reagents,
            spectrum_data=spectrum,
            analysis_results=results,
            analysis_opinion=d.get('analysis_opinion', ''),
            review_opinion=d.get('review_opinion', ''),
            overall_status=d.get('overall_status', 'pending'),
            run_id=d.get('run_id', ''),
            run_time=d.get('run_time', ''),
            is_latest=d.get('is_latest', True),
            source_file=d.get('source_file', ''),
            remark=d.get('remark', ''),
        )
        return record
