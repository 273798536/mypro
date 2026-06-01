"""核心物理模型：抛体运动公式、风阻模型

所有公式、单位、中间量均显式定义，不做隐藏。
"""

import numpy as np
from typing import Dict, Tuple, Optional, List

from .models import ProjectileParams

GRAVITY = 9.81  # 重力加速度, 单位: m/s^2
GRAVITY_VECTOR = np.array([0.0, -GRAVITY])  # 重力加速度矢量, 单位: m/s^2

AIR_DENSITY = 1.225  # 空气密度, 单位: kg/m^3 (标准大气压, 15°C)


def projectile_no_drag(
    t: np.ndarray,
    v0: float,
    theta0_deg: float,
    x0: float = 0.0,
    y0: float = 0.0,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    无风阻抛体运动公式

    公式:
        x(t) = x0 + v0 * cos(θ0) * t
        y(t) = y0 + v0 * sin(θ0) * t - 0.5 * g * t^2
        vx(t) = v0 * cos(θ0)
        vy(t) = v0 * sin(θ0) - g * t

    参数:
        t: 时间数组, 单位: s
        v0: 初速度, 单位: m/s
        theta0_deg: 初角度, 单位: deg
        x0: 初始x坐标, 单位: m
        y0: 初始y坐标, 单位: m

    返回:
        (x, y, vx, vy) 位置和速度
    """
    theta0_rad = np.deg2rad(theta0_deg)
    cos_theta0 = np.cos(theta0_rad)
    sin_theta0 = np.sin(theta0_rad)

    vx = v0 * cos_theta0
    vy_initial = v0 * sin_theta0

    x = x0 + vx * t
    y = y0 + vy_initial * t - 0.5 * GRAVITY * t**2
    vy = vy_initial - GRAVITY * t

    return x, y, vx, vy


def drag_force_magnitude(
    v_rel: np.ndarray,
    drag_coeff: float,
    cross_section_area: float,
    air_density: float = AIR_DENSITY,
) -> Tuple[float, Dict[str, float]]:
    """
    风阻力大小计算

    公式:
        F_drag = 0.5 * ρ * C_d * A * |v_rel|^2

    参数:
        v_rel: 相对速度矢量, 单位: m/s
        drag_coeff: 风阻系数 C_d, 无量纲
        cross_section_area: 横截面积 A, 单位: m^2
        air_density: 空气密度 ρ, 单位: kg/m^3

    返回:
        (阻力大小, 中间量字典)
    """
    v_mag = np.linalg.norm(v_rel)  # 相对速度大小, 单位: m/s
    v_squared = v_mag**2  # 相对速度平方, 单位: m^2/s^2

    f_drag = 0.5 * air_density * drag_coeff * cross_section_area * v_squared

    intermediate = {
        "v_rel_x": v_rel[0],
        "v_rel_y": v_rel[1],
        "v_mag": v_mag,
        "v_squared": v_squared,
        "air_density": air_density,
        "drag_coeff": drag_coeff,
        "cross_section_area": cross_section_area,
        "f_drag_magnitude": f_drag,
    }
    intermediate_units = {
        "v_rel_x": "m/s",
        "v_rel_y": "m/s",
        "v_mag": "m/s",
        "v_squared": "m^2/s^2",
        "air_density": "kg/m^3",
        "drag_coeff": "dimensionless",
        "cross_section_area": "m^2",
        "f_drag_magnitude": "N",
    }

    return f_drag, {"values": intermediate, "units": intermediate_units}


def drag_acceleration(
    v: np.ndarray,
    wind_v: np.ndarray,
    mass: float,
    drag_coeff: float,
    cross_section_area: float,
    air_density: float = AIR_DENSITY,
) -> Tuple[np.ndarray, Dict[str, any]]:
    """
    风阻产生的加速度

    公式:
        v_rel = v - wind_v
        a_drag = -F_drag / mass * (v_rel / |v_rel|)   当 |v_rel| > 0
              = 0                                     当 |v_rel| = 0

    参数:
        v: 抛体速度, 单位: m/s
        wind_v: 风速, 单位: m/s
        mass: 质量, 单位: kg
        drag_coeff: 风阻系数, 无量纲
        cross_section_area: 横截面积, 单位: m^2

    返回:
        (加速度矢量, 中间量字典)
    """
    v_rel = v - wind_v
    v_mag = np.linalg.norm(v_rel)

    if v_mag < 1e-10:
        a_drag = np.zeros(2)
        f_drag = 0.0
        direction = np.zeros(2)
    else:
        direction = v_rel / v_mag
        f_drag, drag_info = drag_force_magnitude(
            v_rel, drag_coeff, cross_section_area, air_density
        )
        a_drag = -f_drag / mass * direction

    intermediate = {
        "v_x": v[0],
        "v_y": v[1],
        "wind_v_x": wind_v[0],
        "wind_v_y": wind_v[1],
        "v_rel_x": v_rel[0],
        "v_rel_y": v_rel[1],
        "v_rel_mag": v_mag,
        "direction_x": direction[0] if v_mag > 1e-10 else 0.0,
        "direction_y": direction[1] if v_mag > 1e-10 else 0.0,
        "f_drag": f_drag,
        "mass": mass,
        "a_drag_x": a_drag[0],
        "a_drag_y": a_drag[1],
    }
    intermediate_units = {
        "v_x": "m/s",
        "v_y": "m/s",
        "wind_v_x": "m/s",
        "wind_v_y": "m/s",
        "v_rel_x": "m/s",
        "v_rel_y": "m/s",
        "v_rel_mag": "m/s",
        "direction_x": "dimensionless",
        "direction_y": "dimensionless",
        "f_drag": "N",
        "mass": "kg",
        "a_drag_x": "m/s^2",
        "a_drag_y": "m/s^2",
    }

    return a_drag, {"values": intermediate, "units": intermediate_units}


def total_acceleration(
    v: np.ndarray,
    wind_v: np.ndarray,
    mass: float,
    drag_coeff: float,
    cross_section_area: float,
) -> Tuple[np.ndarray, Dict[str, any]]:
    """
    总加速度 = 重力加速度 + 风阻加速度

    公式:
        a_total = a_gravity + a_drag

    参数:
        v: 抛体速度, 单位: m/s
        wind_v: 风速, 单位: m/s
        mass: 质量, 单位: kg
        drag_coeff: 风阻系数, 无量纲
        cross_section_area: 横截面积, 单位: m^2

    返回:
        (总加速度矢量, 中间量字典)
    """
    a_drag, drag_info = drag_acceleration(
        v, wind_v, mass, drag_coeff, cross_section_area
    )
    a_total = GRAVITY_VECTOR + a_drag

    intermediate = {
        **drag_info["values"],
        "a_gravity_x": GRAVITY_VECTOR[0],
        "a_gravity_y": GRAVITY_VECTOR[1],
        "a_total_x": a_total[0],
        "a_total_y": a_total[1],
    }
    intermediate_units = {
        **drag_info["units"],
        "a_gravity_x": "m/s^2",
        "a_gravity_y": "m/s^2",
        "a_total_x": "m/s^2",
        "a_total_y": "m/s^2",
    }

    return a_total, {"values": intermediate, "units": intermediate_units}


def projectile_with_drag_step(
    state: np.ndarray,
    wind_v: np.ndarray,
    dt: float,
    mass: float,
    drag_coeff: float,
    cross_section_area: float,
) -> Tuple[np.ndarray, Dict[str, any]]:
    """
    有风阻抛体运动单步积分 (欧拉法)

    状态向量: [x, y, vx, vy]

    参数:
        state: 当前状态 [x, y, vx, vy]
        wind_v: 风速 [wx, wy], 单位: m/s
        dt: 时间步长, 单位: s
        mass: 质量, 单位: kg
        drag_coeff: 风阻系数, 无量纲
        cross_section_area: 横截面积, 单位: m^2

    返回:
        (新状态, 中间量字典)
    """
    x, y, vx, vy = state
    v = np.array([vx, vy])

    a_total, acc_info = total_acceleration(
        v, wind_v, mass, drag_coeff, cross_section_area
    )
    ax, ay = a_total

    x_new = x + vx * dt
    y_new = y + vy * dt
    vx_new = vx + ax * dt
    vy_new = vy + ay * dt

    new_state = np.array([x_new, y_new, vx_new, vy_new])

    intermediate = {
        **acc_info["values"],
        "dt": dt,
        "x_old": x,
        "y_old": y,
        "x_new": x_new,
        "y_new": y_new,
        "vx_old": vx,
        "vy_old": vy,
        "vx_new": vx_new,
        "vy_new": vy_new,
    }
    intermediate_units = {
        **acc_info["units"],
        "dt": "s",
        "x_old": "m",
        "y_old": "m",
        "x_new": "m",
        "y_new": "m",
        "vx_old": "m/s",
        "vy_old": "m/s",
        "vx_new": "m/s",
        "vy_new": "m/s",
    }

    return new_state, {"values": intermediate, "units": intermediate_units}


def simulate_projectile(
    t_points: np.ndarray,
    v0: float,
    theta0_deg: float,
    mass: float,
    drag_coeff: float,
    cross_section_area: float,
    wind_speed: float = 0.0,
    wind_direction_deg: float = 0.0,
    x0: float = 0.0,
    y0: float = 0.0,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[Dict[str, any]]]:
    """
    模拟有风阻的抛体运动轨迹

    参数:
        t_points: 时间点数组, 单位: s
        v0: 初速度, 单位: m/s
        theta0_deg: 初角度, 单位: deg
        mass: 质量, 单位: kg
        drag_coeff: 风阻系数, 无量纲
        cross_section_area: 横截面积, 单位: m^2
        wind_speed: 风速大小, 单位: m/s
        wind_direction_deg: 风向, 单位: deg (0度为x轴正方向)
        x0: 初始x坐标, 单位: m
        y0: 初始y坐标, 单位: m

    返回:
        (x, y, vx, vy, 每步中间量列表)
    """
    theta0_rad = np.deg2rad(theta0_deg)
    wind_direction_rad = np.deg2rad(wind_direction_deg)

    vx0 = v0 * np.cos(theta0_rad)
    vy0 = v0 * np.sin(theta0_rad)

    wind_v = np.array([
        wind_speed * np.cos(wind_direction_rad),
        wind_speed * np.sin(wind_direction_rad),
    ])

    state = np.array([x0, y0, vx0, vy0])

    n_points = len(t_points)
    x = np.zeros(n_points)
    y = np.zeros(n_points)
    vx = np.zeros(n_points)
    vy = np.zeros(n_points)

    x[0], y[0], vx[0], vy[0] = state

    step_infos = []
    for i in range(1, n_points):
        dt = t_points[i] - t_points[i - 1]
        state, step_info = projectile_with_drag_step(
            state, wind_v, dt, mass, drag_coeff, cross_section_area
        )
        x[i], y[i], vx[i], vy[i] = state
        step_infos.append(step_info)

    return x, y, vx, vy, step_infos


def estimate_drag_coefficient(
    t_obs: np.ndarray,
    x_obs: np.ndarray,
    y_obs: np.ndarray,
    v0: float,
    theta0_deg: float,
    mass: float,
    cross_section_area: float,
    wind_speed: float = 0.0,
    wind_direction_deg: float = 0.0,
    x0: float = 0.0,
    y0: float = 0.0,
    cd_bounds: Tuple[float, float] = (0.01, 2.0),
) -> Tuple[float, float, float, Dict[str, any]]:
    """
    从观测轨迹估计风阻系数 (最小二乘法)

    优化目标: 最小化 sqrt( (x_sim - x_obs)^2 + (y_sim - y_obs)^2 ) 的均值

    参数:
        t_obs: 观测时间点, 单位: s
        x_obs: 观测x坐标, 单位: m
        y_obs: 观测y坐标, 单位: m
        v0: 初速度, 单位: m/s
        theta0_deg: 初角度, 单位: deg
        mass: 质量, 单位: kg
        cross_section_area: 横截面积, 单位: m^2
        wind_speed: 风速, 单位: m/s
        wind_direction_deg: 风向, 单位: deg
        cd_bounds: 风阻系数搜索范围
        x0, y0: 初始位置, 单位: m

    返回:
        (最佳风阻系数, R², RMSE, 中间量字典)
    """
    from scipy.optimize import minimize_scalar

    def objective(cd):
        x_sim, y_sim, _, _, _ = simulate_projectile(
            t_obs, v0, theta0_deg, mass, cd, cross_section_area,
            wind_speed, wind_direction_deg, x0, y0
        )
        residuals = np.sqrt((x_sim - x_obs)**2 + (y_sim - y_obs)**2)
        return np.mean(residuals)

    result = minimize_scalar(objective, bounds=cd_bounds, method='bounded')
    best_cd = result.x

    x_sim, y_sim, _, _, _ = simulate_projectile(
        t_obs, v0, theta0_deg, mass, best_cd, cross_section_area,
        wind_speed, wind_direction_deg, x0, y0
    )

    ss_res = np.sum((x_obs - x_sim)**2 + (y_obs - y_sim)**2)
    ss_tot = np.sum(
        (x_obs - np.mean(x_obs))**2 + (y_obs - np.mean(y_obs))**2
    )
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    rmse = np.sqrt(np.mean((x_obs - x_sim)**2 + (y_obs - y_sim)**2))

    intermediate = {
        "v0": v0,
        "theta0_deg": theta0_deg,
        "mass": mass,
        "cross_section_area": cross_section_area,
        "wind_speed": wind_speed,
        "wind_direction_deg": wind_direction_deg,
        "cd_bounds_min": cd_bounds[0],
        "cd_bounds_max": cd_bounds[1],
        "best_cd": best_cd,
        "r_squared": r_squared,
        "rmse": rmse,
        "n_points": len(t_obs),
    }
    intermediate_units = {
        "v0": "m/s",
        "theta0_deg": "deg",
        "mass": "kg",
        "cross_section_area": "m^2",
        "wind_speed": "m/s",
        "wind_direction_deg": "deg",
        "cd_bounds_min": "dimensionless",
        "cd_bounds_max": "dimensionless",
        "best_cd": "dimensionless",
        "r_squared": "dimensionless",
        "rmse": "m",
        "n_points": "count",
    }

    return best_cd, r_squared, rmse, {"values": intermediate, "units": intermediate_units}


def compute_trajectory_angles(
    vx: np.ndarray,
    vy: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    从速度计算轨迹角

    公式:
        θ = arctan2(vy, vx)

    参数:
        vx: x方向速度, 单位: m/s
        vy: y方向速度, 单位: m/s

    返回:
        (角度_deg, 角度_rad)
    """
    theta_rad = np.arctan2(vy, vx)
    theta_deg = np.rad2deg(theta_rad)
    return theta_deg, theta_rad


def fit_trajectory_polynomial(
    t: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    degree: int = 2,
) -> Tuple[Dict[str, np.poly1d], float, float, Dict[str, any]]:
    """
    多项式拟合轨迹

    拟合:
        x(t) = a_n * t^n + ... + a_1 * t + a_0
        y(t) = b_n * t^n + ... + b_1 * t + b_0

    参数:
        t: 时间点, 单位: s
        x: x坐标, 单位: m
        y: y坐标, 单位: m
        degree: 多项式阶数

    返回:
        (拟和函数字典, R², RMSE, 中间量)
    """
    coeffs_x = np.polyfit(t, x, degree)
    coeffs_y = np.polyfit(t, y, degree)

    poly_x = np.poly1d(coeffs_x)
    poly_y = np.poly1d(coeffs_y)

    x_fit = poly_x(t)
    y_fit = poly_y(t)

    ss_res_x = np.sum((x - x_fit)**2)
    ss_tot_x = np.sum((x - np.mean(x))**2)
    r_squared_x = 1 - (ss_res_x / ss_tot_x) if ss_tot_x > 0 else 0.0

    ss_res_y = np.sum((y - y_fit)**2)
    ss_tot_y = np.sum((y - np.mean(y))**2)
    r_squared_y = 1 - (ss_res_y / ss_tot_y) if ss_tot_y > 0 else 0.0

    r_squared = (r_squared_x + r_squared_y) / 2
    rmse = np.sqrt(np.mean((x - x_fit)**2 + (y - y_fit)**2))

    intermediate = {
        "degree": degree,
        "coeffs_x": coeffs_x.tolist(),
        "coeffs_y": coeffs_y.tolist(),
        "r_squared_x": r_squared_x,
        "r_squared_y": r_squared_y,
        "r_squared": r_squared,
        "rmse": rmse,
    }

    return {"x": poly_x, "y": poly_y}, r_squared, rmse, intermediate


FORMULAS = {
    "projectile_no_drag": {
        "name": "无风阻抛体运动",
        "equations": [
            "x(t) = x₀ + v₀·cos(θ₀)·t",
            "y(t) = y₀ + v₀·sin(θ₀)·t - ½·g·t²",
            "vₓ(t) = v₀·cos(θ₀)",
            "vᵧ(t) = v₀·sin(θ₀) - g·t",
        ],
        "parameters": {
            "x₀": "初始x坐标, 单位: m",
            "y₀": "初始y坐标, 单位: m",
            "v₀": "初速度, 单位: m/s",
            "θ₀": "初始抛射角, 单位: deg",
            "g": f"重力加速度, 单位: m/s² (固定值: {GRAVITY})",
        },
    },
    "drag_force": {
        "name": "风阻力",
        "equations": [
            "F_drag = ½·ρ·C_d·A·|v_rel|²",
            "v_rel = v_projectile - v_wind",
        ],
        "parameters": {
            "ρ": f"空气密度, 单位: kg/m³ (固定值: {AIR_DENSITY})",
            "C_d": "风阻系数, 无量纲",
            "A": "横截面积, 单位: m²",
            "v_rel": "相对速度, 单位: m/s",
        },
    },
    "drag_acceleration": {
        "name": "风阻加速度",
        "equations": [
            "a_drag = -F_drag / m · (v_rel / |v_rel|)",
        ],
        "parameters": {
            "m": "质量, 单位: kg",
        },
    },
    "trajectory_angle": {
        "name": "轨迹角",
        "equations": [
            "θ = arctan2(vᵧ, vₓ)",
        ],
        "parameters": {
            "vₓ": "x方向速度, 单位: m/s",
            "vᵧ": "y方向速度, 单位: m/s",
        },
    },
}
