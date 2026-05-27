import os
import csv
import json
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import pandas as pd
from .models import (
    SalesRecord, ReplenishmentCycle, ServiceLevelConfig,
    StockoutRecord, WarehouseCapacity, ManualSuggestion,
    SkuAnalysisResult, ProcessingError, CalculationSummary
)


class DataReader:
    def __init__(self, input_dir: str):
        self.input_dir = Path(input_dir)
        self.errors: List[ProcessingError] = []
    
    def _read_csv_with_line_numbers(self, filename: str) -> Tuple[List[Dict[str, str]], List[ProcessingError]]:
        filepath = self.input_dir / filename
        records = []
        errors = []
        
        if not filepath.exists():
            return records, errors
        
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    row['_source_line'] = line_num
                    row['_source_file'] = filename
                    records.append(row)
                except Exception as e:
                    errors.append(ProcessingError(
                        sku_id=row.get('sku_id'),
                        error_type='DataReadError',
                        error_message=str(e),
                        source_file=filename,
                        source_line=line_num,
                        raw_data=dict(row)
                    ))
        
        return records, errors
    
    def read_sales(self) -> Tuple[List[SalesRecord], List[ProcessingError]]:
        records = []
        all_errors = []
        
        csv_records, errors = self._read_csv_with_line_numbers('sales.csv')
        all_errors.extend(errors)
        
        for row in csv_records:
            try:
                records.append(SalesRecord(
                    sku_id=row['sku_id'],
                    date=row['date'],
                    quantity=float(row['quantity']),
                    source_line=row.get('_source_line'),
                    source_file=row.get('_source_file')
                ))
            except Exception as e:
                all_errors.append(ProcessingError(
                    sku_id=row.get('sku_id'),
                    error_type='SalesDataError',
                    error_message=str(e),
                    source_file=row.get('_source_file'),
                    source_line=row.get('_source_line'),
                    raw_data=dict(row)
                ))
        
        return records, all_errors
    
    def read_replenishment_cycles(self) -> Tuple[List[ReplenishmentCycle], List[ProcessingError]]:
        records = []
        all_errors = []
        
        csv_records, errors = self._read_csv_with_line_numbers('replenishment_cycles.csv')
        all_errors.extend(errors)
        
        for row in csv_records:
            try:
                records.append(ReplenishmentCycle(
                    sku_id=row['sku_id'],
                    lead_time_days=float(row['lead_time_days']),
                    review_period_days=float(row['review_period_days']) if row.get('review_period_days') else None,
                    source_line=row.get('_source_line'),
                    source_file=row.get('_source_file')
                ))
            except Exception as e:
                all_errors.append(ProcessingError(
                    sku_id=row.get('sku_id'),
                    error_type='ReplenishmentCycleError',
                    error_message=str(e),
                    source_file=row.get('_source_file'),
                    source_line=row.get('_source_line'),
                    raw_data=dict(row)
                ))
        
        return records, all_errors
    
    def read_service_levels(self) -> Tuple[List[ServiceLevelConfig], List[ProcessingError]]:
        records = []
        all_errors = []
        
        csv_records, errors = self._read_csv_with_line_numbers('service_levels.csv')
        all_errors.extend(errors)
        
        for row in csv_records:
            try:
                records.append(ServiceLevelConfig(
                    sku_id=row['sku_id'],
                    service_level=float(row['service_level']),
                    source_line=row.get('_source_line'),
                    source_file=row.get('_source_file')
                ))
            except Exception as e:
                all_errors.append(ProcessingError(
                    sku_id=row.get('sku_id'),
                    error_type='ServiceLevelError',
                    error_message=str(e),
                    source_file=row.get('_source_file'),
                    source_line=row.get('_source_line'),
                    raw_data=dict(row)
                ))
        
        return records, all_errors
    
    def read_stockouts(self) -> Tuple[List[StockoutRecord], List[ProcessingError]]:
        records = []
        all_errors = []
        
        csv_records, errors = self._read_csv_with_line_numbers('stockouts.csv')
        all_errors.extend(errors)
        
        for row in csv_records:
            try:
                records.append(StockoutRecord(
                    sku_id=row['sku_id'],
                    date=row['date'],
                    duration_hours=float(row['duration_hours']) if row.get('duration_hours') else None,
                    estimated_lost_sales=float(row['estimated_lost_sales']) if row.get('estimated_lost_sales') else None,
                    source_line=row.get('_source_line'),
                    source_file=row.get('_source_file')
                ))
            except Exception as e:
                all_errors.append(ProcessingError(
                    sku_id=row.get('sku_id'),
                    error_type='StockoutDataError',
                    error_message=str(e),
                    source_file=row.get('_source_file'),
                    source_line=row.get('_source_line'),
                    raw_data=dict(row)
                ))
        
        return records, all_errors
    
    def read_warehouse_capacities(self) -> Tuple[List[WarehouseCapacity], List[ProcessingError]]:
        records = []
        all_errors = []
        
        csv_records, errors = self._read_csv_with_line_numbers('warehouse_capacities.csv')
        all_errors.extend(errors)
        
        for row in csv_records:
            try:
                records.append(WarehouseCapacity(
                    sku_id=row['sku_id'],
                    max_capacity=float(row['max_capacity']),
                    current_capacity=float(row['current_capacity']) if row.get('current_capacity') else None,
                    source_line=row.get('_source_line'),
                    source_file=row.get('_source_file')
                ))
            except Exception as e:
                all_errors.append(ProcessingError(
                    sku_id=row.get('sku_id'),
                    error_type='CapacityDataError',
                    error_message=str(e),
                    source_file=row.get('_source_file'),
                    source_line=row.get('_source_line'),
                    raw_data=dict(row)
                ))
        
        return records, all_errors
    
    def read_manual_suggestions(self) -> Tuple[List[ManualSuggestion], List[ProcessingError]]:
        records = []
        all_errors = []
        
        csv_records, errors = self._read_csv_with_line_numbers('manual_suggestions.csv')
        all_errors.extend(errors)
        
        for row in csv_records:
            try:
                records.append(ManualSuggestion(
                    sku_id=row['sku_id'],
                    suggested_safety_stock=float(row['suggested_safety_stock']) if row.get('suggested_safety_stock') else None,
                    note=row.get('note'),
                    source_line=row.get('_source_line'),
                    source_file=row.get('_source_file')
                ))
            except Exception as e:
                all_errors.append(ProcessingError(
                    sku_id=row.get('sku_id'),
                    error_type='ManualSuggestionError',
                    error_message=str(e),
                    source_file=row.get('_source_file'),
                    source_line=row.get('_source_line'),
                    raw_data=dict(row)
                ))
        
        return records, all_errors


