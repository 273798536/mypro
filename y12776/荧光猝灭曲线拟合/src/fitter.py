import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import curve_fit
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field


@dataclass
class FitResult:
    method: str = ''
    ksv: float = 0.0
    ksv_err: float = 0.0
    intercept: float = 0.0
    intercept_err: float = 0.0
    i0: float = 0.0
    i0_err: float = 0.0
    r_squared: float = 0.0
    adj_r_squared: float = 0.0
    rmse: float = 0.0
    n_points: int = 0
    excluded_points: List[int] = field(default_factory=list)
    concentrations: np.ndarray = field(default_factory=lambda: np.array([]))
    intensities: np.ndarray = field(default_factory=lambda: np.array([]))
    i0_over_i: np.ndarray = field(default_factory=lambda: np.array([]))
    fitted_values: np.ndarray = field(default_factory=lambda: np.array([]))
    residuals: np.ndarray = field(default_factory=lambda: np.array([]))
    row_ids: List[int] = field(default_factory=list)
    fitted_params: Dict[str, float] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


class SternVolmerFitter:
    def __init__(self, exclude_abnormal: bool = True, exclude_time_missing: bool = False):
        self.exclude_abnormal = exclude_abnormal
        self.exclude_time_missing = exclude_time_missing
        self.raw_fit: Optional[FitResult] = None
        self.balanced_fit: Optional[FitResult] = None

    @staticmethod
    def _stern_volmer_linear(q: np.ndarray, ksv: float, intercept: float) -> np.ndarray:
        return intercept + ksv * q

    @staticmethod
    def _stern_volmer_second_order(q: np.ndarray, ksv: float, ksv2: float,
                                    intercept: float) -> np.ndarray:
        return intercept + ksv * q + ksv2 * q ** 2

    def _prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[int], List[int]]:
        work_df = df.copy()

        if self.exclude_abnormal and 'is_abnormal' in work_df.columns:
            excluded_abnormal = work_df[work_df['is_abnormal']]['_row_id'].tolist()
            work_df = work_df[~work_df['is_abnormal']]
        else:
            excluded_abnormal = []

        if self.exclude_time_missing and 'is_time_missing' in work_df.columns:
            excluded_time = work_df[work_df['is_time_missing']]['_row_id'].tolist()
            work_df = work_df[~work_df['is_time_missing']]
        else:
            excluded_time = []

        work_df = work_df.dropna(subset=['concentration', 'intensity'])
        work_df = work_df[work_df['intensity'] > 0]

        if len(work_df) == 0:
            raise ValueError('没有可用的数据点进行拟合')

        concentrations = work_df['concentration'].values.astype(float)
        intensities = work_df['intensity'].values.astype(float)
        row_ids = work_df['_row_id'].tolist()

        excluded = excluded_abnormal + excluded_time
        return concentrations, intensities, row_ids, excluded

    def _compute_i0_ratio(self, concentrations: np.ndarray,
                          intensities: np.ndarray) -> Tuple[float, np.ndarray]:
        zero_mask = concentrations == 0
        if zero_mask.sum() == 0:
            i0_estimate = np.max(intensities)
            warnings.warn('未检测到浓度为0的空白样，以最大荧光强度作为I0估计值')
        elif zero_mask.sum() == 1:
            i0_estimate = float(intensities[zero_mask][0])
        else:
            i0_estimate = float(np.mean(intensities[zero_mask]))

        i0_over_i = i0_estimate / intensities
        return i0_estimate, i0_over_i

    def _handle_duplicates(self, concentrations: np.ndarray, intensities: np.ndarray,
                           row_ids: List[int]) -> Tuple[np.ndarray, np.ndarray, List[int]]:
        df_temp = pd.DataFrame({
            'conc': concentrations,
            'intensity': intensities,
            'row_id': row_ids
        })

        grouped = df_temp.groupby('conc').agg({
            'intensity': 'mean',
            'row_id': list
        }).reset_index()

        return (grouped['conc'].values,
                grouped['intensity'].values,
                [ids[0] for ids in grouped['row_id'].values])

    def fit_linear(self, df: pd.DataFrame, balance_for_time: bool = False,
                   time_issues: Optional[List[Dict]] = None,
                   duplicate_batches: Optional[List[Dict]] = None) -> FitResult:
        concentrations, intensities, row_ids, excluded = self._prepare_data(df)

        if len(concentrations) < 3:
            raise ValueError(f'有效数据点不足（仅{len(concentrations)}个），至少需要3个')

        concentrations, intensities, row_ids = self._handle_duplicates(
            concentrations, intensities, row_ids
        )

        if balance_for_time and time_issues:
            adjusted_intensities = self._apply_time_balance(intensities, concentrations,
                                                            row_ids, df, time_issues)
            intensities = adjusted_intensities

        i0, i0_over_i = self._compute_i0_ratio(concentrations, intensities)

        slope, intercept, r_value, p_value, std_err = stats.linregress(
            concentrations, i0_over_i
        )

        n = len(concentrations)
        fitted = intercept + slope * concentrations
        residuals = i0_over_i - fitted

        ss_res = np.sum(residuals ** 2)
        ss_tot = np.sum((i0_over_i - np.mean(i0_over_i)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - 2) if n > 2 else r_squared
        rmse = np.sqrt(ss_res / n)

        intercept_err = std_err * np.sqrt(np.sum(concentrations ** 2) / n /
                                          np.sum((concentrations - np.mean(concentrations)) ** 2))

        result = FitResult(
            method='Stern-Volmer线性拟合',
            ksv=slope,
            ksv_err=std_err,
            intercept=intercept,
            intercept_err=intercept_err,
            i0=i0,
            r_squared=r_squared,
            adj_r_squared=adj_r_squared,
            rmse=rmse,
            n_points=n,
            excluded_points=excluded,
            concentrations=concentrations,
            intensities=intensities,
            i0_over_i=i0_over_i,
            fitted_values=fitted,
            residuals=residuals,
            row_ids=row_ids
        )

        if abs(intercept - 1.0) > 0.2:
            result.warnings.append(f'截距={intercept:.3f}，偏离理论值1.0较多，可能存在系统误差')

        if r_squared < 0.90:
            result.warnings.append(f'R²={r_squared:.4f}，线性相关性较弱，建议检查数据或考虑非线性模型')

        self._check_duplicate_influence(result, duplicate_batches, df)

        return result

    def fit_nonlinear(self, df: pd.DataFrame, balance_for_time: bool = False,
                      time_issues: Optional[List[Dict]] = None) -> FitResult:
        concentrations, intensities, row_ids, excluded = self._prepare_data(df)

        if len(concentrations) < 5:
            raise ValueError(f'非线性拟合需要至少5个有效数据点（当前{len(concentrations)}个）')

        concentrations, intensities, row_ids = self._handle_duplicates(
            concentrations, intensities, row_ids
        )

        if balance_for_time and time_issues:
            adjusted_intensities = self._apply_time_balance(intensities, concentrations,
                                                            row_ids, df, time_issues)
            intensities = adjusted_intensities

        i0, i0_over_i = self._compute_i0_ratio(concentrations, intensities)

        linear_result = self.fit_linear(df, balance_for_time=False)
        initial_guess = [linear_result.ksv, 0.0, 1.0]

        try:
            popt, pcov = curve_fit(
                self._stern_volmer_second_order,
                concentrations, i0_over_i,
                p0=initial_guess,
                maxfev=10000
            )
            perr = np.sqrt(np.diag(pcov))

            ksv, ksv2, intercept = popt
            ksv_err, ksv2_err, intercept_err = perr

            fitted = self._stern_volmer_second_order(concentrations, ksv, ksv2, intercept)
            residuals = i0_over_i - fitted

            ss_res = np.sum(residuals ** 2)
            ss_tot = np.sum((i0_over_i - np.mean(i0_over_i)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            n = len(concentrations)
            adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - 3) if n > 3 else r_squared
            rmse = np.sqrt(ss_res / n)

            result = FitResult(
                method='Stern-Volmer二阶非线性拟合',
                ksv=ksv,
                ksv_err=ksv_err,
                intercept=intercept,
                intercept_err=intercept_err,
                i0=i0,
                r_squared=r_squared,
                adj_r_squared=adj_r_squared,
                rmse=rmse,
                n_points=n,
                excluded_points=excluded,
                concentrations=concentrations,
                intensities=intensities,
                i0_over_i=i0_over_i,
                fitted_values=fitted,
                residuals=residuals,
                row_ids=row_ids,
                fitted_params={'Ksv2': ksv2, 'Ksv2_err': ksv2_err}
            )

            if abs(ksv2) < 1e-6:
                result.warnings.append('二阶项接近零，线性模型可能已足够')

            return result

        except Exception as e:
            print(f'非线性拟合失败，回退到线性拟合: {e}')
            return self.fit_linear(df, balance_for_time, time_issues)

    @staticmethod
    def _apply_time_balance(intensities: np.ndarray, concentrations: np.ndarray,
                            row_ids: List[int], df: pd.DataFrame,
                            time_issues: List[Dict]) -> np.ndarray:
        adjusted = intensities.copy()

        time_per_row = {}
        for issue in time_issues:
            time_per_row[issue['row_id']] = {
                'current': issue['reaction_time'],
                'standard': issue['standard_time']
            }

        for i, rid in enumerate(row_ids):
            if rid in time_per_row:
                info = time_per_row[rid]
                if info['standard'] > 0 and info['current'] > 0:
                    factor = info['standard'] / info['current']
                    adjusted[i] = adjusted[i] * factor

        return adjusted

    @staticmethod
    def _check_duplicate_influence(result: FitResult,
                                   duplicate_batches: Optional[List[Dict]],
                                   df: pd.DataFrame) -> None:
        if not duplicate_batches:
            return

        for dup in duplicate_batches:
            dup_row_ids = set(dup['row_ids'])
            used_dups = dup_row_ids & set(result.row_ids)
            if len(used_dups) > 1:
                batches_in = df[df['_row_id'].isin(used_dups)]['batch_no'].unique()
                for b in batches_in:
                    result.warnings.append(
                        f'批号 [{b}] 有重复记录，已按浓度取均值并入拟合。涉及行: {sorted(used_dups)}'
                    )

    @staticmethod
    def compare_fits(fit1: FitResult, fit2: FitResult) -> Dict[str, Any]:
        comparison = {
            'ksv_diff': fit2.ksv - fit1.ksv,
            'ksv_pct_change': ((fit2.ksv - fit1.ksv) / abs(fit1.ksv) * 100) if fit1.ksv != 0 else 0,
            'r2_diff': fit2.r_squared - fit1.r_squared,
            'rmse_diff': fit2.rmse - fit1.rmse,
            'intercept_diff': fit2.intercept - fit1.intercept,
            'judgment_changed': False,
            'judgment_before': '',
            'judgment_after': ''
        }

        def judge(fit: FitResult) -> str:
            if fit.r_squared >= 0.98 and abs(fit.intercept - 1.0) < 0.1:
                return '合格 - 线性良好'
            elif fit.r_squared >= 0.95:
                return '基本合格 - 可接受'
            elif fit.r_squared >= 0.90:
                return '可疑 - 建议复核'
            else:
                return '不合格 - 需重新检测'

        comparison['judgment_before'] = judge(fit1)
        comparison['judgment_after'] = judge(fit2)
        comparison['judgment_changed'] = comparison['judgment_before'] != comparison['judgment_after']

        return comparison

    @staticmethod
    def format_fit_report(result: FitResult) -> str:
        lines = []
        lines.append('─' * 60)
        lines.append(f'拟合方法: {result.method}')
        lines.append('─' * 60)
        lines.append(f'Stern-Volmer猝灭常数 Ksv = {result.ksv:.6f} ± {result.ksv_err:.6f} (L/mmol)')
        lines.append(f'截距 = {result.intercept:.4f} ± {result.intercept_err:.4f}')
        lines.append(f'I0 (空白荧光强度) = {result.i0:.2f}')
        lines.append(f'相关系数 R² = {result.r_squared:.6f}')
        lines.append(f'调整 R² = {result.adj_r_squared:.6f}')
        lines.append(f'均方根误差 RMSE = {result.rmse:.6f}')
        lines.append(f'参与拟合点数 = {result.n_points}')
        if result.excluded_points:
            lines.append(f'排除异常点 (行号) = {result.excluded_points}')

        if result.fitted_params:
            for k, v in result.fitted_params.items():
                lines.append(f'{k} = {v:.6f}')

        if result.warnings:
            lines.append('\n【拟合警告】')
            for w in result.warnings:
                lines.append(f'  ⚠ {w}')

        return '\n'.join(lines)
