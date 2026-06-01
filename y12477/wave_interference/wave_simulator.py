import numpy as np
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass, field
from .wave_source import WaveSource


@dataclass
class SimulationResult:
    grid: np.ndarray
    time: float
    max_amplitude: float
    interference_pattern: str
    source_contributions: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "grid_shape": self.grid.shape,
            "time": self.time,
            "max_amplitude": self.max_amplitude,
            "interference_pattern": self.interference_pattern,
            "source_contributions": self.source_contributions,
        }


class WaveSimulator:
    def __init__(self, grid_size: Tuple[int, int] = (100, 100), wave_speed: float = 1.0):
        self.grid_size = grid_size
        self.wave_speed = wave_speed
        self.x_coords = np.linspace(-5, 5, grid_size[0])
        self.y_coords = np.linspace(-5, 5, grid_size[1])
        self.X, self.Y = np.meshgrid(self.x_coords, self.y_coords)

    def calculate_wave_at_point(
        self, source: WaveSource, x: float, y: float, t: float
    ) -> float:
        dx = x - source.x
        dy = y - source.y
        distance = np.sqrt(dx * dx + dy * dy)

        if distance < 0.01:
            return source.amplitude

        omega = 2 * np.pi * source.frequency
        k = omega / self.wave_speed
        wave = source.amplitude * np.sin(k * distance - omega * t + source.phase) / (
            1 + 0.1 * distance
        )
        return wave

    def simulate(self, sources: List[WaveSource], time: float = 0.0) -> SimulationResult:
        grid = np.zeros(self.grid_size)
        source_contributions = {}

        for source in sources:
            source_grid = np.zeros(self.grid_size)
            for i, x in enumerate(self.x_coords):
                for j, y in enumerate(self.y_coords):
                    source_grid[j, i] = self.calculate_wave_at_point(source, x, y, time)
            grid += source_grid
            source_contributions[source.id] = float(np.max(np.abs(source_grid)))

        max_amplitude = float(np.max(np.abs(grid)))
        pattern = self._classify_interference_pattern(grid)

        return SimulationResult(
            grid=grid,
            time=time,
            max_amplitude=max_amplitude,
            interference_pattern=pattern,
            source_contributions=source_contributions,
        )

    def _classify_interference_pattern(self, grid: np.ndarray) -> str:
        std = np.std(grid)
        mean = np.mean(np.abs(grid))

        if mean < 0.1:
            return "calm"
        elif std > 0.8:
            return "strong_interference"
        elif std > 0.4:
            return "moderate_interference"
        else:
            return "weak_interference"
