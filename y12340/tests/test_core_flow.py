#!/usr/bin/env python3
"""
测试弹簧阻尼实验台核心流程
"""
import sys
sys.path.insert(0, '.')

import json
from app.services.validator import DataValidator, ValidationIssue
from app.services.fitting import SpringDamperFitter
import numpy as np


def test_unit_consistency_block():
    """测试：单位混用应该返回error级别，阻止后续拟合"""
    print("=" * 60)
    print("测试1: 单位混用校验")
    print("=" * 60)
    
    validator = DataValidator()
    
    data_mixed = [
        {"timestamp": 0, "timestamp_unit": "s", "displacement": 0.1, "displacement_unit": "m"},
        {"timestamp": 0.1, "timestamp_unit": "s", "displacement": 0.08, "displacement_unit": "cm"},
        {"timestamp": 0.2, "timestamp_unit": "s", "displacement": 0.05, "displacement_unit": "m"},
    ]
    
    issues = validator.validate_all(data_mixed, "kg")
    
    unit_check = next((i for i in issues if i.check_type == "unit_consistency"), None)
    
    assert unit_check is not None, "应该返回单位一致性检查结果"
    assert unit_check.passed == False, "单位混用应该不通过"
    assert unit_check.severity == "error", "单位混用应该是error级别"
    
    print(f"✓ 单位混用检测正确: passed={unit_check.passed}, severity={unit_check.severity}")
    print(f"✓ 人话解释: {unit_check.message}")
    print()


def test_sampling_gap_detection():
    """测试：采样缺口检测"""
    print("=" * 60)
    print("测试2: 采样缺口检测")
    print("=" * 60)
    
    validator = DataValidator()
    
    t = np.arange(0, 5, 0.1)
    data = []
    for i, time in enumerate(t):
        if i == 20:
            time = time + 0.5
        disp = 0.1 * np.exp(-0.3 * time) * np.cos(5 * time)
        data.append({
            "timestamp": time,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    issues = validator.validate_all(data, "kg")
    
    gap_check = next((i for i in issues if i.check_type == "sampling_gaps"), None)
    
    assert gap_check is not None, "应该返回采样间隔检查结果"
    assert gap_check.passed == False, "有采样缺口应该不通过"
    assert gap_check.severity == "warning", "采样缺口应该是warning级别"
    
    print(f"✓ 采样缺口检测正确: passed={gap_check.passed}, severity={gap_check.severity}")
    print(f"✓ 人话解释: {gap_check.message}")
    print()


def test_damping_anomaly_detection():
    """测试：阻尼异常检测"""
    print("=" * 60)
    print("测试3: 阻尼异常检测（过大阻尼）")
    print("=" * 60)
    
    validator = DataValidator()
    
    t = np.arange(0, 5, 0.1)
    data = []
    for time in t:
        disp = 0.1 * np.exp(-3.0 * time) * np.cos(5 * time)
        data.append({
            "timestamp": time,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    issues = validator.validate_all(data, "kg")
    
    damp_check = next((i for i in issues if i.check_type == "damping_anomaly"), None)
    
    assert damp_check is not None, "应该返回阻尼异常检查结果"
    assert damp_check.passed == False, "阻尼过大应该不通过"
    assert damp_check.severity == "warning", "阻尼异常应该是warning级别"
    
    print(f"✓ 阻尼过大检测正确: passed={damp_check.passed}, severity={damp_check.severity}")
    print(f"✓ 人话解释: {damp_check.message}")
    print()


def test_outlier_detection():
    """测试：异常点检测"""
    print("=" * 60)
    print("测试4: 异常点检测")
    print("=" * 60)
    
    validator = DataValidator()
    
    t = np.arange(0, 5, 0.1)
    data = []
    for i, time in enumerate(t):
        disp = 0.1 * np.exp(-0.3 * time) * np.cos(5 * time)
        if i == 15:
            disp = disp * 5
        data.append({
            "timestamp": time,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    issues = validator.validate_all(data, "kg")
    
    outlier_check = next((i for i in issues if i.check_type == "outliers"), None)
    
    assert outlier_check is not None, "应该返回异常点检测结果"
    assert outlier_check.passed == False, "有异常点应该不通过"
    assert 15 in outlier_check.affected_points, "应该检测到第15个点是异常点"
    
    print(f"✓ 异常点检测正确: passed={outlier_check.passed}, affected_points={outlier_check.affected_points}")
    print(f"✓ 人话解释: {outlier_check.message}")
    print()


def test_fitting_algorithm():
    """测试：参数拟合算法"""
    print("=" * 60)
    print("测试5: 参数拟合算法")
    print("=" * 60)
    
    fitter = SpringDamperFitter()
    
    k_true = 25.0
    c_true = 0.3
    mass_true = 0.1
    zeta_true = c_true / (2 * np.sqrt(mass_true * k_true))
    omega_n_true = np.sqrt(k_true / mass_true)
    
    print(f"真实参数: k={k_true}, c={c_true}, zeta={zeta_true:.4f}, f_n={omega_n_true/(2*np.pi):.3f}Hz")
    
    t = np.arange(0, 5, 0.1)
    data = []
    for time in t:
        omega_d = omega_n_true * np.sqrt(1 - zeta_true**2)
        disp = 0.1 * np.exp(-zeta_true * omega_n_true * time) * np.cos(omega_d * time)
        data.append({
            "timestamp": time,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    result = fitter.fit(data, mass_true, "kg")
    
    assert result is not None, "拟合应该成功"
    assert abs(result.spring_constant - k_true) / k_true < 0.05, f"k误差太大: {result.spring_constant}"
    assert abs(result.damping_coefficient - c_true) / c_true < 0.1, f"c误差太大: {result.damping_coefficient}"
    assert result.r_squared > 0.99, f"R²太低: {result.r_squared}"
    
    print(f"✓ 拟合结果: k={result.spring_constant:.3f} (误差={abs(result.spring_constant-k_true)/k_true*100:.2f}%)")
    print(f"✓ 拟合结果: c={result.damping_coefficient:.4f} (误差={abs(result.damping_coefficient-c_true)/c_true*100:.2f}%)")
    print(f"✓ 拟合优度: R²={result.r_squared:.6f}")
    print(f"✓ 拟合方程: {result.fitted_equation}")
    print()


def test_normal_data_validation():
    """测试：正常数据应该全部通过"""
    print("=" * 60)
    print("测试6: 正常数据校验")
    print("=" * 60)
    
    validator = DataValidator()
    
    t = np.arange(0, 5, 0.1)
    data = []
    for time in t:
        disp = 0.1 * np.exp(-0.3 * time) * np.cos(5 * time)
        data.append({
            "timestamp": time,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    issues = validator.validate_all(data, "kg")
    
    for issue in issues:
        if issue.check_type == "unit_consistency":
            assert issue.passed == True, "单位检查应该通过"
        print(f"✓ {issue.check_type}: passed={issue.passed}, {issue.message}")
    
    print()


def main():
    print("弹簧阻尼实验台 - 核心流程测试")
    print()
    
    tests = [
        test_unit_consistency_block,
        test_sampling_gap_detection,
        test_damping_anomaly_detection,
        test_outlier_detection,
        test_fitting_algorithm,
        test_normal_data_validation,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__} 失败: {e}")
            failed += 1
            print()
        except Exception as e:
            print(f"✗ {test.__name__} 异常: {e}")
            failed += 1
            print()
    
    print("=" * 60)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)
    
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
