import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
import os
from .fitter import FitResult
from .safety import SafetyReport


def _setup_chinese_font():
    candidates = [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/Supplemental/Songti.ttc',
    ]
    for fp in candidates:
        if os.path.exists(fp):
            try:
                fm.fontManager.addfont(fp)
                prop = fm.FontProperties(fname=fp)
                plt.rcParams['font.family'] = prop.get_name()
                plt.rcParams['axes.unicode_minus'] = False
                return True
            except Exception:
                continue
    plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
    return False


_setup_chinese_font()


class Plotter:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.generated_files = []

    def plot_stern_volmer(self, fit_before: FitResult, fit_after: FitResult,
                          df: pd.DataFrame, issues: Dict[str, Any],
                          filename: str = 'stern_volmer_fit.png') -> str:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        for ax_idx, (fit, title_prefix) in enumerate([
            (fit_before, '配平前'),
            (fit_after, '配平后')
        ]):
            ax = axes[ax_idx]

            q = fit.concentrations
            i0_ratio = fit.i0_over_i
            fitted = fit.fitted_values

            ax.scatter(q, i0_ratio, color='#2E75B6', s=60, zorder=5,
                       edgecolor='white', linewidth=1, label='实验数据点')

            if fit.method.startswith('Stern-Volmer线性'):
                q_line = np.linspace(0, max(q) * 1.05, 100)
                i0_pred = fit.intercept + fit.ksv * q_line
                ax.plot(q_line, i0_pred, color='#C00000', linewidth=2,
                        linestyle='--', label=f'拟合直线 (R²={fit.r_squared:.4f})')
            else:
                q_line = np.linspace(0, max(q) * 1.05, 200)
                ksv2 = fit.fitted_params.get('Ksv2', 0)
                i0_pred = fit.intercept + fit.ksv * q_line + ksv2 * q_line ** 2
                ax.plot(q_line, i0_pred, color='#C00000', linewidth=2,
                        linestyle='--', label=f'拟合曲线 (R²={fit.r_squared:.4f})')

            ax.axhline(y=1.0, color='gray', linestyle=':', alpha=0.5,
                       label='I0/I=1 参考线')

            abnormal_ids = set()
            if issues.get('abnormal_intensity'):
                for item in issues['abnormal_intensity']:
                    abnormal_ids.add(item['row_id'])

            time_missing_ids = set()
            if issues.get('time_missing'):
                for item in issues['time_missing']:
                    time_missing_ids.add(item['row_id'])

            supplementary_ids = set()
            if issues.get('supplementary_records'):
                for item in issues['supplementary_records']:
                    supplementary_ids.add(item['row_id'])

            for _, row in df.iterrows():
                rid = row['_row_id']
                if rid in fit.row_ids:
                    continue
                try:
                    c = float(row['concentration'])
                    i = float(row['intensity'])
                    if i > 0:
                        ratio = fit.i0 / i
                        if rid in abnormal_ids:
                            ax.scatter([c], [ratio], color='red', s=100, marker='x',
                                       linewidths=2, zorder=6, label='_异常点')
                            ax.annotate(f'行{rid}(异常)', (c, ratio),
                                        textcoords='offset points', xytext=(5, 5),
                                        fontsize=8, color='red', fontweight='bold')
                        elif rid in time_missing_ids:
                            ax.scatter([c], [ratio], color='#FFC000', s=80,
                                       marker='^', edgecolor='#C00000', zorder=6,
                                       label='_时间漏记')
                            ax.annotate(f'行{rid}(缺时)', (c, ratio),
                                        textcoords='offset points', xytext=(5, 5),
                                        fontsize=8, color='#C00000')
                        elif rid in supplementary_ids:
                            ax.scatter([c], [ratio], color='#70AD47', s=70,
                                       marker='D', edgecolor='#548235', zorder=6,
                                       label='_补录')
                            ax.annotate(f'行{rid}(补录)', (c, ratio),
                                        textcoords='offset points', xytext=(5, -12),
                                        fontsize=8, color='#548235')
                except (ValueError, TypeError):
                    continue

            ax.set_xlabel('猝灭剂浓度 [Q] (mmol/L)', fontsize=11, fontweight='bold')
            ax.set_ylabel('I₀ / I', fontsize=11, fontweight='bold')
            ax.set_title(f'{title_prefix} - {fit.method}\n'
                         f'Ksv = {fit.ksv:.4f} ± {fit.ksv_err:.4f} L/mmol | '
                         f'截距 = {fit.intercept:.3f}',
                         fontsize=11, fontweight='bold')
            ax.grid(True, alpha=0.3, linestyle='--')
            ax.legend(loc='best', fontsize=9)

        plt.suptitle('荧光猝灭 Stern-Volmer 拟合曲线对比（配平前 vs 配平后）',
                     fontsize=14, fontweight='bold', y=1.02)
        plt.tight_layout()

        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close(fig)
        self.generated_files.append(filepath)
        print(f'[图表] 已生成: {filepath}')
        return filepath

    def plot_residuals(self, fit_before: FitResult, fit_after: FitResult,
                       filename: str = 'residuals.png') -> str:
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        for ax_idx, (fit, title_prefix) in enumerate([
            (fit_before, '配平前'),
            (fit_after, '配平后')
        ]):
            ax = axes[ax_idx]
            q = fit.concentrations
            residuals = fit.residuals

            ax.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
            ax.scatter(q, residuals, color='#2E75B6', s=60, zorder=5,
                       edgecolor='white', linewidth=1)

            for i, (qv, rv) in enumerate(zip(q, residuals)):
                ax.annotate(f'点{i + 1}', (qv, rv), textcoords='offset points',
                            xytext=(5, 5), fontsize=8)

            ax.axhline(y=np.mean(residuals), color='#C00000', linestyle=':',
                       alpha=0.7, label=f'残差均值={np.mean(residuals):.4f}')

            ax.fill_between(q, -fit.rmse, fit.rmse, alpha=0.15, color='#70AD47',
                            label=f'±RMSE区间 (±{fit.rmse:.4f})')

            ax.set_xlabel('猝灭剂浓度 [Q] (mmol/L)', fontsize=11, fontweight='bold')
            ax.set_ylabel('残差 (实验值 - 拟合值)', fontsize=11, fontweight='bold')
            ax.set_title(f'{title_prefix} - 残差分析\n'
                         f'RMSE = {fit.rmse:.5f} | 残差均值 = {np.mean(residuals):.5f}',
                         fontsize=11, fontweight='bold')
            ax.grid(True, alpha=0.3, linestyle='--')
            ax.legend(loc='best', fontsize=9)

        plt.suptitle('残差分析对比（配平前 vs 配平后）',
                     fontsize=14, fontweight='bold', y=1.02)
        plt.tight_layout()

        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close(fig)
        self.generated_files.append(filepath)
        print(f'[图表] 已生成: {filepath}')
        return filepath

    def plot_issue_summary(self, issues: Dict[str, Any],
                           filename: str = 'issue_summary.png') -> str:
        fig, ax = plt.subplots(figsize=(10, 5))

        categories = ['反应时间漏记', '批号重复', '浓度单位漏填',
                      '异常强度值', '补录/旧表', '时间不一致']
        counts = [
            len(issues.get('time_missing', [])),
            len(issues.get('duplicate_batches', [])),
            len(issues.get('unit_missing', [])),
            len(issues.get('abnormal_intensity', [])),
            len(issues.get('supplementary_records', [])),
            len(issues.get('inconsistent_time', []))
        ]
        colors = ['#C00000', '#FFC000', '#FFC000', '#C00000', '#70AD47', '#FFC000']

        bars = ax.bar(categories, counts, color=colors, edgecolor='#404040', linewidth=0.8)

        for bar, count in zip(bars, counts):
            if count > 0:
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height() + 0.05,
                        str(count), ha='center', va='bottom', fontsize=12,
                        fontweight='bold')

        ax.set_ylabel('问题数量（项）', fontsize=11, fontweight='bold')
        ax.set_title('数据质量问题统计', fontsize=13, fontweight='bold')
        ax.set_ylim(0, max(counts) * 1.4 if max(counts) > 0 else 2)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.tick_params(axis='x', labelsize=10)

        legend_labels = [
            plt.Rectangle((0, 0), 1, 1, color='#C00000', label='高风险'),
            plt.Rectangle((0, 0), 1, 1, color='#FFC000', label='中风险'),
            plt.Rectangle((0, 0), 1, 1, color='#70AD47', label='低风险/提示')
        ]
        ax.legend(handles=legend_labels, loc='upper right', fontsize=10)

        plt.tight_layout()

        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close(fig)
        self.generated_files.append(filepath)
        print(f'[图表] 已生成: {filepath}')
        return filepath

    def plot_intensity_raw(self, df: pd.DataFrame, issues: Dict[str, Any],
                           filename: str = 'raw_intensity.png') -> str:
        fig, ax = plt.subplots(figsize=(12, 6))

        x = range(len(df))
        labels = []
        colors = []
        sizes = []

        abnormal_ids = set(item['row_id'] for item in issues.get('abnormal_intensity', []))
        time_missing_ids = set(item['row_id'] for item in issues.get('time_missing', []))

        for _, row in df.iterrows():
            rid = row['_row_id']
            label = f"行{rid}\n{row.get('batch_no', '')[:8]}"
            labels.append(label)

            if rid in abnormal_ids:
                colors.append('#C00000')
                sizes.append(120)
            elif rid in time_missing_ids:
                colors.append('#FFC000')
                sizes.append(90)
            else:
                colors.append('#2E75B6')
                sizes.append(60)

        intensities = pd.to_numeric(df['intensity'], errors='coerce').values
        ax.bar(x, intensities, color=colors, edgecolor='#404040', linewidth=0.8)

        valid_ints = pd.to_numeric(df['intensity'], errors='coerce').dropna()
        if len(valid_ints) > 0:
            mean_val = valid_ints.mean()
            std_val = valid_ints.std()
            ax.axhline(y=mean_val, color='gray', linestyle='--', alpha=0.7,
                       label=f'均值 = {mean_val:.1f}')
            ax.axhline(y=mean_val + 3 * std_val, color='#C00000', linestyle=':',
                       alpha=0.7, label=f'3σ上限 = {mean_val + 3 * std_val:.1f}')
            if mean_val - 3 * std_val > 0:
                ax.axhline(y=mean_val - 3 * std_val, color='#C00000', linestyle=':',
                           alpha=0.7, label=f'3σ下限 = {mean_val - 3 * std_val:.1f}')

        ax.set_xticks(list(x))
        ax.set_xticklabels(labels, fontsize=8, rotation=45, ha='right')
        ax.set_ylabel('荧光强度 I', fontsize=11, fontweight='bold')
        ax.set_title('原始荧光强度分布（按数据行）\n红色=异常值 | 橙色=反应时间漏记',
                     fontsize=12, fontweight='bold')
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.legend(loc='best', fontsize=9)

        plt.tight_layout()

        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close(fig)
        self.generated_files.append(filepath)
        print(f'[图表] 已生成: {filepath}')
        return filepath

    def plot_comparison_radar(self, fit_before: FitResult, fit_after: FitResult,
                              filename: str = 'comparison_radar.png') -> str:
        categories = ['线性度(R²)', 'Ksv稳定性', '截距准确性', '残差均匀性']
        N = len(categories)

        def score_fit(fit: FitResult) -> List[float]:
            r2_score = min(fit.r_squared * 100, 100)
            ksv_score = max(0, 100 - abs(fit.ksv_err / fit.ksv) * 100) if fit.ksv != 0 else 0
            intercept_score = max(0, 100 - abs(fit.intercept - 1.0) * 200)
            residual_std = np.std(fit.residuals) if len(fit.residuals) > 1 else 1
            residual_score = max(0, 100 - residual_std * 100)
            return [r2_score, ksv_score, intercept_score, residual_score]

        scores_before = score_fit(fit_before)
        scores_after = score_fit(fit_after)

        angles = [n / float(N) * 2 * np.pi for n in range(N)]
        angles += angles[:1]
        scores_before += scores_before[:1]
        scores_after += scores_after[:1]

        fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

        ax.plot(angles, scores_before, 'o-', linewidth=2, color='#FFC000',
                label='配平前', markersize=8)
        ax.fill(angles, scores_before, alpha=0.15, color='#FFC000')

        ax.plot(angles, scores_after, 'o-', linewidth=2, color='#70AD47',
                label='配平后', markersize=8)
        ax.fill(angles, scores_after, alpha=0.15, color='#70AD47')

        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories, fontsize=11, fontweight='bold')
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80, 100])
        ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=9)
        ax.set_title('拟合质量雷达图对比', fontsize=14, fontweight='bold', pad=20)
        ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=11)

        plt.tight_layout()

        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close(fig)
        self.generated_files.append(filepath)
        print(f'[图表] 已生成: {filepath}')
        return filepath
