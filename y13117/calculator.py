from dataclasses import dataclass, field
from typing import Dict, Optional, List, Tuple
from materials_db import (
    find_material, check_material_name_consistency,
    UNIT_CONVERSIONS, MATERIALS_DB
)
from datetime import datetime
import math


@dataclass
class CalcParam:
    name: str
    value: Optional[float]
    unit: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    description: str = ""


@dataclass
class Formula:
    name: str
    expression: str
    description: str
    params_needed: List[str]
    result_unit: str


@dataclass
class UnitIssue:
    param_name: str
    issue_type: str
    current_unit: str
    expected_unit: str
    next_step: str


@dataclass
class BoundaryIssue:
    param_name: str
    current_value: float
    min_value: Optional[float]
    max_value: Optional[float]
    issue_type: str
    next_step: str


@dataclass
class CalcResult:
    problem_id: str
    formula_used: str
    formula_expression: str
    params: Dict[str, CalcParam]
    raw_result: float
    converted_result: float
    result_unit: str
    unit_issues: List[UnitIssue] = field(default_factory=list)
    boundary_issues: List[BoundaryIssue] = field(default_factory=list)
    material_check: Dict = field(default_factory=dict)
    next_steps: List[str] = field(default_factory=list)
    calculation_steps: List[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))


FORMULAS = {
    "mass_from_volume_density": Formula(
        name="质量计算",
        expression="m = ρ × V",
        description="根据体积和密度计算质量",
        params_needed=["density", "volume"],
        result_unit="kg"
    ),
    "volume_from_mass_density": Formula(
        name="体积计算",
        expression="V = m / ρ",
        description="根据质量和密度计算体积",
        params_needed=["mass", "density"],
        result_unit="m³"
    ),
    "count_from_unit_mass": Formula(
        name="构件数量计算",
        expression="n = m_total / m_unit",
        description="根据总质量和单件质量计算构件数量",
        params_needed=["total_mass", "unit_mass"],
        result_unit="件"
    ),
    "count_from_volume_unit": Formula(
        name="构件数量计算",
        expression="n = V_total / V_unit",
        description="根据总体积和单件体积计算构件数量",
        params_needed=["total_volume", "unit_volume"],
        result_unit="件"
    ),
}


def convert_unit(value: float, from_unit: str, to_unit: str) -> Tuple[float, bool]:
    if from_unit == to_unit:
        return value, True
    key = f"{from_unit}_to_{to_unit}"
    if key in UNIT_CONVERSIONS:
        return value * UNIT_CONVERSIONS[key], True
    reverse_key = f"{to_unit}_to_{from_unit}"
    if reverse_key in UNIT_CONVERSIONS:
        return value / UNIT_CONVERSIONS[reverse_key], True
    return value, False


def check_unit_compatibility(param: CalcParam, expected_unit: str) -> Optional[UnitIssue]:
    if not param.unit or param.unit.strip() == "":
        return UnitIssue(
            param_name=param.name,
            issue_type="missing",
            current_unit="（未填写）",
            expected_unit=expected_unit,
            next_step=f"请为参数「{param.name}」补充单位，建议使用 {expected_unit}。如不确定，可参考题目中同类物理量的单位。"
        )
    if param.unit != expected_unit:
        key = f"{param.unit}_to_{expected_unit}"
        reverse_key = f"{expected_unit}_to_{param.unit}"
        if key in UNIT_CONVERSIONS or reverse_key in UNIT_CONVERSIONS:
            return UnitIssue(
                param_name=param.name,
                issue_type="mismatch_convertible",
                current_unit=param.unit,
                expected_unit=expected_unit,
                next_step=f"参数「{param.name}」单位为 {param.unit}，公式期望 {expected_unit}，可自动换算。确认换算关系：{param.unit} → {expected_unit}。"
            )
        else:
            return UnitIssue(
                param_name=param.name,
                issue_type="mismatch_incompatible",
                current_unit=param.unit,
                expected_unit=expected_unit,
                next_step=f"参数「{param.name}」单位 {param.unit} 无法转换为 {expected_unit}，请检查单位是否填写错误，或确认物理量类型。"
            )
    return None


