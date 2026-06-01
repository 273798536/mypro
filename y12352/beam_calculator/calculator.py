from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import math
from .models import Beam, Load, LoadType, BoundaryCondition
from .units import Quantity, Unit, UnitSystem, UnitCategory
from .warnings import WarningCollector
from .steps import StepTracker, StepType, Formula
from .validator import InputValidator, ValidationResult


@dataclass
class CalculationResult:
    left_reaction: Optional[Quantity] = None
    right_reaction: Optional[Quantity] = None
    shear_force_points: List[Tuple[Quantity, Quantity]] = field(default_factory=list)
    bending_moment_points: List[Tuple[Quantity, Quantity]] = field(default_factory=list)
    deflection_points: List[Tuple[Quantity, Quantity]] = field(default_factory=list)
    max_shear_force: Optional[Quantity] = None
    min_shear_force: Optional[Quantity] = None
    max_bending_moment: Optional[Quantity] = None
    min_bending_moment: Optional[Quantity] = None
    max_deflection: Optional[Quantity] = None
    shear_force_zero_positions: List[Quantity] = field(default_factory=list)
    total_vertical_force: Optional[Quantity] = None
    total_moment: Optional[Quantity] = None
    equilibrium_check: Optional[bool] = None
    shear_diagram_points: int = 100
    moment_diagram_points: int = 100
    deflection_diagram_points: int = 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "left_reaction": str(self.left_reaction) if self.left_reaction else None,
            "right_reaction": str(self.right_reaction) if self.right_reaction else None,
            "max_shear_force": str(self.max_shear_force) if self.max_shear_force else None,
            "min_shear_force": str(self.min_shear_force) if self.min_shear_force else None,
            "max_bending_moment": str(self.max_bending_moment) if self.max_bending_moment else None,
            "min_bending_moment": str(self.min_bending_moment) if self.min_bending_moment else None,
            "max_deflection": str(self.max_deflection) if self.max_deflection else None,
            "total_vertical_force": str(self.total_vertical_force) if self.total_vertical_force else None,
            "total_moment": str(self.total_moment) if self.total_moment else None,
            "equilibrium_check": self.equilibrium_check,
            "shear_force_zero_positions": [str(p) for p in self.shear_force_zero_positions],
        }


