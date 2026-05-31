import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Any, Optional
from ..utils import Config, AuditLogger, DataValidator

@dataclass
class ImportResult:
    valid_rows: List[Dict[str, Any]] = field(default_factory=list)
    bad_rows: List[Dict[str, Any]] = field(default_factory=list)
    missing_friction_rows: List[Dict[str, Any]] = field(default_factory=list)
    duplicate_segments: Dict[str, List[int]] = field(default_factory=dict)
    temperature_spikes: List[Dict[str, Any]] = field(default_factory=list)
    total_rows: int = 0
    header_mapping: Dict[str, str] = field(default_factory=dict)
    skipped_empty_lines: int = 0
    skipped_comment_lines: int = 0

class DataImporter:
    def __init__(self, audit_logger: AuditLogger):
        self.config = Config()
        self.validator = DataValidator()
        self.audit_logger = audit_logger
        self.manual_corrections: Dict[int, Dict[str, Any]] = {}
    
    def apply_manual_correction(self, row_id: int, field: str, new_value: Any, 
                                 reason: str, corrector: str = "user"):
        if row_id not in self.manual_corrections:
            self.manual_corrections[row_id] = {}
        self.manual_corrections[row_id][field] = new_value
        self.audit_logger.log_manual_correction(
            row_id, field, "original_value", new_value, reason, corrector
        )
    
    def import_from_csv(self, file_path: str, 
                        comment_prefix: str = "#",
                        encoding: str = "utf-8") -> ImportResult:
        file_path = Path(file_path)
        self.audit_logger.log_import_start(str(file_path))
        
        result = ImportResult()
        
        with open(file_path, 'r', encoding=encoding, errors='replace') as f:
            lines = f.readlines()
        
        header_line_idx = self._find_header_line(lines, comment_prefix)
        if header_line_idx is None:
            raise ValueError("Could not find valid header line in CSV file")
        
        header = self._parse_header(lines[header_line_idx])
        result.header_mapping = self._map_headers(header)
        
        data_lines = lines[header_line_idx + 1:]
        
        for line_idx, line in enumerate(data_lines, start=header_line_idx + 2):
            line = line.rstrip('\n\r')
            
            if not line.strip():
                result.skipped_empty_lines += 1
                continue
            
            if line.strip().startswith(comment_prefix):
                result.skipped_comment_lines += 1
                continue
            
            result.total_rows += 1
            
            row_data = self._parse_row(line, header, result.header_mapping)
            row_id = line_idx
            
            if row_id in self.manual_corrections:
                for field, new_val in self.manual_corrections[row_id].items():
                    row_data[field] = new_val
            
            is_valid, errors, cleaned_data = self.validator.validate_row(row_data, row_id)
            
            if not is_valid:
                bad_row = {
                    "row_id": row_id,
                    "original_data": row_data,
                    "cleaned_data": cleaned_data,
                    "errors": errors,
                    "raw_line": line
                }
                result.bad_rows.append(bad_row)
                self.audit_logger.log_bad_row(row_id, "; ".join(errors), row_data)
                continue
            
            if self.validator.check_missing_friction(cleaned_data):
                result.missing_friction_rows.append({
                    "row_id": row_id,
                    "data": cleaned_data
                })
                self.audit_logger.log_missing_friction(row_id, cleaned_data)
                continue
            
            cleaned_data["row_id"] = row_id
            result.valid_rows.append(cleaned_data)
        
        result.duplicate_segments = self.validator.identify_duplicate_segments(result.valid_rows)
        for seg_id, indices in result.duplicate_segments.items():
            row_ids = [result.valid_rows[i]["row_id"] for i in indices]
            self.audit_logger.log_duplicate_segment(seg_id, row_ids)
        
        result.temperature_spikes = self._detect_temperature_spikes(result.valid_rows)
        
        self.audit_logger.log_import_complete(
            str(file_path),
            result.total_rows,
            len(result.valid_rows),
            len(result.bad_rows)
        )
        
        return result
    
    def _find_header_line(self, lines: List[str], comment_prefix: str) -> Optional[int]:
        for idx, line in enumerate(lines):
            line = line.strip()
            if line and not line.startswith(comment_prefix):
                return idx
        return None
    
    def _parse_header(self, header_line: str) -> List[str]:
        reader = csv.reader([header_line])
        headers = next(reader)
        return [h.strip() for h in headers]
    
    def _map_headers(self, headers: List[str]) -> Dict[str, str]:
        mapping = {}
        header_lower = {h.lower(): h for h in headers}
        
        standard_names = {
            "zone": ["zone", "区域", "雪道区域", "slope_zone"],
            "segment_id": ["segment_id", "seg_id", "坡段编号", "段号", "segment"],
            "slope_angle": ["slope_angle", "坡度", "坡度角", "angle", "slope"],
            "temperature": ["temperature", "气温", "温度", "temp"],
            "surface_type": ["surface_type", "表面类型", "雪面类型", "surface", "雪质"],
            "friction_coeff": ["friction_coeff", "摩擦系数", "friction", "coefficient", "摩擦"],
            "accident_point": ["accident_point", "事故点", "事故位置", "accident_location"],
            "accident_count": ["accident_count", "事故数", "事故次数", "事故数量"],
            "snow_quality": ["snow_quality", "雪质", "雪况"],
            "weather_condition": ["weather_condition", "天气状况", "天气"],
            "timestamp": ["timestamp", "时间", "日期", "time", "date"]
        }
        
        for standard, alternatives in standard_names.items():
            for alt in alternatives:
                if alt.lower() in header_lower:
                    mapping[header_lower[alt.lower()]] = standard
                    break
        
        return mapping
    
    def _parse_row(self, line: str, headers: List[str], 
                   header_mapping: Dict[str, str]) -> Dict[str, Any]:
        reader = csv.reader([line])
        values = next(reader)
        
        row_data = {}
        for idx, header in enumerate(headers):
            if idx < len(values):
                value = values[idx].strip()
            else:
                value = ""
            
            mapped_key = header_mapping.get(header, header)
            row_data[mapped_key] = value
        
        return row_data
    
    def _detect_temperature_spikes(self, valid_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        spikes = []
        sorted_rows = sorted(valid_rows, key=lambda x: (x.get("zone", ""), x.get("segment_id", "")))
        
        prev_temp = None
        prev_seg = None
        
        for row in sorted_rows:
            curr_temp = row.get("temperature")
            curr_seg = row.get("segment_id")
            
            if prev_seg == curr_seg and prev_temp is not None and curr_temp is not None:
                has_spike, change = self.validator.check_temperature_spike(curr_temp, prev_temp)
                if has_spike:
                    spike = {
                        "segment_id": curr_seg,
                        "row_id": row["row_id"],
                        "previous_temperature": prev_temp,
                        "current_temperature": curr_temp,
                        "temperature_change": change
                    }
                    spikes.append(spike)
                    self.audit_logger.log_temperature_spike(
                        curr_seg, change, prev_temp, curr_temp
                    )
            
            prev_temp = curr_temp
            prev_seg = curr_seg
        
        return spikes
    
    def export_bad_rows(self, bad_rows: List[Dict[str, Any]], output_path: str):
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["行号", "错误原因", "原始数据", "清理后数据"])
            for row in bad_rows:
                writer.writerow([
                    row["row_id"],
                    "; ".join(row["errors"]),
                    json.dumps(row["original_data"], ensure_ascii=False),
                    json.dumps(row["cleaned_data"], ensure_ascii=False)
                ])
    
    def export_missing_friction(self, missing_rows: List[Dict[str, Any]], output_path: str):
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["行号", "区域", "坡段编号", "坡度", "气温", "表面类型"])
            for row in missing_rows:
                data = row["data"]
                writer.writerow([
                    row["row_id"],
                    data.get("zone", ""),
                    data.get("segment_id", ""),
                    data.get("slope_angle", ""),
                    data.get("temperature", ""),
                    data.get("surface_type", "")
                ])
