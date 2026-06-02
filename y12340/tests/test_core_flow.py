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
    assert unit_check.severity == "error", f"单位混用应该是error级别，实际是{unit_check.severity}"
    
    print(f"✓ 单位混用检测正确: passed={unit_check.passed}, severity={unit_check.severity}")
    print(f"✓ 人话解释: {unit_check.message}")
    print()


def test_sampling_gap_detection():
    """测试：采样缺口检测（模拟学生漏记5个采样点的真实场景）"""
    print("=" * 60)
    print("测试2: 采样缺口检测")
    print("=" * 60)
    
    validator = DataValidator(tolerance_factor=2.0)
    
    base_timestamps = [i * 0.1 for i in range(50)]
    gap_timestamps = [t for i, t in enumerate(base_timestamps) if not (20 <= i <= 24)]
    
    data = []
    for t in gap_timestamps:
        disp = 0.1 * np.exp(-0.3 * t) * np.cos(5 * t)
        data.append({
            "timestamp": t,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    sorted_ts = sorted([p["timestamp"] for p in data])
    intervals = np.diff(sorted_ts)
    print(f"  数据点数: {len(data)} (原始50个，跳过第20-24个)")
    print(f"  间隔中位数: {np.median(intervals):.4f}s")
    print(f"  最大间隔: {max(intervals):.4f}s (在1.9s到2.5s之间)")
    
    assert max(intervals) > 0.4, f"测试数据应包含>0.4s的缺口，实际最大间隔={max(intervals):.4f}s"
    
    issues = validator.validate_all(data, "kg")
    gap_check = next((i for i in issues if i.check_type == "sampling_gaps"), None)
    
    assert gap_check is not None, "应该返回采样间隔检查结果"
    assert gap_check.passed == False, f"有采样缺口应该不通过，实际passed={gap_check.passed}"
    assert gap_check.severity == "warning", f"采样缺口应该是warning级别，实际是{gap_check.severity}"
    assert len(gap_check.affected_points) >= 2, f"应该至少影响2个点，实际影响{len(gap_check.affected_points)}个"
    
    print(f"✓ 采样缺口检测正确: passed={gap_check.passed}, severity={gap_check.severity}")
    print(f"✓ 影响点数: {len(gap_check.affected_points)}")
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
    assert damp_check.passed == False, f"阻尼过大应该不通过，实际passed={damp_check.passed}"
    assert damp_check.severity == "warning", f"阻尼异常应该是warning级别，实际是{damp_check.severity}"
    
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
            disp = disp * 10
        data.append({
            "timestamp": time,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    issues = validator.validate_all(data, "kg")
    
    outlier_check = next((i for i in issues if i.check_type == "outliers"), None)
    
    assert outlier_check is not None, "应该返回异常点检测结果"
    assert outlier_check.passed == False, f"有异常点应该不通过，实际passed={outlier_check.passed}"
    assert 15 in outlier_check.affected_points, f"应该检测到第15个点是异常点，实际检测到{outlier_check.affected_points}"
    
    print(f"✓ 异常点检测正确: passed={outlier_check.passed}, affected_points={outlier_check.affected_points}")
    print(f"✓ 人话解释: {outlier_check.message}")
    print()


def test_fitting_algorithm():
    """测试：参数拟合算法"""
    print("=" * 60)
    print("测试5: 参数拟合算法")
    print("=" * 60)
    
    fitter = SpringDamperFitter()
    
    k_true = 100.0
    c_true = 1.0
    mass_true = 1.0
    zeta_true = c_true / (2 * np.sqrt(mass_true * k_true))
    omega_n_true = np.sqrt(k_true / mass_true)
    
    print(f"真实参数: k={k_true}, c={c_true}, mass={mass_true}")
    print(f"真实参数: zeta={zeta_true:.6f}, omega_n={omega_n_true:.6f}, f_n={omega_n_true/(2*np.pi):.3f}Hz")
    
    t = np.arange(0, 10, 0.05)
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
    
    k_error = abs(result.spring_constant - k_true) / k_true * 100
    c_error = abs(result.damping_coefficient - c_true) / c_true * 100
    
    print(f"拟合结果: k={result.spring_constant:.3f} (误差={k_error:.2f}%)")
    print(f"拟合结果: c={result.damping_coefficient:.4f} (误差={c_error:.2f}%)")
    print(f"拟合优度: R²={result.r_squared:.6f}")
    
    assert k_error < 5.0, f"k误差太大: {k_error:.2f}% (阈值: 5%)"
    assert c_error < 10.0, f"c误差太大: {c_error:.2f}% (阈值: 10%)"
    assert result.r_squared > 0.99, f"R²太低: {result.r_squared} (阈值: 0.99)"
    
    print(f"✓ 拟合结果: k={result.spring_constant:.3f} (误差={k_error:.2f}%)")
    print(f"✓ 拟合结果: c={result.damping_coefficient:.4f} (误差={c_error:.2f}%)")
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
            assert issue.passed == True, f"单位检查应该通过，实际{issue.passed}"
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
            import traceback
            traceback.print_exc()
            failed += 1
            print()
    
    print("=" * 60)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)
    
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
