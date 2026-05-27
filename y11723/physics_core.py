import numpy as np
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import inspect


@dataclass
class SimulationParams:
    magnet_speed: float = 1.0
    coil_turns: int = 100
    magnet_field_strength: float = 0.5
    time_step: float = 0.01
    total_time: float = 2.0
    coil_radius: float = 0.05
    magnet_length: float = 0.1
    coil_position: float = 0.0


@dataclass
class CalculationTrace:
    source_file: str
    line_number: int
    function_name: str
    variable_name: str
    value_before: Optional[float]
    value_after: Optional[float]
    reason: str
    timestamp: float


class FaradayLawCalculator:
    def __init__(self, params: SimulationParams):
        self.params = params
        self.traces: List[CalculationTrace] = []
        self.warnings: List[str] = []
        self.errors: List[str] = []

    def _trace(self, var_name: str, before: Optional[float], after: Optional[float], reason: str):
        frame = inspect.currentframe().f_back
        self.traces.append(CalculationTrace(
            source_file=frame.f_code.co_filename,
            line_number=frame.f_lineno,
            function_name=frame.f_code.co_name,
            variable_name=var_name,
            value_before=before,
            value_after=after,
            reason=reason,
            timestamp=float(np.datetime64('now').astype(float))
        ))

    def magnetic_field_at_position(self, x: float, t: float) -> float:
        source_line = inspect.currentframe().f_lineno + 1
        magnet_center = self.params.magnet_speed * t - self.params.magnet_length / 2
        
        distance = x - magnet_center
        half_length = self.params.magnet_length / 2
        
        if abs(distance) <= half_length:
            field = self.params.magnet_field_strength * (1 - abs(distance) / half_length)
        else:
            decay_length = self.params.magnet_length / 2
            field = self.params.magnet_field_strength * np.exp(-abs(distance - half_length) / decay_length)
        
        if self.params.magnet_speed >= 0:
            field = -field
        
        self._trace('B(x,t)', None, field, f'磁场计算: x={x:.4f}, t={t:.4f}, 磁铁中心={magnet_center:.4f}')
        return field

    def calculate_magnetic_flux(self, t: float) -> float:
        source_line = inspect.currentframe().f_lineno + 1
        num_points = 100
        r = self.params.coil_radius
        
        x_points = np.linspace(-r, r, num_points)
        dA = (2 * r) / num_points
        
        flux = 0.0
        for i, x in enumerate(x_points):
            B = self.magnetic_field_at_position(x + self.params.coil_position, t)
            flux += B * dA
        
        flux *= self.params.coil_turns
        
        self._trace('Φ(t)', None, flux, f'磁通量计算: t={t:.4f}, 匝数={self.params.coil_turns}')
        return flux

    def calculate_induced_emf(self, t: float) -> float:
        source_line = inspect.currentframe().f_lineno + 1
        dt = self.params.time_step / 10
        flux_plus = self.calculate_magnetic_flux(t + dt)
        flux_minus = self.calculate_magnetic_flux(t - dt)
        
        emf = -(flux_plus - flux_minus) / (2 * dt)
        
        self._trace('ε(t)', None, emf, f'感应电动势计算: 法拉第定律 ε = -dΦ/dt')
        return emf

    def run_simulation(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        source_line = inspect.currentframe().f_lineno + 1
        num_steps = int(self.params.total_time / self.params.time_step)
        times = np.linspace(0, self.params.total_time, num_steps)
        
        fluxes = np.zeros(num_steps)
        emfs = np.zeros(num_steps)
        currents = np.zeros(num_steps)
        
        resistance = 10.0
        
        for i, t in enumerate(times):
            fluxes[i] = self.calculate_magnetic_flux(t)
            emfs[i] = self.calculate_induced_emf(t)
            currents[i] = emfs[i] / resistance
            
            self._trace('I(t)', None, currents[i], f'电流计算: I = ε/R, R={resistance}Ω')
        
        self._trace('simulation_complete', None, None, f'模拟完成: {num_steps}步, 总时长={self.params.total_time}s')
        
        return times, fluxes, emfs, currents

    def get_traces_by_type(self, var_name: str) -> List[CalculationTrace]:
        return [t for t in self.traces if t.variable_name == var_name]
