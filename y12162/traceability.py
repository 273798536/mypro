import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from pathlib import Path
import json
from datetime import datetime

from config import config
from energy_calculator import EnergyResult

@dataclass
class TraceRecord:
    trace_id: str
    level: str
    parent_id: Optional[str]
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class TraceChain:
    train_no: str
    section: str
    energy_recovery: Dict = field(default_factory=dict)
    section_aggregation: Dict = field(default_factory=dict)
    loss_estimation: Dict = field(default_factory=dict)
    raw_data_refs: List[int] = field(default_factory=list)
    quality_flags: List[str] = field(default_factory=list)

class EnergyTracer:
    def __init__(self):
        self.trace_records: List[TraceRecord] = []
        self.trace_chains: Dict[str, TraceChain] = {}
        self._counter = 0
    
    def _generate_id(self) -> str:
        self._counter += 1
        return f"TRACE_{self._counter:06d}"
    
    def trace_energy_recovery(
        self,
        row_data: pd.Series,
        parent_id: Optional[str] = None
    ) -> str:
        trace_id = self._generate_id()
        
        data = {
            "时间": str(row_data.get("时间", "")),
            "速度": row_data.get("速度", 0),
            "电流": row_data.get("电流", 0),
            "电压": row_data.get("电压", 0),
            "功率": row_data.get("功率", 0),
            "能量(kWh)": row_data.get("能量(kWh)", 0),
            "制动能量(kWh)": row_data.get("制动能量(kWh)", 0),
            "牵引能量(kWh)": row_data.get("牵引能量(kWh)", 0),
            "加速度": row_data.get("加速度", 0),
            "制动阶段": bool(row_data.get("制动阶段", False)),
            "制动阶段ID": int(row_data.get("制动阶段ID", 0)),
            "区间": row_data.get("区间", ""),
            "列车号": row_data.get("列车号", "")
        }
        
        record = TraceRecord(
            trace_id=trace_id,
            level="energy_recovery",
            parent_id=parent_id,
            data=data
        )
        self.trace_records.append(record)
        
        return trace_id
    
    def trace_section_aggregation(
        self,
        section_data: pd.Series,
        child_trace_ids: List[str],
        parent_id: Optional[str] = None
    ) -> str:
        trace_id = self._generate_id()
        
        data = section_data.to_dict()
        data["child_trace_ids"] = child_trace_ids
        data["raw_data_count"] = len(child_trace_ids)
        
        for key, value in data.items():
            if isinstance(value, (pd.Timestamp, np.datetime64)):
                data[key] = str(value)
            elif isinstance(value, (np.int64, np.float64)):
                data[key] = float(value) if isinstance(value, np.float64) else int(value)
        
        record = TraceRecord(
            trace_id=trace_id,
            level="section_aggregation",
            parent_id=parent_id,
            data=data
        )
        self.trace_records.append(record)
        
        return trace_id
    
    def trace_loss_estimation(
        self,
        loss_data: pd.Series,
        section_trace_id: str,
        parent_id: Optional[str] = None
    ) -> str:
        trace_id = self._generate_id()
        
        data = loss_data.to_dict()
        data["section_trace_id"] = section_trace_id
        
        for key, value in data.items():
            if isinstance(value, (np.int64, np.float64)):
                data[key] = float(value)
        
        record = TraceRecord(
            trace_id=trace_id,
            level="loss_estimation",
            parent_id=parent_id,
            data=data
        )
        self.trace_records.append(record)
        
        return trace_id
    
    def build_trace_chain(
        self,
        energy_result: EnergyResult,
        train_no: str,
        section: str
    ) -> TraceChain:
        chain_key = f"{train_no}_{section}"
        
        raw_mask = (
            (energy_result.raw_energy_data["列车号"] == train_no) &
            (energy_result.raw_energy_data["区间"] == section)
        )
        raw_data = energy_result.raw_energy_data[raw_mask]
        
        child_ids = []
        for _, row in raw_data.iterrows():
            tid = self.trace_energy_recovery(row)
            child_ids.append(tid)
        
        section_mask = (
            (energy_result.section_energy["列车号"] == train_no) &
            (energy_result.section_energy["区间"] == section)
        )
        section_row = energy_result.section_energy[section_mask]
        
        section_trace_id = ""
        section_agg_data = {}
        if not section_row.empty:
            section_trace_id = self.trace_section_aggregation(
                section_row.iloc[0], child_ids
            )
            section_agg_data = section_row.iloc[0].to_dict()
        
        loss_mask = (
            (energy_result.loss_estimation["列车号"] == train_no) &
            (energy_result.loss_estimation["区间"] == section)
        )
        loss_row = energy_result.loss_estimation[loss_mask]
        
        loss_data = {}
        if not loss_row.empty:
            self.trace_loss_estimation(loss_row.iloc[0], section_trace_id)
            loss_data = loss_row.iloc[0].to_dict()
        
        chain = TraceChain(
            train_no=train_no,
            section=section,
            energy_recovery={
                "总制动能量": raw_data["制动能量(kWh)"].sum(),
                "总牵引能量": raw_data["牵引能量(kWh)"].sum(),
                "数据点数": len(raw_data),
                "时间范围": f"{raw_data['时间'].min()} - {raw_data['时间'].max()}"
            } if not raw_data.empty else {},
            section_aggregation=section_agg_data,
            loss_estimation=loss_data,
            raw_data_refs=child_ids,
            quality_flags=[]
        )
        
        self.trace_chains[chain_key] = chain
        return chain
    
    def get_trace_by_id(self, trace_id: str) -> Optional[TraceRecord]:
        for record in self.trace_records:
            if record.trace_id == trace_id:
                return record
        return None
    
    def get_trace_chain(self, train_no: str, section: str) -> Optional[TraceChain]:
        chain_key = f"{train_no}_{section}"
        return self.trace_chains.get(chain_key)
    
    def get_children_traces(self, trace_id: str) -> List[TraceRecord]:
        return [r for r in self.trace_records if r.parent_id == trace_id]
    
    def get_parent_trace(self, trace_id: str) -> Optional[TraceRecord]:
        record = self.get_trace_by_id(trace_id)
        if record and record.parent_id:
            return self.get_trace_by_id(record.parent_id)
        return None
    
    def _json_serialize(self, obj):
        if isinstance(obj, (pd.Timestamp, np.datetime64, datetime)):
            return str(obj)
        elif isinstance(obj, (np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._json_serialize(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._json_serialize(item) for item in obj]
        else:
            return obj
    
    def export_trace_report(
        self,
        output_path: str,
        format: str = "json"
    ) -> None:
        path = Path(output_path)
        
        report_data = {
            "export_time": datetime.now().isoformat(),
            "total_trace_records": len(self.trace_records),
            "total_trace_chains": len(self.trace_chains),
            "trace_records": [
                {
                    "trace_id": r.trace_id,
                    "level": r.level,
                    "parent_id": r.parent_id,
                    "data": self._json_serialize(r.data),
                    "timestamp": r.timestamp.isoformat()
                }
                for r in self.trace_records
            ],
            "trace_chains": [
                {
                    "train_no": chain.train_no,
                    "section": chain.section,
                    "energy_recovery": self._json_serialize(chain.energy_recovery),
                    "section_aggregation": self._json_serialize(chain.section_aggregation),
                    "loss_estimation": self._json_serialize(chain.loss_estimation),
                    "raw_data_refs": chain.raw_data_refs,
                    "quality_flags": chain.quality_flags
                }
                for chain in self.trace_chains.values()
            ]
        }
        
        if format == "json":
            with open(path, "w", encoding="utf-8") as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
        elif format == "csv":
            records_df = pd.DataFrame([
                {
                    "trace_id": r.trace_id,
                    "level": r.level,
                    "parent_id": r.parent_id or "",
                    "data": json.dumps(self._json_serialize(r.data), ensure_ascii=False),
                    "timestamp": r.timestamp.isoformat()
                }
                for r in self.trace_records
            ])
            records_df.to_csv(path, index=False, encoding="utf-8-sig")
    
    def build_full_traceability(
        self,
        energy_result: EnergyResult
    ) -> Dict[str, TraceChain]:
        for (train_no, section), _ in energy_result.section_energy.groupby(["列车号", "区间"]):
            self.build_trace_chain(energy_result, train_no, section)
        
        return self.trace_chains
    
    def get_trace_summary(self) -> pd.DataFrame:
        summary_data = []
        
        for chain_key, chain in self.trace_chains.items():
            summary_data.append({
                "列车号": chain.train_no,
                "区间": chain.section,
                "能量回收点数": len(chain.raw_data_refs),
                "总制动能量(kWh)": chain.energy_recovery.get("总制动能量", 0),
                "总牵引能量(kWh)": chain.energy_recovery.get("总牵引能量", 0),
                "能量回收率(%)": chain.section_aggregation.get("能量回收率(%)", 0),
                "实际可回收能量(kWh)": chain.loss_estimation.get("实际可回收能量(kWh)", 0),
                "质量标记数量": len(chain.quality_flags)
            })
        
        return pd.DataFrame(summary_data)

def create_trace_report(
    energy_result: EnergyResult,
    output_dir: str
) -> Dict[str, str]:
    tracer = EnergyTracer()
    tracer.build_full_traceability(energy_result)
    
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    json_path = out_dir / "traceability_report.json"
    csv_path = out_dir / "traceability_summary.csv"
    
    tracer.export_trace_report(str(json_path), format="json")
    
    summary_df = tracer.get_trace_summary()
    summary_df.to_csv(str(csv_path), index=False, encoding="utf-8-sig")
    
    return {
        "json_report": str(json_path),
        "csv_summary": str(csv_path),
        "total_chains": len(tracer.trace_chains)
    }

def trace_single_result(
    energy_result: EnergyResult,
    train_no: str,
    section: str
) -> Dict:
    tracer = EnergyTracer()
    chain = tracer.build_trace_chain(energy_result, train_no, section)
    
    return {
        "train_no": train_no,
        "section": section,
        "energy_recovery_summary": chain.energy_recovery,
        "section_aggregation_summary": {
            k: v for k, v in chain.section_aggregation.items()
            if isinstance(v, (int, float, str))
        },
        "loss_estimation_summary": chain.loss_estimation,
        "trace_ids": chain.raw_data_refs[:5],
        "trace_count": len(chain.raw_data_refs)
    }
