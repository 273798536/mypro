from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import copy

from data_models import MaterialParameterRecord, FlywheelDataRecord, CalculationResult
from config import MaterialParams


@dataclass
class ChangeLogEntry:
    param_id: str
    experiment_id: str
    field_name: str
    old_value: float
    new_value: float
    changed_at: datetime
    changed_by: str
    change_reason: str


@dataclass
class ImpactedResult:
    result_id: str
    old_safety_factor: float
    new_safety_factor: float
    old_max_stress_mpa: float
    new_max_stress_mpa: float
    conclusion_changed: bool


class MaterialParameterTracker:
    def __init__(self):
        self.params_store: Dict[str, List[MaterialParameterRecord]] = {}
        self.change_log: List[ChangeLogEntry] = []
        self.impacted_results: Dict[str, List[ImpactedResult]] = {}

    def add_material_params(self, experiment_id: str, 
                            tensile_strength_mpa: float,
                            density_kg_m3: float,
                            elastic_modulus_gpa: float,
                            poisson_ratio: float,
                            source: str = "",
                            created_by: str = "system",
                            change_reason: str = "初始录入") -> MaterialParameterRecord:
        
        new_params = MaterialParameterRecord(
            experiment_id=experiment_id,
            tensile_strength_mpa=tensile_strength_mpa,
            density_kg_m3=density_kg_m3,
            elastic_modulus_gpa=elastic_modulus_gpa,
            poisson_ratio=poisson_ratio,
            source=source,
            created_by=created_by,
            change_reason=change_reason
        )

        if experiment_id not in self.params_store:
            self.params_store[experiment_id] = []
        else:
            for params in self.params_store[experiment_id]:
                params.is_latest = False
            if self.params_store[experiment_id]:
                new_params.previous_version_id = self.params_store[experiment_id][-1].param_id

        self.params_store[experiment_id].append(new_params)
        return new_params

    def update_material_params(self, experiment_id: str,
                               tensile_strength_mpa: Optional[float] = None,
                               density_kg_m3: Optional[float] = None,
                               elastic_modulus_gpa: Optional[float] = None,
                               poisson_ratio: Optional[float] = None,
                               source: str = "",
                               updated_by: str = "system",
                               change_reason: str = "参数修正") -> MaterialParameterRecord:
        
        current_params = self.get_latest_params(experiment_id)
        if not current_params:
            raise ValueError(f"未找到实验 {experiment_id} 的材料参数")

        new_tensile = tensile_strength_mpa if tensile_strength_mpa is not None else current_params.tensile_strength_mpa
        new_density = density_kg_m3 if density_kg_m3 is not None else current_params.density_kg_m3
        new_elastic = elastic_modulus_gpa if elastic_modulus_gpa is not None else current_params.elastic_modulus_gpa
        new_poisson = poisson_ratio if poisson_ratio is not None else current_params.poisson_ratio

        new_params = MaterialParameterRecord(
            experiment_id=experiment_id,
            tensile_strength_mpa=new_tensile,
            density_kg_m3=new_density,
            elastic_modulus_gpa=new_elastic,
            poisson_ratio=new_poisson,
            source=source if source else current_params.source,
            previous_version_id=current_params.param_id,
            created_by=updated_by,
            change_reason=change_reason
        )

        for params in self.params_store[experiment_id]:
            params.is_latest = False

        self._log_changes(current_params, new_params, updated_by, change_reason)

        self.params_store[experiment_id].append(new_params)
        return new_params

    def _log_changes(self, old_params: MaterialParameterRecord, new_params: MaterialParameterRecord,
                     changed_by: str, change_reason: str):
        fields = ['tensile_strength_mpa', 'density_kg_m3', 'elastic_modulus_gpa', 'poisson_ratio']
        
        for field in fields:
            old_val = getattr(old_params, field)
            new_val = getattr(new_params, field)
            if old_val != new_val:
                self.change_log.append(ChangeLogEntry(
                    param_id=new_params.param_id,
                    experiment_id=new_params.experiment_id,
                    field_name=field,
                    old_value=old_val,
                    new_value=new_val,
                    changed_at=new_params.created_at,
                    changed_by=changed_by,
                    change_reason=change_reason
                ))

    def get_latest_params(self, experiment_id: str) -> Optional[MaterialParameterRecord]:
        if experiment_id not in self.params_store:
            return None
        for params in reversed(self.params_store[experiment_id]):
            if params.is_latest:
                return params
        return self.params_store[experiment_id][-1] if self.params_store[experiment_id] else None

    def get_all_versions(self, experiment_id: str) -> List[MaterialParameterRecord]:
        return self.params_store.get(experiment_id, [])

    def get_version(self, experiment_id: str, version_index: int) -> Optional[MaterialParameterRecord]:
        versions = self.get_all_versions(experiment_id)
        if 0 <= version_index < len(versions):
            return versions[version_index]
        return None

    def get_change_history(self, experiment_id: str) -> List[ChangeLogEntry]:
        return [entry for entry in self.change_log if entry.experiment_id == experiment_id]

    def record_impact_analysis(self, experiment_id: str, old_result: CalculationResult, 
                                new_result: CalculationResult) -> ImpactedResult:
        conclusion_changed = (old_result.safety_factor < 1.5) != (new_result.safety_factor < 1.5) or \
                             (old_result.boundary_check_passed != new_result.boundary_check_passed)

        impacted = ImpactedResult(
            result_id=new_result.result_id,
            old_safety_factor=old_result.safety_factor,
            new_safety_factor=new_result.safety_factor,
            old_max_stress_mpa=old_result.max_stress_mpa,
            new_max_stress_mpa=new_result.max_stress_mpa,
            conclusion_changed=conclusion_changed
        )

        if experiment_id not in self.impacted_results:
            self.impacted_results[experiment_id] = []
        self.impacted_results[experiment_id].append(impacted)

        return impacted

    def get_impacted_results(self, experiment_id: str) -> List[ImpactedResult]:
        return self.impacted_results.get(experiment_id, [])

    def has_material_params(self, experiment_id: str) -> bool:
        return experiment_id in self.params_store and len(self.params_store[experiment_id]) > 0

