#!/usr/bin/env python3
import sys
import subprocess
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from beam_calculator.units import Unit, Quantity, UnitSystem, UnitCategory
from beam_calculator.models import Beam, Load, LoadType, BoundaryCondition
from beam_calculator.io import DataImporter
from beam_calculator.calculator import BeamCalculator
from beam_calculator.warnings import WarningCollector
from beam_calculator.steps import StepTracker
from beam_calculator.validator import InputValidator

print("=" * 70)
print("命令行载荷输入链路修复验证")
print("=" * 70)

all_passed = True

# ========== 测试 1: io.py 默认单位解析 ==========
print("\n" + "=" * 70)
print("测试 1: io.py 按载荷类型选择正确默认单位")
print("=" * 70)

importer_eng = DataImporter(unit_system=UnitSystem.metric_engineering())
importer_metric = DataImporter(unit_system=UnitSystem.metric())

test_cases = [
    {
        "name": "均布载荷 (engineering系统)",
        "load_raw": {"type": "uniform_distributed", "magnitude": 5, "start_position": 0, "end_position": 10},
        "importer": importer_eng,
        "expected_unit": Unit.KN_M,
        "expected_category": UnitCategory.DISTRIBUTED_LOAD,
    },
    {
        "name": "均布载荷 (metric系统)",
        "load_raw": {"type": "uniform_distributed", "magnitude": 5000, "start_position": 0, "end_position": 10},
        "importer": importer_metric,
        "expected_unit": Unit.N_M,
        "expected_category": UnitCategory.DISTRIBUTED_LOAD,
    },
    {
        "name": "集中力 (engineering系统)",
        "load_raw": {"type": "concentrated_force", "magnitude": 10, "position": 3},
        "importer": importer_eng,
        "expected_unit": Unit.KN,
        "expected_category": UnitCategory.FORCE,
    },
    {
        "name": "集中力 (metric系统)",
        "load_raw": {"type": "concentrated_force", "magnitude": 10000, "position": 3},
        "importer": importer_metric,
        "expected_unit": Unit.N,
        "expected_category": UnitCategory.FORCE,
    },
    {
        "name": "三角分布载荷",
        "load_raw": {"type": "triangular_distributed", "magnitude": 10, "start_position": 0, "end_position": 5},
        "importer": importer_eng,
        "expected_unit": Unit.KN_M,
        "expected_category": UnitCategory.DISTRIBUTED_LOAD,
    },
]

for tc in test_cases:
    print(f"\n  测试: {tc['name']}")
    try:
        load = tc["importer"]._parse_load(tc["load_raw"])
        actual_unit = load.magnitude.unit
        actual_category = load.magnitude.unit.category
        
        print(f"    输入: {tc['load_raw']}")
        print(f"    解析后单位: {actual_unit} (预期: {tc['expected_unit']})")
        print(f"    单位类别: {actual_category.value} (预期: {tc['expected_category'].value})")
        
        if actual_unit == tc['expected_unit'] and actual_category == tc['expected_category']:
            print(f"    ✓ 通过")
        else:
            print(f"    ✗ 失败")
            all_passed = False
            
        # 验证计算等效力不会出错
        eff_force = load.get_effective_force()
        print(f"    等效力计算: {eff_force} (无类别错误)")
        
    except Exception as e:
        print(f"    ✗ 异常: {e}")
        all_passed = False

# ========== 测试 2: validator.py 严格单位类别校验 ==========
print("\n" + "=" * 70)
print("测试 2: validator.py 按载荷类型严格校验单位类别")
print("=" * 70)

