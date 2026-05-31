"""弹簧参数管理模块"""

from dataclasses import dataclass, field
from typing import Optional, Dict, List
from enum import Enum
from .units import UnitValidator


class SpringType(Enum):
    COMPRESSION = "压缩弹簧"
    EXTENSION = "拉伸弹簧"
    TORSION = "扭转弹簧"


@dataclass
class SpringParameter:
    record_id: str
    maintained_by: str
    last_updated: str
    wire_diameter: float
    wire_diameter_unit: str
    mean_coil_diameter: float
    mean_coil_diameter_unit: str
    active_coils: float
    total_coils: Optional[float] = None
    free_length: Optional[float] = None
    free_length_unit: Optional[str] = None
    spring_type: SpringType = SpringType.COMPRESSION
    material_grade: str = "60Si2MnA"
    surface_treatment: Optional[str] = None
    notes: Optional[str] = None
    
    def validate_units(self, validator: UnitValidator) -> bool:
        valid = True
        
        if not validator.validate_length(
            self.wire_diameter, self.wire_diameter_unit,
            "钢丝直径", self.record_id
        ):
            valid = False
        
        if not validator.validate_length(
            self.mean_coil_diameter, self.mean_coil_diameter_unit,
            "中径", self.record_id
        ):
            valid = False
        
        if self.free_length and self.free_length_unit:
            if not validator.validate_length(
                self.free_length, self.free_length_unit,
                "自由长度", self.record_id
            ):
                valid = False
        
        return valid
    
    def get_spring_index(self) -> float:
        return self.mean_coil_diameter / self.wire_diameter


@dataclass
class ConflictItem:
    field_name: str
    param_a_value: str
    param_a_source: str
    param_b_value: str
    param_b_source: str
    severity: str = "warning"


class SpringParameterMerger:
    def __init__(self):
        self.conflicts: List[ConflictItem] = []
    
    def merge(self, params_a: SpringParameter, params_b: SpringParameter) -> Dict:
        self.conflicts = []
        merged = {}
        
        fields_to_check = [
            ("wire_diameter", "钢丝直径", "数值"),
            ("wire_diameter_unit", "钢丝直径单位", "单位"),
            ("mean_coil_diameter", "弹簧中径", "数值"),
            ("mean_coil_diameter_unit", "弹簧中径单位", "单位"),
            ("active_coils", "有效圈数", "数值"),
            ("material_grade", "材料牌号", "数值"),
            ("spring_type", "弹簧类型", "数值"),
        ]
        
        for field_name, display_name, unit in fields_to_check:
            val_a = getattr(params_a, field_name)
            val_b = getattr(params_b, field_name)
            
            if val_a != val_b:
                self.conflicts.append(ConflictItem(
                    field_name=field_name,
                    param_a_value=str(val_a),
                    param_a_source=f"{params_a.record_id}({params_a.maintained_by})",
                    param_b_value=str(val_b),
                    param_b_source=f"{params_b.record_id}({params_b.maintained_by})",
                    severity="error" if field_name in ["material_grade", "wire_diameter"] else "warning"
                ))
                merged[field_name] = None
            else:
                merged[field_name] = val_a
        
        return merged
    
    def has_conflicts(self) -> bool:
        return len(self.conflicts) > 0
    
    def get_conflict_summary(self) -> str:
        if not self.conflicts:
            return "无参数冲突"
        
        lines = ["参数冲突检测结果:"]
        for c in self.conflicts:
            severity_tag = "严重" if c.severity == "error" else "警告"
            lines.append(
                f"- [{severity_tag}] {c.field_name}:\n"
                f"  A: {c.param_a_value} ({c.param_a_source})\n"
                f"  B: {c.param_b_value} ({c.param_b_source})"
            )
        return "\n".join(lines)
