from calculator import CalcParam
from dataclasses import dataclass, field
from typing import Dict, Optional, List


@dataclass
class StudentProblem:
    problem_id: str
    title: str
    description: str
    formula_key: str
    params: Dict[str, CalcParam]
    material_name: Optional[str] = None
    student_answer: Optional[float] = None
    student_answer_unit: str = ""
    error_type: List[str] = field(default_factory=list)


def get_student_problems() -> List[StudentProblem]:
    problems = []

    problems.append(StudentProblem(
        problem_id="STU-001",
        title="钢板质量计算",
        description="一块长方体钢板，体积为 0.5 m³，已知钢材密度为 7.85 g/cm³，求钢板质量。",
        formula_key="mass_from_volume_density",
        params={
            "density": CalcParam(
                name="密度",
                value=7.85,
                unit="g/cm³",
                min_value=0.1,
                max_value=50,
                description="材料密度"
            ),
            "volume": CalcParam(
                name="体积",
                value=0.5,
                unit="m³",
                min_value=1e-6,
                max_value=100,
                description="物体体积"
            ),
        },
        material_name="钢材",
        student_answer=3.925,
        student_answer_unit="t",
        error_type=["单位换算易错", "密度单位与体积单位不统一"],
    ))

    problems.append(StudentProblem(
        problem_id="STU-002",
        title="混凝土构件数量估算",
        description="一批混凝土预制构件总质量为 12 t，单件质量约 2400 kg，问这批构件大约有多少件？",
        formula_key="count_from_unit_mass",
        params={
            "total_mass": CalcParam(
                name="总质量",
                value=12,
                unit="t",
                min_value=0.1,
                max_value=10000,
                description="构件总质量"
            ),
            "unit_mass": CalcParam(
                name="单件质量",
                value=2400,
                unit="kg",
                min_value=0.1,
                max_value=10000,
                description="单件构件质量"
            ),
        },
        material_name="混凝土",
        student_answer=0.005,
        student_answer_unit="件",
        error_type=["单位不统一", "数量级错误"],
    ))

    problems.append(StudentProblem(
        problem_id="STU-003",
        title="Q235型钢质量计算（材料名称不一致）",
        description="一根 Q235 型钢材，体积为 1200 cm³，求其质量。",
        formula_key="mass_from_volume_density",
        params={
            "density": CalcParam(
                name="密度",
                value=None,
                unit="",
                min_value=0.1,
                max_value=50,
                description="材料密度（学生未填单位）"
            ),
            "volume": CalcParam(
                name="体积",
                value=1200,
                unit="cm³",
                min_value=1e-6,
                max_value=100,
                description="物体体积"
            ),
        },
        material_name="Q235",
        student_answer=9420,
        student_answer_unit="g",
        error_type=["材料名称为别名", "单位缺失", "边界值敏感"],
    ))

    problems.append(StudentProblem(
        problem_id="STU-004",
        title="木材体积计算（单位缺失）",
        description="一根方木质量为 30 kg，木材密度取 0.6 g/cm³，求其体积。",
        formula_key="volume_from_mass_density",
        params={
            "mass": CalcParam(
                name="质量",
                value=30,
                unit="kg",
                min_value=0.001,
                max_value=10000,
                description="物体质量"
            ),
            "density": CalcParam(
                name="密度",
                value=0.6,
                unit="",
                min_value=0.1,
                max_value=10,
                description="木材密度（单位缺失）"
            ),
        },
        material_name="木材",
        student_answer=50,
        student_answer_unit="m³",
        error_type=["单位缺失", "数量级偏差"],
    ))

    problems.append(StudentProblem(
        problem_id="STU-005",
        title="铝合金构件数量计算",
        description="一堆铝合金零件总体积 0.08 m³，单件体积 400 cm³，求零件个数。",
        formula_key="count_from_volume_unit",
        params={
            "total_volume": CalcParam(
                name="总体积",
                value=0.08,
                unit="m³",
                min_value=1e-6,
                max_value=100,
                description="零件总体积"
            ),
            "unit_volume": CalcParam(
                name="单件体积",
                value=400,
                unit="cm³",
                min_value=1e-6,
                max_value=100,
                description="单个零件体积"
            ),
        },
        material_name="铝合金",
        student_answer=5,
        student_answer_unit="件",
        error_type=["单位换算错误", "数量级差三个零"],
    ))

    return problems
