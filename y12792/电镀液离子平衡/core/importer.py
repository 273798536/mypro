import os
import pandas as pd
from typing import List, Dict, Optional, Tuple
from .models import (
    BatchRecord, BatchManager, SpectrumData,
    ReagentRecord, WeighingRecord
)


class DataImporter:
    def __init__(self, batch_manager: BatchManager):
        self.batch_manager = batch_manager
        self.import_log: List[str] = []
    
    def _read_file(self, file_path: str) -> pd.DataFrame:
        ext = os.path.splitext(file_path)[1].lower()
        if ext in ['.csv']:
            return pd.read_csv(file_path)
        elif ext in ['.xlsx', '.xls']:
            return pd.read_excel(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {ext}")
    
    def _normalize_temp(self, temp_value: float, temp_unit: str) -> Tuple[float, str]:
        temp_unit = temp_unit.strip().upper() if temp_unit else "℃"
        if temp_unit in ['C', '℃', '°C', 'DEGREE C', 'CELSIUS']:
            return temp_value, "℃"
        elif temp_unit in ['F', '°F', 'Fahrenheit', 'FAHRENHEIT']:
            celsius = (temp_value - 32) * 5 / 9
            return round(celsius, 2), "℃"
        elif temp_unit in ['K', 'KELVIN']:
            celsius = temp_value - 273.15
            return round(celsius, 2), "℃"
        else:
            return temp_value, temp_unit
    
    def _find_column(self, df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
        columns_lower = {col.lower().strip(): col for col in df.columns}
        for cand in candidates:
            if cand.lower() in columns_lower:
                return columns_lower[cand.lower()]
        return None
    
    def import_weighing_sheet(self, file_path: str, batch_no: Optional[str] = None) -> List[str]:
        self.import_log = []
        df = self._read_file(file_path)
        
        batch_col = self._find_column(df, ['批号', 'batch_no', 'batch', '批次号'])
        sample_col = self._find_column(df, ['样品名称', '样品', 'sample_name', 'sample'])
        weight_col = self._find_column(df, ['重量', '称量', 'weight', 'mass'])
        weight_unit_col = self._find_column(df, ['重量单位', '单位', 'unit', 'weight_unit'])
        operator_col = self._find_column(df, ['操作员', '称量人', 'operator', 'user'])
        time_col = self._find_column(df, ['称量时间', '时间', 'time', 'weigh_time'])
        temp_col = self._find_column(df, ['温度', 'temperature', 'temp'])
        temp_unit_col = self._find_column(df, ['温度单位', 'temp_unit', 'temperature_unit'])
        ph_col = self._find_column(df, ['pH', 'ph值', 'ph'])
        
        imported_batches = []
        
        for _, row in df.iterrows():
            if batch_col and pd.notna(row[batch_col]):
                row_batch_no = str(row[batch_col]).strip()
                
                if batch_no and row_batch_no != batch_no:
                    continue
                
                batch_no_current = row_batch_no
                
                if self.batch_manager.batch_exists(batch_no_current):
                    existing = self.batch_manager.get_latest(batch_no_current)
                    record = existing.copy_for_new_run()
                    record.source_file = os.path.basename(file_path)
                    self.import_log.append(f"批号 {batch_no_current} 已存在，创建新版本 (运行ID: {record.run_id})")
                else:
                    record = BatchRecord(batch_no=batch_no_current)
                    record.source_file = os.path.basename(file_path)
                    self.import_log.append(f"新增批号: {batch_no_current}")
                
                if sample_col and pd.notna(row[sample_col]):
                    record.sample_name = str(row[sample_col])
                if operator_col and pd.notna(row[operator_col]):
                    record.operator = str(row[operator_col])
                if time_col and pd.notna(row[time_col]):
                    record.process_date = str(row[time_col])
                if ph_col and pd.notna(row[ph_col]):
                    record.ph_value = float(row[ph_col])
                
                if temp_col and pd.notna(row[temp_col]):
                    temp_val = float(row[temp_col])
                    temp_unit = "℃"
                    if temp_unit_col and pd.notna(row[temp_unit_col]):
                        temp_unit = str(row[temp_unit_col])
                    temp_celsius, temp_unit_norm = self._normalize_temp(temp_val, temp_unit)
                    record.temperature = temp_celsius
                    record.temperature_unit = temp_unit_norm
                    if temp_unit_norm == "℃" and temp_unit.upper() not in ['C', '℃', '°C']:
                        self.import_log.append(
                            f"  温度单位转换: {temp_val}{temp_unit} → {temp_celsius}℃"
                        )
                
                if weight_col and pd.notna(row[weight_col]):
                    weight_unit = "g"
                    if weight_unit_col and pd.notna(row[weight_unit_col]):
                        weight_unit = str(row[weight_unit_col])
                    weighing = WeighingRecord(
                        sample_name=record.sample_name or record.batch_no,
                        weight=float(row[weight_col]),
                        weight_unit=weight_unit,
                        operator=record.operator,
                        weigh_time=record.process_date
                    )
                    record.weighing_records.append(weighing)
                
                self.batch_manager.add_batch(record)
                imported_batches.append(batch_no_current)
        
        self.import_log.append(f"共导入 {len(imported_batches)} 条称量记录")
        return imported_batches
    
    def import_spectrum_data(self, file_path: str, batch_no: Optional[str] = None) -> None:
        self.import_log = []
        df = self._read_file(file_path)
        
        wave_col = self._find_column(df, ['波长', 'wavelength', 'wave', 'λ', 'nm'])
        abs_col = self._find_column(df, ['吸光度', 'absorbance', 'abs', 'A'])
        conc_col = self._find_column(df, ['浓度', 'concentration', 'conc'])
        batch_col = self._find_column(df, ['批号', 'batch_no', 'batch', '批次号'])
        ion_col = self._find_column(df, ['离子名称', '离子', 'ion', 'ion_name'])
        
        if batch_col:
            batch_groups = df.groupby(batch_col)
            for b_no, group in batch_groups:
                self._import_single_spectrum(group, str(b_no), wave_col, abs_col, conc_col, ion_col)
        elif batch_no:
            self._import_single_spectrum(df, batch_no, wave_col, abs_col, conc_col, ion_col)
        else:
            raise ValueError("谱图数据中未找到批号列，也未指定批号")
    
    def _import_single_spectrum(self, df: pd.DataFrame, batch_no: str,
                                wave_col: str, abs_col: str,
                                conc_col: Optional[str], ion_col: Optional[str]) -> None:
        record = self.batch_manager.get_latest(batch_no)
        if not record:
            record = BatchRecord(batch_no=batch_no)
            self.batch_manager.add_batch(record)
            self.import_log.append(f"新增批号: {batch_no}")
        
        spectrum_points = []
        for _, row in df.iterrows():
            if wave_col and pd.notna(row[wave_col]) and abs_col and pd.notna(row[abs_col]):
                point = SpectrumData(
                    wavelength=float(row[wave_col]),
                    absorbance=float(row[abs_col])
                )
                if conc_col and pd.notna(row[conc_col]):
                    point.concentration = float(row[conc_col])
                spectrum_points.append(point)
        
        record.spectrum_data.extend(spectrum_points)
        self.import_log.append(f"批号 {batch_no}: 导入 {len(spectrum_points)} 个谱图数据点")
        
        if ion_col:
            ion_names = df[ion_col].dropna().unique()
            if len(ion_names) > 0:
                record.remark = f"检测离子: {', '.join(map(str, ion_names))}"
    
    def import_reagent_ledger(self, file_path: str, batch_no: Optional[str] = None) -> None:
        self.import_log = []
        df = self._read_file(file_path)
        
        name_col = self._find_column(df, ['试剂名称', '试剂', 'reagent', 'reagent_name'])
        batch_col = self._find_column(df, ['试剂批号', '试剂批次', 'reagent_batch', 'lot_no'])
        conc_col = self._find_column(df, ['浓度', 'concentration', 'conc'])
        unit_col = self._find_column(df, ['单位', '浓度单位', 'unit', 'concentration_unit'])
        vol_col = self._find_column(df, ['用量', '使用量', 'volume', 'volume_used'])
        supplier_col = self._find_column(df, ['供应商', '厂家', 'supplier', 'manufacturer'])
        expiry_col = self._find_column(df, ['有效期', '失效日期', 'expiry', 'expiry_date'])
        sample_batch_col = self._find_column(df, ['样品批号', '对应批号', 'sample_batch', 'batch_no'])
        
        if sample_batch_col:
            batch_groups = df.groupby(sample_batch_col)
            for b_no, group in batch_groups:
                self._import_single_reagent(group, str(b_no), name_col, batch_col,
                                            conc_col, unit_col, vol_col,
                                            supplier_col, expiry_col)
        elif batch_no:
            self._import_single_reagent(df, batch_no, name_col, batch_col,
                                        conc_col, unit_col, vol_col,
                                        supplier_col, expiry_col)
        else:
            raise ValueError("试剂台账中未找到样品批号列，也未指定批号")
    
    def _import_single_reagent(self, df: pd.DataFrame, batch_no: str,
                               name_col: str, batch_col_reagent: str,
                               conc_col: str, unit_col: str, vol_col: str,
                               supplier_col: Optional[str], expiry_col: Optional[str]) -> None:
        record = self.batch_manager.get_latest(batch_no)
        if not record:
            record = BatchRecord(batch_no=batch_no)
            self.batch_manager.add_batch(record)
            self.import_log.append(f"新增批号: {batch_no}")
        
        for _, row in df.iterrows():
            if name_col and pd.notna(row[name_col]):
                reagent = ReagentRecord(
                    reagent_name=str(row[name_col]),
                    reagent_batch=str(row[batch_col_reagent]) if batch_col_reagent and pd.notna(row[batch_col_reagent]) else "",
                    concentration=float(row[conc_col]) if conc_col and pd.notna(row[conc_col]) else 0.0,
                    unit=str(row[unit_col]) if unit_col and pd.notna(row[unit_col]) else "",
                    volume_used=float(row[vol_col]) if vol_col and pd.notna(row[vol_col]) else 0.0,
                    supplier=str(row[supplier_col]) if supplier_col and pd.notna(row[supplier_col]) else "",
                    expiry_date=str(row[expiry_col]) if expiry_col and pd.notna(row[expiry_col]) else ""
                )
                record.reagent_records.append(reagent)
        
        self.import_log.append(f"批号 {batch_no}: 导入 {len(df)} 条试剂记录")
    
    def get_import_log(self) -> List[str]:
        return self.import_log.copy()