validation_tests = [
    {
        "name": "分布载荷误用 N (力单位) - 应报错",
        "load": Load(
            load_type=LoadType.UNIFORM_DISTRIBUTED,
            magnitude=Quantity(5000, Unit.N),  # 错误: 力单位
            start_position=Quantity(0, Unit.M),
            end_position=Quantity(10, Unit.M),
        ),
        "expect_error": True,
        "error_contains": "分布载荷",
    },
    {
        "name": "分布载荷正确使用 kN/m - 应通过",
        "load": Load(
            load_type=LoadType.UNIFORM_DISTRIBUTED,
            magnitude=Quantity(5, Unit.KN_M),  # 正确: 分布载荷单位
            start_position=Quantity(0, Unit.M),
            end_position=Quantity(10, Unit.M),
        ),
        "expect_error": False,
    },
    {
        "name": "集中力误用 N/m (分布载荷单位) - 应报错",
        "load": Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(5000, Unit.N_M),  # 错误: 分布载荷单位
            position=Quantity(5, Unit.M),
        ),
        "expect_error": True,
        "error_contains": "力单位",
    },
    {
        "name": "集中力正确使用 kN - 应通过",
        "load": Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10, Unit.KN),  # 正确: 力单位
            position=Quantity(5, Unit.M),
        ),
        "expect_error": False,
    },
]

for vt in validation_tests:
    print(f"\n  测试: {vt['name']}")
    
    beam = Beam(
        length=Quantity(10, Unit.M),
        left_support=BoundaryCondition.PINNED,
        right_support=BoundaryCondition.ROLLER,
    )
    beam.add_load(vt["load"])
    
    warnings = WarningCollector()
    steps = StepTracker()
    validator = InputValidator(warning_collector=warnings, step_tracker=steps)
    validation = validator._validate_load(vt["load"], 0, beam.length)
    
    has_error = len(validation.errors) > 0
    error_msg = validation.errors[0] if validation.errors else ""
    
    print(f"    载荷大小单位: {vt['load'].magnitude.unit} ({vt['load'].magnitude.unit.category.value})")
    print(f"    预期错误: {vt['expect_error']}")
    print(f"    实际错误: {has_error}")
    if has_error:
        print(f"    错误信息: {error_msg}")
    
    if vt["expect_error"]:
        if has_error and vt["error_contains"] in error_msg:
            print(f"    ✓ 通过 - 正确拦截错误")
        else:
            print(f"    ✗ 失败 - 未正确拦截")
            all_passed = False
    else:
        if not has_error:
            print(f"    ✓ 通过 - 正确允许")
        else:
            print(f"    ✗ 失败 - 误报错误")
            all_passed = False

# ========== 测试 3: 端到端 CLI 模拟 ==========
print("\n" + "=" * 70)
print("测试 3: 端到端 CLI 简化格式载荷解析 + 计算")
print("=" * 70)

e2e_tests = [
    {
        "name": "CLI格式: uniform,5,0,10 (engineering, 5kN/m)",
        "cli_parts": ["uniform", "5", "0", "10"],
        "unit_system": UnitSystem.metric_engineering(),
        "expected_R_left": 25.0,  # 5kN/m * 10m / 2
        "expected_R_right": 25.0,
        "expected_max_moment": 62.5,  # qL²/8 = 5*100/8
    },
    {
        "name": "CLI格式: concentrated,10,5 (engineering, 10kN @ 5m)",
        "cli_parts": ["concentrated", "10", "5"],
        "unit_system": UnitSystem.metric_engineering(),
        "expected_R_left": 5.0,
        "expected_R_right": 5.0,
        "expected_max_moment": 25.0,
    },
    {
        "name": "混合载荷: 集中力+均布载荷",
        "cli_loads": [
            ["concentrated", "10", "3"],
            ["uniform", "5", "0", "10"],
        ],
        "unit_system": UnitSystem.metric_engineering(),
        "expected_R_left": (10 * 7 + 5 * 10 * 5) / 10,
        "expected_R_right": 60 - ((10 * 7 + 5 * 10 * 5) / 10),
    },
]

