#!/usr/bin/env python3
import unittest
import numpy as np
import sys
import os
import inspect

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from physics_core import SimulationParams, FaradayLawCalculator, CalculationTrace
from parameter_validator import ParameterValidator, ValidationResult


class TestParameterValidation(unittest.TestCase):
    def setUp(self):
        self.validator = ParameterValidator()
        self._source = inspect.currentframe().f_lineno

    def test_zero_speed(self):
        source_line = inspect.currentframe().f_lineno + 1
        params = SimulationParams(magnet_speed=0.0)
        result = self.validator.validate_all(params)
        
        self.assertFalse(result.is_valid, "速度为零时验证应该失败")
        self.assertTrue(any('速度不能为零' in e for e in result.errors),
                        f"应该包含速度为零的错误提示 (L{source_line})")
        self.assertIsNotNone(result.corrected_params, "应该提供修正后的参数")
        self.assertEqual(result.corrected_params.magnet_speed, self.validator.MIN_SPEED,
                         f"速度应该被修正为最小允许值 (L{source_line})")

    def test_negative_speed(self):
        source_line = inspect.currentframe().f_lineno + 1
        params = SimulationParams(magnet_speed=-1.0)
        result = self.validator.validate_all(params)
        
        self.assertTrue(result.is_valid, "负速度在物理上是允许的（方向相反）")
        self.assertTrue(any('向左运动' in w for w in result.warnings),
                        f"应该提示负速度的方向含义 (L{source_line})")

    def test_time_step_too_large(self):
        source_line = inspect.currentframe().f_lineno + 1
        params = SimulationParams(magnet_speed=1.0, time_step=1.0, total_time=2.0)
        result = self.validator.validate_all(params)
        
        self.assertTrue(any('时间步长过大' in w for w in result.warnings),
                        f"应该警告时间步长过大 (L{source_line})")

    def test_insufficient_steps(self):
        source_line = inspect.currentframe().f_lineno + 1
        params = SimulationParams(time_step=0.5, total_time=1.0)
        result = self.validator.validate_all(params)
        
        self.assertFalse(result.is_valid, "步数过少时验证应该失败")
        self.assertTrue(any('步数过少' in e for e in result.errors),
                        f"应该提示步数过少 (L{source_line})")

    def test_invalid_turns(self):
        source_line = inspect.currentframe().f_lineno + 1
        params = SimulationParams(coil_turns=0)
        result = self.validator.validate_all(params)
        
        self.assertFalse(result.is_valid, "匝数为零时验证应该失败")
        self.assertTrue(any('匝数必须为正整数' in e for e in result.errors),
                        f"应该提示匝数错误 (L{source_line})")

    def test_invalid_field_strength(self):
        source_line = inspect.currentframe().f_lineno + 1
        params = SimulationParams(magnet_field_strength=-0.5)
        result = self.validator.validate_all(params)
        
        self.assertFalse(result.is_valid, "负磁场强度验证应该失败")
        self.assertTrue(any('磁场强度必须为正数' in e for e in result.errors),
                        f"应该提示磁场强度错误 (L{source_line})")

    def test_valid_parameters(self):
        source_line = inspect.currentframe().f_lineno + 1
        params = SimulationParams(
            magnet_speed=1.0,
            coil_turns=100,
            magnet_field_strength=0.5,
            time_step=0.01,
            total_time=2.0
        )
        result = self.validator.validate_all(params)
        
        self.assertTrue(result.is_valid, f"合法参数应该通过验证 (L{source_line})")
        self.assertEqual(len(result.errors), 0, f"不应该有错误 (L{source_line})")


