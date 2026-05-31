"""载荷循环管理模块"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Tuple
from enum import Enum
from .units import UnitValidator


class LoadCycleType(Enum):
    CONSTANT_AMPLITUDE = "等幅载荷"
    VARIABLE_AMPLITUDE = "变幅载荷"
    BLOCK_LOADING = "分级载荷"


@dataclass
class LoadCycle:
    record_id: str
    maintained_by: str
    last_updated: str
    cycle_type: LoadCycleType
    min_load: float
    max_load: float
    load_unit: str
    cycles: float
    frequency_hz: Optional[float] = None
    temperature_c: Optional[float] = None
    environment: Optional[str] = None
    source_test_id: Optional[str] = None
    notes: Optional[str] = None
    
    def validate_units(self, validator: UnitValidator) -> bool:
        valid = True
        
        if not validator.validate_force(
            self.min_load, self.load_unit,
            "最小载荷", self.record_id
        ):
            valid = False
        
        if not validator.validate_force(
            self.max_load, self.load_unit,
            "最大载荷", self.record_id
        ):
            valid = False
        
        if self.min_load > self.max_load:
            validator.errors.append(type('Obj', (), {
                'parameter': '载荷范围',
                'expected_unit': '',
                'actual_unit': '',
                'record_id': self.record_id,
                'message': f'最小载荷({self.min_load})大于最大载荷({self.max_load})'
            })())
        
        return valid
    
    def get_mean_load(self) -> float:
        return (self.min_load + self.max_load) / 2
    
    def get_load_amplitude(self) -> float:
        return (self.max_load - self.min_load) / 2
    
    def get_stress_ratio(self) -> float:
        if self.max_load == 0:
            return float('-inf')
        return self.min_load / self.max_load


@dataclass
class LoadSpectrum:
    spectrum_id: str
    name: str
    cycles: List[LoadCycle] = field(default_factory=list)
    
    def add_cycle(self, cycle: LoadCycle):
        self.cycles.append(cycle)
    
    def validate_all(self, validator: UnitValidator) -> bool:
        all_valid = True
        for cycle in self.cycles:
            if not cycle.validate_units(validator):
                all_valid = False
        return all_valid
    
    def get_total_cycles(self) -> float:
        return sum(c.cycles for c in self.cycles)
