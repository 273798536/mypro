from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Tuple

import numpy as np

from .models import Coordinate, Observation, ObservationStatus
from .triangulation import AlgorithmWarning, Line2D


@dataclass
class OutlierDetectionResult:
    outliers: List[Observation]
    inliers: List[Observation]
    warnings: List[AlgorithmWarning]
    consensus_position: Coordinate


class OutlierDetector:
    def __init__(
        self,
        observations: List[Observation],
        min_samples: int = 2,
        residual_threshold: float = 50.0,
        max_iterations: int = 100,
    ):
        self.observations = observations
        self.min_samples = min_samples
        self.residual_threshold = residual_threshold
        self.max_iterations = max_iterations
        self.warnings: List[AlgorithmWarning] = []

    def _compute_residual(
        self, observation: Observation, position: Tuple[float, float]
    ) -> float:
        line = Line2D(observation.position.to_tuple(), observation.bearing.to_radians())
        return line.distance_to_point(position)

    def _ransac(self) -> Tuple[List[Observation], Coordinate]:
        best_inliers: List[Observation] = []
        best_position = None

        valid_obs = [
            o for o in self.observations if o.status == ObservationStatus.VALID
        ]

        if len(valid_obs) < self.min_samples:
            return valid_obs, valid_obs[0].position if valid_obs else None

        for _ in range(self.max_iterations):
            sample_indices = np.random.choice(
                len(valid_obs), size=self.min_samples, replace=False
            )
            sample = [valid_obs[i] for i in sample_indices]

            try:
                line1 = Line2D(sample[0].position.to_tuple(), sample[0].bearing.to_radians())
                line2 = Line2D(sample[1].position.to_tuple(), sample[1].bearing.to_radians())

                det = line1.a * line2.b - line2.a * line1.b
                if abs(det) < 1e-6:
                    continue

                x = (line1.b * line2.c - line2.b * line1.c) / det
                y = (line2.a * line1.c - line1.a * line2.c) / det
                sample_pos = (x, y)

                inliers = []
                for obs in valid_obs:
                    residual = self._compute_residual(obs, sample_pos)
                    if residual < self.residual_threshold:
                        inliers.append(obs)

                if len(inliers) > len(best_inliers):
                    best_inliers = inliers
                    best_position = Coordinate(x=x, y=y)

            except Exception:
                continue

        if not best_inliers:
            best_inliers = valid_obs
            if valid_obs:
                best_position = valid_obs[0].position

        return best_inliers, best_position

    def _chinese_restaurant_process(
        self, inliers: List[Observation], position: Coordinate
    ) -> Tuple[List[Observation], List[Observation]]:
        if len(inliers) < 3:
            return inliers, []

        residuals = []
        for obs in inliers:
            residual = self._compute_residual(obs, position.to_tuple())
            residuals.append(residual)

        residuals = np.array(residuals)
        median = np.median(residuals)
        mad = np.median(np.abs(residuals - median))

        if mad < 1e-10:
            return inliers, []

        z_scores = 0.6745 * (residuals - median) / mad

        threshold = 3.0
        final_inliers = []
        outliers = []

        for i, obs in enumerate(inliers):
            if abs(z_scores[i]) > threshold:
                outliers.append(obs)
                self.warnings.append(
                    AlgorithmWarning(
                        f"观测 {obs.station_id} ({obs.source}) 被检测为离群值 "
                        f"(Z-score: {z_scores[i]:.2f}, 残差: {residuals[i]:.2f})",
                        [obs.id],
                        "warning",
                    )
                )
            else:
                final_inliers.append(obs)

        return final_inliers, outliers

    def detect(self) -> OutlierDetectionResult:
        valid_obs = [
            o for o in self.observations if o.status == ObservationStatus.VALID
        ]

        if len(valid_obs) < 3:
            return OutlierDetectionResult(
                outliers=[],
                inliers=valid_obs,
                warnings=[],
                consensus_position=valid_obs[0].position if valid_obs else None,
            )

        inliers, position = self._ransac()

        if len(inliers) < len(valid_obs):
            ransac_outliers = [o for o in valid_obs if o not in inliers]
            for obs in ransac_outliers:
                self.warnings.append(
                    AlgorithmWarning(
                        f"RANSAC检测到潜在离群值: {obs.station_id} ({obs.source})",
                        [obs.id],
                        "warning",
                    )
                )

        final_inliers, crp_outliers = self._chinese_restaurant_process(
            inliers, position
        )

        all_outliers = ransac_outliers + crp_outliers

        for obs in all_outliers:
            obs.status = ObservationStatus.OUTLIER

        return OutlierDetectionResult(
            outliers=all_outliers,
            inliers=final_inliers,
            warnings=self.warnings,
            consensus_position=position,
        )


def remove_outliers(
    observations: List[Observation],
    residual_threshold: float = 50.0,
) -> Tuple[List[Observation], List[Observation], List[AlgorithmWarning]]:
    detector = OutlierDetector(
        observations,
        residual_threshold=residual_threshold,
    )
    result = detector.detect()
    return result.inliers, result.outliers, result.warnings
