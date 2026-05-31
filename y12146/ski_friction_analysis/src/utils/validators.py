from typing import Dict, Any, List, Tuple, Optional
from .config import Config

class DataValidator:
    def __init__(self):
        self.config = Config()
    
    def validate_row(self, row_data: Dict[str, Any], row_number: int) -> Tuple[bool, List[str], Dict[str, Any]]:
        errors = []
        cleaned_data = {}
        
        for col in self.config.REQUIRED_COLUMNS:
            if col not in row_data or row_data[col] is None or str(row_data[col]).strip() == "":
                errors.append(f"Missing required column: {col}")
            else:
                cleaned_data[col] = self._clean_value(row_data[col], col)
        
        for col in self.config.OPTIONAL_COLUMNS:
            if col in row_data and row_data[col] is not None and str(row_data[col]).strip() != "":
                cleaned_data[col] = self._clean_value(row_data[col], col)
        
        slope_angle = cleaned_data.get("slope_angle")
        if slope_angle is not None:
            try:
                slope_val = float(slope_angle)
                if slope_val < 0 or slope_val > 60:
                    errors.append(f"Invalid slope angle: {slope_val} (must be 0-60 degrees)")
            except (ValueError, TypeError):
                errors.append(f"Invalid slope angle format: {slope_angle}")
        
        temperature = cleaned_data.get("temperature")
        if temperature is not None:
            try:
                temp_val = float(temperature)
                if temp_val < -40 or temp_val > 30:
                    errors.append(f"Invalid temperature: {temp_val} (must be -40 to 30 C)")
            except (ValueError, TypeError):
                errors.append(f"Invalid temperature format: {temperature}")
        
        friction_coeff = cleaned_data.get("friction_coeff")
        if friction_coeff is not None and friction_coeff != "":
            try:
                fric_val = float(friction_coeff)
                if fric_val < 0 or fric_val > 1:
                    errors.append(f"Invalid friction coefficient: {fric_val} (must be 0-1)")
            except (ValueError, TypeError):
                errors.append(f"Invalid friction coefficient format: {friction_coeff}")
        
        is_valid = len(errors) == 0
        return is_valid, errors, cleaned_data
    
    def _clean_value(self, value: Any, field: str) -> Any:
        if value is None:
            return None
        
        str_val = str(value).strip()
        
        if str_val == "" or str_val.lower() in ["n/a", "null", "none", "-"]:
            return None
        
        if field in ["slope_angle", "temperature", "friction_coeff", "accident_count"]:
            try:
                return float(str_val)
            except ValueError:
                return str_val
        
        return str_val
    
    def check_missing_friction(self, row_data: Dict[str, Any]) -> bool:
        return "friction_coeff" not in row_data or row_data.get("friction_coeff") is None
    
    def check_temperature_spike(self, current_temp: float, previous_temp: float) -> Tuple[bool, float]:
        if previous_temp is None or current_temp is None:
            return False, 0.0
        
        temp_change = abs(current_temp - previous_temp)
        return temp_change >= self.config.TEMPERATURE_CHANGE_THRESHOLD, temp_change
    
    def identify_duplicate_segments(self, segment_data: List[Dict[str, Any]]) -> Dict[str, List[int]]:
        segment_counts: Dict[str, List[int]] = {}
        
        for idx, data in enumerate(segment_data):
            seg_id = data.get("segment_id")
            if seg_id:
                if seg_id not in segment_counts:
                    segment_counts[seg_id] = []
                segment_counts[seg_id].append(idx)
        
        return {seg_id: indices for seg_id, indices in segment_counts.items() if len(indices) > 1}
