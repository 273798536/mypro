from typing import List, Dict, Optional, Tuple
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from ..core.models import AnalysisResult, InputData


class TrajectoryPlotter:
    @staticmethod
    def plot_comparison(result: AnalysisResult, input_data: InputData,
                         save_path: Optional[str] = None,
                         show_air_resistance: bool = False,
                         air_resistance_result: Optional[AnalysisResult] = None) -> None:
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle("抛体运动轨迹对比分析", fontsize=16, fontweight='bold')

        TrajectoryPlotter._plot_trajectory_comparison(axes[0, 0], result, input_data,
                                                       air_resistance_result)
        TrajectoryPlotter._plot_x_time(axes[0, 1], result, input_data, air_resistance_result)
        TrajectoryPlotter._plot_y_time(axes[1, 0], result, input_data, air_resistance_result)
        TrajectoryPlotter._plot_velocity_time(axes[1, 1], result, air_resistance_result)

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])

        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            plt.close()
        else:
            plt.show()

    @staticmethod
    def _plot_trajectory_comparison(ax, result: AnalysisResult, input_data: InputData,
                                     air_resistance_result: Optional[AnalysisResult]):
        measured_x = [p.x for p in input_data.trajectory if not p.is_outlier]
        measured_y = [p.y for p in input_data.trajectory if not p.is_outlier]
        outlier_x = [p.x for p in input_data.trajectory if p.is_outlier]
        outlier_y = [p.y for p in input_data.trajectory if p.is_outlier]

        pred_x = [p["x"] for p in result.predicted_trajectory]
        pred_y = [p["y"] for p in result.predicted_trajectory]

        ax.plot(measured_x, measured_y, 'bo', label='实测轨迹点', alpha=0.7, markersize=6)
        if outlier_x:
            ax.plot(outlier_x, outlier_y, 'rx', label='离群点', alpha=0.7, markersize=8)
        ax.plot(pred_x, pred_y, 'b-', label='理想模型拟合', linewidth=2)

        if air_resistance_result:
            air_x = [p["x"] for p in air_resistance_result.predicted_trajectory]
            air_y = [p["y"] for p in air_resistance_result.predicted_trajectory]
            ax.plot(air_x, air_y, 'g--', label='考虑空气阻力', linewidth=2)

        ax.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        ax.set_xlabel('水平距离 X (m)', fontsize=12)
        ax.set_ylabel('垂直高度 Y (m)', fontsize=12)
        ax.set_title('轨迹对比', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_aspect('equal', adjustable='box')

        params = result.params
        info_text = (f'v₀ = {params.v0:.1f} m/s\n'
                     f'θ = {params.angle_deg:.1f}°\n'
                     f'落点 = {result.landing_position:.1f} m')
        ax.text(0.02, 0.98, info_text, transform=ax.transAxes,
                verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

    @staticmethod
    def _plot_x_time(ax, result: AnalysisResult, input_data: InputData,
                      air_resistance_result: Optional[AnalysisResult]):
        measured_t = [p.t for p in input_data.trajectory if not p.is_outlier]
        measured_x = [p.x for p in input_data.trajectory if not p.is_outlier]

        pred_t = [p["t"] for p in result.predicted_trajectory]
        pred_x = [p["x"] for p in result.predicted_trajectory]

        ax.plot(measured_t, measured_x, 'bo', label='实测', alpha=0.7)
        ax.plot(pred_t, pred_x, 'b-', label='理想模型', linewidth=2)

        if air_resistance_result:
            air_t = [p["t"] for p in air_resistance_result.predicted_trajectory]
            air_x = [p["x"] for p in air_resistance_result.predicted_trajectory]
            ax.plot(air_t, air_x, 'g--', label='考虑空气阻力', linewidth=2)

        ax.set_xlabel('时间 t (s)', fontsize=12)
        ax.set_ylabel('水平距离 X (m)', fontsize=12)
        ax.set_title('X-t 曲线', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

    @staticmethod
    def _plot_y_time(ax, result: AnalysisResult, input_data: InputData,
                      air_resistance_result: Optional[AnalysisResult]):
        measured_t = [p.t for p in input_data.trajectory if not p.is_outlier]
        measured_y = [p.y for p in input_data.trajectory if not p.is_outlier]

        pred_t = [p["t"] for p in result.predicted_trajectory]
        pred_y = [p["y"] for p in result.predicted_trajectory]

        ax.plot(measured_t, measured_y, 'bo', label='实测', alpha=0.7)
        ax.plot(pred_t, pred_y, 'b-', label='理想模型', linewidth=2)

        if air_resistance_result:
            air_t = [p["t"] for p in air_resistance_result.predicted_trajectory]
            air_y = [p["y"] for p in air_resistance_result.predicted_trajectory]
            ax.plot(air_t, air_y, 'g--', label='考虑空气阻力', linewidth=2)

        ax.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        ax.set_xlabel('时间 t (s)', fontsize=12)
        ax.set_ylabel('垂直高度 Y (m)', fontsize=12)
        ax.set_title('Y-t 曲线', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

    @staticmethod
    def _plot_velocity_time(ax, result: AnalysisResult,
                             air_resistance_result: Optional[AnalysisResult]):
        pred_t = [p["t"] for p in result.predicted_trajectory]
        pred_v = [p["v"] for p in result.predicted_trajectory]
        pred_vx = [p["vx"] for p in result.predicted_trajectory]
        pred_vy = [p["vy"] for p in result.predicted_trajectory]

        ax.plot(pred_t, pred_v, 'b-', label='合速度 (理想)', linewidth=2)
        ax.plot(pred_t, pred_vx, 'b--', label='Vx (理想)', linewidth=1.5)
        ax.plot(pred_t, pred_vy, 'b:', label='Vy (理想)', linewidth=1.5)

        if air_resistance_result:
            air_t = [p["t"] for p in air_resistance_result.predicted_trajectory]
            air_v = [p["v"] for p in air_resistance_result.predicted_trajectory]
            air_vx = [p["vx"] for p in air_resistance_result.predicted_trajectory]
            air_vy = [p["vy"] for p in air_resistance_result.predicted_trajectory]
            ax.plot(air_t, air_v, 'g-', label='合速度 (有阻力)', linewidth=2)
            ax.plot(air_t, air_vx, 'g--', label='Vx (有阻力)', linewidth=1.5)
            ax.plot(air_t, air_vy, 'g:', label='Vy (有阻力)', linewidth=1.5)

        ax.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        ax.set_xlabel('时间 t (s)', fontsize=12)
        ax.set_ylabel('速度 (m/s)', fontsize=12)
        ax.set_title('速度变化曲线', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

    @staticmethod
    def plot_residuals(result: AnalysisResult, input_data: InputData,
                        save_path: Optional[str] = None) -> None:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        measured_t = [p.t for p in input_data.trajectory if not p.is_outlier]
        measured_x = [p.x for p in input_data.trajectory if not p.is_outlier]
        measured_y = [p.y for p in input_data.trajectory if not p.is_outlier]

        pred_x_interp = []
        pred_y_interp = []
        for t in measured_t:
            pred_t = [p["t"] for p in result.predicted_trajectory]
            pred_x = [p["x"] for p in result.predicted_trajectory]
            pred_y = [p["y"] for p in result.predicted_trajectory]
            import numpy as np
            pred_x_interp.append(np.interp(t, pred_t, pred_x))
            pred_y_interp.append(np.interp(t, pred_t, pred_y))

        residuals_x = [m - p for m, p in zip(measured_x, pred_x_interp)]
        residuals_y = [m - p for m, p in zip(measured_y, pred_y_interp)]

        ax1.plot(measured_t, residuals_x, 'bo-', alpha=0.7)
        ax1.axhline(y=0, color='r', linestyle='-', alpha=0.5)
        ax1.set_xlabel('时间 t (s)', fontsize=12)
        ax1.set_ylabel('残差 (m)', fontsize=12)
        ax1.set_title('X方向残差', fontsize=14, fontweight='bold')
        ax1.grid(True, alpha=0.3)

        ax2.plot(measured_t, residuals_y, 'go-', alpha=0.7)
        ax2.axhline(y=0, color='r', linestyle='-', alpha=0.5)
        ax2.set_xlabel('时间 t (s)', fontsize=12)
        ax2.set_ylabel('残差 (m)', fontsize=12)
        ax2.set_title('Y方向残差', fontsize=14, fontweight='bold')
        ax2.grid(True, alpha=0.3)

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            plt.close()
        else:
            plt.show()
