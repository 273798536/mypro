from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
from .units import Quantity


class StepType(Enum):
    INPUT = "input"
    UNIT_CONVERSION = "unit_conversion"
    VALIDATION = "validation"
    EQUILIBRIUM = "equilibrium"
    REACTION_CALCULATION = "reaction_calculation"
    SHEAR_CALCULATION = "shear_calculation"
    MOMENT_CALCULATION = "moment_calculation"
    DEFLECTION_CALCULATION = "deflection_calculation"
    STRESS_CALCULATION = "stress_calculation"
    LOAD_EQUIVALENT = "load_equivalent"
    SUMMARY = "summary"


@dataclass
class Formula:
    name: str
    expression: str
    variables: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Any] = None

    def __str__(self) -> str:
        var_str = ", ".join([f"{k}={v}" for k, v in self.variables.items()])
        return f"{self.name}: {self.expression}\n  变量: {var_str}\n  结果: {self.result}"


@dataclass
class CalculationStep:
    step_type: StepType
    title: str
    description: str
    formula: Optional[Formula] = None
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)
    order: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_type": self.step_type.value,
            "title": self.title,
            "description": self.description,
            "formula": {
                "name": self.formula.name,
                "expression": self.formula.expression,
                "variables": {k: str(v) for k, v in self.formula.variables.items()},
                "result": str(self.formula.result) if self.formula.result else None,
            } if self.formula else None,
            "inputs": {k: str(v) for k, v in self.inputs.items()},
            "outputs": {k: str(v) for k, v in self.outputs.items()},
            "notes": self.notes,
            "order": self.order,
        }


@dataclass
class StepTracker:
    steps: List[CalculationStep] = field(default_factory=list)
    _counter: int = 0

    def add_step(self,
                 step_type: StepType,
                 title: str,
                 description: str,
                 formula: Optional[Formula] = None,
                 inputs: Optional[Dict[str, Any]] = None,
                 outputs: Optional[Dict[str, Any]] = None,
                 notes: Optional[List[str]] = None) -> CalculationStep:

        self._counter += 1
        step = CalculationStep(
            step_type=step_type,
            title=title,
            description=description,
            formula=formula,
            inputs=inputs or {},
            outputs=outputs or {},
            notes=notes or [],
            order=self._counter,
        )
        self.steps.append(step)
        return step

    def add_input_step(self, title: str, description: str, inputs: Dict[str, Any]) -> CalculationStep:
        return self.add_step(
            step_type=StepType.INPUT,
            title=title,
            description=description,
            inputs=inputs,
        )

    def add_unit_conversion_step(self,
                                 title: str,
                                 description: str,
                                 original: Quantity,
                                 converted: Quantity) -> CalculationStep:
        return self.add_step(
            step_type=StepType.UNIT_CONVERSION,
            title=title,
            description=description,
            inputs={"原始值": original},
            outputs={"转换后": converted},
            notes=[f"转换因子: {original.unit.to_base} / {converted.unit.to_base}"],
        )

    def add_reaction_step(self,
                          title: str,
                          description: str,
                          formula: Formula,
                          inputs: Dict[str, Any],
                          outputs: Dict[str, Any]) -> CalculationStep:
        return self.add_step(
            step_type=StepType.REACTION_CALCULATION,
            title=title,
            description=description,
            formula=formula,
            inputs=inputs,
            outputs=outputs,
        )

    def get_steps_by_type(self, step_type: StepType) -> List[CalculationStep]:
        return [s for s in self.steps if s.step_type == step_type]

    def to_dict(self) -> List[Dict[str, Any]]:
        return [step.to_dict() for step in sorted(self.steps, key=lambda s: s.order)]

    def clear(self) -> None:
        self.steps.clear()
        self._counter = 0

    def __iter__(self):
        return iter(sorted(self.steps, key=lambda s: s.order))

    def __len__(self) -> int:
        return len(self.steps)
