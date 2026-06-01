from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any
from pathlib import Path
import json
import csv
from .units import Quantity, Unit
from .calculator import CalculationResult
from .models import Beam, Load, LoadType
from .warnings import WarningCollector, WarningType, WarningLevel


try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import numpy as np
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


@dataclass
class ChartGenerator:
    warning_collector: Optional[WarningCollector] = None

    def __post_init__(self):
        if self.warning_collector is None:
            self.warning_collector = WarningCollector()
        if not MATPLOTLIB_AVAILABLE:
            self.warning_collector.add(
                warning_type=WarningType.MISSING_DEPENDENCY,
                level=WarningLevel.WARNING,
                message="matplotlib 未安装，图表导出功能将使用数据模式",
                details={"missing": "matplotlib"},
            )

    def export_shear_diagram(self,
                              result: CalculationResult,
                              filepath: str,
                              format: str = "png",
                              title: str = "剪力图 (Shear Force Diagram)") -> str:
        return self._export_diagram(
            points=result.shear_force_points,
            filepath=filepath,
            format=format,
            title=title,
            ylabel=f"剪力 V ({result.left_reaction.unit.symbol})" if result.left_reaction else "剪力 V",
            color="#d32f2f",
            fill_alpha=0.1,
        )

    def export_moment_diagram(self,
                               result: CalculationResult,
                               filepath: str,
                               format: str = "png",
                               title: str = "弯矩图 (Bending Moment Diagram)") -> str:
        return self._export_diagram(
            points=result.bending_moment_points,
            filepath=filepath,
            format=format,
            title=title,
            ylabel=f"弯矩 M ({result.max_bending_moment.unit.symbol})" if result.max_bending_moment else "弯矩 M",
            color="#1976d2",
            fill_alpha=0.1,
        )

    def export_deflection_diagram(self,
                                   result: CalculationResult,
                                   filepath: str,
                                   format: str = "png",
                                   title: str = "挠度图 (Deflection Diagram)") -> str:
        if not result.deflection_points:
            self.warning_collector.add(
                warning_type=WarningType.MISSING_DATA,
                level=WarningLevel.WARNING,
                message="没有挠度数据，跳过挠度图导出",
                details={"原因": "缺少截面或材料参数"},
            )
            return ""
        return self._export_diagram(
            points=result.deflection_points,
            filepath=filepath,
            format=format,
            title=title,
            ylabel=f"挠度 δ ({result.deflection_points[0][1].unit.symbol})" if result.deflection_points else "挠度 δ",
            color="#388e3c",
            fill_alpha=0.1,
        )

    def export_all_diagrams(self,
                             result: CalculationResult,
                             output_dir: str,
                             prefix: str = "beam",
                             format: str = "png") -> Dict[str, str]:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        output = {}

        output["shear"] = self.export_shear_diagram(
            result,
            f"{output_dir}/{prefix}_shear.{format}",
            format=format,
        )
        output["moment"] = self.export_moment_diagram(
            result,
            f"{output_dir}/{prefix}_moment.{format}",
            format=format,
        )
        output["deflection"] = self.export_deflection_diagram(
            result,
            f"{output_dir}/{prefix}_deflection.{format}",
            format=format,
        )
        output["combined"] = self.export_combined_diagram(
            result,
            f"{output_dir}/{prefix}_combined.{format}",
            format=format,
        )
        output["data"] = self.export_diagram_data(
            result,
            f"{output_dir}/{prefix}_diagrams_data.csv",
        )

        return output

    def export_combined_diagram(self,
                                 result: CalculationResult,
                                 filepath: str,
                                 format: str = "png",
                                 title: str = "梁受力分析图") -> str:
        if not MATPLOTLIB_AVAILABLE:
            return self._export_data_only(result, filepath, "combined")

        fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
        fig.suptitle(title, fontsize=16, fontweight='bold', y=0.995)

        x_vals = [p[0].value for p in result.shear_force_points]

        ax1 = axes[0]
        v_vals = [p[1].value for p in result.shear_force_points]
        ax1.plot(x_vals, v_vals, color='#d32f2f', linewidth=2)
        ax1.fill_between(x_vals, v_vals, 0, color='#d32f2f', alpha=0.1)
        ax1.set_ylabel(f'V ({result.left_reaction.unit.symbol})' if result.left_reaction else 'V')
        ax1.set_title('剪力图', fontsize=12)
        ax1.grid(True, alpha=0.3)
        ax1.axhline(y=0, color='black', linewidth=0.5)

        if result.shear_force_zero_positions:
            for pos in result.shear_force_zero_positions:
                ax1.axvline(x=pos.value, color='red', linestyle='--', alpha=0.7, linewidth=1)
                ax1.plot(pos.value, 0, 'ro', markersize=8)

        ax2 = axes[1]
        m_vals = [p[1].value for p in result.bending_moment_points]
        ax2.plot(x_vals, m_vals, color='#1976d2', linewidth=2)
        ax2.fill_between(x_vals, m_vals, 0, color='#1976d2', alpha=0.1)
        ax2.set_ylabel(f'M ({result.max_bending_moment.unit.symbol})' if result.max_bending_moment else 'M')
        ax2.set_title('弯矩图', fontsize=12)
        ax2.grid(True, alpha=0.3)
        ax2.axhline(y=0, color='black', linewidth=0.5)

        if result.shear_force_zero_positions:
            for pos in result.shear_force_zero_positions:
                ax2.axvline(x=pos.value, color='red', linestyle='--', alpha=0.7, linewidth=1)
                idx = min(range(len(x_vals)), key=lambda i: abs(x_vals[i] - pos.value))
                if idx < len(m_vals):
                    ax2.plot(pos.value, m_vals[idx], 'ro', markersize=8,
                             label=f'V=0, M={m_vals[idx]:.2f}')

        ax3 = axes[2]
        if result.deflection_points:
            d_vals = [p[1].value for p in result.deflection_points]
            ax3.plot(x_vals, d_vals, color='#388e3c', linewidth=2)
            ax3.fill_between(x_vals, d_vals, 0, color='#388e3c', alpha=0.1)
            ax3.set_ylabel(f'δ ({result.deflection_points[0][1].unit.symbol})')
        ax3.set_xlabel(f'位置 x ({result.shear_force_points[0][0].unit.symbol})')
        ax3.set_title('挠度图', fontsize=12)
        ax3.grid(True, alpha=0.3)
        ax3.axhline(y=0, color='black', linewidth=0.5)

        plt.tight_layout()
        plt.subplots_adjust(top=0.92)

        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(filepath, format=format, dpi=150, bbox_inches='tight')
        plt.close()

        return str(path.absolute())

    def export_diagram_data(self, result: CalculationResult, filepath: str) -> str:
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)

            x_unit = result.shear_force_points[0][0].unit.symbol if result.shear_force_points else 'm'
            v_unit = result.left_reaction.unit.symbol if result.left_reaction else 'N'
            m_unit = result.max_bending_moment.unit.symbol if result.max_bending_moment else 'N·m'
            d_unit = result.deflection_points[0][1].unit.symbol if result.deflection_points else 'm'

            header = [f'x ({x_unit})', f'V ({v_unit})', f'M ({m_unit})']
            if result.deflection_points:
                header.append(f'δ ({d_unit})')
            writer.writerow(header)

            for i in range(len(result.shear_force_points)):
                x, v = result.shear_force_points[i]
                _, m = result.bending_moment_points[i]
                row = [f'{x.value:.6f}', f'{v.value:.6f}', f'{m.value:.6f}']
                if result.deflection_points and i < len(result.deflection_points):
                    _, d = result.deflection_points[i]
                    row.append(f'{d.value:.8f}')
                writer.writerow(row)

        return str(path.absolute())

    def export_load_diagram(self, beam: Beam, result: CalculationResult, filepath: str, format: str = "png") -> str:
        if not MATPLOTLIB_AVAILABLE:
            return filepath

        fig, ax = plt.subplots(figsize=(12, 4))

        L = beam.length.to_base().value
        ax.plot([0, L], [0, 0], 'k-', linewidth=3, label='梁轴线')

        ax.plot(0, 0, 'kv', markersize=15, label='铰支座')
        ax.plot(L, 0, 'ko', markersize=12, markerfacecolor='white', label='滚动支座')

        for i, load in enumerate(beam.loads):
            if load.magnitude.value == 0:
                continue

            if load.load_type == LoadType.CONCENTRATED_FORCE:
                a = load.position.to_base().value
                F = load.magnitude.to_base().value
                scale = 0.5 / max(abs(F), 1.0)
                ax.arrow(a, F * scale, 0, -F * scale * 0.9,
                         head_width=0.1, head_length=abs(F) * scale * 0.1,
                         fc='red', ec='red', linewidth=2)
                ax.text(a, F * scale * 1.2, f'F{i+1}={load.magnitude}',
                        ha='center', va='bottom', color='red', fontweight='bold')

            elif load.load_type == LoadType.UNIFORM_DISTRIBUTED:
                a = load.start_position.to_base().value
                b = load.end_position.to_base().value
                q = load.magnitude.to_base().value
                scale = 0.3 / max(abs(q), 1.0)
                num_arrows = 8
                for j in range(num_arrows + 1):
                    xj = a + j * (b - a) / num_arrows
                    ax.arrow(xj, q * scale, 0, -q * scale * 0.9,
                             head_width=0.08, head_length=abs(q) * scale * 0.1,
                             fc='blue', ec='blue', linewidth=1.5)
                ax.plot([a, b], [q * scale, q * scale], 'b--', linewidth=2)
                ax.text((a + b) / 2, q * scale * 1.3, f'q{i+1}={load.magnitude}',
                        ha='center', va='bottom', color='blue', fontweight='bold')

            elif load.load_type in [LoadType.TRIANGULAR_DISTRIBUTED, LoadType.TRAPEZOIDAL_DISTRIBUTED]:
                a = load.start_position.to_base().value
                b = load.end_position.to_base().value
                q1 = load.magnitude.to_base().value
                q2 = load.magnitude_end.to_base().value if load.magnitude_end else 0
                max_q = max(abs(q1), abs(q2))
                scale = 0.3 / max(max_q, 1.0)
                num_arrows = 10
                for j in range(num_arrows + 1):
                    xj = a + j * (b - a) / num_arrows
                    qj = q1 + (q2 - q1) * j / num_arrows if num_arrows > 0 else q1
                    ax.arrow(xj, qj * scale, 0, -qj * scale * 0.9,
                             head_width=0.08, head_length=abs(qj) * scale * 0.1,
                             fc='purple', ec='purple', linewidth=1.5)
                ax.text((a + b) / 2, max_q * scale * 1.3, f'q{i+1}',
                        ha='center', va='bottom', color='purple', fontweight='bold')

        ax.set_xlabel(f'x ({beam.length.unit.symbol})')
        ax.set_title('梁的载荷分布图', fontsize=14, fontweight='bold')
        ax.set_ylim(-0.1, 0.8)
        ax.grid(True, alpha=0.3)
        ax.legend(loc='upper right')

        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(filepath, format=format, dpi=150, bbox_inches='tight')
        plt.close()

        return str(path.absolute())

    def _export_diagram(self,
                         points: List[Tuple[Quantity, Quantity]],
                         filepath: str,
                         format: str,
                         title: str,
                         ylabel: str,
                         color: str,
                         fill_alpha: float) -> str:
        if not MATPLOTLIB_AVAILABLE or not points:
            return self._export_data_only_points(points, filepath, title)

        fig, ax = plt.subplots(figsize=(10, 5))

        x_vals = [p[0].value for p in points]
        y_vals = [p[1].value for p in points]

        ax.plot(x_vals, y_vals, color=color, linewidth=2.5)
        ax.fill_between(x_vals, y_vals, 0, color=color, alpha=fill_alpha)

        max_idx = max(range(len(y_vals)), key=lambda i: y_vals[i])
        min_idx = min(range(len(y_vals)), key=lambda i: y_vals[i])

        ax.plot(x_vals[max_idx], y_vals[max_idx], 'o', color=color, markersize=10,
                label=f'Max = {y_vals[max_idx]:.4g}')
        ax.plot(x_vals[min_idx], y_vals[min_idx], 's', color=color, markersize=10,
                label=f'Min = {y_vals[min_idx]:.4g}')

        ax.set_xlabel(f'位置 x ({points[0][0].unit.symbol})')
        ax.set_ylabel(ylabel)
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.axhline(y=0, color='black', linewidth=0.8)
        ax.legend(loc='best')

        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(filepath, format=format, dpi=150, bbox_inches='tight')
        plt.close()

        return str(path.absolute())

    def _export_data_only(self, result: CalculationResult, filepath: str, diagram_type: str) -> str:
        data = {
            "diagram_type": diagram_type,
            "matplotlib_available": False,
            "shear_force": [{"x": str(x), "value": str(v)} for x, v in result.shear_force_points],
            "bending_moment": [{"x": str(x), "value": str(m)} for x, m in result.bending_moment_points],
        }
        if result.deflection_points:
            data["deflection"] = [{"x": str(x), "value": str(d)} for x, d in result.deflection_points]

        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        json_path = path.with_suffix('.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(json_path.absolute())

    def _export_data_only_points(self, points: List[Tuple[Quantity, Quantity]], filepath: str, title: str) -> str:
        data = {
            "title": title,
            "matplotlib_available": False,
            "points": [{"x": str(x), "value": str(v)} for x, v in points],
        }
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        json_path = path.with_suffix('.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(json_path.absolute())
