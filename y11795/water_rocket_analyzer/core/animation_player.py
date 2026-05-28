import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.gridspec import GridSpec
from typing import Optional, Dict
import os
from .data_loader import FlightData
from .trajectory_fitter import FitResult
from .physics_model import TrajectoryResult


class AnimationPlayer:
    def __init__(self, dpi: int = 100, figsize: tuple = (14, 9)):
        self.dpi = dpi
        self.figsize = figsize
        self.output_dir = "output"

    def create_flight_animation(
        self,
        flight_data: FlightData,
        fit_result: Optional[FitResult] = None,
        output_path: Optional[str] = None,
        show_plots: bool = True,
        speed_factor: float = 1.0
    ) -> str:
        os.makedirs(self.output_dir, exist_ok=True)

        if output_path is None:
            output_path = os.path.join(self.output_dir, "flight_animation.mp4")

        times, altitudes = flight_data.get_valid_data()

        if len(times) < 2:
            raise ValueError("Insufficient data for animation")

        fig = plt.figure(figsize=self.figsize, dpi=self.dpi)
        gs = GridSpec(3, 3, figure=fig)

        ax_2d = fig.add_subplot(gs[0:2, 0:2])
        ax_height = fig.add_subplot(gs[0, 2])
        ax_velocity = fig.add_subplot(gs[1, 2])
        ax_info = fig.add_subplot(gs[2, :])
        ax_info.axis('off')

        max_altitude = np.max(altitudes) * 1.1
        max_time = times[-1]

        ax_2d.set_xlim(-max_altitude * 0.5, max_altitude * 1.2)
        ax_2d.set_ylim(0, max_altitude)
        ax_2d.set_xlabel('水平距离 (m)', fontsize=10)
        ax_2d.set_ylabel('高度 (m)', fontsize=10)
        ax_2d.set_title('水火箭飞行轨迹', fontsize=12, fontweight='bold')
        ax_2d.grid(True, alpha=0.3)

        ax_height.set_xlim(0, max_time)
        ax_height.set_ylim(0, max_altitude)
        ax_height.set_xlabel('时间 (s)', fontsize=9)
        ax_height.set_ylabel('高度 (m)', fontsize=9)
        ax_height.set_title('高度-时间曲线', fontsize=10)
        ax_height.grid(True, alpha=0.3)

        velocities = np.diff(altitudes) / np.diff(times)
        vel_times = times[:-1]
        max_velocity = np.max(np.abs(velocities)) * 1.1

        ax_velocity.set_xlim(0, max_time)
        ax_velocity.set_ylim(-max_velocity, max_velocity)
        ax_velocity.set_xlabel('时间 (s)', fontsize=9)
        ax_velocity.set_ylabel('垂直速度 (m/s)', fontsize=9)
        ax_velocity.set_title('速度-时间曲线', fontsize=10)
        ax_velocity.grid(True, alpha=0.3)

        line_2d_actual, = ax_2d.plot([], [], 'b-o', markersize=4, label='实际数据', alpha=0.6)
        line_2d_fitted, = ax_2d.plot([], [], 'r-', linewidth=2, label='拟合曲线', alpha=0.8)

        line_height_actual, = ax_height.plot([], [], 'b-', label='实际数据', alpha=0.7)
        line_height_fitted, = ax_height.plot([], [], 'r--', label='拟合曲线', alpha=0.8)

        line_velocity, = ax_velocity.plot([], [], 'g-', label='计算速度', alpha=0.7)

        rocket_marker, = ax_2d.plot([], [], 'k*', markersize=15, label='火箭位置', zorder=5)

        time_text = ax_2d.text(0.02, 0.95, '', transform=ax_2d.transAxes, fontsize=10,
                                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
        height_text = ax_2d.text(0.02, 0.90, '', transform=ax_2d.transAxes, fontsize=10,
                                 bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.8))

        ax_2d.legend(loc='upper right', fontsize=9)

        if fit_result and fit_result.fitted_trajectory:
            fitted_points = fit_result.fitted_trajectory.points
            fitted_times = [p.time for p in fitted_points]
            fitted_heights = [p.z for p in fitted_points]
            fitted_x = [p.x for p in fitted_points]

            ax_2d.plot(fitted_x, fitted_heights, 'r-', alpha=0.3, linewidth=1)
            ax_height.plot(fitted_times, fitted_heights, 'r--', alpha=0.3)

        info_text = self._get_info_text(flight_data, fit_result)
        ax_info.text(0.5, 0.5, info_text, transform=ax_info.transAxes,
                     fontsize=9, ha='center', va='center',
                     bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.7))

        n_frames = len(times)
        interval = 1000 / (30 * speed_factor)

        def init():
            line_2d_actual.set_data([], [])
            line_2d_fitted.set_data([], [])
            line_height_actual.set_data([], [])
            line_height_fitted.set_data([], [])
            line_velocity.set_data([], [])
            rocket_marker.set_data([], [])
            time_text.set_text('')
            height_text.set_text('')
            return line_2d_actual, line_2d_fitted, line_height_actual, \
                   line_height_fitted, line_velocity, rocket_marker, time_text, height_text

        def animate(frame):
            t = times[:frame + 1]
            h = altitudes[:frame + 1]

            line_2d_actual.set_data(np.zeros_like(h), h)
            line_height_actual.set_data(t, h)

            if frame > 0:
                vel_frames = min(frame, len(vel_times))
                line_velocity.set_data(vel_times[:vel_frames], velocities[:vel_frames])

            if fit_result and fit_result.fitted_trajectory:
                fitted_points = fit_result.fitted_trajectory.points
                current_time = times[frame]
                fitted_t = [p.time for p in fitted_points if p.time <= current_time]
                fitted_h = [p.z for p in fitted_points if p.time <= current_time]
                fitted_x = [p.x for p in fitted_points if p.time <= current_time]

                if len(fitted_t) > 1:
                    line_2d_fitted.set_data(fitted_x, fitted_h)
                    line_height_fitted.set_data(fitted_t, fitted_h)

            rocket_marker.set_data([0], [altitudes[frame]])

            time_text.set_text(f'时间: {times[frame]:.2f}s')
            height_text.set_text(f'高度: {altitudes[frame]:.1f}m')

            return line_2d_actual, line_2d_fitted, line_height_actual, \
                   line_height_fitted, line_velocity, rocket_marker, time_text, height_text

        ani = animation.FuncAnimation(
            fig, animate, init_func=init, frames=n_frames,
            interval=interval, blit=True, repeat=True
        )

        try:
            Writer = animation.writers['ffmpeg']
            writer = Writer(fps=30, metadata=dict(artist='Water Rocket Analyzer'), bitrate=2000)
            ani.save(output_path, writer=writer)
        except Exception as e:
            print(f"Warning: Could not save MP4 animation: {e}")
            print("Trying GIF format instead...")
            try:
                output_path_gif = output_path.replace('.mp4', '.gif')
                ani.save(output_path_gif, writer='pillow', fps=15)
                output_path = output_path_gif
            except Exception as e2:
                print(f"Could not save animation: {e2}")

        if show_plots:
            plt.tight_layout()
            plt.savefig(output_path.replace('.mp4', '_trajectory.png'), dpi=150, bbox_inches='tight')
            plt.show()

        plt.close(fig)

        return output_path

    def create_comparison_plot(
        self,
        flight_data: FlightData,
        fit_result: FitResult,
        output_path: Optional[str] = None
    ) -> str:
        os.makedirs(self.output_dir, exist_ok=True)

        if output_path is None:
            output_path = os.path.join(self.output_dir, "comparison_plot.png")

        fig = plt.figure(figsize=(16, 10))
        gs = GridSpec(4, 4, figure=fig)

        ax_main = fig.add_subplot(gs[0:2, 0:2])
        ax_residual = fig.add_subplot(gs[2, 0:2])
        ax_phase = fig.add_subplot(gs[0:2, 2:4])
        ax_params = fig.add_subplot(gs[2, 2:4])
        ax_table = fig.add_subplot(gs[3, :])
        ax_table.axis('off')

        times, actual_heights = flight_data.get_valid_data()

        fitted_heights = []
        fitted_times = []
        if fit_result.fitted_trajectory:
            fitted_times = np.array([p.time for p in fit_result.fitted_trajectory.points])
            fitted_heights = np.array([p.z for p in fit_result.fitted_trajectory.points])

        fitted_interp = np.interp(times, fitted_times, fitted_heights, left=0, right=0)

        ax_main.plot(times, actual_heights, 'bo', markersize=3, label='实际测量值', alpha=0.6)
        ax_main.plot(fitted_times, fitted_heights, 'r-', linewidth=2, label='拟合曲线', alpha=0.8)
        ax_main.set_xlabel('时间 (s)', fontsize=11)
        ax_main.set_ylabel('高度 (m)', fontsize=11)
        ax_main.set_title('高度-时间曲线对比', fontsize=13, fontweight='bold')
        ax_main.legend(fontsize=10)
        ax_main.grid(True, alpha=0.3)

        residuals = actual_heights - fitted_interp
        ax_residual.plot(times, residuals, 'g.', markersize=4, alpha=0.7)
        ax_residual.axhline(y=0, color='r', linestyle='--', alpha=0.5)
        ax_residual.fill_between(times, residuals, alpha=0.3, color='green')
        ax_residual.set_xlabel('时间 (s)', fontsize=10)
        ax_residual.set_ylabel('残差 (m)', fontsize=10)
        ax_residual.set_title(f'拟合残差 (RMSE = {fit_result.rmse:.3f}m)', fontsize=11)
        ax_residual.grid(True, alpha=0.3)

        for i, dp in enumerate(flight_data.data_points):
            if dp.needs_manual_review:
                ax_main.plot(dp.time, dp.original_altitude, 'rx', markersize=10,
                             markeredgewidth=2, zorder=10)

        velocities = np.gradient(actual_heights, times)
        ax_phase.plot(actual_heights, velocities, 'b-', alpha=0.6)
        ax_phase.set_xlabel('高度 (m)', fontsize=10)
        ax_phase.set_ylabel('垂直速度 (m/s)', fontsize=10)
        ax_phase.set_title('高度-速度相图', fontsize=11)
        ax_phase.grid(True, alpha=0.3)

        params_text = self._get_params_text(fit_result)
        ax_params.text(0.05, 0.95, params_text, transform=ax_params.transAxes,
                       fontsize=9, va='top',
                       bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.7))
        ax_params.set_title('拟合参数', fontsize=11)
        ax_params.axis('off')

        table_text = self._get_summary_table(flight_data, fit_result)
        ax_table.text(0.5, 0.5, table_text, transform=ax_table.transAxes,
                      fontsize=9, ha='center', va='center',
                      bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.7))

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close(fig)

        return output_path

    def _get_info_text(self, flight_data: FlightData, fit_result: Optional[FitResult]) -> str:
        text = f"数据来源: {flight_data.metadata.source_file.split('/')[-1]}\n"
        text += f"数据点数: {len(flight_data.data_points)} | "

        modified = flight_data.get_modified_points()
        review = flight_data.get_review_required()
        invalid = flight_data.get_invalid_points()

        text += f"修正: {len(modified)} | 待确认: {len(review)} | 无效: {len(invalid)}\n"

        if fit_result:
            text += f"初速度: {fit_result.initial_velocity:.1f} m/s | "
            text += f"阻力系数: {fit_result.drag_coefficient:.3f} | "
            text += f"R² = {fit_result.r_squared:.4f}"

        return text

    def _get_params_text(self, fit_result: FitResult) -> str:
        ci = fit_result.confidence_interval

        text = "=== 拟合参数 ===\n\n"
        text += f"初速度 v₀ = {fit_result.initial_velocity:.2f} m/s\n"
        if 'v0' in ci:
            text += f"  95%置信区间: [{ci['v0'][0]:.2f}, {ci['v0'][1]:.2f}]\n\n"

        text += f"阻力系数 C_d = {fit_result.drag_coefficient:.4f}\n"
        if 'Cd' in ci:
            text += f"  95%置信区间: [{ci['Cd'][0]:.4f}, {ci['Cd'][1]:.4f}]\n\n"

        text += f"发射角 = {fit_result.launch_angle:.1f}°\n\n"

        text += "=== 拟合质量 ===\n\n"
        text += f"RMSE = {fit_result.rmse:.3f} m\n"
        text += f"R² = {fit_result.r_squared:.4f}\n"
        text += f"最大高度误差 = {fit_result.max_height_error:.2f} m\n"

        return text

    def _get_summary_table(self, flight_data: FlightData, fit_result: FitResult) -> str:
        if fit_result.fitted_trajectory:
            traj = fit_result.fitted_trajectory
            table = f"最大高度: {traj.max_height:.2f}m (@ {traj.max_height_time:.2f}s)  |  "
            table += f"落地时间: {traj.landing_time:.2f}s  |  "
            table += f"飞行时间: {traj.flight_duration:.2f}s  |  "
            table += f"落地点: ({traj.landing_position[0]:.1f}, {traj.landing_position[1]:.1f})m"
            return table
        return ""
