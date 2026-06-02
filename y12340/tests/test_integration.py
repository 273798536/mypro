#!/usr/bin/env python3
"""
端到端集成测试：验证数据进入、处理、保存完整流程
"""
import sys
sys.path.insert(0, '.')

import numpy as np
from app.services.validator import DataValidator
from app.services.fitting import SpringDamperFitter


def generate_realistic_data(n_points=100, noise=0.0):
    """生成真实的弹簧阻尼振动数据"""
    k = 100.0
    c = 1.0
    mass = 1.0
    zeta = c / (2 * np.sqrt(mass * k))
    omega_n = np.sqrt(k / mass)
    
    data = []
    for i in range(n_points):
        t = i * 0.05
        omega_d = omega_n * np.sqrt(1 - zeta**2)
        disp = 0.1 * np.exp(-zeta * omega_n * t) * np.cos(omega_d * t)
        if noise > 0:
            disp += np.random.normal(0, noise)
        data.append({
            "timestamp": t,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    return data, k, c, mass


def test_full_workflow():
    """测试完整工作流程：数据→校验→拟合"""
    print("=" * 70)
    print("端到端集成测试：完整工作流程")
    print("=" * 70)
    
    print("\n【步骤1】生成理想振动数据")
    data, k_true, c_true, mass = generate_realistic_data(n_points=80)
    print(f"  ✓ 生成 {len(data)} 个数据点")
    print(f"  ✓ 真实参数: k={k_true} N/m, c={c_true} Ns/m")
    
    print("\n【步骤2】数据校验（正常数据）")
    validator = DataValidator()
    issues = validator.validate_all(data, "kg")
    
    all_passed = all(issue.passed for issue in issues)
    print(f"  ✓ 全部校验通过: {all_passed}")
    for issue in issues:
        status = "✅ 通过" if issue.passed else "❌ 失败"
        print(f"    - {issue.check_type}: {status}")
    
    assert all_passed, "正常数据应该全部通过校验"
    
    print("\n【步骤3】参数拟合")
    fitter = SpringDamperFitter()
    result = fitter.fit(data, mass, "kg")
    
    assert result is not None, "拟合应该成功"
    
    k_error = abs(result.spring_constant - k_true) / k_true * 100
    c_error = abs(result.damping_coefficient - c_true) / c_true * 100
    
    print(f"  ✓ 拟合成功")
    print(f"  ✓ 弹簧常数 k = {result.spring_constant:.3f} N/m (误差 {k_error:.2f}%)")
    print(f"  ✓ 阻尼系数 c = {result.damping_coefficient:.4f} Ns/m (误差 {c_error:.2f}%)")
    print(f"  ✓ 拟合优度 R² = {result.r_squared:.6f}")
    
    assert k_error < 5.0, f"k误差太大: {k_error:.2f}%"
    assert c_error < 10.0, f"c误差太大: {c_error:.2f}%"
    assert result.r_squared > 0.99, f"R²太低: {result.r_squared}"
    
    print("\n【步骤4】引入单位混用错误")
    data_with_unit_error = list(data)
    data_with_unit_error[10] = {
        "timestamp": data_with_unit_error[10]["timestamp"],
        "timestamp_unit": "s",
        "displacement": data_with_unit_error[10]["displacement"],
        "displacement_unit": "cm"
    }
    data_with_unit_error[20] = {
        "timestamp": data_with_unit_error[20]["timestamp"],
        "timestamp_unit": "s",
        "displacement": data_with_unit_error[20]["displacement"],
        "displacement_unit": "mm"
    }
    
    issues = validator.validate_all(data_with_unit_error, "kg")
    unit_check = next((i for i in issues if i.check_type == "unit_consistency"), None)
    
    assert unit_check is not None, "应该返回单位检查结果"
    assert unit_check.passed == False, "单位混用应该不通过"
    assert unit_check.severity == "error", f"单位混用应该是error级别，实际是{unit_check.severity}"
    
    print(f"  ✓ 单位混用检测到错误: severity={unit_check.severity}")
    print(f"  ✓ 人话解释: {unit_check.message}")
    
    print("\n【步骤5】引入采样缺口（删除中间5个点）")
    data_with_gap = []
    for i, point in enumerate(data):
        if 30 <= i <= 34:
            continue
        data_with_gap.append(point)
    
    gap_ts = sorted([p["timestamp"] for p in data_with_gap])
    gap_intervals = np.diff(gap_ts)
    print(f"  删除第30-34个点后，最大间隔={max(gap_intervals):.4f}s")
    
    issues = validator.validate_all(data_with_gap, "kg")
    gap_check = next((i for i in issues if i.check_type == "sampling_gaps"), None)
    
    assert gap_check is not None, "应该返回采样间隔检查结果"
    assert gap_check.passed == False, f"有采样缺口应该不通过，实际passed={gap_check.passed}"
    assert len(gap_check.affected_points) >= 2, "应该至少影响2个点"
    
    print(f"  ✓ 采样缺口检测到警告: affected_points={gap_check.affected_points}")
    print(f"  ✓ 人话解释: {gap_check.message}")
    
    print("\n【步骤6】引入异常点")
    data_with_outlier = list(data)
    data_with_outlier[25] = {
        "timestamp": data_with_outlier[25]["timestamp"],
        "timestamp_unit": "s",
        "displacement": data_with_outlier[25]["displacement"] * 15,
        "displacement_unit": "m"
    }
    
    issues = validator.validate_all(data_with_outlier, "kg")
    outlier_check = next((i for i in issues if i.check_type == "outliers"), None)
    
    assert outlier_check is not None, "应该返回异常点检查结果"
    assert outlier_check.passed == False, "有异常点应该不通过"
    assert 25 in outlier_check.affected_points, f"应该检测到第25个点是异常点，实际检测到{outlier_check.affected_points}"
    
    print(f"  ✓ 异常点检测成功: affected_points={outlier_check.affected_points}")
    print(f"  ✓ 人话解释: {outlier_check.message}")
    
    print("\n" + "=" * 70)
    print("✅ 端到端集成测试全部通过！")
    print("=" * 70)
    return True


if __name__ == "__main__":
    try:
        test_full_workflow()
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
