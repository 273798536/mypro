import math
import os
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.animation as animation
    from matplotlib.patches import Circle, Rectangle
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

from .config import JointConfig, LoadConfig, MotionConfig, CheckResult


@dataclass
class VisualizationConfig:
    figure_size: Tuple[int, int] = (12, 8)
    dpi: int = 100
    show_annotations: bool = True
    animation_interval: int = 50


class MotionVisualizer:
    def __init__(
        self,
        check_result: Optional[CheckResult] = None,
        output_dir: str = "reports",
    ):
        self.check_result = check_result or CheckResult()
        self.output_dir = output_dir
        self.config = VisualizationConfig()
        os.makedirs(output_dir, exist_ok=True)

    def plot_joint_angles(
        self,
        output_file: str = "joint_angles.png",
    ) -> str:
        if not MATPLOTLIB_AVAILABLE:
            return self._fallback_output("joint_angles")

        motion_config = self.check_result.motion_config
        if not motion_config:
            raise ValueError("No motion configuration available")

        fig, ax = plt.subplots(figsize=self.config.figure_size, dpi=self.config.dpi)

        time_steps = motion_config.time_steps
        colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]

        for idx, (joint_id, angles) in enumerate(motion_config.joint_angles.items()):
            color = colors[idx % len(colors)]
            config = self.check_result.joint_configs.get(joint_id)

            ax.plot(
                time_steps,
                angles,
                label=f"关节{joint_id}" + (f" ({config.name})" if config else ""),
                color=color,
                linewidth=2,
            )

            if config:
                ax.axhline(
                    y=config.min_angle,
                    color=color,
                    linestyle="--",
                    alpha=0.5,
                    linewidth=1,
                )
                ax.axhline(
                    y=config.max_angle,
                    color=color,
                    linestyle="--",
                    alpha=0.5,
                    linewidth=1,
                )

        self._mark_violations(ax, ["angle_min_exceeded", "angle_max_exceeded"])

        ax.set_xlabel("时间 (s)", fontsize=12)
        ax.set_ylabel("角度 (°)", fontsize=12)
        ax.set_title("关节角度随时间变化", fontsize=14, fontweight="bold")
        ax.legend(loc="best", bbox_to_anchor=(1.05, 1), fontsize=10)
        ax.grid(True, alpha=0.3)
        plt.tight_layout()

        output_path = os.path.join(self.output_dir, output_file)
        plt.savefig(output_path, bbox_inches="tight")
        plt.close()

        return output_path

    def plot_torques(
        self,
        output_file: str = "joint_torques.png",
    ) -> str:
        if not MATPLOTLIB_AVAILABLE:
            return self._fallback_output("joint_torques")

        motion_config = self.check_result.motion_config
        if not motion_config:
            raise ValueError("No motion configuration available")

        fig, ax = plt.subplots(figsize=self.config.figure_size, dpi=self.config.dpi)

        time_steps = motion_config.time_steps
        colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]

        for idx, (joint_id, torques) in enumerate(self.check_result.torque_results.items()):
            color = colors[idx % len(colors)]
            config = self.check_result.joint_configs.get(joint_id)

            ax.plot(
                time_steps,
                torques,
                label=f"关节{joint_id}" + (f" ({config.name})" if config else ""),
                color=color,
                linewidth=2,
            )

            if config:
                ax.axhline(
                    y=config.max_torque,
                    color=color,
                    linestyle="--",
                    alpha=0.7,
                    linewidth=1.5,
                    label=f"关节{joint_id} 最大力矩" if idx == 0 else "",
                )

        self._mark_violations(ax, ["torque_exceeded"])

        ax.set_xlabel("时间 (s)", fontsize=12)
        ax.set_ylabel("力矩 (Nm)", fontsize=12)
        ax.set_title("关节力矩随时间变化", fontsize=14, fontweight="bold")
        ax.legend(loc="best", bbox_to_anchor=(1.05, 1), fontsize=10)
        ax.grid(True, alpha=0.3)
        plt.tight_layout()

        output_path = os.path.join(self.output_dir, output_file)
        plt.savefig(output_path, bbox_inches="tight")
        plt.close()

        return output_path

    def plot_velocities(
        self,
        output_file: str = "joint_velocities.png",
    ) -> str:
        if not MATPLOTLIB_AVAILABLE:
            return self._fallback_output("joint_velocities")

        motion_config = self.check_result.motion_config
        if not motion_config:
            raise ValueError("No motion configuration available")

        fig, ax = plt.subplots(figsize=self.config.figure_size, dpi=self.config.dpi)

        time_steps = motion_config.time_steps
        colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]

        for idx, (joint_id, velocities) in enumerate(self.check_result.velocity_results.items()):
            color = colors[idx % len(colors)]
            config = self.check_result.joint_configs.get(joint_id)

            ax.plot(
                time_steps,
                [abs(v) for v in velocities],
                label=f"关节{joint_id}" + (f" ({config.name})" if config else ""),
                color=color,
                linewidth=2,
            )

            if config:
                ax.axhline(
                    y=config.max_angular_velocity,
                    color=color,
                    linestyle="--",
                    alpha=0.7,
                    linewidth=1.5,
                )

        self._mark_violations(ax, ["velocity_exceeded"])

        ax.set_xlabel("时间 (s)", fontsize=12)
        ax.set_ylabel("角速度 (°/s)", fontsize=12)
        ax.set_title("关节角速度随时间变化", fontsize=14, fontweight="bold")
        ax.legend(loc="best", bbox_to_anchor=(1.05, 1), fontsize=10)
        ax.grid(True, alpha=0.3)
        plt.tight_layout()

        output_path = os.path.join(self.output_dir, output_file)
        plt.savefig(output_path, bbox_inches="tight")
        plt.close()

        return output_path

    def plot_robot_arm(
        self,
        step_idx: int = 0,
        output_file: str = "robot_arm.png",
    ) -> str:
        if not MATPLOTLIB_AVAILABLE:
            return self._fallback_output("robot_arm")

        fig, ax = plt.subplots(figsize=(10, 10), dpi=self.config.dpi)

        self._draw_robot_arm_at_step(ax, step_idx)

        ax.set_xlabel("X (m)", fontsize=12)
        ax.set_ylabel("Y (m)", fontsize=12)
        ax.set_title(f"机械臂位姿 - 时间步 {step_idx}", fontsize=14, fontweight="bold")
        ax.set_aspect("equal")
        ax.grid(True, alpha=0.3)
        plt.tight_layout()

        output_path = os.path.join(self.output_dir, output_file)
        plt.savefig(output_path, bbox_inches="tight")
        plt.close()

        return output_path

    def create_animation(
        self,
        output_file: str = "motion_animation.gif",
    ) -> str:
        if not MATPLOTLIB_AVAILABLE:
            return self._fallback_output("motion_animation")

        motion_config = self.check_result.motion_config
        if not motion_config:
            raise ValueError("No motion configuration available")

        fig, ax = plt.subplots(figsize=(10, 10), dpi=self.config.dpi)
        ax.set_aspect("equal")
        ax.grid(True, alpha=0.3)

        total_steps = len(motion_config.time_steps)

        def update(frame):
            ax.clear()
            ax.set_aspect("equal")
            ax.grid(True, alpha=0.3)
            self._draw_robot_arm_at_step(ax, frame)
            ax.set_title(
                f"机械臂运动回放 - 时间: {motion_config.time_steps[frame]:.2f}s",
                fontsize=14,
                fontweight="bold",
            )

        ani = animation.FuncAnimation(
            fig,
            update,
            frames=min(total_steps, 100),
            interval=self.config.animation_interval,
            blit=False,
        )

        output_path = os.path.join(self.output_dir, output_file)
        ani.save(output_path, writer="pillow", fps=20)
        plt.close()

        return output_path

    def _draw_robot_arm_at_step(self, ax, step_idx: int):
        motion_config = self.check_result.motion_config
        if not motion_config:
            return

        x, y = 0, 0
        cumulative_angle = 0

        sorted_joints = sorted(self.check_result.joint_configs.keys())

        for joint_id in sorted_joints:
            config = self.check_result.joint_configs[joint_id]
            angles = motion_config.joint_angles.get(joint_id, [0])
            angle_deg = angles[min(step_idx, len(angles) - 1)]
            cumulative_angle += math.radians(angle_deg)

            x_new = x + config.link_length * math.cos(cumulative_angle)
            y_new = y + config.link_length * math.sin(cumulative_angle)

            ax.plot([x, x_new], [y, y_new], "b-", linewidth=4)

            joint_circle = Circle((x, y), 0.05, color="red", zorder=5)
            ax.add_patch(joint_circle)

            if self.config.show_annotations:
                ax.text(
                    x,
                    y + 0.08,
                    f"J{joint_id}\n{angle_deg:.1f}°",
                    ha="center",
                    va="bottom",
                    fontsize=9,
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7),
                )

            x, y = x_new, y_new

        end_circle = Circle((x, y), 0.04, color="green", zorder=5)
        ax.add_patch(end_circle)
        ax.text(x, y + 0.06, "末端", ha="center", va="bottom", fontsize=10, color="green")

        if self.check_result.load_config:
            load = self.check_result.load_config
            load_circle = Circle(
                (x + load.load_position[0] if len(load.load_position) > 0 else x,
                 y + load.load_position[1] if len(load.load_position) > 1 else y),
                0.06,
                color="purple",
                alpha=0.7,
                zorder=4,
            )
            ax.add_patch(load_circle)
            ax.text(
                x + (load.load_position[0] if len(load.load_position) > 0 else 0),
                y + (load.load_position[1] if len(load.load_position) > 1 else 0) + 0.08,
                f"{load.load_mass:.1f}kg",
                ha="center",
                va="bottom",
                fontsize=9,
                color="purple",
            )

        max_reach = sum(config.link_length for config in self.check_result.joint_configs.values())
        ax.set_xlim(-max_reach * 0.2, max_reach * 1.2)
        ax.set_ylim(-max_reach * 0.2, max_reach * 1.2)

    def _mark_violations(self, ax, violation_types: List[str]):
        for violation in self.check_result.violations:
            if violation["violation_type"] in violation_types and violation.get("time_value") is not None:
                color = "red" if violation["severity"] == "critical" else "orange"
                ax.axvspan(
                    violation["time_value"] - 0.01,
                    violation["time_value"] + 0.01,
                    color=color,
                    alpha=0.3,
                )

    def _fallback_output(self, name: str) -> str:
        output_path = os.path.join(self.output_dir, f"{name}_placeholder.txt")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"{name} visualization placeholder\n")
            f.write("Install matplotlib to enable visualizations.\n")
        return output_path

    def generate_all_plots(self) -> Dict[str, str]:
        plots = {}

        try:
            plots["joint_angles"] = self.plot_joint_angles()
        except Exception as e:
            plots["joint_angles_error"] = str(e)

        try:
            plots["joint_torques"] = self.plot_torques()
        except Exception as e:
            plots["joint_torques_error"] = str(e)

        try:
            plots["joint_velocities"] = self.plot_velocities()
        except Exception as e:
            plots["joint_velocities_error"] = str(e)

        try:
            plots["robot_arm"] = self.plot_robot_arm()
        except Exception as e:
            plots["robot_arm_error"] = str(e)

        try:
            plots["animation"] = self.create_animation()
        except Exception as e:
            plots["animation_error"] = str(e)

        return plots
