from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .models import (
    AttributedError,
    FormulaStep,
    RoomData,
    SurfaceContribution,
)

SABINE_CONSTANT = 0.161

BOUNDARIES: dict[str, dict[str, Any]] = {
    "volume_m3": {"min": 1.0, "max": 100000.0, "unit": "m³", "desc": "房间容积"},
    "area_m2": {"min": 0.01, "max": 100000.0, "unit": "m²", "desc": "表面面积"},
    "absorption_coeff": {"min": 0.0, "max": 1.0, "unit": "无量纲", "desc": "吸声系数"},
    "measured_t60_s": {"min": 0.05, "max": 15.0, "unit": "s", "desc": "实测混响时间 T60"},
    "calculated_t60_s": {"min": 0.05, "max": 15.0, "unit": "s", "desc": "计算混响时间 T60"},
    "total_absorption_m2": {"min": 0.01, "max": 100000.0, "unit": "m²", "desc": "总吸声量 A"},
    "relative_error_pct": {"min": -100.0, "max": 200.0, "unit": "%", "desc": "相对误差"},
}


def sabine_t60(volume_m3: float, total_absorption_m2: float) -> tuple[float, list[FormulaStep]]:
    steps: list[FormulaStep] = []

    steps.append(FormulaStep(
        name="Sabine 公式",
        expression="T60 = k × V / A",
        values={"k": SABINE_CONSTANT, "V": volume_m3, "A": total_absorption_m2},
        result=0.0,
        unit="s",
        note="k=0.161 s/m (常数), V=容积(m³), A=总吸声量(m²)",
    ))

    t60 = SABINE_CONSTANT * volume_m3 / total_absorption_m2

    steps.append(FormulaStep(
        name="代入计算",
        expression=f"T60 = {SABINE_CONSTANT} × {volume_m3} / {total_absorption_m2}",
        values={"k": SABINE_CONSTANT, "V": volume_m3, "A": total_absorption_m2},
        result=t60,
        unit="s",
        note=f"计算结果 T60 = {t60:.4f} s",
    ))

    return t60, steps


def compute_total_absorption(room: RoomData) -> tuple[float, list[FormulaStep]]:
    steps: list[FormulaStep] = []
    effective_surfaces = [s for s in room.surfaces if s.quality.value != "bad"]

    steps.append(FormulaStep(
        name="总吸声量公式",
        expression="A = Σ(αi × Si)",
        values={"surface_count": len(effective_surfaces)},
        result=0.0,
        unit="m²",
        note="αi=第i面吸声系数(无量纲), Si=第i面面积(m²)",
    ))

    partial_results = []
    for s in effective_surfaces:
        partial = s.absorption_area
        partial_results.append({
            "material": s.material_name,
            "alpha": s.absorption_coeff,
            "S": s.area_m2,
            "alpha_S": round(partial, 4),
        })

    total_a = sum(s.absorption_area for s in effective_surfaces)

    steps.append(FormulaStep(
        name="逐面计算",
        expression=" + ".join(f"({s.absorption_coeff}×{s.area_m2})" for s in effective_surfaces),
        values={"partials": partial_results},
        result=total_a,
        unit="m²",
        note=f"总吸声量 A = {total_a:.4f} m²",
    ))

    return total_a, steps


def attribute_error(room: RoomData) -> AttributedError:
    all_steps: list[FormulaStep] = []

    total_a, abs_steps = compute_total_absorption(room)
    all_steps.extend(abs_steps)

    calc_t60, t60_steps = sabine_t60(room.volume_m3, total_a)
    all_steps.extend(t60_steps)

    abs_error = room.measured_t60_s - calc_t60
    rel_error = (abs_error / calc_t60) * 100.0 if calc_t60 != 0 else 0.0

    all_steps.append(FormulaStep(
        name="绝对误差",
        expression="ΔT60 = T60_measured - T60_calculated",
        values={"T60_measured": room.measured_t60_s, "T60_calculated": round(calc_t60, 4)},
        result=abs_error,
        unit="s",
    ))
    all_steps.append(FormulaStep(
        name="相对误差",
        expression="δT60 = ΔT60 / T60_calculated × 100%",
        values={"ΔT60": round(abs_error, 4), "T60_calculated": round(calc_t60, 4)},
        result=rel_error,
        unit="%",
    ))

    effective_surfaces = [s for s in room.surfaces if s.quality.value != "bad"]

    volume_contrib = SABINE_CONSTANT / total_a * (abs_error * 0.3) if total_a != 0 else 0.0
    volume_contrib_pct = (volume_contrib / abs(abs_error)) * 100.0 if abs_error != 0 else 0.0

    all_steps.append(FormulaStep(
        name="容积误差贡献",
        expression="∂T60/∂V × ΔV ≈ (k/A) × ΔV",
        values={"k": SABINE_CONSTANT, "A": round(total_a, 4), "estimated_delta_V": "按误差30%估算"},
        result=volume_contrib,
        unit="s",
        note="容积误差贡献为近似估计，假设容积偏差占总误差30%",
    ))

    surface_contributions: list[SurfaceContribution] = []
    for s in effective_surfaces:
        a_i = s.absorption_area
        partial_t60 = 0.0
        if total_a == 0 or a_i == 0:
            contrib_s = 0.0
            contrib_pct = 0.0
        else:
            partial_t60 = SABINE_CONSTANT * room.volume_m3 / a_i
            contrib_s = -(SABINE_CONSTANT * room.volume_m3 * a_i) / (total_a ** 2)
            contrib_pct = (abs(contrib_s) / abs(abs_error)) * 100.0 if abs_error != 0 else 0.0

        surface_contributions.append(SurfaceContribution(
            material_name=s.material_name,
            area_m2=s.area_m2,
            absorption_coeff=s.absorption_coeff,
            absorption_area_m2=a_i,
            partial_t60_s=partial_t60,
            contribution_s=contrib_s,
            contribution_pct=contrib_pct,
            original_row=s.original_row,
        ))

    all_steps.append(FormulaStep(
        name="各面吸声误差贡献",
        expression="∂T60/∂αi = -k×V×Si / A²",
        values={
            "k": SABINE_CONSTANT,
            "V": room.volume_m3,
            "A": round(total_a, 4),
        },
        result=sum(sc.contribution_s for sc in surface_contributions),
        unit="s",
        note="各面吸声系数偏差对混响时间误差的贡献",
    ))

    if surface_contributions:
        dominant_surface = max(surface_contributions, key=lambda sc: abs(sc.contribution_pct))
        dominant_source = f"表面 {dominant_surface.material_name} ({dominant_surface.contribution_pct:.1f}%)"
    else:
        dominant_source = "无法判定"

    return AttributedError(
        room_id=room.room_id,
        calculated_t60_s=calc_t60,
        measured_t60_s=room.measured_t60_s,
        absolute_error_s=abs_error,
        relative_error_pct=rel_error,
        volume_contribution_s=volume_contrib,
        volume_contribution_pct=volume_contrib_pct,
        surface_contributions=surface_contributions,
        dominant_source=dominant_source,
        formula_chain=all_steps,
    )
