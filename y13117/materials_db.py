from dataclasses import dataclass, field
from typing import Dict, Optional, List


@dataclass
class Material:
    name: str
    density: float
    density_unit: str
    aliases: List[str] = field(default_factory=list)


MATERIALS_DB: Dict[str, Material] = {
    "钢材": Material(
        name="钢材",
        density=7.85,
        density_unit="g/cm³",
        aliases=["钢", "钢板", "型钢", "Q235", "Q345"]
    ),
    "混凝土": Material(
        name="混凝土",
        density=2.4,
        density_unit="t/m³",
        aliases=["砼", "钢筋混凝土", "C30", "C40"]
    ),
    "木材": Material(
        name="木材",
        density=0.6,
        density_unit="g/cm³",
        aliases=["木", "方木", "木板"]
    ),
    "铝合金": Material(
        name="铝合金",
        density=2.7,
        density_unit="g/cm³",
        aliases=["铝", "铝型材", "6061"]
    ),
}

UNIT_CONVERSIONS = {
    "g/cm³_to_kg/m³": 1000,
    "kg/m³_to_g/cm³": 0.001,
    "t/m³_to_g/cm³": 1,
    "g/cm³_to_t/m³": 1,
    "t/m³_to_kg/m³": 1000,
    "kg/m³_to_t/m³": 0.001,
    "cm³_to_m³": 1e-6,
    "m³_to_cm³": 1e6,
    "mm³_to_cm³": 1e-3,
    "cm³_to_mm³": 1000,
    "m³_to_mm³": 1e9,
    "mm³_to_m³": 1e-9,
    "kg_to_t": 0.001,
    "t_to_kg": 1000,
    "g_to_kg": 0.001,
    "kg_to_g": 1000,
}


def find_material(name: str) -> Optional[Material]:
    if not name:
        return None
    if name in MATERIALS_DB:
        return MATERIALS_DB[name]
    for mat in MATERIALS_DB.values():
        if name in mat.aliases or name.lower() == mat.name.lower():
            return mat
        for alias in mat.aliases:
            if name.lower() == alias.lower():
                return mat
    return None


def get_standard_material_name(name: str) -> Optional[str]:
    mat = find_material(name)
    return mat.name if mat else None


def check_material_name_consistency(name: str) -> Dict:
    result = {
        "input_name": name,
        "is_standard": name in MATERIALS_DB,
        "standard_name": None,
        "is_alias": False,
        "is_unknown": False,
        "note": ""
    }
    mat = find_material(name)
    if mat:
        result["standard_name"] = mat.name
        if name != mat.name:
            result["is_alias"] = True
            result["note"] = f"输入名称「{name}」为标准名称「{mat.name}」的别名"
    else:
        result["is_unknown"] = True
        result["note"] = f"未找到材料「{name}」，请检查名称是否正确"
    return result
