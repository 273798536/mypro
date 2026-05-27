"""
动画和可视化模块
================

提供双星系统的轨道动画、能量图表、距离图表等可视化功能。
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Circle
from typing import Optional, List, Tuple
from dataclasses import dataclass

from .simulator import BinarySimulator, SimulationStatus


@dataclass
class AnimationConfig:
    """动画配置"""
    show_trajectory: bool = True
    trajectory_length: int = 500
    show_energy: bool = True
    show_distance: bool = True
    show_vectors: bool = False
    vector_scale: float = 0.05
    trail_alpha: float = 0.3
    body_size: float = 100
    figsize: Tuple[int, int] = (14, 10)
    dpi: int = 100
    interval: int = 20
    speed: float = 1.0


class BinaryAnimator:
    """
    双星系统动画生成器
    
    示例:
        >>> animator = BinaryAnimator(simulator)
        >>> animator.show()  # 显示动画
        >>> animator.save('orbit.gif')  # 保存动画
    """
    
    def __init__(self, simulator: BinarySimulator, config: Optional[AnimationConfig] = None):
        self.simulator = simulator
        self.config = config or AnimationConfig()
        self.fig = None
        self.ax = None
        self.ax_energy = None
        self.ax_dist = None
        self._anim = None
        
        self._setup_figure()
    
    def _setup_figure(self):
        """设置图表布局"""
        if self.config.show_energy and self.config.show_distance:
            self.fig = plt.figure(figsize=self.config.figsize, dpi=self.config.dpi)
            gs = self.fig.add_gridspec(3, 1, height_ratios=[3, 1, 1], hspace=0.3)
            self.ax = self.fig.add_subplot(gs[0])
            self.ax_energy = self.fig.add_subplot(gs[1])
            self.ax_dist = self.fig.add_subplot(gs[2])
        elif self.config.show_energy:
            self.fig = plt.figure(figsize=self.config.figsize, dpi=self.config.dpi)
            gs = self.fig.add_gridspec(2, 1, height_ratios=[3, 1], hspace=0.3)
            self.ax = self.fig.add_subplot(gs[0])
            self.ax_energy = self.fig.add_subplot(gs[1])
            self.ax_dist = None
        elif self.config.show_distance:
            self.fig = plt.figure(figsize=self.config.figsize, dpi=self.config.dpi)
            gs = self.fig.add_gridspec(2, 1, height_ratios=[3, 1], hspace=0.3)
            self.ax = self.fig.add_subplot(gs[0])
            self.ax_energy = None
            self.ax_dist = self.fig.add_subplot(gs[1])
        else:
            self.fig, self.ax = plt.subplots(figsize=self.config.figsize, dpi=self.config.dpi)
            self.ax_energy = None
            self.ax_dist = None
    
    def _plot_static_elements(self):
        """绘制静态元素（轨迹、能量曲线等）"""
        sim = self.simulator
        
        if len(sim.states) < 2:
            return
        
        traj1 = sim.get_trajectory(0)
        traj2 = sim.get_trajectory(1)
        
        if self.config.show_trajectory:
            self.ax.plot(traj1[:, 0], traj1[:, 1], '--', color=sim.bodies[0].color, 
                        alpha=0.3, linewidth=1, label=f'{sim.bodies[0].name} 轨迹')
            self.ax.plot(traj2[:, 0], traj2[:, 1], '--', color=sim.bodies[1].color,
                        alpha=0.3, linewidth=1, label=f'{sim.bodies[1].name} 轨迹')
        
        if self.ax_energy is not None:
            energy = sim.get_energy_history()
            self.ax_energy.plot(energy['time'], energy['kinetic'], 'r-', label='动能', alpha=0.7)
            self.ax_energy.plot(energy['time'], energy['potential'], 'b-', label='势能', alpha=0.7)
            self.ax_energy.plot(energy['time'], energy['total'], 'k-', label='总能量', linewidth=2)
            self.ax_energy.set_xlabel('时间 (年)')
            self.ax_energy.set_ylabel('能量')
            self.ax_energy.legend(loc='best', fontsize=8)
            self.ax_energy.grid(True, alpha=0.3)
        
        if self.ax_dist is not None:
            dist = sim.get_distance_history()
            self.ax_dist.plot(dist['time'], dist['distance'], 'g-', label='星体距离')
            self.ax_dist.set_xlabel('时间 (年)')
            self.ax_dist.set_ylabel('距离 (AU)')
            self.ax_dist.legend(loc='best', fontsize=8)
            self.ax_dist.grid(True, alpha=0.3)
    
    def _update_animation(self, frame: int):
        """动画更新函数"""
        sim = self.simulator
        state_idx = min(frame, len(sim.states) - 1)
        state = sim.states[state_idx]
        
        self.ax.clear()
        self._plot_static_elements()
        
        pos1 = state.positions[0]
        pos2 = state.positions[1]
        
        size1 = self.config.body_size * (sim.bodies[0].mass ** 0.5)
        size2 = self.config.body_size * (sim.bodies[1].mass ** 0.5)
        
        self.ax.scatter(pos1[0], pos1[1], s=size1, c=sim.bodies[0].color, 
                       edgecolors='black', zorder=10, label=sim.bodies[0].name)
        self.ax.scatter(pos2[0], pos2[1], s=size2, c=sim.bodies[1].color,
                       edgecolors='black', zorder=10, label=sim.bodies[1].name)
        
        if self.config.show_vectors:
            vel1 = state.velocities[0] * self.config.vector_scale
            vel2 = state.velocities[1] * self.config.vector_scale
            self.ax.arrow(pos1[0], pos1[1], vel1[0], vel1[1], 
                         head_width=0.02, head_length=0.03, fc='red', ec='red')
            self.ax.arrow(pos2[0], pos2[1], vel2[0], vel2[1],
                         head_width=0.02, head_length=0.03, fc='red', ec='red')
        
        all_x = np.concatenate([sim.get_trajectory(0)[:, 0], sim.get_trajectory(1)[:, 0]])
        all_y = np.concatenate([sim.get_trajectory(0)[:, 1], sim.get_trajectory(1)[:, 1]])
        margin = 0.1 * max(np.ptp(all_x), np.ptp(all_y), 1.0)
        xlim = (all_x.min() - margin, all_x.max() + margin)
        ylim = (all_y.min() - margin, all_y.max() + margin)
        self.ax.set_xlim(xlim)
        self.ax.set_ylim(ylim)
        
        self.ax.set_aspect('equal')
        self.ax.set_xlabel('X (AU)')
        self.ax.set_ylabel('Y (AU)')
        self.ax.set_title(f'双星轨道模拟 | t = {state.time:.2f} 年 | 步骤 {state.step}')
        self.ax.legend(loc='best', fontsize=9)
        self.ax.grid(True, alpha=0.3)
        
        status_text = f"状态: {sim.status.value}\n"
        status_text += f"总能量: {state.total_energy:.4f}\n"
        status_text += f"距离: {state.distances[0]:.4f} AU"
        
        if sim._initial_energy is not None and abs(sim._initial_energy) > 1e-10:
            drift = abs((state.total_energy - sim._initial_energy) / abs(sim._initial_energy)) * 100
            status_text += f"\n能量漂移: {drift:.2f}%"
        
        self.ax.text(0.02, 0.98, status_text, transform=self.ax.transAxes,
                    verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8),
                    fontsize=9)
        
        return []
    
    def show(self):
        """显示动画"""
        if len(self.simulator.states) < 2:
            print("请先运行模拟")
            return
        
        frames = len(self.simulator.states)
        interval = max(10, int(self.config.interval / self.config.speed))
        
        self._anim = animation.FuncAnimation(
            self.fig, self._update_animation,
            frames=frames, interval=interval,
            blit=False, repeat=True
        )
        
        plt.show()
    
    def save(self, filename: str, fps: int = 30):
        """
        保存动画到文件
        
        Args:
            filename: 输出文件名 (.gif, .mp4, .avi等)
            fps: 帧率
        """
        if len(self.simulator.states) < 2:
            print("请先运行模拟")
            return
        
        frames = len(self.simulator.states)
        
        self._anim = animation.FuncAnimation(
            self.fig, self._update_animation,
            frames=frames, interval=1000/fps,
            blit=False, repeat=False
        )
        
        if filename.endswith('.gif'):
            writer = animation.PillowWriter(fps=fps)
        else:
            writer = animation.FFMpegWriter(fps=fps)
        
        self._anim.save(filename, writer=writer)
        print(f"动画已保存到: {filename}")
    
    def plot_static(self, save_path: Optional[str] = None):
        """
        绘制静态图表
        
        Args:
            save_path: 保存路径，None则显示
        """
        sim = self.simulator
        
        if len(sim.states) < 2:
            print("请先运行模拟")
            return
        
        self.ax.clear()
        
        traj1 = sim.get_trajectory(0)
        traj2 = sim.get_trajectory(1)
        
        self.ax.plot(traj1[:, 0], traj1[:, 1], '-', color=sim.bodies[0].color,
                    alpha=0.7, linewidth=1.5, label=f'{sim.bodies[0].name} 轨道')
        self.ax.plot(traj2[:, 0], traj2[:, 1], '-', color=sim.bodies[1].color,
                    alpha=0.7, linewidth=1.5, label=f'{sim.bodies[1].name} 轨道')
        
        self.ax.scatter(traj1[-1, 0], traj1[-1, 1], s=100, c=sim.bodies[0].color,
                       edgecolors='black', zorder=10)
        self.ax.scatter(traj2[-1, 0], traj2[-1, 1], s=100, c=sim.bodies[1].color,
                       edgecolors='black', zorder=10)
        
        self.ax.scatter(traj1[0, 0], traj1[0, 1], s=50, c=sim.bodies[0].color,
                       marker='x', alpha=0.5, label='起点')
        self.ax.scatter(traj2[0, 0], traj2[0, 1], s=50, c=sim.bodies[1].color,
                       marker='x', alpha=0.5)
        
        self.ax.set_aspect('equal')
        self.ax.set_xlabel('X (AU)')
        self.ax.set_ylabel('Y (AU)')
        self.ax.set_title('双星轨道图')
        self.ax.legend(loc='best')
        self.ax.grid(True, alpha=0.3)
        
        if save_path:
            plt.savefig(save_path, dpi=self.config.dpi, bbox_inches='tight')
            print(f"静态图已保存到: {save_path}")
        else:
            plt.show()


def plot_energy_comparison(simulators: List[BinarySimulator], labels: List[str], 
                          save_path: Optional[str] = None):
    """
    比较多个模拟器的能量曲线
    
    Args:
        simulators: 模拟器列表
        labels: 标签列表
        save_path: 保存路径
    """
    fig, axes = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
    
    for sim, label in zip(simulators, labels):
        energy = sim.get_energy_history()
        initial_energy = energy['total'][0]
        if abs(initial_energy) > 1e-10:
            drift = (energy['total'] - initial_energy) / abs(initial_energy) * 100
        else:
            drift = energy['total'] - initial_energy
        
        axes[0].plot(energy['time'], energy['total'], label=label, linewidth=1.5)
        axes[1].plot(energy['time'], drift, label=label, linewidth=1.5)
    
    axes[0].set_ylabel('总能量')
    axes[0].set_title('总能量对比')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    axes[1].set_xlabel('时间 (年)')
    axes[1].set_ylabel('能量漂移 (%)')
    axes[1].set_title('能量漂移对比')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"能量对比图已保存到: {save_path}")
    else:
        plt.show()


def plot_trajectory_comparison(simulators: List[BinarySimulator], labels: List[str],
                              save_path: Optional[str] = None):
    """
    比较多个模拟器的轨迹
    
    Args:
        simulators: 模拟器列表
        labels: 标签列表
        save_path: 保存路径
    """
    fig, ax = plt.subplots(figsize=(10, 10))
    
    colors = plt.cm.tab10(np.linspace(0, 1, len(simulators)))
    
    for sim, label, color in zip(simulators, labels, colors):
        traj1 = sim.get_trajectory(0)
        traj2 = sim.get_trajectory(1)
        
        ax.plot(traj1[:, 0], traj1[:, 1], '-', color=color, alpha=0.7, linewidth=1.5,
               label=f'{label} - {sim.bodies[0].name}')
        ax.plot(traj2[:, 0], traj2[:, 1], '--', color=color, alpha=0.7, linewidth=1.5,
               label=f'{label} - {sim.bodies[1].name}')
    
    ax.set_aspect('equal')
    ax.set_xlabel('X (AU)')
    ax.set_ylabel('Y (AU)')
    ax.set_title('轨道对比')
    ax.legend(loc='best', fontsize=8)
    ax.grid(True, alpha=0.3)
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"轨迹对比图已保存到: {save_path}")
    else:
        plt.show()
