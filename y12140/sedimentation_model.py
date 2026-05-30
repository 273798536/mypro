from typing import Optional, Tuple
from models import (
    Particle, Liquid, SedimentationResult, BoundaryInfo, BoundaryType
)
from unit_converter import UnitConverter
from dataclasses import dataclass


@dataclass
class ModelConstraints:
    MIN_DIAMETER_UM: float = 0.1
    MAX_DIAMETER_UM: float = 1000.0
    MIN_REYNOLDS_LAMINAR: float = 0.0
    MAX_REYNOLDS_LAMINAR: float = 1.0
    GRAVITY: float = 9.81
    BOUNDARY_TOLERANCE: float = 0.05


class StokesModel:
    def __init__(self, constraints: Optional[ModelConstraints] = None):
        self.constraints = constraints or ModelConstraints()

    def _check_boundary(
        self,
        diameter_m: float,
        reynolds: float,
        velocity: float
    ) -> Optional[BoundaryInfo]:
        diameter_um = diameter_m * 1e6
        tol = self.constraints.BOUNDARY_TOLERANCE

        if diameter_um <= self.constraints.MIN_DIAMETER_UM * (1 + tol):
            if diameter_um < self.constraints.MIN_DIAMETER_UM:
                return BoundaryInfo(
                    boundary_type=BoundaryType.LOWER,
                    field_name="particle_diameter",
                    value=diameter_um,
                    limit=self.constraints.MIN_DIAMETER_UM,
                    tolerance=tol
                )
            else:
                return BoundaryInfo(
                    boundary_type=BoundaryType.NEAR_BOUNDARY,
                    field_name="particle_diameter",
                    value=diameter_um,
                    limit=self.constraints.MIN_DIAMETER_UM,
                    tolerance=tol
                )

        if diameter_um >= self.constraints.MAX_DIAMETER_UM * (1 - tol):
            if diameter_um > self.constraints.MAX_DIAMETER_UM:
                return BoundaryInfo(
                    boundary_type=BoundaryType.UPPER,
                    field_name="particle_diameter",
                    value=diameter_um,
                    limit=self.constraints.MAX_DIAMETER_UM,
                    tolerance=tol
                )
            else:
                return BoundaryInfo(
                    boundary_type=BoundaryType.NEAR_BOUNDARY,
                    field_name="particle_diameter",
                    value=diameter_um,
                    limit=self.constraints.MAX_DIAMETER_UM,
                    tolerance=tol
                )

        if reynolds >= self.constraints.MAX_REYNOLDS_LAMINAR * (1 - tol):
            if reynolds > self.constraints.MAX_REYNOLDS_LAMINAR:
                return BoundaryInfo(
                    boundary_type=BoundaryType.UPPER,
                    field_name="reynolds_number",
                    value=reynolds,
                    limit=self.constraints.MAX_REYNOLDS_LAMINAR,
                    tolerance=tol
                )
            else:
                return BoundaryInfo(
                    boundary_type=BoundaryType.NEAR_BOUNDARY,
                    field_name="reynolds_number",
                    value=reynolds,
                    limit=self.constraints.MAX_REYNOLDS_LAMINAR,
                    tolerance=tol
                )

        return None

    def calculate_viscosity(self, liquid: Liquid) -> float:
        if liquid.viscosity > 0:
            return liquid.viscosity

        if liquid.temperature is not None:
            return UnitConverter.dynamic_viscosity_water(liquid.temperature)

        return 1.002e-3

    def calculate(self, particle: Particle, liquid: Liquid) -> SedimentationResult:
        d_m = UnitConverter.diameter_to_meters(
            particle.diameter, particle.diameter_unit
        )

        rho_p_kgm3 = UnitConverter.density_to_kgm3(
            particle.density, particle.density_unit
        ) if particle.density is not None and particle.density_unit else 2650.0

        rho_l_kgm3 = UnitConverter.density_to_kgm3(
            liquid.density, liquid.density_unit
        )

        mu = self.calculate_viscosity(liquid)

        g = self.constraints.GRAVITY

        velocity = (g * (rho_p_kgm3 - rho_l_kgm3) * d_m ** 2) / (18 * mu)

        reynolds = (rho_l_kgm3 * velocity * d_m) / mu

        is_laminar = reynolds <= self.constraints.MAX_REYNOLDS_LAMINAR

        settling_time_1m = 1.0 / velocity if velocity > 0 else float('inf')

        note = ""
        if not is_laminar:
            note = "警告：雷诺数大于1，Stokes定律假设不成立，结果可能不准确"
        if velocity < 0:
            note = "警告：颗粒密度小于液体密度，颗粒会上浮而不是沉降"
            settling_time_1m = abs(settling_time_1m)

        boundary_info = self._check_boundary(d_m, reynolds, velocity)

        return SedimentationResult(
            sample_id=particle.sample_id,
            velocity=abs(velocity),
            velocity_unit="m/s",
            settling_time_1m=settling_time_1m,
            settling_time_unit="s",
            reynolds_number=reynolds,
            is_laminar=is_laminar,
            particle_diameter_m=d_m,
            particle_density_kgm3=rho_p_kgm3,
            liquid_density_kgm3=rho_l_kgm3,
            liquid_viscosity=mu,
            temperature=liquid.temperature,
            boundary_info=boundary_info,
            calculation_note=note
        )

    def is_within_model_range(self, diameter_um: float) -> Tuple[bool, str]:
        if diameter_um < self.constraints.MIN_DIAMETER_UM:
            return False, f"粒径{ diameter_um }μm小于模型下限{self.constraints.MIN_DIAMETER_UM}μm"
        if diameter_um > self.constraints.MAX_DIAMETER_UM:
            return False, f"粒径{ diameter_um }μm大于模型上限{self.constraints.MAX_DIAMETER_UM}μm"
        return True, ""
