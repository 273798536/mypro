"""
预设场景模块
============

提供多种预设的双星系统场景，方便快速测试和演示。

每个预设包含:
- 星体参数（质量、半径、初始位置、初始速度）
- 模拟配置（时间步长、积分方法等）
- 场景说明
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import numpy as np

from .physics import Body, G, circular_velocity, escape_velocity
from .simulator import SimulationConfig


@dataclass
class Preset:
    """预设场景"""
    name: str
    description: str
    bodies: List[Body]
    config: SimulationConfig
    expected_behavior: str = ""
    reference: str = ""


PRESETS: Dict[str, Preset] = {}


def register_preset(name: str):
    """预设注册装饰器"""
    def decorator(func):
        preset = func()
        preset.name = name
        PRESETS[name] = preset
        return func
    return decorator


@register_preset("sun_earth")
def sun_earth() -> Preset:
    """太阳-地球系统（近似圆轨道）"""
    m_sun = 1.0
    m_earth = 3.0e-6
    
    distance = 1.0
    v_circ = circular_velocity(m_sun, distance)
    
    earth = Body(
        mass=m_earth,
        pos=[distance, 0.0],
        vel=[0.0, v_circ],
        radius=4.26e-5,
        name="地球",
        color="blue"
    )
    
    sun = Body(
        mass=m_sun,
        pos=[0.0, 0.0],
        vel=[0.0, 0.0],
        radius=0.00465,
        name="太阳",
        color="orange"
    )
    
    config = SimulationConfig(
        dt=0.01,
        max_steps=10000,
        method='rk4',
        energy_drift_threshold=0.05
    )
    
    return Preset(
        name="sun_earth",
        description="太阳-地球系统，1 AU距离的近似圆轨道",
        bodies=[sun, earth],
        config=config,
        expected_behavior="地球绕太阳做近似圆轨道运动，周期约1年",
        reference="开普勒第三定律: T² = a³"
    )


@register_preset("sun_jupiter")
def sun_jupiter() -> Preset:
    """太阳-木星系统"""
    m_sun = 1.0
    m_jupiter = 9.5e-4
    
    distance = 5.2
    v_circ = circular_velocity(m_sun, distance)
    
    jupiter = Body(
        mass=m_jupiter,
        pos=[distance, 0.0],
        vel=[0.0, v_circ],
        radius=3.36e-4,
        name="木星",
        color="sandybrown"
    )
    
    sun = Body(
        mass=m_sun,
        pos=[0.0, 0.0],
        vel=[0.0, 0.0],
        radius=0.00465,
        name="太阳",
        color="orange"
    )
    
    config = SimulationConfig(
        dt=0.05,
        max_steps=20000,
        method='rk4',
        energy_drift_threshold=0.05
    )
    
    return Preset(
        name="sun_jupiter",
        description="太阳-木星系统，5.2 AU距离",
        bodies=[sun, jupiter],
        config=config,
        expected_behavior="木星绕太阳运动，周期约11.86年",
        reference="木星轨道半长轴5.2 AU，周期11.86年"
    )


@register_preset("binary_equal")
def binary_equal() -> Preset:
    """等质量双星系统"""
    m1 = 1.0
    m2 = 1.0
    
    distance = 2.0
    total_mass = m1 + m2
    
    v = np.sqrt(G * m2 / (4 * distance))
    
    body1 = Body(
        mass=m1,
        pos=[distance, 0.0],
        vel=[0.0, v],
        radius=0.00465,
        name="星体A",
        color="orange"
    )
    
    body2 = Body(
        mass=m2,
        pos=[-distance, 0.0],
        vel=[0.0, -v],
        radius=0.00465,
        name="星体B",
        color="blue"
    )
    
    config = SimulationConfig(
        dt=0.05,
        max_steps=10000,
        method='rk4',
        energy_drift_threshold=0.05
    )
    
    return Preset(
        name="binary_equal",
        description="等质量双星系统，两星绕质心运动",
        bodies=[body1, body2],
        config=config,
        expected_behavior="两星绕共同质心做圆轨道运动，周期可由开普勒第三定律计算",
        reference="双星系统质心位于两星连线中点"
    )


@register_preset("high_eccentricity")
def high_eccentricity() -> Preset:
    """高偏心率椭圆轨道"""
    m_sun = 1.0
    m_planet = 1e-5
    
    perihelion = 0.5
    aphelion = 5.0
    a = (perihelion + aphelion) / 2
    e = (aphelion - perihelion) / (aphelion + perihelion)
    
    v_perihelion = np.sqrt(G * m_sun * (1 + e) / (a * (1 - e)))
    
    planet = Body(
        mass=m_planet,
        pos=[perihelion, 0.0],
        vel=[0.0, v_perihelion],
        radius=1e-4,
        name="行星",
        color="green"
    )
    
    sun = Body(
        mass=m_sun,
        pos=[0.0, 0.0],
        vel=[0.0, 0.0],
        radius=0.00465,
        name="太阳",
        color="orange"
    )
    
    config = SimulationConfig(
        dt=0.01,
        max_steps=50000,
        method='verlet',
        energy_drift_threshold=0.05
    )
    
    return Preset(
        name="high_eccentricity",
        description=f"高偏心率(e={e:.2f})椭圆轨道，近日点0.5AU，远日点5.0AU",
        bodies=[sun, planet],
        config=config,
        expected_behavior="行星沿椭圆轨道运动，近日点速度快，远日点速度慢",
        reference="开普勒第二定律（面积速度守恒）"
    )


@register_preset("near_escape")
def near_escape() -> Preset:
    """接近逃逸速度的轨道"""
    m_sun = 1.0
    m_body = 1e-5
    
    distance = 1.0
    v_circ = circular_velocity(m_sun, distance)
    v_esc = escape_velocity(m_sun, distance)
    v = 0.99 * v_esc
    
    body = Body(
        mass=m_body,
        pos=[distance, 0.0],
        vel=[0.0, v],
        radius=1e-4,
        name="探测器",
        color="red"
    )
    
    sun = Body(
        mass=m_sun,
        pos=[0.0, 0.0],
        vel=[0.0, 0.0],
        radius=0.00465,
        name="太阳",
        color="orange"
    )
    
    config = SimulationConfig(
        dt=0.02,
        max_steps=20000,
        method='rk4',
        energy_drift_threshold=0.05,
        escape_distance=50.0
    )
    
    return Preset(
        name="near_escape",
        description=f"接近逃逸速度（{v/v_esc*100:.1f}%逃逸速度）的双曲线轨道",
        bodies=[sun, body],
        config=config,
        expected_behavior="星体将沿双曲线轨道飞离，不会返回",
        reference="逃逸速度 v_esc = √(2GM/r), 圆轨道速度 v_c = √(GM/r)"
    )


@register_preset("collision_course")
def collision_course() -> Preset:
    """会发生碰撞的轨道（直接碰撞）"""
    m1 = 1.0
    m2 = 0.5
    
    distance = 0.1
    
    body1 = Body(
        mass=m1,
        pos=[0.0, 0.0],
        vel=[0.0, 0.0],
        radius=0.00465,
        name="星体A",
        color="orange"
    )
    
    body2 = Body(
        mass=m2,
        pos=[distance, 0.0],
        vel=[-0.5, 0.0],
        radius=0.00465,
        name="星体B",
        color="red"
    )
    
    config = SimulationConfig(
        dt=0.001,
        max_steps=10000,
        method='rk4',
        energy_drift_threshold=0.05,
        collision_detection=True,
        auto_stop_on_collision=True
    )
    
    return Preset(
        name="collision_course",
        description="两星直接相向运动，将发生碰撞",
        bodies=[body1, body2],
        config=config,
        expected_behavior="两星将在短时间内发生碰撞，模拟自动停止",
        reference="碰撞检测阈值为两星半径之和"
    )


@register_preset("unstable_euler")
def unstable_euler() -> Preset:
    """演示欧拉法能量漂移的场景"""
    m_sun = 1.0
    m_planet = 1e-5
    
    distance = 1.0
    v_circ = circular_velocity(m_sun, distance)
    
    planet = Body(
        mass=m_planet,
        pos=[distance, 0.0],
        vel=[0.0, v_circ],
        radius=1e-4,
        name="行星",
        color="blue"
    )
    
    sun = Body(
        mass=m_sun,
        pos=[0.0, 0.0],
        vel=[0.0, 0.0],
        radius=0.00465,
        name="太阳",
        color="orange"
    )
    
    config = SimulationConfig(
        dt=0.1,
        max_steps=5000,
        method='euler',
        energy_drift_threshold=0.01
    )
    
    return Preset(
        name="unstable_euler",
        description="使用欧拉法和较大时间步长，演示能量漂移现象",
        bodies=[sun, planet],
        config=config,
        expected_behavior="轨道会逐渐扩张，能量漂移明显，展示欧拉法的局限性",
        reference="欧拉法是一阶方法，能量不守恒，长期积分会发散"
    )


@register_preset("three_body_test")
def three_body_test() -> Preset:
    """双星系统测试（可扩展为三体）"""
    m1 = 1.0
    m2 = 0.5
    
    distance = 2.0
    v_circ = circular_velocity(m1, distance)
    
    body1 = Body(
        mass=m1,
        pos=[0.0, 0.0],
        vel=[0.0, 0.0],
        radius=0.00465,
        name="主星",
        color="orange"
    )
    
    body2 = Body(
        mass=m2,
        pos=[distance, 0.0],
        vel=[0.0, v_circ],
        radius=0.00465,
        name="伴星",
        color="blue"
    )
    
    config = SimulationConfig(
        dt=0.02,
        max_steps=20000,
        method='verlet',
        energy_drift_threshold=0.05
    )
    
    return Preset(
        name="three_body_test",
        description="基础双星系统测试，可作为三体系统的起点",
        bodies=[body1, body2],
        config=config,
        expected_behavior="伴星绕主星做圆轨道运动",
        reference=""
    )


def list_presets() -> List[str]:
    """列出所有可用预设"""
    return list(PRESETS.keys())


def get_preset(name: str) -> Optional[Preset]:
    """获取指定预设"""
    return PRESETS.get(name)


def print_preset_info(name: str):
    """打印预设信息"""
    preset = get_preset(name)
    if not preset:
        print(f"预设 '{name}' 不存在")
        print(f"可用预设: {', '.join(list_presets())}")
        return
    
    print("=" * 60)
    print(f"预设: {preset.name}")
    print("=" * 60)
    print(f"描述: {preset.description}")
    print()
    print("星体参数:")
    for i, body in enumerate(preset.bodies):
        print(f"  星体{i+1} ({body.name}):")
        print(f"    质量: {body.mass} M☉")
        print(f"    位置: ({body.pos[0]:.4f}, {body.pos[1]:.4f}) AU")
        print(f"    速度: ({body.vel[0]:.4f}, {body.vel[1]:.4f}) AU/年")
        print(f"    半径: {body.radius:.6f} AU")
    print()
    print("模拟配置:")
    print(f"  时间步长: {preset.config.dt} 年")
    print(f"  最大步数: {preset.config.max_steps}")
    print(f"  积分方法: {preset.config.method}")
    print(f"  能量漂移阈值: {preset.config.energy_drift_threshold*100:.0f}%")
    print()
    if preset.expected_behavior:
        print(f"预期行为: {preset.expected_behavior}")
    if preset.reference:
        print(f"参考: {preset.reference}")
    print("=" * 60)
