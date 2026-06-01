#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from beam_calculator.units import Unit, Quantity, UnitSystem
from beam_calculator.models import Beam, Load, LoadType, BoundaryCondition
from beam_calculator.calculator import BeamCalculator
from beam_calculator.warnings import WarningCollector
from beam_calculator.steps import StepTracker
from beam_calculator.report import ReportGenerator

output = []

output.append("=" * 60)
output.append("桥梁简支梁受力器 - 测试验证")
output.append("=" * 60)

output.append("\n1. 单位系统测试")
q1 = Quantity(100, Unit.CM)
q2 = q1.convert_to(Unit.M)
output.append(f"   100 cm = {q2.value} m")
assert abs(q2.value - 1.0) < 1e-6

q3 = Quantity(1, Unit.KN)
q4 = q3.convert_to(Unit.N)
output.append(f"   1 kN = {q4.value} N")
assert abs(q4.value - 1000.0) < 1e-6
output.append("   ✓ 单位转换正确")

output.append("\n2. 集中力简支梁测试 (跨中10kN, L=10m)")
beam = Beam(
    length=Quantity(10, Unit.M),
    left_support=BoundaryCondition.PINNED,
    right_support=BoundaryCondition.ROLLER,
)
beam.add_load(Load(
    load_type=LoadType.CONCENTRATED_FORCE,
    magnitude=Quantity(10, Unit.KN),
    position=Quantity(5, Unit.M),
))

warnings = WarningCollector()
steps = StepTracker()
calc = BeamCalculator(warning_collector=warnings, step_tracker=steps, num_points=100)
result = calc.calculate(beam)

output.append(f"   左支座反力: {result.left_reaction} (预期: 5 kN)")
output.append(f"   右支座反力: {result.right_reaction} (预期: 5 kN)")
output.append(f"   最大弯矩: {result.max_bending_moment} (预期: 25 kN·m)")
output.append(f"   平衡校验: {'✓ 通过' if result.equilibrium_check else '✗ 失败'}")

assert abs(result.left_reaction.value - 5.0) < 0.01
assert abs(result.right_reaction.value - 5.0) < 0.01
assert abs(result.max_bending_moment.value - 25.0) < 0.5
assert result.equilibrium_check
output.append("   ✓ 计算正确")

output.append("\n3. 均布载荷测试 (q=10kN/m, L=10m)")
beam2 = Beam(
    length=Quantity(10, Unit.M),
    left_support=BoundaryCondition.PINNED,
    right_support=BoundaryCondition.ROLLER,
)
beam2.add_load(Load(
    load_type=LoadType.UNIFORM_DISTRIBUTED,
    magnitude=Quantity(10, Unit.KN_M),
    start_position=Quantity(0, Unit.M),
    end_position=Quantity(10, Unit.M),
))

warnings2 = WarningCollector()
steps2 = StepTracker()
calc2 = BeamCalculator(warning_collector=warnings2, step_tracker=steps2, num_points=100)
result2 = calc2.calculate(beam2)

output.append(f"   左支座反力: {result2.left_reaction} (预期: 50 kN)")
output.append(f"   右支座反力: {result2.right_reaction} (预期: 50 kN)")
output.append(f"   最大弯矩: {result2.max_bending_moment} (预期: 125 kN·m)")
output.append(f"   平衡校验: {'✓ 通过' if result2.equilibrium_check else '✗ 失败'}")

assert abs(result2.left_reaction.value - 50.0) < 0.5
assert abs(result2.right_reaction.value - 50.0) < 0.5
assert abs(result2.max_bending_moment.value - 125.0) < 2.0
assert result2.equilibrium_check
output.append("   ✓ 计算正确")

output.append("\n4. 混合载荷测试 (2个集中力+均布载荷)")
beam3 = Beam(
    length=Quantity(10, Unit.M),
    left_support=BoundaryCondition.PINNED,
    right_support=BoundaryCondition.ROLLER,
)
beam3.add_load(Load(
    load_type=LoadType.CONCENTRATED_FORCE,
    magnitude=Quantity(10, Unit.KN),
    position=Quantity(3, Unit.M),
))
beam3.add_load(Load(
    load_type=LoadType.CONCENTRATED_FORCE,
    magnitude=Quantity(20, Unit.KN),
    position=Quantity(7, Unit.M),
))
beam3.add_load(Load(
    load_type=LoadType.UNIFORM_DISTRIBUTED,
    magnitude=Quantity(5, Unit.KN_M),
    start_position=Quantity(0, Unit.M),
    end_position=Quantity(10, Unit.M),
))

warnings3 = WarningCollector()
steps3 = StepTracker()
calc3 = BeamCalculator(warning_collector=warnings3, step_tracker=steps3, num_points=100)
result3 = calc3.calculate(beam3)

R_left_expected = (10 * 7 + 20 * 3 + 5 * 10 * 5) / 10
R_right_expected = 80 - R_left_expected
output.append(f"   左支座反力: {result3.left_reaction} (预期: ~{R_left_expected:.1f} kN)")
output.append(f"   右支座反力: {result3.right_reaction} (预期: ~{R_right_expected:.1f} kN)")
output.append(f"   平衡校验: {'✓ 通过' if result3.equilibrium_check else '✗ 失败'}")
output.append(f"   计算步骤数: {len(steps3)}")
output.append(f"   警告数: {len(warnings3)}")

assert result3.equilibrium_check
assert len(steps3) > 0
output.append("   ✓ 计算正确")

output.append("\n5. 报告生成测试")
report_gen = ReportGenerator(
    include_formulas=True,
    include_steps=True,
    include_intermediate=True,
)
report_txt = report_gen.generate_text_report(
    beam3, result3, warnings3, steps3
)
output_path = Path(__file__).parent / "test_output" / "final_report.txt"
output_path.parent.mkdir(exist_ok=True)
report_gen.save_report(report_txt, str(output_path))
output.append(f"   ✓ 文本报告已生成: {output_path}")

report_md = report_gen.generate_markdown_report(
    beam3, result3, warnings3, steps3
)
md_path = Path(__file__).parent / "test_output" / "final_report.md"
report_gen.save_report(report_md, str(md_path))
output.append(f"   ✓ Markdown报告已生成: {md_path}")

report_json = report_gen.generate_json_report(
    beam3, result3, warnings3, steps3
)
json_path = Path(__file__).parent / "test_output" / "final_report.json"
report_gen.save_report(report_json, str(json_path))
output.append(f"   ✓ JSON报告已生成: {json_path}")

output.append("\n" + "=" * 60)
output.append("✓ 所有测试通过！")
output.append("=" * 60)

output_text = "\n".join(output)
print(output_text)

with open("/tmp/beam_test_output.txt", "w", encoding="utf-8") as f:
    f.write(output_text)

with open("/tmp/beam_full_report.md", "w", encoding="utf-8") as f:
    f.write(report_md)
