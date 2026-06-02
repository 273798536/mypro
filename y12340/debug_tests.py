#!/usr/bin/env python3
"""
调试测试失败的具体原因
"""
import sys
sys.path.insert(0, '.')

import numpy as np
from app.services.validator import DataValidator
from app.services.fitting import SpringDamperFitter


def debug_sampling_gap():
    print("=" * 60)
    print("调试: 采样缺口检测")
    print("=" * 60)
    
    validator = DataValidator()
    
    t = np.arange(0, 5, 0.1)
    data = []
    for i, time in enumerate(t):
        if i == 20:
            time = time + 0.5
            print(f"点 {i}: 时间从 {t[i]} 改为 {time} (添加缺口)")
        disp = 0.1 * np.exp(-0.3 * time) * np.cos(5 * time)
        data.append({
            "timestamp": time,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    timestamps = sorted([p["timestamp"] for p in data])
    intervals = np.diff(timestamps)
    print(f"\n时间戳前25个: {timestamps[:25]}")
    print(f"间隔前25个: {intervals[:25]}")
    
    median_interval = np.median(intervals)
    threshold = median_interval * 2.0
    print(f"中位数间隔: {median_interval}, 阈值: {threshold}")
    
    gap_points = []
    for i, interval in enumerate(intervals):
        if interval > threshold:
            print(f"  发现缺口 at index {i}, interval = {interval}")
            gap_points.extend([i, i + 1])
    
    print(f"缺口影响的点: {gap_points}")
    
    issues = validator.validate_all(data, "kg")
    gap_check = next((i for i in issues if i.check_type == "sampling_gaps"), None)
    if gap_check:
        print(f"\n结果: passed={gap_check.passed}, severity={gap_check.severity}")
        print(f"影响点: {gap_check.affected_points}")
    else:
        print("\n结果: 未返回采样缺口检查结果")


def debug_outliers():
    print("\n" + "=" * 60)
    print("调试: 异常点检测")
    print("=" * 60)
    
    validator = DataValidator()
    
    t = np.arange(0, 5, 0.1)
    data = []
    for i, time in enumerate(t):
        disp = 0.1 * np.exp(-0.3 * time) * np.cos(5 * time)
        if i == 15:
            disp = disp * 5
            print(f"点 {i}: 位移从 {disp/5} 放大到 {disp} (异常点)")
        data.append({
            "timestamp": time,
            "timestamp_unit": "s",
            "displacement": disp,
            "displacement_unit": "m"
        })
    
    displacements = [p["displacement"] for p in data]
    print(f"\n位移范围: {min(displacements):.4f} ~ {max(displacements):.4f}")
    
    sorted_pairs = sorted(zip([p["timestamp"] for p in data], displacements), key=lambda x: x[0])
    _, sorted_disp = zip(*sorted_pairs)
    
    Q1 = np.percentile(sorted_disp, 25)
    Q3 = np.percentile(sorted_disp, 75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    print(f"Q1={Q1:.4f}, Q3={Q3:.4f}, IQR={IQR:.4f}")
    print(f"正常范围: [{lower_bound:.4f}, {upper_bound:.4f}]")
    print(f"点15的位移: {sorted_disp[15]:.4f}")
    
    outlier_indices = []
    for i, disp in enumerate(sorted_disp):
        if disp < lower_bound or disp > upper_bound:
            print(f"  点 {i} 是异常点: disp={disp:.4f}")
            outlier_indices.append(i)
    
    print(f"检测到的异常点: {outlier_indices}")
    
    issues = validator.validate_all(data, "kg")
    outlier_check = next((i for i in issues if i.check_type == "outliers"), None)
    if outlier_check:
        print(f"\n结果: passed={outlier_check.passed}, severity={outlier_check.severity}")
        print(f"影响点: {outlier_check.affected_points}")
    else:
        print("\n结果: 未返回异常点检查结果")


def debug_fitting():
    print("\n" + "=" * 60)
    print("调试: 参数拟合算法")
    print("=" * 60)
    
    fitter = SpringDamperFitter()
    
    k_true = 25.0
    c_true = 0.3
    mass_true = 0.1
    zeta_true = c_true / (2 * np.sqrt(mass_true * k_true))
    omega_n_true = np.sqrt(k_true / mass_true)
    
    print(f"真实参数: k={k_true}, c={c_true}, mass={mass_true}")
    print(f"真实参数: zeta={zeta_true:.6f}, omega_n={omega_n_true:.6f}, f_n={omega_n_true/(2*np.pi):.3f}Hz")
    
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
    
    print(f"\n数据点: {len(data)} 个")
    print(f"时间范围: {t[0]} ~ {t[-1]} s")
    print(f"位移范围: {min([p['displacement'] for p in data]):.4f} ~ {max([p['displacement'] for p in data]):.4f} m")
    
    result = fitter.fit(data, mass_true, "kg")
    if result:
        print(f"\n拟合结果:")
        print(f"  k = {result.spring_constant:.6f} (真实: {k_true}, 误差: {abs(result.spring_constant-k_true)/k_true*100:.2f}%)")
        print(f"  c = {result.damping_coefficient:.6f} (真实: {c_true}, 误差: {abs(result.damping_coefficient-c_true)/c_true*100:.2f}%)")
        print(f"  f_n = {result.natural_frequency:.6f} Hz")
        print(f"  zeta = {result.damping_ratio:.6f}")
        print(f"  R² = {result.r_squared:.6f}")
        print(f"  方程: {result.fitted_equation}")
    else:
        print("\n拟合失败!")


if __name__ == "__main__":
    debug_sampling_gap()
    debug_outliers()
    debug_fitting()
