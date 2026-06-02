#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from beam_calculator.units import Unit, Quantity, UnitSystem
from beam_calculator.models import Beam, Load, LoadType, BoundaryCondition
from beam_calculator.io import DataImporter
from beam_calculator.calculator import BeamCalculator
from beam_calculator.warnings import WarningCollector
from beam_calculator.steps import StepTracker

print("=" * 60)
print("复现命令行载荷输入缺陷")
print("=" * 60)

print("\n场景1: CLI简化格式均布载荷 uniform,5000,0,10")
print("预期: 均布载荷 5000 N/m 作用于 0~10m")
print("实际: 大小被解析为 5000 N (力单位), 计算时要转 N/m 会报错\n")

importer = DataImporter()

# 模拟 CLI 解析出来的载荷数据
load_raw = {
    "type": "uniform_distributed",
    "magnitude": 5000,
    "start_position": 0,
    "end_position": 10,
}

print(f"原始载荷数据: {load_raw}")
print(f"注意: magnitude_unit 未指定, io.py:261 默认用 Unit.N")

try:
    load = importer._parse_load(load_raw)
    print(f"解析后载荷: {load}")
    print(f"载荷大小单位: {load.magnitude.unit}")
    print(f"载荷大小单位类别: {load.magnitude.unit.category}")
    
    print("\n尝试计算等效力 (models.py:140 会 convert_to(Unit.N_M)):")
    eff_force = load.get_effective_force()
    print(f"等效力: {eff_force}")
except ValueError as e:
    print(f"\n❌ 错误: {e}")
    print("这就是用户遇到的问题!")

print("\n" + "=" * 60)
print("场景2: 验证器是否提前拦截")
print("=" * 60)

from beam_calculator.validator import InputValidator

beam = Beam(
    length=Quantity(10, Unit.M),
    left_support=BoundaryCondition.PINNED,
    right_support=BoundaryCondition.ROLLER,
)

load2 = Load(
    load_type=LoadType.UNIFORM_DISTRIBUTED,
    magnitude=Quantity(5000, Unit.N),  # 错误: 用了力单位而非分布载荷单位
    start_position=Quantity(0, Unit.M),
    end_position=Quantity(10, Unit.M),
)
beam.add_load(load2)

warnings = WarningCollector()
steps = StepTracker()
validator = InputValidator(warning_collector=warnings, step_tracker=steps)
validation = validator.validate_beam(beam)

print(f"验证结果: {'有效' if validation else '无效'}")
print(f"验证错误: {validation.errors if validation.errors else '无'}")
print(f"验证警告: {validation.warnings if validation.warnings else '无'}")
print(f"警告收集器警告数: {len(warnings)}")

if not validation.errors:
    print("\n❌ 问题: 验证器没有提前拦截! 允许分布载荷使用力单位")
    print("validator.py:125 只检查了单位类别在 [FORCE, MOMENT, DISTRIBUTED_LOAD] 中")
    print("但没有根据载荷类型做更严格的校验")
