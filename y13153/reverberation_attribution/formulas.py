from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .models import (
    AttributedError,
    DataQuality,
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
    effective_surfaces = [s for s in room.surfaces if s.quality != DataQuality.BAD]

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

    effective_surfaces = [s for s in room.surfaces if s.quality != DataQuality.BAD]

    total_a, abs_steps = compute_total_absorption(room)
    all_steps.extend(abs_steps)

    calc_t60, t60_steps = sabine_t60(room.volume_m3, total_a)
    all_steps.extend(t60_steps)

    abs_error = room.measured_t60_s - calc_t60
    rel_error = (abs_error / calc_t60) * 100.0 if calc_t60 != 0 else 0.0

    all_steps.append(FormulaStep(
        name="绝对误差",
        expression="ΔT60_total = T60_measured - T60_calculated",
        values={"T60_measured": room.measured_t60_s, "T60_calculated": round(calc_t60, 4)},
        result=abs_error,
        unit="s",
        note="实测值与当前参数计算值的总偏差",
    ))
    all_steps.append(FormulaStep(
        name="相对误差",
        expression="δT60 = ΔT60_total / T60_calculated × 100%",
        values={"ΔT60_total": round(abs_error, 4), "T60_calculated": round(calc_t60, 4)},
        result=rel_error,
        unit="%",
        note="相对总误差",
    ))

    sens_volume = SABINE_CONSTANT / total_a if total_a != 0 else 0.0

    all_steps.append(FormulaStep(
        name="容积灵敏度",
        expression="∂T60/∂V = k / A",
        values={"k": SABINE_CONSTANT, "A": round(total_a, 4)},
        result=sens_volume,
        unit="s/m³",
        note="容积每增加 1 m³，T60 增加多少秒",
    ))

    surface_contributions: list[SurfaceContribution] = []
    explained_by_surfaces_s = 0.0

    for s in effective_surfaces:
        a_i = s.absorption_area
        if total_a == 0:
            sens_alpha = 0.0
            partial_t60 = 0.0
        else:
            sens_alpha = -(SABINE_CONSTANT * room.volume_m3 * s.area_m2) / (total_a ** 2)
            partial_t60 = SABINE_CONSTANT * room.volume_m3 / a_i if a_i != 0 else 0.0

        delta_alpha = s.delta_coeff if s.has_coeff_deviation else 0.0
        contrib_s = sens_alpha * delta_alpha
        is_sens_only = not s.has_coeff_deviation

        surface_contributions.append(SurfaceContribution(
            material_name=s.material_name,
            area_m2=s.area_m2,
            absorption_coeff=s.absorption_coeff,
            absorption_area_m2=a_i,
            partial_t60_s=partial_t60,
            contribution_s=contrib_s,
            contribution_pct=0.0,
            sensitivity_s_per_alpha=sens_alpha,
            delta_alpha=delta_alpha,
            delta_source=s.provenance.source.value if s.has_coeff_deviation else "",
            is_sensitivity_only=is_sens_only,
            original_row=s.original_row,
        ))
        if not is_sens_only:
            explained_by_surfaces_s += contrib_s

    volume_contrib_s = 0.0
    if room.has_volume_deviation:
        volume_contrib_s = sens_volume * room.delta_volume

    all_steps.append(FormulaStep(
        name="容积偏差贡献",
        expression="ΔT60_V = ∂T60/∂V × ΔV",
        values={
            "∂T60/∂V": round(sens_volume, 6),
            "ΔV": round(room.delta_volume, 4),
            "has_deviation": room.has_volume_deviation,
        },
        result=volume_contrib_s,
        unit="s",
        note="容积偏差对 T60 计算值变化的贡献（一阶近似）",
    ))
    all_steps.append(FormulaStep(
        name="表面吸声偏差贡献合计",
        expression="ΔT60_α = Σ(∂T60/∂αi × Δαi)",
        values={
            "surface_count_with_deviation": sum(1 for sc in surface_contributions if not sc.is_sensitivity_only),
            "total_surfaces": len(surface_contributions),
        },
        result=explained_by_surfaces_s,
        unit="s",
        note="有偏差的表面吸声系数对 T60 计算值变化的贡献合计（一阶近似）",
    ))

    explained_error_s = volume_contrib_s + explained_by_surfaces_s
    unexplained_error_s = abs_error - explained_error_s

    all_steps.append(FormulaStep(
        name="已解释误差",
        expression="ΔT60_explained = ΔT60_V + ΔT60_α",
        values={
            "ΔT60_V": round(volume_contrib_s, 6),
            "ΔT60_α": round(explained_by_surfaces_s, 6),
        },
        result=explained_error_s,
        unit="s",
        note="已知参数偏差可解释的误差量（一阶近似）",
    ))
    all_steps.append(FormulaStep(
        name="未解释残差",
        expression="ΔT60_unexplained = ΔT60_total - ΔT60_explained",
        values={
            "ΔT60_total": round(abs_error, 6),
            "ΔT60_explained": round(explained_error_s, 6),
        },
        result=unexplained_error_s,
        unit="s",
        note="来源包括：测量误差、模型假设偏差、未考虑因素、非线性交互效应",
    ))

    abs_explained_total = abs(volume_contrib_s) + sum(
        abs(sc.contribution_s) for sc in surface_contributions if not sc.is_sensitivity_only
    )

    if abs_explained_total > 1e-9:
        volume_contrib_pct = (abs(volume_contrib_s) / abs_explained_total) * 100.0
        for sc in surface_contributions:
            if not sc.is_sensitivity_only:
                sc.contribution_pct = (abs(sc.contribution_s) / abs_explained_total) * 100.0
    else:
        volume_contrib_pct = 0.0

    has_any_deviation = room.has_volume_deviation or any(
        not sc.is_sensitivity_only for sc in surface_contributions
    )
    attribution_mode = "full" if has_any_deviation else "sensitivity_only"

    if has_any_deviation:
        dominant_candidates = []
        if room.has_volume_deviation:
            dominant_candidates.append(("容积", abs(volume_contrib_s), volume_contrib_pct))
        for sc in surface_contributions:
            if not sc.is_sensitivity_only:
                dominant_candidates.append((f"表面 {sc.material_name}", abs(sc.contribution_s), sc.contribution_pct))
        if dominant_candidates:
            dominant = max(dominant_candidates, key=lambda x: x[1])
            dominant_source = f"{dominant[0]} ({dominant[2]:.1f}%)"
        else:
            dominant_source = "无已解释贡献"
    else:
        if surface_contributions:
            most_sensitive = max(surface_contributions, key=lambda sc: abs(sc.sensitivity_s_per_alpha))
            dominant_source = f"灵敏度最高: 表面 {most_sensitive.material_name} ({abs(most_sensitive.sensitivity_s_per_alpha):.4f} s/单位α)"
        else:
            dominant_source = "无法判定"

    return AttributedError(
        room_id=room.room_id,
        calculated_t60_s=calc_t60,
        measured_t60_s=room.measured_t60_s,
        absolute_error_s=abs_error,
        relative_error_pct=rel_error,
        volume_contribution_s=volume_contrib_s,
        volume_contribution_pct=volume_contrib_pct,
        surface_contributions=surface_contributions,
        dominant_source=dominant_source,
        formula_chain=all_steps,
        explained_error_s=explained_error_s,
        unexplained_error_s=unexplained_error_s,
        attribution_mode=attribution_mode,
    )
