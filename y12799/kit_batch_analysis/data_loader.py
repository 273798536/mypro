"""数据加载与保存模块"""

from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date
import json
import hashlib
import pandas as pd

from .config import AppConfig
from .models import (
    ReagentLedgerRecord, ExperimentRecord, WeighingSheetRecord,
    ReactionTimeRecord, TemperatureCurveRecord, TemperaturePoint,
    BatchTrackingRecord, ManualNote, AnalysisDataset, RecordStatus
)


def _parse_date(val: Any) -> date:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return date.today()
    if isinstance(val, pd.Timestamp):
        return val.to_pydatetime().date()
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%Y%m%d"]:
            try:
                return datetime.strptime(val.strip(), fmt).date()
            except (ValueError, AttributeError):
                continue
    return date.today()


def _parse_float(val: Any, default: Optional[float] = None) -> Optional[float]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _parse_int(val: Any, default: int = 0) -> int:
    f = _parse_float(val)
    return int(f) if f is not None else default


def _extract_notes(row: Dict[str, Any], note_keys: List[str]) -> List[ManualNote]:
    """从行数据中提取人工备注 - 严格保留原样，不做任何规范化"""
    notes: List[ManualNote] = []
    for key in note_keys:
        if key in row and row[key] is not None:
            val = row[key]
            if isinstance(val, float) and pd.isna(val):
                continue
            text = str(val).strip()
            if text:
                notes.append(ManualNote(
                    raw_text=text,
                    source_record_id="",
                    timestamp=datetime.now()
                ))
    return notes


def _row_to_dict(row: pd.Series) -> Dict[str, Any]:
    d = {}
    for k, v in row.items():
        if isinstance(v, float) and pd.isna(v):
            d[k] = None
        else:
            d[k] = v
    return d


