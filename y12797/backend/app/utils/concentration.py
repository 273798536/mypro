"""浓度换算与称量精度分析工具。"""
from typing import Optional, Dict, Any


CONC_UNIT_FACTORS = {
    "mol/L": 1.0,
    "mmol/L": 1e-3,
    "μmol/L": 1e-6,
    "umol/L": 1e-6,
    "nmol/L": 1e-9,
    "g/L": None,  # 需要分子量
    "mg/L": None,
    "μg/mL": None,
    "mg/mL": None,
    "%(w/v)": None,
    "g/mL": None,
}

MASS_UNIT_FACTORS = {
    "g": 1.0,
    "mg": 1e-3,
    "μg": 1e-6,
    "ug": 1e-6,
    "ng": 1e-9,
    "kg": 1e3,
}

VOLUME_UNIT_FACTORS = {
    "L": 1.0,
    "mL": 1e-3,
    "μL": 1e-6,
    "uL": 1e-6,
    "nL": 1e-9,
}


def convert_mass_to_g(mass: float, unit: str) -> float:
    unit = unit.strip()
    if unit not in MASS_UNIT_FACTORS:
        raise ValueError(f"不支持的质量单位：{unit}")
    return mass * MASS_UNIT_FACTORS[unit]


def convert_volume_to_L(volume: float, unit: str) -> float:
    unit = unit.strip()
    if unit not in VOLUME_UNIT_FACTORS:
        raise ValueError(f"不支持的体积单位：{unit}")
    return volume * VOLUME_UNIT_FACTORS[unit]


def calculate_final_concentration(
    mass: float,
    mass_unit: str,
    volume: float,
    volume_unit: str,
    molecular_weight: float,
    purity_percent: Optional[float] = None,
    target_unit: str = "mmol/L",
) -> Dict[str, Any]:
    """
    根据称样量、体积、分子量、纯度计算终浓度。
    返回 {final_concentration, final_concentration_unit, formula, note, issue}
    """
    result = {
        "final_concentration": None,
        "final_concentration_unit": target_unit,
        "formula": "",
        "note": "",
        "error": None,
    }

    try:
        mass_g = convert_mass_to_g(mass, mass_unit)
        volume_L = convert_volume_to_L(volume, volume_unit)
    except ValueError as e:
        result["error"] = str(e)
        return result

    purity = (purity_percent or 100.0) / 100.0
    mass_g_effective = mass_g * purity

    if molecular_weight <= 0:
        result["error"] = "分子量必须为正数"
        return result

    moles = mass_g_effective / molecular_weight  # mol
    conc_mol_per_L = moles / volume_L if volume_L > 0 else 0  # mol/L

    factor = CONC_UNIT_FACTORS.get(target_unit)
    if factor is None or factor == 0:
        result["error"] = f"暂不支持的浓度目标单位：{target_unit}"
        return result

    final_conc = conc_mol_per_L / factor

    purity_text = f" × {purity_percent}%纯度" if (purity_percent and purity_percent != 100) else ""

    result["final_concentration"] = round(final_conc, 6)
    result["formula"] = (
        f"c(mol/L) = (称样量 × 纯度) / (分子量 × 体积)；"
        f"即 ({mass_g:.6f}g{purity_text}) / ({molecular_weight:.4f} g/mol × {volume_L:.6f} L)"
        f" = {conc_mol_per_L:.6e} mol/L = {final_conc:.4f} {target_unit}"
    )
    result["note"] = (
        f"已按{purity_percent if purity_percent else 100}%纯度校正；"
        f"浓度值按 {target_unit} 输出，保留 4 位小数。"
    )
    return result


def analyze_weighing_precision(
    mass: float,
    mass_unit: str,
    molecular_weight: Optional[float] = None,
) -> Dict[str, Any]:
    """
    分析称量精度是否满足实验要求。
    逻辑：
      - 常规分析天平：最低 1 mg，推荐 ≥10 mg
      - 微量天平：最低 0.1 mg
      - 当称样量 < 1 mg（常规）或 < 0.1 mg（微量）时，标注称量精度不足
    返回 {is_insufficient, precision_level, plain_explain, detail}
    """
    result = {
        "is_insufficient": False,
        "precision_level": "常规(1mg级)",
        "plain_explain": "",
        "detail": {},
    }

    try:
        mass_mg = convert_mass_to_g(mass, mass_unit) * 1000.0
    except Exception:
        result["is_insufficient"] = True
        result["plain_explain"] = "称样量单位异常，无法判断称量精度，请手工复核"
        return result

    result["detail"] = {"mass_mg": round(mass_mg, 6)}

    if mass_mg < 0.1:
        result["is_insufficient"] = True
        result["precision_level"] = "超微量(0.01mg以下)"
        mw_text = (
            f"（若分子量仅数百，则对应物质的量可能低于纳摩尔级别）"
            if molecular_weight and molecular_weight > 0 else ""
        )
        result["plain_explain"] = (
            f"本次称样量仅 {mass_mg:.4f} mg，低于常规分析天平的可靠称量下限(0.1 mg)。"
            f"建议使用百万分之一级微量天平，或增大称样量/减小体积以保证换算结果可靠。{mw_text}"
        )
    elif mass_mg < 1.0:
        result["is_insufficient"] = True
        result["precision_level"] = "微量(0.1~1mg级)"
        result["plain_explain"] = (
            f"本次称样量为 {mass_mg:.3f} mg，处于微量水平。"
            f"普通千分之一天平误差可能达到 ±0.1 mg，相对误差超过 10%；"
            f"请确认使用了十万分之一及以上精度的天平，并在复核栏中注明。"
        )
    elif mass_mg < 10.0:
        result["precision_level"] = "常规低限(1~10mg级)"
        result["plain_explain"] = (
            f"本次称样量为 {mass_mg:.2f} mg，处于常规天平的低限范围。"
            f"若实验对浓度准确性要求较高（如酶动力学），建议增大称样量以降低相对误差。"
        )
    else:
        result["precision_level"] = "常规充分(>10mg)"
        result["plain_explain"] = (
            f"本次称样量 {mass_mg:.1f} mg，常规分析天平即可保证足够精度。"
        )

    return result