for e2e in e2e_tests:
    print(f"\n  测试: {e2e['name']}")
    
    from beam_calculator.cli import parse_load_string
    
    beam = Beam(
        length=Quantity(10, Unit.M),
        left_support=BoundaryCondition.PINNED,
        right_support=BoundaryCondition.ROLLER,
    )
    
    importer = DataImporter(unit_system=e2e["unit_system"])
    
    cli_loads = e2e.get("cli_loads", [e2e["cli_parts"]])
    for parts in cli_loads:
        load_data = parse_load_string(",".join(parts))
        print(f"    CLI解析: {load_data}")
        load = importer._parse_load(load_data)
        print(f"    载荷单位: {load.magnitude.unit}")
        beam.add_load(load)
    
    # 验证
    warnings = WarningCollector()
    steps = StepTracker()
    validator = InputValidator(e2e["unit_system"], warnings, steps)
    validation = validator.validate_beam(beam)
    print(f"    验证: {'通过' if validation else '失败'}")
    if validation.errors:
        print(f"    错误: {validation.errors}")
        all_passed = False
        continue
    
    # 计算
    calc = BeamCalculator(e2e["unit_system"], warnings, steps, num_points=100)
    result = calc.calculate(beam, validate=False)
    
    print(f"    左反力: {result.left_reaction.value:.2f} (预期: {e2e['expected_R_left']:.2f})")
    print(f"    右反力: {result.right_reaction.value:.2f} (预期: {e2e['expected_R_right']:.2f})")
    if "expected_max_moment" in e2e:
        print(f"    最大弯矩: {result.max_bending_moment.value:.2f} (预期: {e2e['expected_max_moment']:.2f})")
    
    # 检查平衡
    print(f"    平衡校验: {'✓ 通过' if result.equilibrium_check else '✗ 失败'}")
    
    if abs(result.left_reaction.value - e2e["expected_R_left"]) < 0.1 and \
       abs(result.right_reaction.value - e2e["expected_R_right"]) < 0.1 and \
       result.equilibrium_check:
        print(f"    ✓ 通过")
    else:
        print(f"    ✗ 失败")
        all_passed = False

# ========== 测试 4: 真实 CLI 调用 ==========
print("\n" + "=" * 70)
print("测试 4: 真实 CLI 命令调用")
print("=" * 70)

cli_tests = [
    {
        "name": "均布载荷简化格式",
        "cmd": ["./beam-calc", "--length", "10", "--unit", "m", 
                "--load", "uniform,5,0,10",
                "--output", "/tmp/test_cli_uniform", "-f", "txt",
                "--no-charts"],
    },
    {
        "name": "集中力简化格式",
        "cmd": ["./beam-calc", "--length", "10", "--unit", "m",
                "--load", "concentrated,10,5",
                "--output", "/tmp/test_cli_concentrated", "-f", "txt",
                "--no-charts"],
    },
    {
        "name": "混合载荷",
        "cmd": ["./beam-calc", "--length", "10", "--unit", "m",
                "--load", "concentrated,10,3",
                "--load", "uniform,5,0,10",
                "--output", "/tmp/test_cli_mixed", "-f", "md",
                "--no-charts"],
    },
    {
        "name": "带显式单位的均布载荷",
        "cmd": ["./beam-calc", "--length", "10", "--unit", "m",
                "--load", "uniform,5000,N/m,0,m,10,m",
                "--unit-system", "metric",
                "--output", "/tmp/test_cli_unit", "-f", "json",
                "--no-charts"],
    },
]

for ct in cli_tests:
    print(f"\n  测试: {ct['name']}")
    print(f"    命令: {' '.join(ct['cmd'])}")
    
    try:
        result = subprocess.run(
            ct["cmd"],
            cwd=str(Path(__file__).parent),
            capture_output=True,
            text=True,
            timeout=10,
        )
        
        if result.returncode == 0:
            print(f"    ✓ CLI执行成功 (退出码: {result.returncode})")
            if result.stdout:
                lines = result.stdout.strip().split("\n")[-3:]
                print(f"    输出: ...{lines[-1] if lines else ''}")
        else:
            print(f"    ✗ CLI执行失败 (退出码: {result.returncode})")
            if result.stdout:
                print(f"    stdout: {result.stdout[:500]}")
            if result.stderr:
                print(f"    stderr: {result.stderr[:500]}")
            all_passed = False
            
    except subprocess.TimeoutExpired:
        print(f"    ✗ CLI执行超时")
        all_passed = False
    except Exception as e:
        print(f"    ✗ 异常: {e}")
        all_passed = False

# ========== 总结 ==========
print("\n" + "=" * 70)
print("测试总结")
print("=" * 70)

if all_passed:
    print("✓ 所有测试通过!")
else:
    print("✗ 部分测试失败, 请检查以上输出")

print(f"\n退出码: {'0' if all_passed else '1'}")
sys.exit(0 if all_passed else 1)
