import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import json

SPEED_OF_SOUND = 343.0


@dataclass
class Microphone:
    id: str
    x: float
    y: float
    z: float = 0.0
    notes: str = ""

    def to_array(self) -> np.ndarray:
        return np.array([self.x, self.y, self.z])


@dataclass
class TimeDifference:
    mic1_id: str
    mic2_id: str
    delta_t: float
    confidence: float = 1.0
    notes: str = ""
    noise_peak: Optional[float] = None


@dataclass
class IntermediateResult:
    description: str
    formula: str
    value: any
    unit: str


@dataclass
class LocalizationResult:
    source_position: np.ndarray
    method: str
    error: float
    intermediate_steps: List[IntermediateResult] = field(default_factory=list)
    microphone_distances: Dict[str, float] = field(default_factory=dict)
    consistency_score: float = 1.0
    tuning_notes: List[str] = field(default_factory=list)


class TDOALocalizer:
    def __init__(self, speed_of_sound: float = SPEED_OF_SOUND):
        self.speed_of_sound = speed_of_sound
        self.microphones: Dict[str, Microphone] = {}
        self.time_differences: List[TimeDifference] = []

    def add_microphone(self, mic: Microphone) -> None:
        self.microphones[mic.id] = mic

    def add_microphones(self, mics: List[Microphone]) -> None:
        for mic in mics:
            self.add_microphone(mic)

    def add_time_difference(self, td: TimeDifference) -> None:
        self.time_differences.append(td)

    def add_time_differences(self, tds: List[TimeDifference]) -> None:
        for td in tds:
            self.add_time_difference(td)

    def _get_mic_pair(self, td: TimeDifference) -> Tuple[Microphone, Microphone]:
        if td.mic1_id not in self.microphones:
            raise ValueError(f"Microphone {td.mic1_id} not found")
        if td.mic2_id not in self.microphones:
            raise ValueError(f"Microphone {td.mic2_id} not found")
        return self.microphones[td.mic1_id], self.microphones[td.mic2_id]

    def _calculate_distance_difference(self, td: TimeDifference) -> float:
        return td.delta_t * self.speed_of_sound

    def localize_2d_chan(self) -> LocalizationResult:
        if len(self.microphones) < 3:
            raise ValueError("At least 3 microphones required for 2D localization")
        if len(self.time_differences) < 2:
            raise ValueError("At least 2 time differences required")

        intermediate_steps = []
        mic_ids = list(self.microphones.keys())
        mic_positions = {mid: self.microphones[mid].to_array()[:2] for mid in mic_ids}

        intermediate_steps.append(IntermediateResult(
            description="麦克风坐标",
            formula="麦克风位置列表",
            value=[f"{mid}: ({mic_positions[mid][0]:.2f}, {mic_positions[mid][1]:.2f})" for mid in mic_ids],
            unit="m"
        ))

        td_pairs = []
        distance_diffs = []
        for td in self.time_differences:
            try:
                mic1, mic2 = self._get_mic_pair(td)
                d_diff = self._calculate_distance_difference(td)
                td_pairs.append((mic1.id, mic2.id, d_diff))
                distance_diffs.append(d_diff)
            except ValueError:
                continue

        if len(td_pairs) < 2:
            raise ValueError("Insufficient valid time differences")

        intermediate_steps.append(IntermediateResult(
            description="距离差计算",
            formula="Δd = Δt × v_sound",
            value=[f"{p[0]}-{p[1]}: {p[2]:.4f} m" for p in td_pairs],
            unit="m"
        ))

        all_positions = np.array(list(mic_positions.values()))
        min_x, max_x = np.min(all_positions[:, 0]) - 10, np.max(all_positions[:, 0]) + 10
        min_y, max_y = np.min(all_positions[:, 1]) - 10, np.max(all_positions[:, 1]) + 10

        intermediate_steps.append(IntermediateResult(
            description="搜索范围",
            formula="基于麦克风坐标扩展",
            value=f"X: [{min_x:.1f}, {max_x:.1f}], Y: [{min_y:.1f}, {max_y:.1f}]",
            unit="m"
        ))

        grid_size = 100
        x_grid = np.linspace(min_x, max_x, grid_size)
        y_grid = np.linspace(min_y, max_y, grid_size)
        X, Y = np.meshgrid(x_grid, y_grid)

        error_grid = np.zeros_like(X)

        for i in range(X.shape[0]):
            for j in range(X.shape[1]):
                test_pos = np.array([X[i, j], Y[i, j]])
                total_error = 0

                for (mic1_id, mic2_id, expected_dd) in td_pairs:
                    pos1 = mic_positions[mic1_id]
                    pos2 = mic_positions[mic2_id]

                    d1 = np.linalg.norm(test_pos - pos1)
                    d2 = np.linalg.norm(test_pos - pos2)
                    actual_dd = d1 - d2

                    total_error += (actual_dd - expected_dd) ** 2

                error_grid[i, j] = np.sqrt(total_error / len(td_pairs))

        min_error_idx = np.unravel_index(np.argmin(error_grid), error_grid.shape)
        best_x = X[min_error_idx]
        best_y = Y[min_error_idx]
        min_error = error_grid[min_error_idx]

        intermediate_steps.append(IntermediateResult(
            description="网格搜索粗定位",
            formula=f"在 {grid_size}×{grid_size} 网格中搜索最小误差点",
            value=f"位置: ({best_x:.4f}, {best_y:.4f}), 误差: {min_error:.6f}",
            unit="m"
        ))

        refine_steps = 20
        refine_range = 2.0
        current_pos = np.array([best_x, best_y])
        current_error = min_error

        for step in range(refine_steps):
            step_size = refine_range * (1 - step / refine_steps)
            improved = False

            for dx in [-step_size, 0, step_size]:
                for dy in [-step_size, 0, step_size]:
                    if dx == 0 and dy == 0:
                        continue

                    test_pos = current_pos + np.array([dx, dy])
                    total_error = 0

                    for (mic1_id, mic2_id, expected_dd) in td_pairs:
                        pos1 = mic_positions[mic1_id]
                        pos2 = mic_positions[mic2_id]

                        d1 = np.linalg.norm(test_pos - pos1)
                        d2 = np.linalg.norm(test_pos - pos2)
                        actual_dd = d1 - d2

                        total_error += (actual_dd - expected_dd) ** 2

                    test_error = np.sqrt(total_error / len(td_pairs))

                    if test_error < current_error:
                        current_pos = test_pos
                        current_error = test_error
                        improved = True

            if not improved:
                break

        source_pos_absolute = current_pos
        residual_error = current_error

        intermediate_steps.append(IntermediateResult(
            description="局部优化精定位",
            formula=f"梯度下降式邻域搜索 ({refine_steps} 步)",
            value=f"位置: ({source_pos_absolute[0]:.4f}, {source_pos_absolute[1]:.4f}), 误差: {residual_error:.6f}",
            unit="m"
        ))

        mic_distances = {}
        for mic_id, pos in mic_positions.items():
            dist = np.linalg.norm(source_pos_absolute - pos)
            mic_distances[mic_id] = dist

        tuning_notes = self._check_consistency(source_pos_absolute)

        return LocalizationResult(
            source_position=source_pos_absolute,
            method="GridSearch_LS_2D",
            error=residual_error,
            intermediate_steps=intermediate_steps,
            microphone_distances=mic_distances,
            consistency_score=self._calculate_consistency_score(residual_error),
            tuning_notes=tuning_notes
        )

    def _calculate_consistency_score(self, error: float) -> float:
        threshold = 0.5
        if error < 0.01:
            return 1.0
        elif error < threshold:
            return 1.0 - (error / threshold) * 0.5
        else:
            return max(0.0, 0.5 - (error - threshold) / threshold * 0.5)

    def _check_consistency(self, source_pos: np.ndarray) -> List[str]:
        notes = []

        for td in self.time_differences:
            try:
                mic1, mic2 = self._get_mic_pair(td)
                pos1 = mic1.to_array()[:2]
                pos2 = mic2.to_array()[:2]

                dist1 = np.linalg.norm(source_pos - pos1)
                dist2 = np.linalg.norm(source_pos - pos2)
                expected_dt = (dist1 - dist2) / self.speed_of_sound

                diff = abs(expected_dt - td.delta_t)
                if diff > 0.001:
                    notes.append(
                        f"⚠️ 时间差不一致: {mic1.id}-{mic2.id} | "
                        f"测量: {td.delta_t*1000:.2f}ms | "
                        f"预期: {expected_dt*1000:.2f}ms | "
                        f"差值: {diff*1000:.2f}ms"
                    )
            except Exception:
                continue

        if len(self.microphones) >= 3:
            mic_positions = [m.to_array()[:2] for m in self.microphones.values()]
            min_x = min(p[0] for p in mic_positions)
            max_x = max(p[0] for p in mic_positions)
            min_y = min(p[1] for p in mic_positions)
            max_y = max(p[1] for p in mic_positions)

            boundary_margin = 2.0
            if source_pos[0] < min_x - boundary_margin or source_pos[0] > max_x + boundary_margin or \
               source_pos[1] < min_y - boundary_margin or source_pos[1] > max_y + boundary_margin:
                notes.append(
                    f"⚠️ 声源位于麦克风阵列外 | "
                    f"位置: ({source_pos[0]:.2f}, {source_pos[1]:.2f}) | "
                    f"阵列范围: X[{min_x:.1f}, {max_x:.1f}] Y[{min_y:.1f}, {max_y:.1f}]"
                )

        return notes

    def localize_2d_coarse_grid(self) -> LocalizationResult:
        return self._grid_search_with_params(grid_size=50, refine_steps=10, method_name="CoarseGrid_2D")

    def localize_2d_fine_grid(self) -> LocalizationResult:
        return self._grid_search_with_params(grid_size=150, refine_steps=30, method_name="FineGrid_2D")

    def localize_2d_weighted(self) -> LocalizationResult:
        return self._grid_search_with_params(
            grid_size=80,
            refine_steps=20,
            use_confidence_weights=True,
            method_name="WeightedGrid_2D"
        )

    def _grid_search_with_params(self, grid_size: int = 100, refine_steps: int = 20,
                                 use_confidence_weights: bool = False,
                                 method_name: str = "GridSearch_2D") -> LocalizationResult:
        if len(self.microphones) < 3:
            raise ValueError("At least 3 microphones required for 2D localization")
        if len(self.time_differences) < 2:
            raise ValueError("At least 2 time differences required")

        intermediate_steps = []
        mic_ids = list(self.microphones.keys())
        mic_positions = {mid: self.microphones[mid].to_array()[:2] for mid in mic_ids}

        intermediate_steps.append(IntermediateResult(
            description="麦克风坐标",
            formula="麦克风位置列表",
            value=[f"{mid}: ({mic_positions[mid][0]:.2f}, {mic_positions[mid][1]:.2f})" for mid in mic_ids],
            unit="m"
        ))

        td_pairs = []
        for td in self.time_differences:
            try:
                mic1, mic2 = self._get_mic_pair(td)
                d_diff = self._calculate_distance_difference(td)
                weight = td.confidence if use_confidence_weights else 1.0
                td_pairs.append((mic1.id, mic2.id, d_diff, weight))
            except ValueError:
                continue

        if len(td_pairs) < 2:
            raise ValueError("Insufficient valid time differences")

        intermediate_steps.append(IntermediateResult(
            description="距离差计算",
            formula="Δd = Δt × v_sound" + (" (带置信度加权)" if use_confidence_weights else ""),
            value=[f"{p[0]}-{p[1]}: {p[2]:.4f} m (权重: {p[3]:.2f})" for p in td_pairs],
            unit="m"
        ))

        all_positions = np.array(list(mic_positions.values()))
        min_x, max_x = np.min(all_positions[:, 0]) - 10, np.max(all_positions[:, 0]) + 10
        min_y, max_y = np.min(all_positions[:, 1]) - 10, np.max(all_positions[:, 1]) + 10

        intermediate_steps.append(IntermediateResult(
            description="搜索范围",
            formula=f"基于麦克风坐标扩展 (网格分辨率: {grid_size}×{grid_size})",
            value=f"X: [{min_x:.1f}, {max_x:.1f}], Y: [{min_y:.1f}, {max_y:.1f}]",
            unit="m"
        ))

        x_grid = np.linspace(min_x, max_x, grid_size)
        y_grid = np.linspace(min_y, max_y, grid_size)
        X, Y = np.meshgrid(x_grid, y_grid)

        error_grid = np.zeros_like(X)

        for i in range(X.shape[0]):
            for j in range(X.shape[1]):
                test_pos = np.array([X[i, j], Y[i, j]])
                total_error = 0
                total_weight = 0

                for (mic1_id, mic2_id, expected_dd, weight) in td_pairs:
                    pos1 = mic_positions[mic1_id]
                    pos2 = mic_positions[mic2_id]

                    d1 = np.linalg.norm(test_pos - pos1)
                    d2 = np.linalg.norm(test_pos - pos2)
                    actual_dd = d1 - d2

                    total_error += weight * (actual_dd - expected_dd) ** 2
                    total_weight += weight

                error_grid[i, j] = np.sqrt(total_error / max(total_weight, 1e-10))

        min_error_idx = np.unravel_index(np.argmin(error_grid), error_grid.shape)
        best_x = X[min_error_idx]
        best_y = Y[min_error_idx]
        min_error = error_grid[min_error_idx]

        intermediate_steps.append(IntermediateResult(
            description="网格搜索粗定位",
            formula=f"在 {grid_size}×{grid_size} 网格中搜索最小误差点",
            value=f"位置: ({best_x:.4f}, {best_y:.4f}), 误差: {min_error:.6f}",
            unit="m"
        ))

        refine_range = 2.0
        current_pos = np.array([best_x, best_y])
        current_error = min_error

        for step in range(refine_steps):
            step_size = refine_range * (1 - step / refine_steps)
            improved = False

            for dx in [-step_size, 0, step_size]:
                for dy in [-step_size, 0, step_size]:
                    if dx == 0 and dy == 0:
                        continue

                    test_pos = current_pos + np.array([dx, dy])
                    total_error = 0
                    total_weight = 0

                    for (mic1_id, mic2_id, expected_dd, weight) in td_pairs:
                        pos1 = mic_positions[mic1_id]
                        pos2 = mic_positions[mic2_id]

                        d1 = np.linalg.norm(test_pos - pos1)
                        d2 = np.linalg.norm(test_pos - pos2)
                        actual_dd = d1 - d2

                        total_error += weight * (actual_dd - expected_dd) ** 2
                        total_weight += weight

                    test_error = np.sqrt(total_error / max(total_weight, 1e-10))

                    if test_error < current_error:
                        current_pos = test_pos
                        current_error = test_error
                        improved = True

            if not improved:
                break

        source_pos_absolute = current_pos
        residual_error = current_error

        intermediate_steps.append(IntermediateResult(
            description="局部优化精定位",
            formula=f"梯度下降式邻域搜索 ({refine_steps} 步)",
            value=f"位置: ({source_pos_absolute[0]:.4f}, {source_pos_absolute[1]:.4f}), 误差: {residual_error:.6f}",
            unit="m"
        ))

        mic_distances = {}
        for mic_id, pos in mic_positions.items():
            dist = np.linalg.norm(source_pos_absolute - pos)
            mic_distances[mic_id] = dist

        tuning_notes = self._check_consistency(source_pos_absolute)

        return LocalizationResult(
            source_position=source_pos_absolute,
            method=method_name,
            error=residual_error,
            intermediate_steps=intermediate_steps,
            microphone_distances=mic_distances,
            consistency_score=self._calculate_consistency_score(residual_error),
            tuning_notes=tuning_notes
        )

    def localize_2d_chan(self) -> LocalizationResult:
        return self.localize_2d_fine_grid()

    def get_candidate_positions(self, n_candidates: int = 5) -> List[LocalizationResult]:
        candidates = []
        methods = [
            ("fine_grid", lambda: self.localize_2d_fine_grid()),
            ("coarse_grid", lambda: self.localize_2d_coarse_grid()),
            ("weighted", lambda: self.localize_2d_weighted()),
        ]

        for method_name, method_func in methods:
            try:
                result = method_func()
                candidates.append(result)
            except Exception as e:
                pass

        seen_positions = set()
        unique_candidates = []
        for cand in candidates:
            pos_key = (round(cand.source_position[0], 2), round(cand.source_position[1], 2))
            if pos_key not in seen_positions:
                seen_positions.add(pos_key)
                unique_candidates.append(cand)

        unique_candidates.sort(key=lambda x: x.error)
        return unique_candidates[:n_candidates]

    def export_input_data(self) -> Dict:
        return {
            "speed_of_sound": {
                "value": self.speed_of_sound,
                "unit": "m/s",
                "description": "声速"
            },
            "microphones": [
                {
                    "id": m.id,
                    "position": {"x": m.x, "y": m.y, "z": m.z},
                    "unit": "m",
                    "notes": m.notes
                }
                for m in self.microphones.values()
            ],
            "time_differences": [
                {
                    "pair": f"{td.mic1_id}-{td.mic2_id}",
                    "delta_t": td.delta_t,
                    "unit": "s",
                    "confidence": td.confidence,
                    "notes": td.notes,
                    "noise_peak": td.noise_peak,
                    "distance_difference": td.delta_t * self.speed_of_sound
                }
                for td in self.time_differences
            ]
        }