def check_boundary(param: CalcParam) -> Optional[BoundaryIssue]:
    if param.value is None:
        return None
    if param.min_value is not None and param.value < param.min_value:
        return BoundaryIssue(
            param_name=param.name,
            current_value=param.value,
            min_value=param.min_value,
            max_value=param.max_value,
            issue_type="below_min",
            next_step=f"参数「{param.name}」当前值 {param.value} {param.unit} 低于下限 {param.min_value} {param.unit}，请检查数值是否抄错或单位是否漏了数量级。"
        )
    if param.max_value is not None and param.value > param.max_value:
        return BoundaryIssue(
            param_name=param.name,
            current_value=param.value,
            min_value=param.min_value,
            max_value=param.max_value,
            issue_type="above_max",
            next_step=f"参数「{param.name}」当前值 {param.value} {param.unit} 高于上限 {param.max_value} {param.unit}，请检查小数点位置或单位换算。"
        )
    return None


def calculate_mass_from_volume_density(params: Dict[str, CalcParam]) -> Tuple[float, List[str], List[UnitIssue], List[BoundaryIssue]]:
    density = params["density"]
    volume = params["volume"]
    steps = []
    unit_issues = []
    boundary_issues = []

    steps.append(f"已知条件：密度 ρ = {density.value} {density.unit}，体积 V = {volume.value} {volume.unit}")

    density_issue = check_unit_compatibility(density, "kg/m³")
    if density_issue:
        unit_issues.append(density_issue)
    volume_issue = check_unit_compatibility(volume, "m³")
    if volume_issue:
        unit_issues.append(volume_issue)

    for p in params.values():
        boundary_issue = check_boundary(p)
        if boundary_issue:
            boundary_issues.append(boundary_issue)

    density_kgm3, ok_d = convert_unit(density.value, density.unit, "kg/m³")
    volume_m3, ok_v = convert_unit(volume.value, volume.unit, "m³")

    if not ok_d:
        steps.append(f"⚠️ 密度单位 {density.unit} 无法自动换算为 kg/m³，按原值参与计算")
    else:
        steps.append(f"密度换算：{density.value} {density.unit} = {density_kgm3} kg/m³")

    if not ok_v:
        steps.append(f"⚠️ 体积单位 {volume.unit} 无法自动换算为 m³，按原值参与计算")
    else:
        steps.append(f"体积换算：{volume.value} {volume.unit} = {volume_m3} m³")

    result = density_kgm3 * volume_m3
    steps.append(f"代入公式 m = ρ × V = {density_kgm3} kg/m³ × {volume_m3} m³ = {result} kg")

    return result, steps, unit_issues, boundary_issues


def calculate_volume_from_mass_density(params: Dict[str, CalcParam]) -> Tuple[float, List[str], List[UnitIssue], List[BoundaryIssue]]:
    mass = params["mass"]
    density = params["density"]
    steps = []
    unit_issues = []
    boundary_issues = []

    steps.append(f"已知条件：质量 m = {mass.value} {mass.unit}，密度 ρ = {density.value} {density.unit}")

    mass_issue = check_unit_compatibility(mass, "kg")
    if mass_issue:
        unit_issues.append(mass_issue)
    density_issue = check_unit_compatibility(density, "kg/m³")
    if density_issue:
        unit_issues.append(density_issue)

    for p in params.values():
        boundary_issue = check_boundary(p)
        if boundary_issue:
            boundary_issues.append(boundary_issue)

    mass_kg, ok_m = convert_unit(mass.value, mass.unit, "kg")
    density_kgm3, ok_d = convert_unit(density.value, density.unit, "kg/m³")

    if not ok_m:
        steps.append(f"⚠️ 质量单位 {mass.unit} 无法自动换算为 kg，按原值参与计算")
    else:
        steps.append(f"质量换算：{mass.value} {mass.unit} = {mass_kg} kg")

    if not ok_d:
        steps.append(f"⚠️ 密度单位 {density.unit} 无法自动换算为 kg/m³，按原值参与计算")
    else:
        steps.append(f"密度换算：{density.value} {density.unit} = {density_kgm3} kg/m³")

    result = mass_kg / density_kgm3 if density_kgm3 != 0 else 0
    steps.append(f"代入公式 V = m / ρ = {mass_kg} kg / {density_kgm3} kg/m³ = {result} m³")

    return result, steps, unit_issues, boundary_issues


