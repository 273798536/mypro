import numpy as np
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.patches import Rectangle, Circle
from typing import List, Tuple, Optional
from physics_core import SimulationParams, FaradayLawCalculator, CalculationTrace
import inspect


class SimulationVisualizer:
    def __init__(self, params: SimulationParams, calculator: FaradayLawCalculator):
        self.params = params
        self.calculator = calculator
        self.fig = None
        self.anim = None
        self._trace_source = inspect.currentframe().f_lineno

    def _plot_with_source(self, ax, x, y, label, color, linewidth=2):
        source_line = inspect.currentframe().f_lineno + 1
        line, = ax.plot(x, y, label=label, color=color, linewidth=linewidth)
        return line

    def plot_curves(self, times: np.ndarray, fluxes: np.ndarray, emfs: np.ndarray, currents: np.ndarray, 
                    save_path: Optional[str] = None) -> None:
        source_func = inspect.currentframe().f_code.co_name
        source_line = inspect.currentframe().f_lineno + 1
        
        self.fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
        self.fig.suptitle('电磁感应模拟结果 - 法拉第定律验证', fontsize=16, fontweight='bold')
        
        axes[0].plot(times, fluxes, 'b-', linewidth=2, label='磁通量 Φ(t)')
        axes[0].set_ylabel('磁通量 Φ (Wb)', fontsize=12)
        axes[0].set_title('磁通量随时间变化', fontsize=14)
        axes[0].grid(True, alpha=0.3)
        axes[0].legend(loc='upper right')
        
        axes[1].plot(times, emfs, 'r-', linewidth=2, label='感应电动势 ε(t)')
        axes[1].set_ylabel('电动势 ε (V)', fontsize=12)
        axes[1].set_title('感应电动势随时间变化 (ε = -dΦ/dt)', fontsize=14)
        axes[1].grid(True, alpha=0.3)
        axes[1].legend(loc='upper right')
        axes[1].axhline(y=0, color='k', linestyle='--', alpha=0.5)
        
        axes[2].plot(times, currents, 'g-', linewidth=2, label='感应电流 I(t)')
        axes[2].set_xlabel('时间 t (s)', fontsize=12)
        axes[2].set_ylabel('电流 I (A)', fontsize=12)
        axes[2].set_title('感应电流随时间变化', fontsize=14)
        axes[2].grid(True, alpha=0.3)
        axes[2].legend(loc='upper right')
        axes[2].axhline(y=0, color='k', linestyle='--', alpha=0.5)
        
        params_text = (f'参数: v={self.params.magnet_speed} m/s, N={self.params.coil_turns} 匝, '
                       f'B={self.params.magnet_field_strength} T, Δt={self.params.time_step} s')
        self.fig.text(0.5, 0.02, params_text, ha='center', fontsize=10, style='italic')
        
        plt.tight_layout(rect=[0, 0.05, 1, 0.95])
        
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"[INFO] {source_func} (L{source_line}): 曲线图已保存到 {save_path}")
        
        plt.close()

    def create_animation(self, times: np.ndarray, fluxes: np.ndarray, emfs: np.ndarray, currents: np.ndarray,
                         save_path: Optional[str] = None) -> None:
        source_func = inspect.currentframe().f_code.co_name
        source_line = inspect.currentframe().f_lineno + 1
        
        self.fig = plt.figure(figsize=(14, 8))
        gs = self.fig.add_gridspec(2, 2, height_ratios=[1, 1], width_ratios=[1, 1])
        
        ax_anim = self.fig.add_subplot(gs[0, 0])
        ax_flux = self.fig.add_subplot(gs[0, 1])
        ax_emf = self.fig.add_subplot(gs[1, 0])
        ax_current = self.fig.add_subplot(gs[1, 1])
        
        ax_anim.set_xlim(-0.5, 0.5)
        ax_anim.set_ylim(-0.3, 0.3)
        ax_anim.set_aspect('equal')
        ax_anim.set_title('磁铁穿过线圈动画', fontsize=12)
        ax_anim.set_xlabel('位置 (m)')
        ax_anim.grid(True, alpha=0.3)
        
        coil = Circle((0, 0), self.params.coil_radius, fill=False, color='blue', linewidth=3, label='线圈')
        ax_anim.add_patch(coil)
        
        magnet = Rectangle((-0.1, -0.05), 0.2, 0.1, color='red', alpha=0.7, label='磁铁')
        ax_anim.add_patch(magnet)
        ax_anim.legend(loc='upper right')
        
        time_text = ax_anim.text(0.02, 0.95, '', transform=ax_anim.transAxes, fontsize=10)
        
        ax_flux.plot(times, fluxes, 'b-', linewidth=1.5, alpha=0.3)
        flux_line, = ax_flux.plot([], [], 'bo', markersize=6)
        ax_flux.set_ylabel('Φ (Wb)')
        ax_flux.set_title('磁通量')
        ax_flux.grid(True, alpha=0.3)
        
        ax_emf.plot(times, emfs, 'r-', linewidth=1.5, alpha=0.3)
        emf_line, = ax_emf.plot([], [], 'ro', markersize=6)
        ax_emf.set_ylabel('ε (V)')
        ax_emf.set_xlabel('t (s)')
        ax_emf.set_title('感应电动势')
        ax_emf.grid(True, alpha=0.3)
        ax_emf.axhline(y=0, color='k', linestyle='--', alpha=0.5)
        
        ax_current.plot(times, currents, 'g-', linewidth=1.5, alpha=0.3)
        current_line, = ax_current.plot([], [], 'go', markersize=6)
        ax_current.set_ylabel('I (A)')
        ax_current.set_xlabel('t (s)')
        ax_current.set_title('感应电流')
        ax_current.grid(True, alpha=0.3)
        ax_current.axhline(y=0, color='k', linestyle='--', alpha=0.5)
        
        def init():
            magnet.set_xy((-0.5, -0.05))
            time_text.set_text('')
            flux_line.set_data([], [])
            emf_line.set_data([], [])
            current_line.set_data([], [])
            return magnet, time_text, flux_line, emf_line, current_line
        
        def update(frame):
            t = times[frame]
            magnet_x = self.params.magnet_speed * t - 0.5 - self.params.magnet_length / 2
            magnet.set_xy((magnet_x, -0.05))
            
            time_text.set_text(f'时间: {t:.3f} s')
            flux_line.set_data([t], [fluxes[frame]])
            emf_line.set_data([t], [emfs[frame]])
            current_line.set_data([t], [currents[frame]])
            
            return magnet, time_text, flux_line, emf_line, current_line
        
        frames = min(len(times), 200)
        interval = max(20, self.params.time_step * 1000)
        
        self.anim = FuncAnimation(
            self.fig, update, frames=frames, init_func=init,
            interval=interval, blit=True, repeat=False
        )
        
        self.fig.suptitle(f'电磁感应模拟 | v={self.params.magnet_speed}m/s, N={self.params.coil_turns}匝', 
                          fontsize=14, fontweight='bold')
        plt.tight_layout()
        
        if save_path:
            self.anim.save(save_path, writer='ffmpeg', fps=30, dpi=100)
            print(f"[INFO] {source_func} (L{source_line}): 动画已保存到 {save_path}")
        
        plt.close()

    def show_interactive(self, times: np.ndarray, fluxes: np.ndarray, emfs: np.ndarray, currents: np.ndarray) -> None:
        source_func = inspect.currentframe().f_code.co_name
        source_line = inspect.currentframe().f_lineno + 1
        
        print(f"[INFO] {source_func} (L{source_line}): 启动交互式显示...")
        self.plot_curves(times, fluxes, emfs, currents)
        
        self.fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
        self.fig.suptitle('电磁感应模拟 - 交互式查看', fontsize=16, fontweight='bold')
        
        axes[0].plot(times, fluxes, 'b-', linewidth=2)
        axes[0].set_ylabel('磁通量 Φ (Wb)')
        axes[0].set_title('磁通量随时间变化')
        axes[0].grid(True, alpha=0.3)
        
        axes[1].plot(times, emfs, 'r-', linewidth=2)
        axes[1].set_ylabel('电动势 ε (V)')
        axes[1].set_title('感应电动势 (ε = -dΦ/dt)')
        axes[1].grid(True, alpha=0.3)
        axes[1].axhline(y=0, color='k', linestyle='--', alpha=0.5)
        
        axes[2].plot(times, currents, 'g-', linewidth=2)
        axes[2].set_xlabel('时间 t (s)')
        axes[2].set_ylabel('电流 I (A)')
        axes[2].set_title('感应电流')
        axes[2].grid(True, alpha=0.3)
        axes[2].axhline(y=0, color='k', linestyle='--', alpha=0.5)
        
        plt.tight_layout()
        print(f"[INFO] {source_func} (L{source_line}): 请查看弹出的绘图窗口。关闭窗口后继续...")
        plt.show()

    def plot_velocity_comparison(self, velocities: List[float], save_path: Optional[str] = None):
        source_func = inspect.currentframe().f_code.co_name
        source_line = inspect.currentframe().f_lineno + 1
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('不同速度下的感应电流对比', fontsize=16, fontweight='bold')
        
        colors = plt.cm.viridis(np.linspace(0, 1, len(velocities)))
        
        for idx, v in enumerate(velocities):
            temp_params = SimulationParams(
                magnet_speed=v,
                coil_turns=self.params.coil_turns,
                magnet_field_strength=self.params.magnet_field_strength,
                time_step=self.params.time_step,
                total_time=self.params.total_time
            )
            temp_calc = FaradayLawCalculator(temp_params)
            times, fluxes, emfs, currents = temp_calc.run_simulation()
            
            axes[0, 0].plot(times, currents, color=colors[idx], label=f'v={v} m/s', linewidth=2)
            axes[0, 1].plot(times, np.abs(currents), color=colors[idx], label=f'v={v} m/s', linewidth=2)
            axes[1, 0].plot(times, fluxes, color=colors[idx], label=f'v={v} m/s', linewidth=2)
            axes[1, 1].plot(times, emfs, color=colors[idx], label=f'v={v} m/s', linewidth=2)
        
        axes[0, 0].set_ylabel('电流 I (A)')
        axes[0, 0].set_title('感应电流')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)
        axes[0, 0].axhline(y=0, color='k', linestyle='--', alpha=0.5)
        
        axes[0, 1].set_ylabel('|I| (A)')
        axes[0, 1].set_title('电流绝对值')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
        
        axes[1, 0].set_xlabel('时间 t (s)')
        axes[1, 0].set_ylabel('磁通量 Φ (Wb)')
        axes[1, 0].set_title('磁通量')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)
        
        axes[1, 1].set_xlabel('时间 t (s)')
        axes[1, 1].set_ylabel('电动势 ε (V)')
        axes[1, 1].set_title('感应电动势')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)
        axes[1, 1].axhline(y=0, color='k', linestyle='--', alpha=0.5)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"[INFO] {source_func} (L{source_line}): 速度对比图已保存到 {save_path}")
        
        plt.close()
