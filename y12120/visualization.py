import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import rcParams
from typing import Callable, Dict, List, Optional, Tuple
import sympy as sp

from core import trapezoidal_rule, simpsons_rule, compute_step_size
from error_analysis import ErrorEstimate, ErrorStatus

rcParams['font.sans-serif'] = ['PingFang SC', 'Heiti SC', 'STKaiti', 'Arial Unicode MS', 'SimHei', 'DejaVu Sans']
rcParams['axes.unicode_minus'] = False
rcParams['font.size'] = 11


class ChartGenerator:
    def __init__(self, output_dir: str = "./output/charts"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _save_fig(self, fig, filename: str, data_hash: str = "") -> str:
        if data_hash:
            base, ext = os.path.splitext(filename)
            filename = f"{base}_{data_hash[:8]}{ext}"
        filepath = os.path.join(self.output_dir, filename)
        fig.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        return filepath

    def plot_curve_comparison(
        self,
        f: Callable[[float], float],
        a: float,
        b: float,
        n: int,
        function_expr: str = "",
        data_hash: str = "",
        title_suffix: str = ""
    ) -> str:
        x_fine = np.linspace(a, b, 500)
        y_fine = f(x_fine)

        trap_result, x_trap, y_trap = trapezoidal_rule(f, a, b, n)
        simp_result, x_simp, y_simp = simpsons_rule(f, a, b, n)

        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        ax0 = axes[0]
        ax0.plot(x_fine, y_fine, 'b-', linewidth=2, label='原函数 f(x)')
        ax0.plot(x_trap, y_trap, 'ro--', markersize=5, linewidth=1.5, label='梯形近似')
        ax0.fill_between(x_trap, y_trap, alpha=0.2, color='red', label='梯形面积')
        for i in range(len(x_trap)):
            ax0.plot([x_trap[i], x_trap[i]], [0, y_trap[i]], 'r:', alpha=0.4)
        ax0.set_xlabel('x')
        ax0.set_ylabel('y')
        title0 = f'梯形公式近似 (n={n})'
        if title_suffix:
            title0 += f' - {title_suffix}'
        ax0.set_title(title0)
        ax0.legend(loc='best')
        ax0.grid(True, alpha=0.3)
        trap_h = compute_step_size(a, b, n)
        ax0.text(0.02, 0.98, f'步长 h = {trap_h:.6f}\n近似值 = {trap_result:.8f}',
                 transform=ax0.transAxes, va='top',
                 bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

        ax1 = axes[1]
        ax1.plot(x_fine, y_fine, 'b-', linewidth=2, label='原函数 f(x)')
        ax1.plot(x_simp, y_simp, 'go--', markersize=5, linewidth=1.5, label='辛普森近似')
        for i in range(0, len(x_simp) - 1, 2):
            x_quad = np.linspace(x_simp[i], x_simp[i + 2], 30)
            p = np.polyfit(x_simp[i:i + 3], y_simp[i:i + 3], 2)
            y_quad = np.polyval(p, x_quad)
            ax1.fill_between(x_quad, y_quad, alpha=0.2, color='green')
            ax1.plot(x_quad, y_quad, 'g-', linewidth=1.2, alpha=0.7)
        for i in range(len(x_simp)):
            ax1.plot([x_simp[i], x_simp[i]], [0, y_simp[i]], 'g:', alpha=0.4)
        ax1.set_xlabel('x')
        ax1.set_ylabel('y')
        title1 = f'辛普森公式近似 (n={n})'
        if title_suffix:
            title1 += f' - {title_suffix}'
        ax1.set_title(title1)
        ax1.legend(loc='best')
        ax1.grid(True, alpha=0.3)
        simp_h = compute_step_size(a, b, n if n % 2 == 0 else n + 1)
        ax1.text(0.02, 0.98, f'步长 h = {simp_h:.6f}\n近似值 = {simp_result:.8f}',
                 transform=ax1.transAxes, va='top',
                 bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.8))

        if function_expr:
            fig.suptitle(f'f(x) = {function_expr}', fontsize=13, y=1.02)

        fig.tight_layout()
        return self._save_fig(fig, f"curve_comparison_n{n}.png", data_hash)

    def plot_error_vs_stepsize(
        self,
        f: Callable[[float], float],
        a: float,
        b: float,
        n_values: List[int],
        exact_value: float,
        function_expr: str = "",
        data_hash: str = "",
        title_suffix: str = ""
    ) -> str:
        h_values = []
        trap_errors = []
        simp_errors = []
        trap_estimates = []
        simp_estimates = []

        for n in n_values:
            h = compute_step_size(a, b, n)
            h_values.append(h)
            trap_val, _, _ = trapezoidal_rule(f, a, b, n)
            simp_val, _, _ = simpsons_rule(f, a, b, n)
            trap_estimates.append(trap_val)
            simp_estimates.append(simp_val)
            trap_errors.append(abs(trap_val - exact_value))
            simp_errors.append(abs(simp_val - exact_value))

        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        ax0 = axes[0]
        ax0.loglog(h_values, trap_errors, 'ro-', markersize=7, linewidth=2, label='梯形公式-实际误差')
        ax0.loglog(h_values, simp_errors, 'go-', markersize=7, linewidth=2, label='辛普森公式-实际误差')

        if len(h_values) >= 2:
            h_ref = np.array([min(h_values), max(h_values)])
            trap_slope = np.polyfit(np.log(h_values[:4]), np.log(trap_errors[:4]), 1)[0]
            simp_slope = np.polyfit(np.log(h_values[:4]), np.log(simp_errors[:4]), 1)[0]
            ax0.loglog(h_ref, trap_errors[0] * (h_ref / h_values[0]) ** 2, 'r--',
                       alpha=0.5, label=f'O(h²) 参考线 (斜率≈{trap_slope:.2f})')
            ax0.loglog(h_ref, simp_errors[0] * (h_ref / h_values[0]) ** 4, 'g--',
                       alpha=0.5, label=f'O(h⁴) 参考线 (斜率≈{simp_slope:.2f})')

        ax0.set_xlabel('步长 h (对数尺度)')
        ax0.set_ylabel('绝对误差 |E| (对数尺度)')
        title0 = '误差-步长关系 (双对数图)'
        if title_suffix:
            title0 += f' - {title_suffix}'
        ax0.set_title(title0)
        ax0.legend(loc='best')
        ax0.grid(True, alpha=0.3, which='both')
        for i, n in enumerate(n_values):
            ax0.annotate(f'n={n}', (h_values[i], trap_errors[i]),
                        textcoords="offset points", xytext=(5, 5), fontsize=9, color='red')

        ax1 = axes[1]
        ax1.semilogx(h_values, trap_estimates, 'ro-', markersize=7, linewidth=2, label='梯形公式近似值')
        ax1.semilogx(h_values, simp_estimates, 'go-', markersize=7, linewidth=2, label='辛普森公式近似值')
        ax1.axhline(y=exact_value, color='b', linestyle='--', linewidth=2, label=f'精确值 = {exact_value:.8f}')
        ax1.set_xlabel('步长 h (对数尺度)')
        ax1.set_ylabel('积分近似值')
        title1 = '近似值收敛过程'
        if title_suffix:
            title1 += f' - {title_suffix}'
        ax1.set_title(title1)
        ax1.legend(loc='best')
        ax1.grid(True, alpha=0.3, which='both')

        if function_expr:
            fig.suptitle(f'f(x) = {function_expr}\n精确值 = {exact_value:.10f}', fontsize=12, y=1.02)

        fig.tight_layout()
        return self._save_fig(fig, "error_vs_stepsize.png", data_hash)

    def plot_convergence_table(
        self,
        error_results: Dict[int, ErrorEstimate],
        function_expr: str = "",
        data_hash: str = "",
        title_suffix: str = ""
    ) -> str:
        n_list = sorted(error_results.keys())
        h_values = []
        trap_errors = []
        simp_errors = []
        trap_ratios = []
        simp_ratios = []

        for n in n_list:
            est = error_results[n]
            h_values.append(est.step_size)
            trap_errors.append(est.trapezoidal_error if est.trapezoidal_error is not None else np.nan)
            simp_errors.append(est.simpsons_error if est.simpsons_error is not None else np.nan)

        for i in range(1, len(n_list)):
            if trap_errors[i] > 0 and trap_errors[i - 1] > 0:
                trap_ratios.append(trap_errors[i - 1] / trap_errors[i])
            else:
                trap_ratios.append(np.nan)
            if simp_errors[i] > 0 and simp_errors[i - 1] > 0:
                simp_ratios.append(simp_errors[i - 1] / simp_errors[i])
            else:
                simp_ratios.append(np.nan)

        fig, ax = plt.subplots(figsize=(12, 6))
        ax.axis('off')

        col_labels = ['n (区间数)', '步长 h', '梯形误差 E_T', '误差比 E_T(h)/E_T(2h)',
                      '辛普森误差 E_S', '误差比 E_S(h)/E_S(2h)']
        cell_text = []
        for i, n in enumerate(n_list):
            row = [
                f'{n}',
                f'{h_values[i]:.6f}',
                f'{trap_errors[i]:.2e}' if not np.isnan(trap_errors[i]) else 'N/A',
                f'{trap_ratios[i - 1]:.2f}' if i > 0 and not np.isnan(trap_ratios[i - 1]) else '-',
                f'{simp_errors[i]:.2e}' if not np.isnan(simp_errors[i]) else 'N/A',
                f'{simp_ratios[i - 1]:.2f}' if i > 0 and not np.isnan(simp_ratios[i - 1]) else '-',
            ]
            cell_text.append(row)

        table = ax.table(cellText=cell_text, colLabels=col_labels,
                         cellLoc='center', loc='center',
                         colColours=['#f0f0f0'] * len(col_labels))
        table.auto_set_font_size(False)
        table.set_fontsize(10)
        table.scale(1, 1.8)

        notes_text = "说明：\n"
        notes_text += "  • 梯形公式误差比理论值 ≈ 4 (O(h²) 收敛)\n"
        notes_text += "  • 辛普森公式误差比理论值 ≈ 16 (O(h⁴) 收敛)\n"
        notes_text += "  • 误差比越接近理论值，说明收敛行为符合预期"
        ax.text(0.02, -0.15, notes_text, transform=ax.transAxes,
                fontsize=10, va='top',
                bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.7))

        title = '收敛阶分析表'
        if title_suffix:
            title += f' - {title_suffix}'
        if function_expr:
            title += f'\nf(x) = {function_expr}'
        ax.set_title(title, fontsize=13, y=1.0, pad=20)

        fig.tight_layout()
        return self._save_fig(fig, "convergence_table.png", data_hash)

    def plot_status_summary(
        self,
        error_est: ErrorEstimate,
        function_expr: str = "",
        data_hash: str = "",
        title_suffix: str = ""
    ) -> str:
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.axis('off')

        status_colors = {
            ErrorStatus.OK: '#4CAF50',
            ErrorStatus.SINGULARITY: '#FF9800',
            ErrorStatus.INTERVAL_REVERSED: '#FF9800',
            ErrorStatus.STEP_TOO_LARGE: '#FF9800',
            ErrorStatus.MULTIPLE_ISSUES: '#f44336',
        }
        color = status_colors.get(error_est.status, '#9E9E9E')

        info_text = f"{'=' * 60}\n"
        info_text += f"  误差分析状态报告\n"
        info_text += f"{'=' * 60}\n\n"
        info_text += f"  状态: [{error_est.status.value}]\n"
        info_text += f"  建议动作: {error_est.action.value}\n\n"

        info_text += f"  计算参数:\n"
        info_text += f"    区间数 n = {error_est.n_intervals}\n"
        info_text += f"    步长 h = {error_est.step_size:.8f}\n"
        info_text += f"    步长/区间长度比 = {error_est.step_ratio:.4f}\n\n"

        info_text += f"  近似结果:\n"
        info_text += f"    梯形公式: {error_est.trapezoidal_approx:.10f}\n"
        info_text += f"    辛普森公式: {error_est.simpsons_approx:.10f}\n"

        if error_est.exact_value is not None:
            info_text += f"    精确值: {error_est.exact_value:.10f}\n\n"
            info_text += f"  实际误差:\n"
            if error_est.trapezoidal_error is not None:
                info_text += f"    梯形绝对误差: {error_est.trapezoidal_error:.2e}\n"
                info_text += f"    梯形相对误差: {error_est.trapezoidal_relative_error:.2e}\n"
            if error_est.simpsons_error is not None:
                info_text += f"    辛普森绝对误差: {error_est.simpsons_error:.2e}\n"
                info_text += f"    辛普森相对误差: {error_est.simpsons_relative_error:.2e}\n"
        else:
            info_text += f"    精确值: [待补录]\n\n"

        if error_est.trapezoidal_theoretical_bound is not None:
            info_text += f"  理论误差界:\n"
            info_text += f"    梯形公式上界: {error_est.trapezoidal_theoretical_bound:.2e}\n"
        if error_est.simpsons_theoretical_bound is not None:
            info_text += f"    辛普森公式上界: {error_est.simpsons_theoretical_bound:.2e}\n"

        if error_est.notes:
            info_text += f"\n  备注:\n"
            for note in error_est.notes:
                info_text += f"    ! {note}\n"

        if error_est.status != ErrorStatus.OK:
            info_text += f"\n  ⚠  此计算结果需要人工复核，请联系相关人员确认。\n"

        ax.text(0.05, 0.95, info_text, transform=ax.transAxes,
                fontsize=11, va='top', family='monospace',
                bbox=dict(boxstyle='round,pad=1', facecolor=color, alpha=0.15,
                          edgecolor=color, linewidth=2))

        title = '误差分析状态汇总'
        if title_suffix:
            title += f' - {title_suffix}'
        if function_expr:
            title += f'\nf(x) = {function_expr}'
        ax.set_title(title, fontsize=13, y=0.98)

        fig.tight_layout()
        return self._save_fig(fig, "status_summary.png", data_hash)


    def generate_all_charts(
        self,
        unified_data: Dict,
        n_values: Optional[List[int]] = None
    ) -> Dict[str, str]:
        f = unified_data['f']
        a = unified_data['a']
        b = unified_data['b']
        n = unified_data['n']
        exact_value = unified_data['exact_value']
        function_expr = unified_data['function_expr']
        data_hash = unified_data['data_hash']

        if n_values is None:
            n_values = [n]
            for factor in [2, 4, 8, 16]:
                n_val = n * factor
                if n_val <= 512:
                    n_values.append(n_val)

        charts = {}

        charts['curve_comparison'] = self.plot_curve_comparison(
            f, a, b, n, function_expr, data_hash,
            title_suffix=f"区间 [{a}, {b}]"
        )

        if exact_value is not None:
            charts['error_vs_stepsize'] = self.plot_error_vs_stepsize(
                f, a, b, n_values, exact_value, function_expr, data_hash,
                title_suffix=f"区间 [{a}, {b}]"
            )

            from error_analysis import analyze_step_convergence
            error_results = analyze_step_convergence(f, a, b, n_values, exact_value)
            charts['convergence_table'] = self.plot_convergence_table(
                error_results, function_expr, data_hash,
                title_suffix=f"区间 [{a}, {b}]"
            )

        if unified_data.get('error_estimate'):
            from error_analysis import ErrorEstimate, ErrorStatus, ReviewAction
            ee_dict = unified_data['error_estimate']
            ee = ErrorEstimate(
                status=ErrorStatus(ee_dict['status']),
                action=ReviewAction(ee_dict['action']),
                trapezoidal_approx=ee_dict['trapezoidal_approx'],
                simpsons_approx=ee_dict['simpsons_approx'],
                exact_value=ee_dict.get('exact_value'),
                trapezoidal_error=ee_dict.get('trapezoidal_error'),
                simpsons_error=ee_dict.get('simpsons_error'),
                trapezoidal_relative_error=ee_dict.get('trapezoidal_relative_error'),
                simpsons_relative_error=ee_dict.get('simpsons_relative_error'),
                step_size=ee_dict['step_size'],
                n_intervals=ee_dict['n_intervals'],
                has_singularity=ee_dict['has_singularity'],
                singularity_points=ee_dict.get('singularity_points', []),
                is_interval_reversed=ee_dict['is_interval_reversed'],
                is_step_too_large=ee_dict['is_step_too_large'],
                step_ratio=ee_dict['step_ratio'],
                notes=ee_dict.get('notes', []),
                trapezoidal_theoretical_bound=ee_dict.get('trapezoidal_theoretical_bound'),
                simpsons_theoretical_bound=ee_dict.get('simpsons_theoretical_bound')
            )
            charts['status_summary'] = self.plot_status_summary(
                ee, function_expr, data_hash,
                title_suffix=f"区间 [{a}, {b}]"
            )

        return charts