def calculate_count_from_unit_mass(params: Dict[str, CalcParam]) -> Tuple[float, List[str], List[UnitIssue], List[BoundaryIssue]]:
    total_mass = params["total_mass"]
    unit_mass = params["unit_mass"]
    steps = []
    unit_issues = []
    boundary_issues = []

    steps.append(f"已知条件：总质量 m_total = {total_mass.value} {total_mass.unit}，单件质量 m_unit = {unit_mass.value} {unit_mass.unit}")

    for p in params.values():
        boundary_issue = check_boundary(p)
        if boundary_issue:
            boundary_issues.append(boundary_issue)

    total_kg, ok_t = convert_unit(total_mass.value, total_mass.unit, "kg")
    unit_kg, ok_u = convert_unit(unit_mass.value, unit_mass.unit, "kg")

    if total_mass.unit != unit_mass.unit:
        issue = UnitIssue(
            param_name="total_mass, unit_mass",
            issue_type="mismatch_convertible",
            current_unit=f"{total_mass.unit}, {unit_mass.unit}",
            expected_unit="统一单位（建议 kg）",
            next_step="总质量与单件质量单位不一致，已自动统一为 kg 后再计算。请确认换算方向正确。"
        )
        unit_issues.append(issue)
        steps.append(f"单位统一：总质量 {total_mass.value} {total_mass.unit} = {total_kg} kg，单件质量 {unit_mass.value} {unit_mass.unit} = {unit_kg} kg")

    result = total_kg / unit_kg if unit_kg != 0 else 0
    steps.append(f"代入公式 n = m_total / m_unit = {total_kg} kg / {unit_kg} kg = {result} 件")

    return result, steps, unit_issues, boundary_issues


def calculate_count_from_volume_unit(params: Dict[str, CalcParam]) -> Tuple[float, List[str], List[UnitIssue], List[BoundaryIssue]]:
    total_volume = params["total_volume"]
    unit_volume = params["unit_volume"]
    steps = []
    unit_issues = []
    boundary_issues = []

    steps.append(f"已知条件：总体积 V_total = {total_volume.value} {total_volume.unit}，单件体积 V_unit = {unit_volume.value} {unit_volume.unit}")

    for p in params.values():
        boundary_issue = check_boundary(p)
        if boundary_issue:
            boundary_issues.append(boundary_issue)

    total_m3, ok_t = convert_unit(total_volume.value, total_volume.unit, "m³")
    unit_m3, ok_u = convert_unit(unit_volume.value, unit_volume.unit, "m³")

    if total_volume.unit != unit_volume.unit:
        issue = UnitIssue(
            param_name="total_volume, unit_volume",
            issue_type="mismatch_convertible",
            current_unit=f"{total_volume.unit}, {unit_volume.unit}",
            expected_unit="统一单位（建议 m³）",
            next_step="总体积与单件体积单位不一致，已自动统一为 m³ 后再计算。请确认换算方向正确。"
        )
        unit_issues.append(issue)
        steps.append(f"单位统一：总体积 {total_volume.value} {total_volume.unit} = {total_m3} m³，单件体积 {unit_volume.value} {unit_volume.unit} = {unit_m3} m³")

    result = total_m3 / unit_m3 if unit_m3 != 0 else 0
    steps.append(f"代入公式 n = V_total / V_unit = {total_m3} m³ / {unit_m3} m³ = {result} 件")

    return result, steps, unit_issues, boundary_issues


CALC_FUNCS = {
    "mass_from_volume_density": calculate_mass_from_volume_density,
    "volume_from_mass_density": calculate_volume_from_mass_density,
    "count_from_unit_mass": calculate_count_from_unit_mass,
    "count_from_volume_unit": calculate_count_from_volume_unit,
}


def run_calculation(
    problem_id: str,
    formula_key: str,
    params: Dict[str, CalcParam],
    material_name: Optional[str] = None
) -> CalcResult:
    formula = FORMULAS[formula_key]
    calc_func = CALC_FUNCS[formula_key]

    material_check = {}
    if material_name:
        material_check = check_material_name_consistency(material_name)
        mat = find_material(material_name)
        if mat and "density" in params and params["density"].value is None:
            params["density"].value = mat.density
            params["density"].unit = mat.density_unit

    raw_result, steps, unit_issues, boundary_issues = calc_func(params)

    next_steps = []
    for issue in unit_issues:
        if issue.issue_type == "missing":
            next_steps.append(issue.next_step)
        elif issue.issue_type == "mismatch_incompatible":
            next_steps.append(issue.next_step)
    for issue in boundary_issues:
        next_steps.append(issue.next_step)
    if material_check.get("is_unknown"):
        next_steps.append(material_check["note"] + "。请补充材料标准名称或确认材料种类。")
    if material_check.get("is_alias"):
        next_steps.append(material_check["note"] + "。计算时已按标准名称对应密度取值，请注意核对。")

    result = CalcResult(
        problem_id=problem_id,
        formula_used=formula.name,
        formula_expression=formula.expression,
        params=params,
        raw_result=raw_result,
        converted_result=raw_result,
        result_unit=formula.result_unit,
        unit_issues=unit_issues,
        boundary_issues=boundary_issues,
        material_check=material_check,
        next_steps=next_steps,
        calculation_steps=steps,
    )
    return result
