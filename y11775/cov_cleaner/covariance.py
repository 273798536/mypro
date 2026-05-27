"""Covariance matrix estimation and positive definite repair."""

from typing import List, Tuple

import numpy as np
import pandas as pd
from scipy.linalg import eigh

from .types import (
    CorrectionTrace,
    CorrectionType,
    Severity,
    CleaningRules,
)


class CovarianceCleaner:
    """Estimates covariance matrices and ensures positive definiteness."""

    def __init__(self, rules: CleaningRules):
        self.rules = rules
        self.traces: List[CorrectionTrace] = []

    def estimate_covariance(self, returns: pd.DataFrame, source_file: str) -> pd.DataFrame:
        """Estimate covariance matrix from returns."""
        self.traces = []

        n_obs = len(returns)
        if n_obs < self.rules.min_obs_for_cov:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                severity=Severity.WARNING,
                description=f"Only {n_obs} observations available - less than minimum {self.rules.min_obs_for_cov} recommended",
                source_file=source_file,
                details={"n_obs": n_obs, "min_obs": self.rules.min_obs_for_cov},
            ))

        method = self.rules.covariance_method
        if method == "pearson":
            cov_matrix = returns.cov()
        elif method == "kendall":
            cov_matrix = returns.cov(method="kendall")
        elif method == "spearman":
            cov_matrix = returns.cov(method="spearman")
        else:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                severity=Severity.ERROR,
                description=f"Unknown covariance method '{method}', using Pearson",
                source_file=source_file,
            ))
            cov_matrix = returns.cov()

        self.traces.append(CorrectionTrace(
            correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
            severity=Severity.INFO,
            description=f"Estimated {len(cov_matrix)}x{len(cov_matrix)} covariance matrix using {method} method from {n_obs} observations",
            source_file=source_file,
            details={
                "n_assets": len(cov_matrix),
                "n_obs": n_obs,
                "method": method,
            },
        ))

        return cov_matrix

    def check_positive_definite(self, matrix: pd.DataFrame, source_file: str) -> Tuple[bool, np.ndarray, np.ndarray]:
        """Check if matrix is positive definite by examining eigenvalues."""
        values = matrix.values
        try:
            eigenvalues, eigenvectors = eigh(values)
        except Exception as e:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                severity=Severity.CRITICAL,
                description=f"Eigenvalue decomposition failed: {str(e)}",
                source_file=source_file,
            ))
            return False, np.array([]), np.array([])

        min_eigen = eigenvalues.min()
        n_negative = (eigenvalues < 0).sum()
        n_near_zero = ((eigenvalues >= 0) & (eigenvalues < self.rules.eigen_epsilon)).sum()

        is_pd = min_eigen > self.rules.eigen_epsilon

        if not is_pd:
            if n_negative > 0:
                self.traces.append(CorrectionTrace(
                    correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                    severity=Severity.ERROR,
                    description=f"Matrix is NOT positive definite: {n_negative} negative eigenvalues, min={min_eigen:.2e}",
                    source_file=source_file,
                    details={
                        "min_eigenvalue": float(min_eigen),
                        "n_negative_eigen": int(n_negative),
                        "n_near_zero_eigen": int(n_near_zero),
                        "eigen_epsilon": self.rules.eigen_epsilon,
                    },
                    before_value=float(min_eigen),
                ))
            elif n_near_zero > 0:
                self.traces.append(CorrectionTrace(
                    correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                    severity=Severity.WARNING,
                    description=f"Matrix is near-singular: {n_near_zero} eigenvalues below epsilon {self.rules.eigen_epsilon:.2e}",
                    source_file=source_file,
                    details={
                        "min_eigenvalue": float(min_eigen),
                        "n_negative_eigen": int(n_negative),
                        "n_near_zero_eigen": int(n_near_zero),
                        "eigen_epsilon": self.rules.eigen_epsilon,
                    },
                ))
        else:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                severity=Severity.INFO,
                description=f"Matrix is positive definite: min eigenvalue={min_eigen:.2e}",
                source_file=source_file,
                details={"min_eigenvalue": float(min_eigen)},
            ))

        return is_pd, eigenvalues, eigenvectors

    def make_positive_definite(
        self,
        matrix: pd.DataFrame,
        source_file: str,
    ) -> Tuple[pd.DataFrame, List[CorrectionTrace]]:
        """Repair matrix to be positive definite using the configured strategy."""
        self.traces = []

        is_pd, eigenvalues, eigenvectors = self.check_positive_definite(matrix, source_file)

        if is_pd:
            return matrix, self.traces

        strategy = self.rules.posdef_strategy

        if strategy == "eigen_clip":
            result = self._eigenvalue_clipping(matrix, eigenvalues, eigenvectors, source_file)
        elif strategy == "shrinkage":
            result = self._shrinkage(matrix, source_file)
        elif strategy == "nearest":
            result = self._nearest_positive_definite(matrix, source_file)
        else:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                severity=Severity.ERROR,
                description=f"Unknown posdef strategy '{strategy}', using eigenvalue clipping",
                source_file=source_file,
            ))
            result = self._eigenvalue_clipping(matrix, eigenvalues, eigenvectors, source_file)

        self._verify_repair(matrix, result, source_file)

        return result, self.traces

    def _eigenvalue_clipping(
        self,
        matrix: pd.DataFrame,
        eigenvalues: np.ndarray,
        eigenvectors: np.ndarray,
        source_file: str,
    ) -> pd.DataFrame:
        """Clip negative eigenvalues to epsilon and reconstruct."""
        epsilon = self.rules.eigen_epsilon
        clipped_eigen = np.maximum(eigenvalues, epsilon)

        n_clipped = (eigenvalues < epsilon).sum()
        self.traces.append(CorrectionTrace(
            correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
            severity=Severity.WARNING,
            description=f"Applied eigenvalue clipping: clipped {n_clipped} eigenvalues to {epsilon:.2e}",
            source_file=source_file,
            details={
                "n_clipped": int(n_clipped),
                "epsilon": epsilon,
                "original_eigenvalues": [float(v) for v in eigenvalues],
                "clipped_eigenvalues": [float(v) for v in clipped_eigen],
            },
            before_value=[float(v) for v in eigenvalues],
            after_value=[float(v) for v in clipped_eigen],
        ))

        reconstructed = eigenvectors @ np.diag(clipped_eigen) @ eigenvectors.T

        result = pd.DataFrame(reconstructed, index=matrix.index, columns=matrix.columns)
        return result

    def _shrinkage(self, matrix: pd.DataFrame, source_file: str) -> pd.DataFrame:
        """Apply shrinkage to diagonal to ensure positive definiteness."""
        values = matrix.values
        n = len(values)

        if self.rules.shrinkage_factor is not None:
            shrinkage = self.rules.shrinkage_factor
        else:
            trace = np.trace(values)
            shrinkage = max(1e-4, 1e-3 * trace / n)

        diag_mean = np.mean(np.diag(values))
        lambda_val = shrinkage * diag_mean

        shrunk = values + lambda_val * np.eye(n)

        self.traces.append(CorrectionTrace(
            correction_type=CorrectionType.POSDEF_SHRINKAGE,
            severity=Severity.WARNING,
            description=f"Applied shrinkage: added {lambda_val:.2e} to diagonal (factor={shrinkage:.4f})",
            source_file=source_file,
            details={
                "shrinkage_factor": float(shrinkage),
                "lambda_added": float(lambda_val),
                "diag_mean": float(diag_mean),
            },
            before_value=float(0),
            after_value=float(lambda_val),
        ))

        result = pd.DataFrame(shrunk, index=matrix.index, columns=matrix.columns)
        return result

    def _nearest_positive_definite(self, matrix: pd.DataFrame, source_file: str) -> pd.DataFrame:
        """Find nearest positive definite matrix using Higham's algorithm."""
        values = matrix.values
        n = len(values)

        B = (values + values.T) / 2
        _, s, V = np.linalg.svd(B)
        H = V.T @ np.diag(s) @ V

        A2 = (B + H) / 2
        A3 = (A2 + A2.T) / 2

        if self._is_positive_definite(A3):
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_NEAREST,
                severity=Severity.WARNING,
                description="Applied nearest PD correction (Higham algorithm)",
                source_file=source_file,
            ))
            return pd.DataFrame(A3, index=matrix.index, columns=matrix.columns)

        spacing = np.spacing(np.linalg.norm(values))
        I = np.eye(n)
        k = 1
        max_iter = 100
        while not self._is_positive_definite(A3) and k <= max_iter:
            mineig = np.min(np.real(np.linalg.eigvals(A3)))
            A3 += I * (-mineig * k**2 + spacing)
            k += 1

        if k > max_iter:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_NEAREST,
                severity=Severity.CRITICAL,
                description=f"Nearest PD correction did not converge after {max_iter} iterations - requires manual review",
                source_file=source_file,
            ))
        else:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_NEAREST,
                severity=Severity.WARNING,
                description=f"Applied nearest PD correction (Higham algorithm) in {k} iterations",
                source_file=source_file,
                details={"iterations": k},
            ))

        return pd.DataFrame(A3, index=matrix.index, columns=matrix.columns)

    def _is_positive_definite(self, matrix: np.ndarray) -> bool:
        """Check if matrix is positive definite via Cholesky."""
        try:
            np.linalg.cholesky(matrix)
            return True
        except np.linalg.LinAlgError:
            return False

    def _verify_repair(
        self,
        original: pd.DataFrame,
        repaired: pd.DataFrame,
        source_file: str,
    ) -> None:
        """Verify the repaired matrix is positive definite and measure distortion."""
        is_pd_final, eig_final, _ = self.check_positive_definite(repaired, source_file)

        if not is_pd_final:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                severity=Severity.CRITICAL,
                description=f"CRITICAL: Repair failed - matrix still not positive definite. Min eigenvalue: {eig_final.min():.2e}",
                source_file=source_file,
                details={"min_eigen_after": float(eig_final.min())},
            ))
            return

        diff = np.abs(original.values - repaired.values)
        max_diff = diff.max()
        mean_diff = diff.mean()
        frob_norm = np.linalg.norm(original.values - repaired.values, "fro")
        orig_norm = np.linalg.norm(original.values, "fro")
        relative_error = frob_norm / orig_norm if orig_norm > 0 else 0

        self.traces.append(CorrectionTrace(
            correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
            severity=Severity.INFO,
            description=f"Repair verification: max_diff={max_diff:.2e}, mean_diff={mean_diff:.2e}, relative_error={relative_error:.4f}",
            source_file=source_file,
            details={
                "max_difference": float(max_diff),
                "mean_difference": float(mean_diff),
                "frobenius_error": float(frob_norm),
                "relative_error": float(relative_error),
            },
        ))

        if relative_error > 0.1:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.POSDEF_EIGEN_CLIP,
                severity=Severity.WARNING,
                description=f"Large distortion detected: relative error {relative_error:.2%} exceeds 10% - review recommended",
                source_file=source_file,
                details={"relative_error": float(relative_error)},
            ))
