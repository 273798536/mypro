from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np

from .models import (
    Coordinate,
    ErrorEllipse,
    IntersectionPoint,
    MapBounds,
    Observation,
    ObservationStatus,
    TriangulationResult,
)


@dataclass
class AlgorithmWarning:
    message: str
    observation_ids: List[str]
    severity: str = "warning"


class Line2D:
    def __init__(self, point: Tuple[float, float], direction: float):
        self.point = point
        self.direction = direction
        self.a = math.sin(direction)
        self.b = -math.cos(direction)
        self.c = -(self.a * point[0] + self.b * point[1])

    def distance_to_point(self, point: Tuple[float, float]) -> float:
        return abs(self.a * point[0] + self.b * point[1] + self.c) / math.sqrt(
            self.a**2 + self.b**2
        )


class Triangulator:
    PARALLEL_THRESHOLD = 1e-6
    MIN_ANGLE_DIFFERENCE = math.radians(5)

    def __init__(self, observations: List[Observation]):
        self.observations = observations
        self.warnings: List[AlgorithmWarning] = []

    def _check_parallel(
        self, obs1: Observation, obs2: Observation
    ) -> Tuple[bool, float]:
        angle1 = obs1.bearing.to_radians()
        angle2 = obs2.bearing.to_radians()

        angle_diff = abs(angle1 - angle2)
        angle_diff = min(angle_diff, 2 * math.pi - angle_diff)

        is_parallel = angle_diff < self.PARALLEL_THRESHOLD or abs(
            angle_diff - math.pi
        ) < self.PARALLEL_THRESHOLD

        return is_parallel, angle_diff

    def _line_intersection(
        self, line1: Line2D, line2: Line2D
    ) -> Optional[Tuple[float, float]]:
        det = line1.a * line2.b - line2.a * line1.b

        if abs(det) < self.PARALLEL_THRESHOLD:
            return None

        x = (line1.b * line2.c - line2.b * line1.c) / det
        y = (line2.a * line1.c - line1.a * line2.c) / det

        return (x, y)

    def _create_line(self, obs: Observation) -> Line2D:
        pos = obs.position.to_tuple()
        angle = obs.bearing.to_radians()
        return Line2D(pos, angle)

    def _intersect_two(
        self, obs1: Observation, obs2: Observation
    ) -> Optional[IntersectionPoint]:
        is_parallel, angle_diff = self._check_parallel(obs1, obs2)

        if is_parallel:
            self.warnings.append(
                AlgorithmWarning(
                    f"观测 {obs1.station_id} ({obs1.source}) 与 "
                    f"{obs2.station_id} ({obs2.source}) 射线几乎平行 "
                    f"(夹角: {math.degrees(angle_diff):.2f}°)",
                    [obs1.id, obs2.id],
                    "critical",
                )
            )
            obs1.status = ObservationStatus.PARALLEL
            obs2.status = ObservationStatus.PARALLEL
            return None

        if angle_diff < self.MIN_ANGLE_DIFFERENCE:
            self.warnings.append(
                AlgorithmWarning(
                    f"观测 {obs1.station_id} 与 {obs2.station_id} 夹角过小 "
                    f"({math.degrees(angle_diff):.2f}°)，可能导致定位不稳定",
                    [obs1.id, obs2.id],
                    "warning",
                )
            )

        line1 = self._create_line(obs1)
        line2 = self._create_line(obs2)

        intersection = self._line_intersection(line1, line2)

        if intersection is None:
            return None

        x, y = intersection
        residual = line1.distance_to_point(intersection) + line2.distance_to_point(
            intersection
        )

        return IntersectionPoint(
            position=Coordinate(x=x, y=y),
            observations=[obs1, obs2],
            residual=residual,
            is_valid=True,
        )

    def compute_all_intersections(self) -> List[IntersectionPoint]:
        intersections: List[IntersectionPoint] = []
        valid_obs = [
            o for o in self.observations if o.status == ObservationStatus.VALID
        ]

        for i, obs1 in enumerate(valid_obs):
            for obs2 in valid_obs[i + 1 :]:
                point = self._intersect_two(obs1, obs2)
                if point:
                    intersections.append(point)

        return intersections

    def _weighted_centroid(
        self, intersections: List[IntersectionPoint]
    ) -> Tuple[Coordinate, float]:
        if not intersections:
            raise ValueError("没有有效的交点")

        weights = []
        points = []

        for pt in intersections:
            weight = 1.0 / (pt.residual + 1e-10)
            weights.append(weight)
            points.append(pt.position.to_tuple())

        weights = np.array(weights)
        points = np.array(points)

        total_weight = weights.sum()
        weights = weights / total_weight

        centroid = np.average(points, weights=weights, axis=0)
        centroid_coord = Coordinate(x=centroid[0], y=centroid[1])

        spread = 0.0
        for i, pt in enumerate(points):
            dist = math.hypot(pt[0] - centroid[0], pt[1] - centroid[1])
            spread += weights[i] * dist

        return centroid_coord, spread

    def _error_ellipse(
        self,
        intersections: List[IntersectionPoint],
        center: Coordinate,
        confidence: float = 0.95,
    ) -> Optional[ErrorEllipse]:
        if len(intersections) < 3:
            return None

        points = np.array([pt.position.to_tuple() for pt in intersections])

        centered = points - center.to_tuple()
        cov_matrix = np.cov(centered.T, ddof=1)

        try:
            eigenvalues, eigenvectors = np.linalg.eigh(cov_matrix)
        except np.linalg.LinAlgError:
            return None

        order = eigenvalues.argsort()[::-1]
        eigenvalues = eigenvalues[order]
        eigenvectors = eigenvectors[:, order]

        chi2 = {0.68: 2.30, 0.95: 5.99, 0.99: 9.21}.get(confidence, 5.99)

        major_axis = 2 * math.sqrt(chi2 * eigenvalues[0])
        minor_axis = 2 * math.sqrt(chi2 * eigenvalues[1])

        orientation = math.atan2(eigenvectors[1, 0], eigenvectors[0, 0])

        return ErrorEllipse(
            center=center,
            major_axis=major_axis,
            minor_axis=minor_axis,
            orientation=orientation,
            confidence_level=confidence,
        )

    def triangulate(
        self,
        map_bounds: Optional[MapBounds] = None,
        confidence_level: float = 0.95,
    ) -> TriangulationResult:
        valid_obs = [
            o for o in self.observations if o.status == ObservationStatus.VALID
        ]

        if len(valid_obs) < 2:
            raise ValueError("至少需要2个有效观测点才能进行三角测量")

        intersections = self.compute_all_intersections()

        if not intersections:
            raise ValueError("没有找到有效的交点（可能存在平行射线）")

        if map_bounds:
            in_bounds = []
            out_of_bounds = []
            for pt in intersections:
                if map_bounds.contains(pt.position):
                    in_bounds.append(pt)
                else:
                    out_of_bounds.append(pt)

            if out_of_bounds:
                self.warnings.append(
                    AlgorithmWarning(
                        f"有 {len(out_of_bounds)} 个交点在地图边界外",
                        [],
                        "warning",
                    )
                )

            if in_bounds:
                intersections = in_bounds

        center, spread = self._weighted_centroid(intersections)

        error_ellipse = self._error_ellipse(intersections, center, confidence_level)

        used_ids = set()
        for pt in intersections:
            for obs in pt.observations:
                used_ids.add(obs.id)

        used_obs = [o for o in self.observations if o.id in used_ids]
        excluded_obs = [
            o
            for o in self.observations
            if o.id not in used_ids and o.status != ObservationStatus.VALID
        ]

        confidence_score = max(
            0.0,
            min(
                1.0,
                1.0
                - spread / (map_bounds.width() if map_bounds else 1000)
                - len(excluded_obs) / len(self.observations) * 0.3,
            ),
        )

        return TriangulationResult(
            estimated_position=center,
            error_ellipse=error_ellipse,
            used_observations=used_obs,
            excluded_observations=excluded_obs,
            intersections=intersections,
            confidence_score=confidence_score,
        )
