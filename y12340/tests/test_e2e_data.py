#!/usr/bin/env python3
"""
端到端数据流验证：模拟 API 完整流程，不依赖 uvicorn
验证：创建→校验→拟合→导出 全链路数据一致性
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from app.services.validator import DataValidator
from app.services.fitting import SpringDamperFitter
from app.services.report_generator import ReportGenerator


def main():
    print("=" * 70)
    print("端到端数据流验证")
    print("=" * 70)
    
    validator = DataValidator()
    fitter = SpringDamperFitter()
    report_gen = ReportGenerator()
    
    # 模拟学生实验：质量1kg，k=100 N/m，c=1 Ns/m
    k_true, c_true, mass = 100.0, 1.0, 1.0
    zeta_true = c_true / (2 * np.sqrt(mass * k_true))
    omega_n_true = np.sqrt(k_true / mass)
    
    print("\n[1] 生成实验数据")
    data = []
    for i in range(100):
        t = i * 0.05
        omega_d = omega_n_true * np.sqrt(1 - zeta_true**2)
        disp = 0.1 * np.exp(-zeta_true * omega_n_true * t) * np.cos(omega_d * t)
        data.append({
            "timestamp": t, "timestamp_unit": "s",
            "displacement": disp, "displacement_unit": "m"
        })
    print(f"  生成 {len(data)} 个数据点, 质量={mass}kg")
    
    print("\n[2] 校验（正常数据，应全部通过）")
    issues = validator.validate_all(data, "kg")
    for issue in issues:
        status = "PASS" if issue.passed else "FAIL"
        print(f"  [{status}] {issue.check_type}: {issue.message[:50]}")
    
    all_passed = all(i.passed for i in issues)
    assert all_passed, "正常数据应全部通过校验"
    print("  ✓ 正常数据校验全部通过")
    
    print("\n[3] 参数拟合")
    fit_result = fitter.fit(data, mass, "kg")
    assert fit_result is not None, "拟合应成功"
    
    k_err = abs(fit_result.spring_constant - k_true) / k_true * 100
    c_err = abs(fit_result.damping_coefficient - c_true) / c_true * 100
    print(f"  k = {fit_result.spring_constant:.3f} N/m (误差 {k_err:.2f}%)")
    print(f"  c = {fit_result.damping_coefficient:.4f} Ns/m (误差 {c_err:.2f}%)")
    print(f"  R² = {fit_result.r_squared:.6f}")
    assert k_err < 5.0, f"k误差 {k_err:.2f}% 超标"
    assert c_err < 10.0, f"c误差 {c_err:.2f}% 超标"
    assert fit_result.r_squared > 0.99, "R²太低"
    print("  ✓ 拟合精度合格")
    
    print("\n[4] 报告生成")
    validation_dicts = [
        {"check_type": i.check_type, "passed": i.passed, "message": i.message, "severity": i.severity}
        for i in issues
    ]
    fitting_dict = {
        "spring_constant": fit_result.spring_constant,
        "damping_coefficient": fit_result.damping_coefficient,
        "natural_frequency": fit_result.natural_frequency,
        "damping_ratio": fit_result.damping_ratio,
        "r_squared": fit_result.r_squared,
        "fitted_equation": fit_result.fitted_equation,
        "initial_amplitude": fit_result.initial_amplitude,
        "phase": fit_result.phase,
    }
    html = report_gen.generate_html_report(
        experiment={"name": "测试实验", "mass": mass, "mass_unit": "kg",
                     "data_source": "验证脚本", "version": 1, "created_at": "2026-06-03"},
        validation_results=validation_dicts,
        fitting_result=fitting_dict,
        data_points=data
    )
    assert len(html) > 1000, "报告太短，可能生成失败"
    assert "弹簧常数" in html, "报告缺少弹簧常数"
    assert f"{fit_result.spring_constant:.3f}" in html, "报告中的k值与拟合结果不一致"
    print(f"  报告大小: {len(html)} 字符")
    print(f"  包含拟合值 k={fit_result.spring_constant:.3f}: {'YES' if f'{fit_result.spring_constant:.3f}' in html else 'NO'}")
    print("  ✓ 报告生成成功，数据与拟合结果一致")
    
    print("\n[5] 校验阻断：单位混用应阻止拟合")
    mixed_data = list(data)
    mixed_data[10] = {**mixed_data[10], "displacement_unit": "cm"}
    issues = validator.validate_all(mixed_data, "kg")
    unit_check = next(i for i in issues if i.check_type == "unit_consistency")
    assert not unit_check.passed, "单位混用应不通过"
    assert unit_check.severity == "error", "单位混用应为error级别"
    print(f"  ✓ 单位混用: severity={unit_check.severity}, 会阻止拟合")
    
    print("\n[6] 校验阻断：采样缺口应被检测")
    gap_data = [d for i, d in enumerate(data) if not (40 <= i <= 44)]
    issues = validator.validate_all(gap_data, "kg")
    gap_check = next(i for i in issues if i.check_type == "sampling_gaps")
    assert not gap_check.passed, "采样缺口应不通过"
    print(f"  ✓ 采样缺口: {gap_check.message[:60]}...")
    
    print("\n" + "=" * 70)
    print("✅ 端到端数据流验证全部通过")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as e:
        print(f"\n❌ 验证失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 验证异常: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