class ResultWriter:
    def __init__(self, output_dir: str, create_timestamp_dir: bool = True):
        self.base_output_dir = Path(output_dir)
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if create_timestamp_dir:
            self.output_dir = self.base_output_dir / f"run_{self.timestamp}"
        else:
            self.output_dir = self.base_output_dir
        
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _model_to_dict(self, obj: Any) -> Dict:
        if hasattr(obj, 'model_dump'):
            return obj.model_dump()
        return dict(obj)
    
    def write_results(self, results: List[SkuAnalysisResult], 
                     errors: List[ProcessingError], 
                     summary: CalculationSummary) -> Dict[str, str]:
        output_files = {}
        
        results_df = pd.DataFrame([self._model_to_dict(r) for r in results])
        results_df = results_df.drop(columns=['calculation_trace', 'warnings', 'data_sources_used'], errors='ignore')
        results_path = self.output_dir / 'safety_stock_results.csv'
        results_df.to_csv(results_path, index=False, encoding='utf-8-sig')
        output_files['results'] = str(results_path)
        
        warnings_data = []
        for r in results:
            for w in r.warnings:
                warnings_data.append({
                    'sku_id': r.sku_id,
                    'warning_type': w.get('type'),
                    'severity': w.get('severity'),
                    'message': w.get('message'),
                    'details': json.dumps(w.get('details', {}), ensure_ascii=False)
                })
        
        if warnings_data:
            warnings_df = pd.DataFrame(warnings_data)
            warnings_path = self.output_dir / 'warnings.csv'
            warnings_df.to_csv(warnings_path, index=False, encoding='utf-8-sig')
            output_files['warnings'] = str(warnings_path)
        
        if errors:
            errors_df = pd.DataFrame([self._model_to_dict(e) for e in errors])
            errors_path = self.output_dir / 'errors.csv'
            errors_df.to_csv(errors_path, index=False, encoding='utf-8-sig')
            output_files['errors'] = str(errors_path)
        
        detailed_results = []
        for r in results:
            detailed = self._model_to_dict(r)
            detailed['warnings'] = json.dumps(detailed.get('warnings', []), ensure_ascii=False)
            detailed['data_sources_used'] = json.dumps(detailed.get('data_sources_used', []), ensure_ascii=False)
            detailed['calculation_trace'] = json.dumps(detailed.get('calculation_trace', {}), ensure_ascii=False)
            detailed_results.append(detailed)
        
        detailed_df = pd.DataFrame(detailed_results)
        detailed_path = self.output_dir / 'detailed_results.json'
        with open(detailed_path, 'w', encoding='utf-8') as f:
            json.dump(detailed_results, f, ensure_ascii=False, indent=2)
        output_files['detailed'] = str(detailed_path)
        
        summary_path = self.output_dir / 'summary.json'
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(self._model_to_dict(summary), f, ensure_ascii=False, indent=2)
        output_files['summary'] = str(summary_path)
        
        return output_files
    
    def write_replenishment_suggestions(self, results: List[SkuAnalysisResult]) -> str:
        suggestions = []
        for r in results:
            suggestions.append({
                'sku_id': r.sku_id,
                'final_safety_stock': round(r.final_safety_stock, 2),
                'reorder_point': round(r.reorder_point, 2),
                'order_up_to_level': round(r.order_up_to_level, 2) if r.order_up_to_level else None,
                'has_warnings': len(r.warnings) > 0,
                'warning_count': len(r.warnings),
                'manual_override': r.manual_override is not None
            })
        
        suggestions_df = pd.DataFrame(suggestions)
        suggestions_path = self.output_dir / 'replenishment_suggestions.csv'
        suggestions_df.to_csv(suggestions_path, index=False, encoding='utf-8-sig')
        return str(suggestions_path)
