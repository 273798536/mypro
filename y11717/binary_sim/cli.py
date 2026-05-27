"""
命令行界面模块
==============

提供双星轨道模拟器的命令行接口。

使用示例:
    python -m binary_sim.cli --preset sun_earth
    python -m binary_sim.cli --m1 1.0 --m2 0.001 --distance 1.0 --v2 6.28 --dt 0.01 --steps 1000
    python -m binary_sim.cli --preset unstable_euler --animate --export orbit.gif
"""

import argparse
import sys
import os
import numpy as np
from typing import List, Optional

from .physics import Body, circular_velocity, G
from .simulator import BinarySimulator, SimulationConfig, SimulationStatus
from .animation import BinaryAnimator, AnimationConfig
from .analysis import OrbitAnalyzer
from .presets import list_presets, get_preset, print_preset_info


def create_parser() -> argparse.ArgumentParser:
    """创建命令行解析器"""
    parser = argparse.ArgumentParser(
        description="天文双星轨道模拟器 - 模拟双星系统的轨道运动",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  1. 使用预设场景:
     python -m binary_sim.cli --preset sun_earth
     python -m binary_sim.cli --preset binary_equal --animate
     
  2. 自定义参数:
     python -m binary_sim.cli --m1 1.0 --m2 0.001 --distance 1.0 --v2 6.28
     
  3. 导出结果:
     python -m binary_sim.cli --preset high_eccentricity --export orbit.gif --report report.json
     
  4. 列出所有预设:
     python -m binary_sim.cli --list-presets
     
  5. 查看预设详情:
     python -m binary_sim.cli --preset-info sun_earth
        """
    )
    
    parser.add_argument('--preset', type=str, default=None,
                       help=f'使用预设场景，可选: {", ".join(list_presets())}')
    parser.add_argument('--list-presets', action='store_true',
                       help='列出所有可用预设')
    parser.add_argument('--preset-info', type=str, default=None,
                       help='查看指定预设的详细信息')
    
    group = parser.add_argument_group('星体参数')
    group.add_argument('--m1', type=float, default=None,
                       help='星体1质量（太阳质量单位）')
    group.add_argument('--m2', type=float, default=None,
                       help='星体2质量（太阳质量单位）')
    group.add_argument('--distance', type=float, default=None,
                       help='初始距离（AU）')
    group.add_argument('--v1', type=float, default=0.0,
                       help='星体1初始速度大小（AU/年），默认0')
    group.add_argument('--v2', type=float, default=None,
                       help='星体2初始速度大小（AU/年），不指定则使用圆轨道速度')
    group.add_argument('--angle', type=float, default=90.0,
                       help='速度方向与连线的夹角（度），默认90度（圆轨道）')
    group.add_argument('--r1', type=float, default=0.00465,
                       help='星体1半径（AU），默认太阳半径')
    group.add_argument('--r2', type=float, default=0.00465,
                       help='星体2半径（AU），默认太阳半径')
    group.add_argument('--name1', type=str, default='星体1',
                       help='星体1名称')
    group.add_argument('--name2', type=str, default='星体2',
                       help='星体2名称')
    group.add_argument('--color1', type=str, default='orange',
                       help='星体1颜色')
    group.add_argument('--color2', type=str, default='blue',
                       help='星体2颜色')
    
    group = parser.add_argument_group('模拟参数')
    group.add_argument('--dt', type=float, default=None,
                       help='时间步长（年），不指定则自动计算建议值')
    group.add_argument('--steps', type=int, default=10000,
                       help='模拟步数，默认10000')
    group.add_argument('--method', type=str, default='rk4',
                       choices=['euler', 'rk4', 'verlet'],
                       help='积分方法，默认rk4')
    group.add_argument('--energy-threshold', type=float, default=0.05,
                       help='能量漂移报警阈值（比例），默认0.05')
    group.add_argument('--no-collision', action='store_true',
                       help='关闭碰撞检测')
    group.add_argument('--escape-distance', type=float, default=100.0,
                       help='逃逸检测距离阈值（AU），默认100')
    
    group = parser.add_argument_group('输出选项')
    group.add_argument('--animate', action='store_true',
                       help='显示动画')
    group.add_argument('--export', type=str, default=None,
                       help='导出动画到文件（.gif, .mp4等）')
    group.add_argument('--static-plot', type=str, default=None,
                       help='导出静态轨道图到文件')
    group.add_argument('--report', type=str, default=None,
                       help='导出分析报告到JSON文件')
    group.add_argument('--no-summary', action='store_true',
                       help='不打印模拟摘要')
    group.add_argument('--show-events', action='store_true',
                       help='显示所有事件记录')
    
    group = parser.add_argument_group('动画参数')
    group.add_argument('--no-energy-plot', action='store_true',
                       help='不显示能量图表')
    group.add_argument('--no-distance-plot', action='store_true',
                       help='不显示距离图表')
    group.add_argument('--show-vectors', action='store_true',
                       help='显示速度向量')
    group.add_argument('--speed', type=float, default=1.0,
                       help='动画速度倍率，默认1.0')
    group.add_argument('--fps', type=int, default=30,
                       help='导出动画的帧率，默认30')
    
    return parser


def create_bodies_from_args(args) -> List[Body]:
    """根据命令行参数创建星体"""
    if args.preset:
        preset = get_preset(args.preset)
        if not preset:
            print(f"错误: 预设 '{args.preset}' 不存在")
            print(f"可用预设: {', '.join(list_presets())}")
            sys.exit(1)
        bodies = []
        for b in preset.bodies:
            bodies.append(Body(
                mass=b.mass,
                pos=b.pos.copy(),
                vel=b.vel.copy(),
                radius=b.radius,
                name=b.name,
                color=b.color
            ))
        return bodies
    
    if args.m1 is None or args.m2 is None or args.distance is None:
        print("错误: 自定义参数时必须指定 --m1, --m2, --distance")
        sys.exit(1)
    
    angle_rad = args.angle * 3.1415926535 / 180.0
    
    if args.v2 is None:
        v2 = circular_velocity(args.m1, args.distance)
    else:
        v2 = args.v2
    
    body1 = Body(
        mass=args.m1,
        pos=[0.0, 0.0],
        vel=[0.0, args.v1],
        radius=args.r1,
        name=args.name1,
        color=args.color1
    )
    
    vx2 = -v2 * np.sin(angle_rad)
    vy2 = v2 * np.cos(angle_rad)
    
    body2 = Body(
        mass=args.m2,
        pos=[args.distance, 0.0],
        vel=[vx2, vy2],
        radius=args.r2,
        name=args.name2,
        color=args.color2
    )
    
    return [body1, body2]


def create_config_from_args(args) -> SimulationConfig:
    """根据命令行参数创建模拟配置"""
    if args.preset:
        preset = get_preset(args.preset)
        if preset:
            config = SimulationConfig()
            config.dt = preset.config.dt
            config.max_steps = preset.config.max_steps
            config.method = preset.config.method
            config.energy_drift_threshold = preset.config.energy_drift_threshold
            if args.dt is not None:
                config.dt = args.dt
            if args.method != 'rk4':
                config.method = args.method
            if args.steps != 10000:
                config.max_steps = args.steps
            config.energy_drift_threshold = args.energy_threshold
            config.collision_detection = not args.no_collision
            config.escape_distance = args.escape_distance
            return config
    
    config = SimulationConfig()
    config.max_steps = args.steps
    config.method = args.method
    config.energy_drift_threshold = args.energy_threshold
    config.collision_detection = not args.no_collision
    config.escape_distance = args.escape_distance
    
    if args.dt is not None:
        config.dt = args.dt
    
    return config


def main():
    """主函数"""
    parser = create_parser()
    args = parser.parse_args()
    
    if args.list_presets:
        print("可用预设场景:")
        for name in list_presets():
            preset = get_preset(name)
            print(f"  {name:<20} - {preset.description}")
        return
    
    if args.preset_info:
        print_preset_info(args.preset_info)
        return
    
    bodies = create_bodies_from_args(args)
    config = create_config_from_args(args)
    
    sim = BinarySimulator(bodies, config)
    
    if args.dt is None and not args.preset:
        suggested = sim.validate_timestep()
        config.dt = suggested['suggested_dt']
        print(f"自动设置时间步长: {config.dt:.6f} 年")
    
    print(f"\n开始模拟...")
    print(f"积分方法: {config.method}")
    print(f"时间步长: {config.dt:.6f} 年")
    print(f"最大步数: {config.max_steps}")
    print(f"星体1: {bodies[0].name} (质量: {bodies[0].mass} M☉)")
    print(f"星体2: {bodies[1].name} (质量: {bodies[1].mass} M☉)")
    print()
    
    status = sim.run()
    
    print(f"模拟完成，状态: {status.value}")
    print(f"总步数: {sim.current_step}")
    print(f"总时间: {sim.current_time:.4f} 年")
    print()
    
    if not args.no_summary:
        analyzer = OrbitAnalyzer(sim)
        report = analyzer.analyze()
        report.print_summary()
    
    if args.show_events:
        sim.print_events()
    
    if args.report:
        analyzer = OrbitAnalyzer(sim)
        report = analyzer.analyze()
        report.save(args.report)
    
    anim_config = AnimationConfig()
    anim_config.show_energy = not args.no_energy_plot
    anim_config.show_distance = not args.no_distance_plot
    anim_config.show_vectors = args.show_vectors
    anim_config.speed = args.speed
    
    if args.export or args.animate or args.static_plot:
        animator = BinaryAnimator(sim, anim_config)
    
    if args.static_plot:
        animator.plot_static(args.static_plot)
    
    if args.export:
        animator.save(args.export, fps=args.fps)
    
    if args.animate:
        animator.show()


if __name__ == '__main__':
    main()
