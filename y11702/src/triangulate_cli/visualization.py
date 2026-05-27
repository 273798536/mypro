from __future__ import annotations

import math
from typing import List, Optional, Tuple

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Arial", "Liberation Sans"]
plt.rcParams["axes.unicode_minus"] = False
import numpy as np
from matplotlib.patches import Ellipse, Rectangle

from .models import ErrorEllipse, MapBounds, Observation, ObservationStatus, TriangulationResult


class MapVisualizer:
    def __init__(
        self,
        dpi: int = 150,
        figsize: Tuple[int, int] = (10, 8),
    ):
        self.dpi = dpi
        self.figsize = figsize

    def _get_line_endpoint(
        self,
        start: Tuple[float, float],
        angle: float,
        length: float,
    ) -> Tuple[float, float]:
        end_x = start[0] + length * math.cos(angle)
        end_y = start[1] + length * math.sin(angle)
        return (end_x, end_y)

    def _plot_error_ellipse(self, ax: plt.Axes, ellipse: ErrorEllipse):
        ellipse_patch = Ellipse(
            xy=(ellipse.center.x, ellipse.center.y),
            width=ellipse.major_axis,
            height=ellipse.minor_axis,
            angle=math.degrees(ellipse.orientation),
            facecolor="red",
            alpha=0.2,
            edgecolor="red",
            linewidth=2,
            label=f"{ellipse.confidence_level*100:.0f}% Confidence",
        )
        ax.add_patch(ellipse_patch)

    def _plot_bearing_line(
        self,
        ax: plt.Axes,
        obs: Observation,
        line_length: float,
        color: str,
        alpha: float = 1.0,
    ):
        start = obs.position.to_tuple()
        angle = obs.bearing.to_radians()
        end = self._get_line_endpoint(start, angle, line_length)

        ax.plot(
            [start[0], end[0]],
            [start[1], end[1]],
            color=color,
            linestyle="--",
            linewidth=1.5,
            alpha=alpha,
        )

        if obs.bearing.error > 0:
            error_angle = obs.bearing.error_radians()
            end_left = self._get_line_endpoint(start, angle - error_angle, line_length * 0.9)
            end_right = self._get_line_endpoint(start, angle + error_angle, line_length * 0.9)

            ax.plot(
                [start[0], end_left[0]],
                [start[1], end_left[1]],
                color=color,
                linestyle=":",
                linewidth=1,
                alpha=alpha * 0.7,
            )
            ax.plot(
                [start[0], end_right[0]],
                [start[1], end_right[1]],
                color=color,
                linestyle=":",
                linewidth=1,
                alpha=alpha * 0.7,
            )

    def plot(
        self,
        result: TriangulationResult,
        observations: List[Observation],
        map_bounds: Optional[MapBounds] = None,
        title: str = "Triangulation Result",
    ) -> plt.Figure:
        fig, ax = plt.subplots(figsize=self.figsize, dpi=self.dpi)

        all_points = [obs.position.to_tuple() for obs in observations]
        all_points.append(result.estimated_position.to_tuple())

        if map_bounds:
            map_rect = Rectangle(
                (map_bounds.min_x, map_bounds.min_y),
                map_bounds.width(),
                map_bounds.height(),
                facecolor="lightgray",
                alpha=0.3,
                edgecolor="gray",
                linewidth=2,
                label="Map Bounds",
            )
            ax.add_patch(map_rect)
            ax.set_xlim(map_bounds.min_x, map_bounds.max_x)
            ax.set_ylim(map_bounds.min_y, map_bounds.max_y)
        else:
            xs = [p[0] for p in all_points]
            ys = [p[1] for p in all_points]
            margin = 0.2
            x_range = max(xs) - min(xs)
            y_range = max(ys) - min(ys)
            ax.set_xlim(min(xs) - margin * x_range, max(xs) + margin * x_range)
            ax.set_ylim(min(ys) - margin * y_range, max(ys) + margin * y_range)

        xlim = ax.get_xlim()
        ylim = ax.get_ylim()
        line_length = max(xlim[1] - xlim[0], ylim[1] - ylim[0]) * 1.5

        colors = plt.cm.Set3(np.linspace(0, 1, max(3, len(observations))))

        for idx, obs in enumerate(observations):
            color = colors[idx]

            if obs.status == ObservationStatus.VALID:
                marker = "o"
                markersize = 8
                alpha = 1.0
                self._plot_bearing_line(ax, obs, line_length, color, alpha)
            elif obs.status == ObservationStatus.OUTLIER:
                marker = "x"
                markersize = 10
                alpha = 0.5
                self._plot_bearing_line(ax, obs, line_length, "gray", alpha * 0.3)
            elif obs.status == ObservationStatus.PARALLEL:
                marker = "s"
                markersize = 8
                alpha = 0.6
                self._plot_bearing_line(ax, obs, line_length, "orange", alpha * 0.5)
            else:
                marker = "?"
                markersize = 6
                alpha = 0.3

            ax.scatter(
                obs.position.x,
                obs.position.y,
                marker=marker,
                s=markersize**2,
                color=color if obs.status == ObservationStatus.VALID else "gray",
                alpha=alpha,
                label=f"{obs.station_id} ({obs.status.value})",
                zorder=5,
            )

            ax.annotate(
                obs.station_id,
                (obs.position.x, obs.position.y),
                xytext=(5, 5),
                textcoords="offset points",
                fontsize=8,
                fontweight="bold",
            )

        for pt in result.intersections:
            ax.scatter(
                pt.position.x,
                pt.position.y,
                marker="+",
                s=30,
                color="blue",
                alpha=0.5,
                zorder=3,
            )

        ax.scatter(
            result.estimated_position.x,
            result.estimated_position.y,
            marker="*",
            s=200,
            color="red",
            edgecolor="darkred",
            linewidth=2,
            zorder=10,
            label="Estimated Position",
        )

        if result.error_ellipse:
            self._plot_error_ellipse(ax, result.error_ellipse)

        ax.set_aspect("equal")
        ax.set_xlabel("X Coordinate")
        ax.set_ylabel("Y Coordinate")
        ax.set_title(title, fontsize=14, fontweight="bold")
        ax.grid(True, alpha=0.3, linestyle="--")

        legend = ax.legend(bbox_to_anchor=(1.05, 1), loc="upper left", fontsize=8)

        pos_text = (
            f"Est. Pos.: ({result.estimated_position.x:.2f}, {result.estimated_position.y:.2f})\n"
            f"Confidence: {result.confidence_score*100:.1f}%\n"
            f"Valid Obs.: {len(result.used_observations)}/{len(observations)}"
        )
        ax.text(
            0.02,
            0.02,
            pos_text,
            transform=ax.transAxes,
            fontsize=9,
            bbox=dict(boxstyle="round", facecolor="white", alpha=0.8),
            verticalalignment="bottom",
        )

        plt.tight_layout()

        return fig

    def save(
        self,
        output_path: str,
        result: TriangulationResult,
        observations: List[Observation],
        map_bounds: Optional[MapBounds] = None,
        title: str = "Triangulation Result",
    ):
        fig = self.plot(result, observations, map_bounds, title)
        fig.savefig(output_path, bbox_inches="tight", dpi=self.dpi)
        plt.close(fig)


def create_map_plot(
    output_path: str,
    result: TriangulationResult,
    observations: List[Observation],
    map_bounds: Optional[MapBounds] = None,
    dpi: int = 150,
):
    visualizer = MapVisualizer(dpi=dpi)
    visualizer.save(output_path, result, observations, map_bounds)