class DataLoader:
    """数据加载器"""

    def __init__(self, config: AppConfig):
        self.config = config

    def load_reagent_ledger(self) -> List[ReagentLedgerRecord]:
        path = self.config.input_dir / self.config.input_files.reagent_ledger_filename
        records: List[ReagentLedgerRecord] = []
        if not path.exists():
            return records
        df = pd.read_excel(path)
        for idx, row in df.iterrows():
            rd = _row_to_dict(row)
            batch_no = str(rd.get("批次号") or rd.get("batch_no") or f"BATCH-{idx:04d}").strip()
            record_id = f"RL-{batch_no}-{idx:04d}"
            notes = _extract_notes(rd, ["备注", "人工备注", "note", "remark", "说明"])
            for n in notes:
                n.source_record_id = record_id
            records.append(ReagentLedgerRecord(
                record_id=record_id,
                batch_no=batch_no,
                kit_name=str(rd.get("试剂盒名称") or rd.get("kit_name") or "").strip(),
                reagent_name=str(rd.get("试剂名称") or rd.get("reagent_name") or "").strip(),
                receive_date=_parse_date(rd.get("入库日期") or rd.get("receive_date")),
                expiry_date=_parse_date(rd.get("有效期") or rd.get("expiry_date")),
                quantity=_parse_float(rd.get("数量") or rd.get("quantity"), 0.0) or 0.0,
                unit=str(rd.get("单位") or rd.get("unit") or "").strip(),
                storage_condition=str(rd.get("储存条件") or rd.get("storage") or "").strip(),
                operator=str(rd.get("操作人") or rd.get("operator") or "").strip(),
                manual_notes=notes,
                status=RecordStatus.PENDING,
                raw_row=rd,
            ))
        return records

    def load_experiment_records(self) -> List[ExperimentRecord]:
        path = self.config.input_dir / self.config.input_files.experiment_record_filename
        records: List[ExperimentRecord] = []
        if not path.exists():
            return records
        df = pd.read_excel(path)
        for idx, row in df.iterrows():
            rd = _row_to_dict(row)
            batch_no = str(rd.get("批次号") or rd.get("batch_no") or f"BATCH-{idx:04d}").strip()
            exp_no = str(rd.get("实验编号") or rd.get("experiment_no") or f"EXP-{idx:04d}").strip()
            record_id = f"EX-{batch_no}-{exp_no}-{idx:04d}"
            notes = _extract_notes(rd, ["备注", "人工备注", "note", "remark", "说明"])
            for n in notes:
                n.source_record_id = record_id
            records.append(ExperimentRecord(
                record_id=record_id,
                batch_no=batch_no,
                experiment_no=exp_no,
                experiment_date=_parse_date(rd.get("实验日期") or rd.get("experiment_date")),
                experiment_type=str(rd.get("实验类型") or rd.get("experiment_type") or "").strip(),
                sample_count=_parse_int(rd.get("样本数") or rd.get("sample_count"), 0),
                operator=str(rd.get("操作人") or rd.get("operator") or "").strip(),
                blank_control_count=_parse_int(rd.get("空白对照数") or rd.get("blank_control"), 0),
                manual_notes=notes,
                status=RecordStatus.PENDING,
                raw_row=rd,
            ))
        return records

    def load_weighing_sheets(self) -> List[WeighingSheetRecord]:
        path = self.config.input_dir / self.config.input_files.weighing_sheet_filename
        records: List[WeighingSheetRecord] = []
        if not path.exists():
            return records
        df = pd.read_excel(path)
        for idx, row in df.iterrows():
            rd = _row_to_dict(row)
            batch_no = str(rd.get("批次号") or rd.get("batch_no") or f"BATCH-{idx:04d}").strip()
            exp_no = str(rd.get("实验编号") or rd.get("experiment_no") or f"EXP-{idx:04d}").strip()
            record_id = f"WS-{batch_no}-{exp_no}-{idx:04d}"
            notes = _extract_notes(rd, ["备注", "人工备注", "note", "remark", "说明"])
            for n in notes:
                n.source_record_id = record_id
            records.append(WeighingSheetRecord(
                record_id=record_id,
                batch_no=batch_no,
                experiment_no=exp_no,
                reagent_name=str(rd.get("试剂名称") or rd.get("reagent_name") or "").strip(),
                weighing_date=_parse_date(rd.get("称量日期") or rd.get("weighing_date")),
                theoretical_weight=_parse_float(rd.get("理论称量") or rd.get("theoretical_weight"), 0.0) or 0.0,
                actual_weight=_parse_float(rd.get("实际称量") or rd.get("actual_weight"), 0.0) or 0.0,
                unit=str(rd.get("单位") or rd.get("unit") or "mg").strip(),
                operator=str(rd.get("操作人") or rd.get("operator") or "").strip(),
                manual_notes=notes,
                status=RecordStatus.PENDING,
                raw_row=rd,
            ))
        return records

    def load_reaction_times(self) -> List[ReactionTimeRecord]:
        path = self.config.input_dir / self.config.input_files.reaction_time_filename
        records: List[ReactionTimeRecord] = []
        if not path.exists():
            return records
        df = pd.read_excel(path)
        for idx, row in df.iterrows():
            rd = _row_to_dict(row)
            batch_no = str(rd.get("批次号") or rd.get("batch_no") or f"BATCH-{idx:04d}").strip()
            exp_no = str(rd.get("实验编号") or rd.get("experiment_no") or f"EXP-{idx:04d}").strip()
            step_name = str(rd.get("步骤名称") or rd.get("step_name") or f"STEP-{idx:04d}").strip()
            record_id = f"RT-{batch_no}-{exp_no}-{step_name}-{idx:04d}"
            actual = _parse_float(rd.get("实际时间_分钟") or rd.get("actual_duration_min"))
            notes = _extract_notes(rd, ["备注", "人工备注", "note", "remark", "说明"])
            for n in notes:
                n.source_record_id = record_id
            records.append(ReactionTimeRecord(
                record_id=record_id,
                batch_no=batch_no,
                experiment_no=exp_no,
                step_name=step_name,
                standard_duration_min=_parse_float(rd.get("标准时间_分钟") or rd.get("standard_duration_min"), 0.0) or 0.0,
                actual_duration_min=actual,
                operator=str(rd.get("操作人") or rd.get("operator") or "").strip(),
                manual_notes=notes,
                status=RecordStatus.PENDING if actual is None else RecordStatus.PENDING,
                raw_row=rd,
            ))
        return records

    def load_temperature_curves(self) -> List[TemperatureCurveRecord]:
        path = self.config.input_dir / self.config.input_files.temp_curve_filename
        records: List[TemperatureCurveRecord] = []
        if not path.exists():
            return records
        df = pd.read_excel(path)
        grouped: Dict[Tuple, List[Dict[str, Any]]] = {}
        for idx, row in df.iterrows():
            rd = _row_to_dict(row)
            batch_no = str(rd.get("批次号") or rd.get("batch_no") or "").strip()
            exp_no = str(rd.get("实验编号") or rd.get("experiment_no") or "").strip()
            curve_name = str(rd.get("曲线名称") or rd.get("curve_name") or "默认曲线").strip()
            key = (batch_no, exp_no, curve_name)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append({
                "time_min": _parse_float(rd.get("时间_分钟") or rd.get("time_min"), 0.0) or 0.0,
                "temperature": _parse_float(rd.get("实际温度") or rd.get("temperature"), 0.0) or 0.0,
                "expected_temperature": _parse_float(rd.get("标准温度") or rd.get("expected_temperature")),
                "operator": str(rd.get("操作人") or rd.get("operator") or "").strip(),
                "note_raw": rd.get("备注") or rd.get("人工备注") or rd.get("note") or rd.get("remark"),
                "row_idx": idx,
            })
        for key, points_data in grouped.items():
            batch_no, exp_no, curve_name = key
            if not batch_no:
                batch_no = f"BATCH-{points_data[0]['row_idx']:04d}"
            record_id = f"TC-{batch_no}-{exp_no}-{curve_name}"
            points = [TemperaturePoint(
                time_min=p["time_min"],
                temperature=p["temperature"],
                expected_temperature=p["expected_temperature"]
            ) for p in sorted(points_data, key=lambda x: x["time_min"])]
            notes: List[ManualNote] = []
            for p in points_data:
                nr = p.get("note_raw")
                if nr is not None:
                    text = str(nr).strip()
                    if text and not (isinstance(nr, float) and pd.isna(nr)):
                        notes.append(ManualNote(raw_text=text, source_record_id=record_id))
            operator = points_data[0].get("operator", "") if points_data else ""
            records.append(TemperatureCurveRecord(
                record_id=record_id,
                batch_no=batch_no,
                experiment_no=exp_no,
                curve_name=curve_name,
                points=points,
                operator=operator,
                manual_notes=notes,
                status=RecordStatus.PENDING,
                raw_row={"group_points": [p for p in points_data]},
            ))
        return records

    def load_batch_tracking(self, dataset: AnalysisDataset) -> Dict[str, BatchTrackingRecord]:
        path = self.config.output_dir / self.config.output_files.state_filename
        existing: Dict[str, BatchTrackingRecord] = {}
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    state_data = json.load(f)
                for batch_no, bt_dict in (state_data.get("batch_tracking") or {}).items():
                    snapshots = bt_dict.get("history_snapshots") or []
                    suggestions = bt_dict.get("recheck_suggestions") or []
                    unresolved = bt_dict.get("unresolved_anomaly_ids") or []
                    notes_data = bt_dict.get("manual_notes") or []
                    notes = [ManualNote(raw_text=n.get("raw_text", ""), author=n.get("author")) for n in notes_data]
                    existing[batch_no] = BatchTrackingRecord(
                        batch_no=batch_no,
                        kit_name=bt_dict.get("kit_name", ""),
                        first_analysis_date=_parse_date(bt_dict.get("first_analysis_date")),
                        last_analysis_date=_parse_date(bt_dict.get("last_analysis_date")),
                        analysis_count=int(bt_dict.get("analysis_count", 0)),
                        current_status=bt_dict.get("current_status", "分析中"),
                        recheck_suggestions=list(suggestions),
                        history_snapshots=list(snapshots),
                        manual_notes=notes,
                        unresolved_anomaly_ids=list(unresolved),
                    )
            except (json.JSONDecodeError, KeyError, ValueError):
                existing = {}
        all_batches = dataset.get_batch_numbers()
        result: Dict[str, BatchTrackingRecord] = {}
        for bn in all_batches:
            if bn in existing:
                result[bn] = existing[bn]
            else:
                kit_name = ""
                for rl in dataset.reagent_ledgers:
                    if rl.batch_no == bn and rl.kit_name:
                        kit_name = rl.kit_name
                        break
                result[bn] = BatchTrackingRecord(
                    batch_no=bn,
                    kit_name=kit_name,
                    first_analysis_date=None,
                    last_analysis_date=None,
                    analysis_count=0,
                    current_status="首次分析",
                    recheck_suggestions=[],
                    history_snapshots=[],
                    manual_notes=[],
                    unresolved_anomaly_ids=[],
                )
        return result

    def load_all(self) -> AnalysisDataset:
        dataset = AnalysisDataset()
        dataset.reagent_ledgers = self.load_reagent_ledger()
        dataset.experiment_records = self.load_experiment_records()
        dataset.weighing_sheets = self.load_weighing_sheets()
        dataset.reaction_times = self.load_reaction_times()
        dataset.temp_curves = self.load_temperature_curves()
        dataset.analysis_run_id = self._compute_run_id(dataset)
        dataset.batch_tracking = self.load_batch_tracking(dataset)
        return dataset

    def _compute_run_id(self, dataset: AnalysisDataset) -> str:
        h = hashlib.sha256()
        h.update(str(datetime.now().isoformat()).encode("utf-8"))
        for rl in dataset.reagent_ledgers:
            h.update(rl.record_id.encode("utf-8"))
            h.update(str(rl.raw_row).encode("utf-8", errors="ignore"))
        return "RUN-" + h.hexdigest()[:12].upper()