class TestFaradayLawCalculator(unittest.TestCase):
    def setUp(self):
        self.params = SimulationParams(
            magnet_speed=1.0,
            coil_turns=100,
            magnet_field_strength=0.5,
            time_step=0.01,
            total_time=0.5
        )
        self.calculator = FaradayLawCalculator(self.params)
        self._source = inspect.currentframe().f_lineno

    def test_magnetic_field_calculation(self):
        source_line = inspect.currentframe().f_lineno + 1
        B = self.calculator.magnetic_field_at_position(0.0, 0.5)
        
        self.assertIsInstance(B, float, f"磁场应该是浮点数 (L{source_line})")
        self.assertTrue(hasattr(self.calculator, 'traces'), f"应该有追踪记录 (L{source_line})")

    def test_magnetic_flux_calculation(self):
        source_line = inspect.currentframe().f_lineno + 1
        flux = self.calculator.calculate_magnetic_flux(0.5)
        
        self.assertIsInstance(flux, float, f"磁通量应该是浮点数 (L{source_line})")

    def test_induced_emf_calculation(self):
        source_line = inspect.currentframe().f_lineno + 1
        emf = self.calculator.calculate_induced_emf(0.5)
        
        self.assertIsInstance(emf, float, f"感应电动势应该是浮点数 (L{source_line})")

    def test_full_simulation(self):
        source_line = inspect.currentframe().f_lineno + 1
        times, fluxes, emfs, currents = self.calculator.run_simulation()
        
        self.assertEqual(len(times), len(fluxes), f"时间和磁通量数组长度应该相等 (L{source_line})")
        self.assertEqual(len(times), len(emfs), f"时间和电动势数组长度应该相等 (L{source_line})")
        self.assertEqual(len(times), len(currents), f"时间和电流数组长度应该相等 (L{source_line})")
        
        self.assertGreater(len(times), 0, f"模拟结果不应为空 (L{source_line})")

    def test_trace_records(self):
        source_line = inspect.currentframe().f_lineno + 1
        self.calculator.run_simulation()
        
        self.assertGreater(len(self.calculator.traces), 0, f"应该有追踪记录 (L{source_line})")
        
        trace = self.calculator.traces[0]
        self.assertIsInstance(trace, CalculationTrace, f"追踪记录类型正确 (L{source_line})")
        self.assertTrue(hasattr(trace, 'line_number'), f"追踪记录应该包含行号 (L{source_line})")
        self.assertTrue(hasattr(trace, 'source_file'), f"追踪记录应该包含源文件 (L{source_line})")

    def test_current_direction_changes(self):
        source_line = inspect.currentframe().f_lineno + 1
        times, fluxes, emfs, currents = self.calculator.run_simulation()
        
        sign_changes = np.where(np.diff(np.sign(currents)))[0]
        
        self.assertTrue(len(sign_changes) >= 1, 
                        f"磁铁穿过线圈时电流方向应该至少变化一次 (L{source_line})")

    def test_emf_proportional_to_turns(self):
        source_line = inspect.currentframe().f_lineno + 1
        params_low = SimulationParams(
            magnet_speed=1.0,
            coil_turns=50,
            magnet_field_strength=0.5,
            time_step=0.01,
            total_time=0.5
        )
        params_high = SimulationParams(
            magnet_speed=1.0,
            coil_turns=100,
            magnet_field_strength=0.5,
            time_step=0.01,
            total_time=0.5
        )
        
        calc_low = FaradayLawCalculator(params_low)
        calc_high = FaradayLawCalculator(params_high)
        
        _, _, emfs_low, _ = calc_low.run_simulation()
        _, _, emfs_high, _ = calc_high.run_simulation()
        
        max_emf_low = np.max(np.abs(emfs_low))
        max_emf_high = np.max(np.abs(emfs_high))
        
        ratio = max_emf_high / max_emf_low if max_emf_low > 0 else 0
        expected_ratio = params_high.coil_turns / params_low.coil_turns
        
        self.assertAlmostEqual(ratio, expected_ratio, delta=0.5,
                              msg=f"感应电动势应该与匝数成正比 (L{source_line})")


class TestEdgeCases(unittest.TestCase):
    def test_very_small_speed(self):
        source_line = inspect.currentframe().f_lineno + 1
        validator = ParameterValidator()
        params = SimulationParams(magnet_speed=0.0001)
        result = validator.validate_all(params)
        
        self.assertTrue(any('速度过小' in w for w in result.warnings),
                        f"应该警告速度过小 (L{source_line})")

    def test_very_large_speed(self):
        source_line = inspect.currentframe().f_lineno + 1
        validator = ParameterValidator()
        params = SimulationParams(magnet_speed=200.0)
        result = validator.validate_all(params)
        
        self.assertTrue(any('速度过大' in w for w in result.warnings),
                        f"应该警告速度过大 (L{source_line})")

    def test_correction_traces_have_line_numbers(self):
        source_line = inspect.currentframe().f_lineno + 1
        validator = ParameterValidator()
        params = SimulationParams(magnet_speed=0.0)
        result = validator.validate_all(params)
        
        self.assertGreater(len(result.corrections), 0, f"应该有修正记录 (L{source_line})")
        
        for corr in result.corrections:
            self.assertGreater(corr.line_number, 0, 
                              f"修正记录应该包含有效的行号 (L{source_line})")
            self.assertIsNotNone(corr.source_file, 
                                f"修正记录应该包含源文件路径 (L{source_line})")

    def test_conservation_of_energy_hint(self):
        source_line = inspect.currentframe().f_lineno + 1
        params = SimulationParams(
            magnet_speed=1.0,
            coil_turns=1000,
            magnet_field_strength=1.0,
            time_step=0.01,
            total_time=0.5
        )
        calc = FaradayLawCalculator(params)
        times, fluxes, emfs, currents = calc.run_simulation()
        
        max_emf = np.max(np.abs(emfs))
        self.assertIsInstance(max_emf, float, f"结果应该是数值 (L{source_line})")


def run_tests():
    print("=" * 70)
    print("电磁感应模拟器 - 单元测试")
    print("=" * 70)
    print()
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    suite.addTests(loader.loadTestsFromTestCase(TestParameterValidation))
    suite.addTests(loader.loadTestsFromTestCase(TestFaradayLawCalculator))
    suite.addTests(loader.loadTestsFromTestCase(TestEdgeCases))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print()
    print("=" * 70)
    if result.wasSuccessful():
        print("✓ 所有测试通过！")
    else:
        print(f"✗ 测试失败: {len(result.failures)} 个失败, {len(result.errors)} 个错误")
    print("=" * 70)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
