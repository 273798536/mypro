"""
协方差矩阵计算与正定修复模块
"""

import numpy as np
import pandas as pd
from typing import Optional, Tuple, Dict
from dataclasses import dataclass, field
from enum import Enum


class FixMethod(Enum):
    NEAR_PD = 'near_pd'
    EIGENVALUE_CLIPPING = 'eigenvalue_clipping'
    DIAGONAL_SHIFT = 'diagonal_shift'
    SHRINKAGE = 'shrinkage'


@dataclass
class CovarianceResult:
    original_matrix: pd.DataFrame
    is_positive_definite: bool
    min_eigenvalue: float
    eigenvalues: np.ndarray
    fixed_matrix: Optional[pd.DataFrame] = None
    fix_method_used: Optional[FixMethod] = None
    fix_success: bool = False
    fix_details: Dict[str, float] = field(default_factory=dict)


class CovarianceFixer:
    def __init__(self, epsilon: float = 1e-6):
        self.epsilon = epsilon

    def compute_covariance(self, returns: pd.DataFrame, 
                           ddof: int = 1,
                           annualize: bool = False,
                           periods_per_year: int = 252) -> pd.DataFrame:
        cov = returns.cov(ddof=ddof)
        
        if annualize:
            cov = cov * periods_per_year
        
        return cov

    def check_positive_definite(self, matrix: pd.DataFrame) -> Tuple[bool, float, np.ndarray]:
        try:
            eigenvalues = np.linalg.eigvalsh(matrix.values)
            min_eig = np.min(eigenvalues)
            is_pd = min_eig > self.epsilon
            return is_pd, min_eig, eigenvalues
        except Exception:
            return False, -np.inf, np.array([])

    def fix_near_pd(self, matrix: pd.DataFrame, max_iter: int = 1000) -> pd.DataFrame:
        A = matrix.values.copy()
        n = A.shape[0]
        
        diag = np.diag(A)
        D = np.diag(1.0 / np.sqrt(diag))
        C = D @ A @ D
        
        for _ in range(max_iter):
            eigvals, eigvecs = np.linalg.eigh(C)
            eigvals = np.maximum(eigvals, self.epsilon)
            C = eigvecs @ np.diag(eigvals) @ eigvecs.T
            
            np.fill_diagonal(C, 1.0)
        
        D_inv = np.diag(np.sqrt(diag))
        A_fixed = D_inv @ C @ D_inv
        
        return pd.DataFrame(A_fixed, index=matrix.index, columns=matrix.columns)

    def fix_eigenvalue_clipping(self, matrix: pd.DataFrame) -> pd.DataFrame:
        A = matrix.values.copy()
        eigvals, eigvecs = np.linalg.eigh(A)
        eigvals = np.maximum(eigvals, self.epsilon)
        A_fixed = eigvecs @ np.diag(eigvals) @ eigvecs.T
        
        return pd.DataFrame(A_fixed, index=matrix.index, columns=matrix.columns)

    def fix_diagonal_shift(self, matrix: pd.DataFrame) -> pd.DataFrame:
        A = matrix.values.copy()
        _, min_eig, _ = self.check_positive_definite(pd.DataFrame(A))
        
        if min_eig < self.epsilon:
            shift = self.epsilon - min_eig
            A = A + shift * np.eye(A.shape[0])
        
        return pd.DataFrame(A, index=matrix.index, columns=matrix.columns)

    def fix_shrinkage(self, matrix: pd.DataFrame, shrinkage_intensity: float = 0.1) -> pd.DataFrame:
        A = matrix.values.copy()
        n = A.shape[0]
        
        avg_var = np.mean(np.diag(A))
        target = avg_var * np.eye(n)
        
        A_fixed = (1 - shrinkage_intensity) * A + shrinkage_intensity * target
        
        return pd.DataFrame(A_fixed, index=matrix.index, columns=matrix.columns)

    def fix_covariance(self, cov_matrix: pd.DataFrame, 
                       method: FixMethod = FixMethod.NEAR_PD,
                       **kwargs) -> CovarianceResult:
        is_pd, min_eig, eigenvalues = self.check_positive_definite(cov_matrix)
        
        result = CovarianceResult(
            original_matrix=cov_matrix,
            is_positive_definite=is_pd,
            min_eigenvalue=min_eig,
            eigenvalues=eigenvalues
        )
        
        if is_pd:
            result.fixed_matrix = cov_matrix.copy()
            result.fix_success = True
            result.fix_method_used = None
            result.fix_details = {'message': '矩阵原本就是正定的'}
            return result
        
        if method == FixMethod.NEAR_PD:
            fixed = self.fix_near_pd(cov_matrix, **kwargs)
        elif method == FixMethod.EIGENVALUE_CLIPPING:
            fixed = self.fix_eigenvalue_clipping(cov_matrix)
        elif method == FixMethod.DIAGONAL_SHIFT:
            fixed = self.fix_diagonal_shift(cov_matrix)
        elif method == FixMethod.SHRINKAGE:
            fixed = self.fix_shrinkage(cov_matrix, **kwargs)
        else:
            fixed = self.fix_near_pd(cov_matrix)
        
        is_pd_after, min_eig_after, _ = self.check_positive_definite(fixed)
        
        result.fixed_matrix = fixed
        result.fix_method_used = method
        result.fix_success = is_pd_after
        result.fix_details = {
            'min_eigenvalue_before': min_eig,
            'min_eigenvalue_after': min_eig_after,
            'frobenius_norm_diff': np.linalg.norm(fixed.values - cov_matrix.values, 'fro')
        }
        
        return result

    def get_fix_report(self, result: CovarianceResult) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("协方差矩阵正定修复报告")
        lines.append("=" * 60)
        lines.append(f"原始矩阵维度: {result.original_matrix.shape}")
        lines.append(f"原始是否正定: {'是' if result.is_positive_definite else '否'}")
        lines.append(f"原始最小特征值: {result.min_eigenvalue:.6e}")
        lines.append("")
        
        if result.fix_method_used is not None:
            lines.append(f"使用修复方法: {result.fix_method_used.value}")
            lines.append(f"修复后是否正定: {'是' if result.fix_success else '否'}")
            if result.fix_details:
                for key, value in result.fix_details.items():
                    if isinstance(value, float):
                        lines.append(f"  {key}: {value:.6e}")
                    else:
                        lines.append(f"  {key}: {value}")
        else:
            lines.append("无需修复，矩阵已为正定")
        
        return "\n".join(lines)

    def get_eigenvalue_distribution(self, result: CovarianceResult) -> pd.DataFrame:
        eigvals = np.sort(result.eigenvalues)[::-1]
        data = {
            '特征值序号': range(1, len(eigvals) + 1),
            '特征值': eigvals,
            '是否为正': eigvals > self.epsilon
        }
        return pd.DataFrame(data)
