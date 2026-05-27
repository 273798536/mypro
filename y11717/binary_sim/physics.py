"""
物理计算核心模块
================

包含引力计算、数值积分器、能量计算、碰撞检测等核心物理功能。

使用的单位系统（天文单位制）：
- 长度：天文单位 AU (1 AU ≈ 1.496e11 m)
- 质量：太阳质量 M☉ (1 M☉ ≈ 1.989e30 kg)
- 时间：年 yr (1 yr ≈ 3.154e7 s)
- 速度：AU/yr
- 能量：M☉·AU²/yr²

在这个单位制下，万有引力常数 G = 4π² ≈ 39.478
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Tuple, Optional

G = 4 * np.pi ** 2  # 万有引力常数（天文单位制）
AU_TO_M = 1.496e11  # 1 AU = 1.496e11 米
M_SUN_TO_KG = 1.989e30  # 1太阳质量 = 1.989e30 千克
YR_TO_S = 3.154e7  # 1年 = 3.154e7 秒


@dataclass
class Body:
    """
    星体数据类
    
    Attributes:
        mass: 质量（太阳质量单位）
        pos: 位置向量 [x, y] (AU)
        vel: 速度向量 [vx, vy] (AU/yr)
        radius: 星体半径（AU），用于碰撞检测
        name: 星体名称
        color: 动画显示颜色
    """
    mass: float
    pos: np.ndarray
    vel: np.ndarray
    radius: float = 0.00465  # 太阳半径约0.00465 AU
    name: str = "星体"
    color: str = "orange"
    
    def __post_init__(self):
        self.pos = np.array(self.pos, dtype=np.float64)
        self.vel = np.array(self.vel, dtype=np.float64)


def gravitational_force(body1: Body, body2: Body) -> np.ndarray:
    """
    计算两个星体之间的万有引力
    
    公式: F = G * m1 * m2 / r² * r̂
    
    Args:
        body1: 星体1
        body2: 星体2
    
    Returns:
        作用在body1上的力向量 (AU·M☉/yr²)
        
    修正记录:
        v1.0: 初始实现，使用向量运算避免数值不稳定
    """
    r = body2.pos - body1.pos
    distance = np.linalg.norm(r)
    
    if distance < 1e-10:
        raise ValueError(f"星体距离过近: {distance:.2e} AU，可能发生碰撞")
    
    force_magnitude = G * body1.mass * body2.mass / (distance ** 2)
    force_direction = r / distance
    
    return force_magnitude * force_direction


def acceleration(body: Body, other_bodies: List[Body]) -> np.ndarray:
    """
    计算星体受到的总加速度
    
    Args:
        body: 待计算加速度的星体
        other_bodies: 其他星体列表
    
    Returns:
        加速度向量 (AU/yr²)
    """
    total_force = np.zeros(2)
    for other in other_bodies:
        if other is not body:
            total_force += gravitational_force(body, other)
    return total_force / body.mass


def total_kinetic_energy(bodies: List[Body]) -> float:
    """
    计算系统总动能
    
    公式: KE = Σ (1/2) * m * v²
    
    Args:
        bodies: 星体列表
    
    Returns:
        总动能 (M☉·AU²/yr²)
    """
    ke = 0.0
    for body in bodies:
        speed_sq = np.dot(body.vel, body.vel)
        ke += 0.5 * body.mass * speed_sq
    return ke


def total_potential_energy(bodies: List[Body]) -> float:
    """
    计算系统总引力势能
    
    公式: PE = -Σ Σ (G * m_i * m_j) / r_ij  (i < j)
    
    Args:
        bodies: 星体列表
    
    Returns:
        总势能 (M☉·AU²/yr²)
    """
    pe = 0.0
    n = len(bodies)
    for i in range(n):
        for j in range(i + 1, n):
            r = np.linalg.norm(bodies[j].pos - bodies[i].pos)
            pe -= G * bodies[i].mass * bodies[j].mass / r
    return pe


def total_energy(bodies: List[Body]) -> float:
    """
    计算系统总机械能
    
    公式: E = KE + PE
    
    Args:
        bodies: 星体列表
    
    Returns:
        总机械能 (M☉·AU²/yr²)
    """
    return total_kinetic_energy(bodies) + total_potential_energy(bodies)


def check_collision(body1: Body, body2: Body) -> Tuple[bool, float]:
    """
    检测两个星体是否发生碰撞
    
    Args:
        body1: 星体1
        body2: 星体2
    
    Returns:
        (是否碰撞, 当前距离)
    """
    distance = np.linalg.norm(body2.pos - body1.pos)
    min_distance = body1.radius + body2.radius
    return distance < min_distance, distance


def orbital_period(body: Body, central_mass: float, semi_major_axis: float) -> float:
    """
    计算轨道周期（开普勒第三定律）
    
    公式: T² = (4π²/G) * a³ / (M1 + M2)
    
    Args:
        body: 绕行星体
        central_mass: 中心天体质量
        semi_major_axis: 轨道半长轴
    
    Returns:
        轨道周期（年）
    """
    return 2 * np.pi * np.sqrt(semi_major_axis ** 3 / (G * (central_mass + body.mass)))


def circular_velocity(central_mass: float, distance: float) -> float:
    """
    计算圆轨道速度
    
    公式: v = √(G * M / r)
    
    Args:
        central_mass: 中心天体质量
        distance: 轨道半径
    
    Returns:
        圆轨道速度 (AU/yr)
    """
    return np.sqrt(G * central_mass / distance)


def escape_velocity(central_mass: float, distance: float) -> float:
    """
    计算逃逸速度
    
    公式: v_esc = √(2 * G * M / r)
    
    Args:
        central_mass: 中心天体质量
        distance: 当前距离
    
    Returns:
        逃逸速度 (AU/yr)
    """
    return np.sqrt(2 * G * central_mass / distance)


def euler_step(bodies: List[Body], dt: float) -> None:
    """
    欧拉法积分（一阶）
    
    公式:
        x(t+dt) = x(t) + v(t) * dt
        v(t+dt) = v(t) + a(t) * dt
    
    注意: 欧拉法简单但精度低，能量不守恒，只适用于演示
    
    Args:
        bodies: 星体列表（会被修改）
        dt: 时间步长
    """
    accelerations = [acceleration(body, bodies) for body in bodies]
    
    for i, body in enumerate(bodies):
        body.pos += body.vel * dt
        body.vel += accelerations[i] * dt


def rk4_step(bodies: List[Body], dt: float) -> None:
    """
    四阶龙格-库塔法（RK4）积分
    
    高精度积分方法，能量守恒性好于欧拉法
    
    Args:
        bodies: 星体列表（会被修改）
        dt: 时间步长
    """
    original_states = [(body.pos.copy(), body.vel.copy()) for body in bodies]
    
    def get_derivatives(positions, velocities):
        temp_bodies = []
        for i, body in enumerate(bodies):
            temp_body = Body(
                mass=body.mass,
                pos=positions[i],
                vel=velocities[i],
                radius=body.radius
            )
            temp_bodies.append(temp_body)
        
        accs = [acceleration(b, temp_bodies) for b in temp_bodies]
        return velocities, accs
    
    pos0 = [s[0] for s in original_states]
    vel0 = [s[1] for s in original_states]
    
    k1_v, k1_a = get_derivatives(pos0, vel0)
    
    pos2 = [pos0[i] + 0.5 * dt * k1_v[i] for i in range(len(bodies))]
    vel2 = [vel0[i] + 0.5 * dt * k1_a[i] for i in range(len(bodies))]
    k2_v, k2_a = get_derivatives(pos2, vel2)
    
    pos3 = [pos0[i] + 0.5 * dt * k2_v[i] for i in range(len(bodies))]
    vel3 = [vel0[i] + 0.5 * dt * k2_a[i] for i in range(len(bodies))]
    k3_v, k3_a = get_derivatives(pos3, vel3)
    
    pos4 = [pos0[i] + dt * k3_v[i] for i in range(len(bodies))]
    vel4 = [vel0[i] + dt * k3_a[i] for i in range(len(bodies))]
    k4_v, k4_a = get_derivatives(pos4, vel4)
    
    for i, body in enumerate(bodies):
        body.pos = pos0[i] + (dt / 6.0) * (k1_v[i] + 2*k2_v[i] + 2*k3_v[i] + k4_v[i])
        body.vel = vel0[i] + (dt / 6.0) * (k1_a[i] + 2*k2_a[i] + 2*k3_a[i] + k4_a[i])


def verlet_step(bodies: List[Body], dt: float, prev_accelerations: Optional[List[np.ndarray]] = None) -> List[np.ndarray]:
    """
    Verlet积分（速度形式）
    
    辛积分算法，长期能量守恒性好，适合天体力学模拟
    
    公式:
        x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
        v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
    
    Args:
        bodies: 星体列表（会被修改）
        dt: 时间步长
        prev_accelerations: 上一步的加速度（首次调用时为None）
    
    Returns:
        当前步的加速度，供下一步使用
    """
    if prev_accelerations is None:
        acc = [acceleration(body, bodies) for body in bodies]
    else:
        acc = prev_accelerations
    
    for i, body in enumerate(bodies):
        body.pos += body.vel * dt + 0.5 * acc[i] * dt * dt
    
    new_acc = [acceleration(body, bodies) for body in bodies]
    
    for i, body in enumerate(bodies):
        body.vel += 0.5 * (acc[i] + new_acc[i]) * dt
    
    return new_acc


def get_integrator(method: str):
    """
    获取积分器函数
    
    Args:
        method: 积分方法名称 ('euler', 'rk4', 'verlet')
    
    Returns:
        积分器函数
    """
    integrators = {
        'euler': euler_step,
        'rk4': rk4_step,
        'verlet': verlet_step,
    }
    
    if method not in integrators:
        raise ValueError(f"未知的积分方法: {method}，可选: {list(integrators.keys())}")
    
    return integrators[method]


def suggest_timestep(bodies: List[Body], method: str = 'rk4') -> float:
    """
    建议合适的时间步长
    
    根据轨道周期和积分方法建议时间步长：
    - 欧拉法: 周期的1/1000或更小
    - RK4: 周期的1/100
    - Verlet: 周期的1/50
    
    Args:
        bodies: 星体列表
        method: 积分方法
    
    Returns:
        建议的时间步长（年）
    """
    if len(bodies) < 2:
        return 0.01
    
    r = np.linalg.norm(bodies[1].pos - bodies[0].pos)
    total_mass = bodies[0].mass + bodies[1].mass
    
    period = 2 * np.pi * np.sqrt(r ** 3 / (G * total_mass))
    
    factors = {
        'euler': 1000,
        'rk4': 100,
        'verlet': 50,
    }
    
    factor = factors.get(method, 100)
    suggested_dt = period / factor
    
    return max(suggested_dt, 1e-6)