class BeamCalculator:
    def __init__(self,
                 unit_system: Optional[UnitSystem] = None,
                 warning_collector: Optional[WarningCollector] = None,
                 step_tracker: Optional[StepTracker] = None,
                 num_points: int = 100):
        self.unit_system = unit_system if unit_system is not None else UnitSystem.metric_engineering()
        self.warnings = warning_collector if warning_collector is not None else WarningCollector()
        self.steps = step_tracker if step_tracker is not None else StepTracker()
        self.validator = InputValidator(self.unit_system, self.warnings, self.steps)
        self.num_points = num_points

    def calculate(self, beam: Beam, validate: bool = True) -> CalculationResult:
        if validate:
            validation = self.validator.validate_beam(beam)
            if not validation:
                raise ValueError(f"输入验证失败: {validation}")

        beam_standard = beam.to_unit_system(self.unit_system)

        self.steps.add_input_step(
            title="计算输入参数",
            description="简支梁受力计算的原始输入参数",
            inputs={
                "梁长度": beam_standard.length,
                "左支座": beam_standard.left_support.value,
                "右支座": beam_standard.right_support.value,
                "载荷数量": len(beam_standard.loads),
            },
        )

        result = CalculationResult(
            shear_diagram_points=self.num_points,
            moment_diagram_points=self.num_points,
            deflection_diagram_points=self.num_points,
        )

        self._record_load_equivalents(beam_standard)

        left_reaction, right_reaction = self._calculate_reactions(beam_standard)
        result.left_reaction = left_reaction
        result.right_reaction = right_reaction

        if left_reaction.value < 0:
            self.warnings.negative_reaction(
                support="左",
                reaction_value=left_reaction,
                source=beam_standard.source,
            )
        if right_reaction.value < 0:
            self.warnings.negative_reaction(
                support="右",
                reaction_value=right_reaction,
                source=beam_standard.source,
            )

        equilibrium_ok = self._check_equilibrium(beam_standard, left_reaction, right_reaction)
        result.equilibrium_check = equilibrium_ok
        result.total_vertical_force = left_reaction + right_reaction

        shear_points = self._calculate_shear_force(beam_standard, left_reaction, right_reaction)
        result.shear_force_points = shear_points
        result.max_shear_force = max((v for _, v in shear_points), key=lambda q: q.value)
        result.min_shear_force = min((v for _, v in shear_points), key=lambda q: q.value)

        moment_points = self._calculate_bending_moment(beam_standard, left_reaction, right_reaction)
        result.bending_moment_points = moment_points
        result.max_bending_moment = max((v for _, v in moment_points), key=lambda q: q.value)
        result.min_bending_moment = min((v for _, v in moment_points), key=lambda q: q.value)

        result.shear_force_zero_positions = self._find_shear_zero_crossings(shear_points)

        if beam_standard.section and beam_standard.material and beam_standard.material.elastic_modulus:
            deflection_points = self._calculate_deflection(
                beam_standard, left_reaction, right_reaction,
                beam_standard.material.elastic_modulus,
                beam_standard.section.moment_of_inertia
            )
            result.deflection_points = deflection_points
            if deflection_points:
                result.max_deflection = max((abs(v) for _, v in deflection_points), key=lambda q: q.value)

        self.steps.add_step(
            step_type=StepType.SUMMARY,
            title="计算结果汇总",
            description="简支梁受力计算的主要结果汇总",
            outputs={
                "左支座反力": left_reaction,
                "右支座反力": right_reaction,
                "最大剪力": result.max_shear_force,
                "最小剪力": result.min_shear_force,
                "最大弯矩": result.max_bending_moment,
                "最小弯矩": result.min_bending_moment,
                "最大挠度": result.max_deflection,
                "平衡校验": equilibrium_ok,
            },
        )

        return result

    def _record_load_equivalents(self, beam: Beam) -> None:
        for i, load in enumerate(beam.loads):
            if load.magnitude.value == 0:
                continue

            eff_force = load.get_effective_force()
            centroid = load.get_centroid_position()

            self.steps.add_step(
                step_type=StepType.LOAD_EQUIVALENT,
                title=f"载荷 #{i+1} 等效处理",
                description=f"将 {load.load_type.value} 转换为等效力和作用点",
                formula=Formula(
                    name="等效力计算",
                    expression="F_eq = ∫q(x)dx",
                    variables={"载荷类型": load.load_type.value, "原始大小": load.magnitude},
                    result=eff_force,
                ),
                inputs={"原始载荷": load.magnitude, "载荷类型": load.load_type.value},
                outputs={"等效力": eff_force, "形心位置": centroid},
                notes=[f"来源: {load.source}" if load.source else ""],
            )

    def _calculate_reactions(self, beam: Beam) -> Tuple[Quantity, Quantity]:
        L = beam.length.to_base().value
        total_force = 0.0
        total_moment_about_left = 0.0

        for i, load in enumerate(beam.loads):
            if load.magnitude.value == 0:
                continue

            if load.load_type in [LoadType.CONCENTRATED_FORCE]:
                F = load.magnitude.to_base().value
                a = load.position.to_base().value
                total_force += F
                total_moment_about_left += F * a

            elif load.load_type in [LoadType.CONCENTRATED_MOMENT]:
                M = load.magnitude.to_base().value
                sign = 1 if load.direction == "clockwise" else -1
                total_moment_about_left += sign * M

            elif load.load_type == LoadType.UNIFORM_DISTRIBUTED:
                q = load.magnitude.to_base().value
                a = load.start_position.to_base().value
                b = load.end_position.to_base().value
                F_eq = q * (b - a)
                centroid = (a + b) / 2
                total_force += F_eq
                total_moment_about_left += F_eq * centroid

            elif load.load_type == LoadType.TRIANGULAR_DISTRIBUTED:
                q = load.magnitude.to_base().value
                a = load.start_position.to_base().value
                b = load.end_position.to_base().value
                F_eq = 0.5 * q * (b - a)
                centroid = a + (2/3) * (b - a)
                total_force += F_eq
                total_moment_about_left += F_eq * centroid

            elif load.load_type == LoadType.TRAPEZOIDAL_DISTRIBUTED:
                q1 = load.magnitude.to_base().value
                q2 = load.magnitude_end.to_base().value
                a = load.start_position.to_base().value
                b = load.end_position.to_base().value
                F_eq = 0.5 * (q1 + q2) * (b - a)
                if q1 + q2 != 0:
                    centroid = a + (b - a) * (q1 + 2*q2) / (3*(q1 + q2))
                else:
                    centroid = (a + b) / 2
                total_force += F_eq
                total_moment_about_left += F_eq * centroid

        R_right = total_moment_about_left / L
        R_left = total_force - R_right

        R_left_qty = Quantity(R_left, Unit.N).convert_to(self.unit_system.force_unit)
        R_right_qty = Quantity(R_right, Unit.N).convert_to(self.unit_system.force_unit)

        formula_vars = {
            "ΣF": Quantity(total_force, Unit.N).convert_to(self.unit_system.force_unit),
            "ΣM_A": Quantity(total_moment_about_left, Unit.NM).convert_to(self.unit_system.moment_unit),
            "L": beam.length,
        }

        self.steps.add_reaction_step(
            title="左支座反力计算",
            description="对右支座取矩，由力矩平衡计算左支座反力",
            formula=Formula(
                name="左支座反力",
                expression="R_left = (ΣF * L - ΣM_A) / L",
                variables=formula_vars,
                result=R_left_qty,
            ),
            inputs=formula_vars,
            outputs={"R_left": R_left_qty},
        )

        self.steps.add_reaction_step(
            title="右支座反力计算",
            description="对左支座取矩，由力矩平衡计算右支座反力",
            formula=Formula(
                name="右支座反力",
                expression="R_right = ΣM_A / L",
                variables=formula_vars,
                result=R_right_qty,
            ),
            inputs=formula_vars,
            outputs={"R_right": R_right_qty},
        )

        return R_left_qty, R_right_qty

    def _check_equilibrium(self, beam: Beam, R_left: Quantity, R_right: Quantity) -> bool:
        total_reactions = R_left.to_base().value + R_right.to_base().value
        total_loads = 0.0

        for load in beam.loads:
            if load.load_type != LoadType.CONCENTRATED_MOMENT:
                total_loads += load.get_effective_force().to_base().value

        force_balance = abs(total_reactions - total_loads) < max(abs(total_loads), 1.0) * 1e-6

        L = beam.length.to_base().value
        total_moment_left = 0.0
        for load in beam.loads:
            if load.load_type == LoadType.CONCENTRATED_MOMENT:
                M = load.magnitude.to_base().value
                sign = 1 if load.direction == "clockwise" else -1
                total_moment_left += sign * M
            elif load.magnitude.value != 0:
                F = load.get_effective_force().to_base().value
                a = load.get_centroid_position().to_base().value
                total_moment_left += F * a

        moment_from_reactions = R_right.to_base().value * L
        moment_balance = abs(total_moment_left - moment_from_reactions) < max(abs(total_moment_left), 1.0) * 1e-6

        self.steps.add_step(
            step_type=StepType.EQUILIBRIUM,
            title="平衡条件校验",
            description="验证竖向力平衡和力矩平衡",
            formula=Formula(
                name="竖向力平衡",
                expression="ΣFy = R_left + R_right - ΣF_loads = 0",
                variables={
                    "R_left": R_left,
                    "R_right": R_right,
                    "ΣF_loads": Quantity(total_loads, Unit.N).convert_to(self.unit_system.force_unit),
                },
                result=Quantity(total_reactions - total_loads, Unit.N).convert_to(self.unit_system.force_unit),
            ),
            inputs={
                "总反力": Quantity(total_reactions, Unit.N).convert_to(self.unit_system.force_unit),
                "总荷载": Quantity(total_loads, Unit.N).convert_to(self.unit_system.force_unit),
            },
            outputs={
                "力平衡误差": Quantity(total_reactions - total_loads, Unit.N).convert_to(self.unit_system.force_unit),
                "矩平衡误差": Quantity(total_moment_left - moment_from_reactions, Unit.NM).convert_to(self.unit_system.moment_unit),
                "平衡满足": force_balance and moment_balance,
            },
        )

        return force_balance and moment_balance

    def _calculate_shear_force(self, beam: Beam, R_left: Quantity, R_right: Quantity) -> List[Tuple[Quantity, Quantity]]:
        L = beam.length.to_base().value
        R_left_base = R_left.to_base().value
        R_right_base = R_right.to_base().value
        points = []

        for i in range(self.num_points + 1):
            x = (i / self.num_points) * L
            V = R_left_base

            for load in beam.loads:
                if load.magnitude.value == 0:
                    continue

                if load.load_type == LoadType.CONCENTRATED_FORCE:
                    a = load.position.to_base().value
                    if x >= a:
                        V -= load.magnitude.to_base().value

                elif load.load_type == LoadType.UNIFORM_DISTRIBUTED:
                    a = load.start_position.to_base().value
                    b = load.end_position.to_base().value
                    q = load.magnitude.to_base().value
                    if x >= a:
                        effective_length = min(x, b) - a
                        if effective_length > 0:
                            V -= q * effective_length

                elif load.load_type == LoadType.TRIANGULAR_DISTRIBUTED:
                    a = load.start_position.to_base().value
                    b = load.end_position.to_base().value
                    q_max = load.magnitude.to_base().value
                    if x >= a:
                        effective_end = min(x, b)
                        len_eff = effective_end - a
                        total_len = b - a
                        q_at_x = q_max * len_eff / total_len if total_len > 0 else 0
                        V -= 0.5 * q_at_x * len_eff

                elif load.load_type == LoadType.TRAPEZOIDAL_DISTRIBUTED:
                    a = load.start_position.to_base().value
                    b = load.end_position.to_base().value
                    q1 = load.magnitude.to_base().value
                    q2 = load.magnitude_end.to_base().value
                    if x >= a:
                        effective_end = min(x, b)
                        len_eff = effective_end - a
                        total_len = b - a
                        q_at_x = q1 + (q2 - q1) * len_eff / total_len if total_len > 0 else q1
                        V -= 0.5 * (q1 + q_at_x) * len_eff

            x_qty = Quantity(x, Unit.M).convert_to(self.unit_system.length_unit)
            V_qty = Quantity(V, Unit.N).convert_to(self.unit_system.force_unit)
            points.append((x_qty, V_qty))

        self.steps.add_step(
            step_type=StepType.SHEAR_CALCULATION,
            title="剪力图计算",
            description="沿梁长各截面的剪力值计算",
            formula=Formula(
                name="剪力计算",
                expression="V(x) = R_left - ΣF_loads(left of x)",
                variables={"R_left": R_left},
                result=f"{len(points)} 个计算点",
            ),
            outputs={"最大剪力": max((v for _, v in points), key=lambda q: q.value)},
        )

        return points

    def _calculate_bending_moment(self, beam: Beam, R_left: Quantity, R_right: Quantity) -> List[Tuple[Quantity, Quantity]]:
        L = beam.length.to_base().value
        R_left_base = R_left.to_base().value
        points = []

        for i in range(self.num_points + 1):
            x = (i / self.num_points) * L
            M = R_left_base * x

            for load in beam.loads:
                if load.magnitude.value == 0:
                    continue

                if load.load_type == LoadType.CONCENTRATED_FORCE:
                    a = load.position.to_base().value
                    if x >= a:
                        M -= load.magnitude.to_base().value * (x - a)

                elif load.load_type == LoadType.CONCENTRATED_MOMENT:
                    a = load.position.to_base().value
                    if x >= a:
                        sign = 1 if load.direction == "clockwise" else -1
                        M -= sign * load.magnitude.to_base().value

                elif load.load_type == LoadType.UNIFORM_DISTRIBUTED:
                    a = load.start_position.to_base().value
                    b = load.end_position.to_base().value
                    q = load.magnitude.to_base().value
                    if x >= a:
                        effective_end = min(x, b)
                        len_eff = effective_end - a
                        if len_eff > 0:
                            centroid = a + len_eff / 2
                            M -= q * len_eff * (x - centroid)

                elif load.load_type == LoadType.TRIANGULAR_DISTRIBUTED:
                    a = load.start_position.to_base().value
                    b = load.end_position.to_base().value
                    q_max = load.magnitude.to_base().value
                    total_len = b - a
                    if x >= a:
                        effective_end = min(x, b)
                        len_eff = effective_end - a
                        if len_eff > 0:
                            q_at_x = q_max * len_eff / total_len if total_len > 0 else 0
                            F_eq = 0.5 * q_at_x * len_eff
                            centroid = a + (2/3) * len_eff
                            M -= F_eq * (x - centroid)

                elif load.load_type == LoadType.TRAPEZOIDAL_DISTRIBUTED:
                    a = load.start_position.to_base().value
                    b = load.end_position.to_base().value
                    q1 = load.magnitude.to_base().value
                    q2 = load.magnitude_end.to_base().value
                    total_len = b - a
                    if x >= a:
                        effective_end = min(x, b)
                        len_eff = effective_end - a
                        if len_eff > 0:
                            q_at_x = q1 + (q2 - q1) * len_eff / total_len if total_len > 0 else q1
                            F_eq = 0.5 * (q1 + q_at_x) * len_eff
                            if q1 + q_at_x != 0:
                                centroid = a + len_eff * (q1 + 2*q_at_x) / (3*(q1 + q_at_x))
                            else:
                                centroid = a + len_eff / 2
                            M -= F_eq * (x - centroid)

            x_qty = Quantity(x, Unit.M).convert_to(self.unit_system.length_unit)
            M_qty = Quantity(M, Unit.NM).convert_to(self.unit_system.moment_unit)
            points.append((x_qty, M_qty))

        self.steps.add_step(
            step_type=StepType.MOMENT_CALCULATION,
            title="弯矩图计算",
            description="沿梁长各截面的弯矩值计算",
            formula=Formula(
                name="弯矩计算",
                expression="M(x) = R_left * x - ΣM_loads(left of x)",
                variables={"R_left": R_left},
                result=f"{len(points)} 个计算点",
            ),
            outputs={"最大弯矩": max((v for _, v in points), key=lambda q: q.value)},
        )

        return points

    def _find_shear_zero_crossings(self, shear_points: List[Tuple[Quantity, Quantity]]) -> List[Quantity]:
        zeros = []
        for i in range(len(shear_points) - 1):
            x1, v1 = shear_points[i]
            x2, v2 = shear_points[i + 1]
            if (v1.value > 0 and v2.value < 0) or (v1.value < 0 and v2.value > 0):
                if abs(v2.value - v1.value) > 1e-10:
                    ratio = abs(v1.value) / abs(v2.value - v1.value)
                    x_zero = x1.value + ratio * (x2.value - x1.value)
                    zeros.append(Quantity(x_zero, x1.unit))
        return zeros

    def _calculate_deflection(self, beam: Beam, R_left: Quantity, R_right: Quantity,
                              E: Quantity, I: Optional[Quantity]) -> List[Tuple[Quantity, Quantity]]:
        if I is None:
            self.warnings.missing_data(
                parameter="惯性矩 I",
                calculation="挠度计算",
                source=beam.source,
            )
            return []

        L = beam.length.to_base().value
        E_base = E.to_base().value
        I_base = I.to_base().value
        EI = E_base * I_base

        R_left_base = R_left.to_base().value
        R_right_base = R_right.to_base().value

        deflection_points = []
        dx = L / self.num_points

        M_points = self._calculate_bending_moment(beam, R_left, R_right)
        M_values = [m.to_base().value for _, m in M_points]

        theta = [0.0] * (self.num_points + 1)
        deflection = [0.0] * (self.num_points + 1)

        for i in range(1, self.num_points + 1):
            M_avg = (M_values[i-1] + M_values[i]) / 2
            dtheta = M_avg * dx / EI
            theta[i] = theta[i-1] + dtheta

        theta_correction = -theta[-1] / L
        for i in range(self.num_points + 1):
            theta[i] += theta_correction

        for i in range(1, self.num_points + 1):
            theta_avg = (theta[i-1] + theta[i]) / 2
            deflection[i] = deflection[i-1] + theta_avg * dx

        for i in range(self.num_points + 1):
            x = (i / self.num_points) * L
            x_qty = Quantity(x, Unit.M).convert_to(self.unit_system.length_unit)
            delta_qty = Quantity(deflection[i] * 1000, Unit.MM).convert_to(Unit.M)
            deflection_points.append((x_qty, delta_qty))

        self.steps.add_step(
            step_type=StepType.DEFLECTION_CALCULATION,
            title="挠度计算",
            description="基于挠曲线微分方程的数值积分计算",
            formula=Formula(
                name="挠曲线方程",
                expression="EI * d²y/dx² = M(x)",
                variables={"E": E, "I": I, "EI": Quantity(EI, Unit.NM)},
                result=f"{len(deflection_points)} 个计算点",
            ),
            outputs={"最大挠度": max((abs(v) for _, v in deflection_points), key=lambda q: q.value)},
        )

        return deflection_points
