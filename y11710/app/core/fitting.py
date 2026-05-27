import numpy as np
from scipy.optimize import curve_fit
from scipy.signal import find_peaks


def damped_oscillation(t, A, gamma, omega, phi, offset):
    return A * np.exp(-gamma * t) * np.cos(omega * t + phi) + offset


def estimate_initial_params(t, x):
    offset = np.mean(x)
    x_centered = x - offset
    A = np.max(np.abs(x_centered))
    
    peaks, _ = find_peaks(x_centered, distance=5)
    if len(peaks) < 2:
        peaks = np.argsort(x_centered)[-5:]
        peaks = np.sort(peaks)
    
    if len(peaks) >= 2:
        T_est = np.mean(np.diff(t[peaks]))
        omega_est = 2 * np.pi / T_est if T_est > 0 else 1.0
    else:
        omega_est = 1.0
    
    if len(peaks) >= 2:
        peak_amps = x_centered[peaks]
        if len(peak_amps) >= 2 and peak_amps[0] > 0 and peak_amps[-1] > 0:
            gamma_est = np.log(peak_amps[0] / peak_amps[-1]) / (t[peaks[-1]] - t[peaks[0]])
        else:
            gamma_est = 0.01
    else:
        gamma_est = 0.01
    
    phi_est = 0.0
    
    return [A, gamma_est, omega_est, phi_est, offset]


def fit_damped_oscillation(t, x, maxfev=10000):
    t = np.asarray(t, dtype=float)
    x = np.asarray(x, dtype=float)
    
    if len(t) < 10 or len(x) < 10:
        raise ValueError("数据点太少，至少需要10个点进行拟合")
    
    if len(t) != len(x):
        raise ValueError("时间序列和位移序列长度不一致")
    
    p0 = estimate_initial_params(t, x)
    
    lower_bounds = [0, 0, 0, -np.pi, -np.inf]
    upper_bounds = [np.inf, np.inf, np.inf, np.pi, np.inf]
    
    p0[3] = np.clip(p0[3], -np.pi + 0.01, np.pi - 0.01)
    
    try:
        try:
            popt, pcov = curve_fit(
                damped_oscillation, t, x,
                p0=p0,
                bounds=(lower_bounds, upper_bounds),
                maxfev=maxfev
            )
        except ValueError:
            popt, pcov = curve_fit(
                damped_oscillation, t, x,
                p0=p0,
                maxfev=maxfev
            )
        
        perr = np.sqrt(np.diag(pcov)) if pcov is not None else np.zeros_like(popt)
        
        x_fit = damped_oscillation(t, *popt)
        residuals = x - x_fit
        ss_res = np.sum(residuals ** 2)
        ss_tot = np.sum((x - np.mean(x)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        A, gamma, omega, phi, offset = popt
        T = 2 * np.pi / omega if omega > 0 else np.inf
        frequency = 1 / T if T > 0 else 0
        
        damping_ratio = gamma / omega if omega > 0 else np.inf
        
        quality_factor = np.pi / (gamma * T) if (gamma * T) > 0 else np.inf
        
        fit_success = True
        fit_message = "拟合成功"
        
        if np.any(perr / np.abs(popt) > 0.5) and np.all(popt != 0):
            fit_message = "警告：部分参数误差较大，结果仅供参考"
        
        if gamma < 1e-6:
            fit_message = "警告：阻尼系数接近零，可能为无阻尼振动或拟合质量不佳"
        
        if r_squared < 0.8:
            fit_message = f"警告：拟合优度 R²={r_squared:.4f} 较低，请检查数据质量"
    
    except RuntimeError as e:
        popt = p0
        perr = np.zeros_like(p0)
        x_fit = damped_oscillation(t, *popt)
        residuals = x - x_fit
        r_squared = 0
        T = 2 * np.pi / popt[2] if popt[2] > 0 else np.inf
        frequency = 1 / T if T > 0 else 0
        damping_ratio = popt[1] / popt[2] if popt[2] > 0 else np.inf
        quality_factor = np.inf
        fit_success = False
        fit_message = f"拟合失败：{str(e)}。使用初始估计值。"
    except Exception as e:
        raise RuntimeError(f"拟合过程出错: {str(e)}")
    
    return {
        'amplitude': float(popt[0]),
        'amplitude_err': float(perr[0]),
        'gamma': float(popt[1]),
        'gamma_err': float(perr[1]),
        'omega': float(popt[2]),
        'omega_err': float(perr[2]),
        'phi': float(popt[3]),
        'phi_err': float(perr[3]),
        'offset': float(popt[4]),
        'offset_err': float(perr[4]),
        'period': float(T),
        'frequency': float(frequency),
        'damping_ratio': float(damping_ratio),
        'quality_factor': float(quality_factor),
        'r_squared': float(r_squared),
        'fit_success': fit_success,
        'fit_message': fit_message,
        'fitted_curve': x_fit.tolist(),
        'residuals': residuals.tolist()
    }


def estimate_period_by_peaks(t, x):
    t = np.asarray(t, dtype=float)
    x = np.asarray(x, dtype=float)
    x_centered = x - np.mean(x)
    
    peaks, peak_props = find_peaks(x_centered, prominence=0.1 * np.std(x_centered), distance=3)
    
    if len(peaks) < 2:
        return None, 0, "峰数量不足，无法估计周期"
    
    t_peaks = t[peaks]
    periods = np.diff(t_peaks)
    
    T_mean = float(np.mean(periods))
    T_std = float(np.std(periods))
    
    message = f"通过峰值检测得到周期: T = {T_mean:.4f} ± {T_std:.4f} (基于 {len(periods)} 个周期间隔)"
    
    return T_mean, T_std, message
