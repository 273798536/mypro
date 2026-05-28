import numpy as np
from scipy.integrate import solve_ivp
from dataclasses import dataclass
from typing import Optional, Tuple, List
import math


@dataclass
class PhysicsParameters:
    g: float = 9.81
    Cd: float = 0.4
    rho_air: float = 1.225
    rocket_mass: float = 0.5
    rocket_diameter: float = 0.1
    wind_speed: float = 0.0
    wind_direction: float = 0.0

    @property
    def rocket_area(self) -> float:
        return math.pi * (self.rocket_diameter / 2) ** 2


@dataclass
class TrajectoryPoint:
    time: float
    x: float
    y: float
    z: float
    vx: float
    vy: float
    vz: float
    acceleration: float
    drag_force: float


@dataclass
class TrajectoryResult:
    points: List[TrajectoryPoint]
    max_height: float
    max_height_time: float
    landing_time: float
    landing_position: Tuple[float, float]
    initial_velocity: float
    flight_duration: float
    params: PhysicsParameters


class PhysicsModel:
    def __init__(self, params: Optional[PhysicsParameters] = None):
        self.params = params or PhysicsParameters()

    def _derivatives(self, t: float, state: np.ndarray, params: PhysicsParameters) -> np.ndarray:
        x, y, z, vx, vy, vz = state

        v_mag = np.sqrt(vx ** 2 + vy ** 2 + vz ** 2)

        wind_rad = math.radians(params.wind_direction)
        wind_vx = params.wind_speed * math.cos(wind_rad)
        wind_vy = params.wind_speed * math.sin(wind_rad)

        rel_vx = vx - wind_vx
        rel_vy = vy - wind_vy
        rel_vz = vz
        rel_v_mag = np.sqrt(rel_vx ** 2 + rel_vy ** 2 + rel_vz ** 2)

        if rel_v_mag > 1e-6:
            drag_coeff = 0.5 * params.rho_air * params.Cd * params.rocket_area / params.rocket_mass
            ax = -drag_coeff * rel_v_mag * rel_vx
            ay = -drag_coeff * rel_v_mag * rel_vy
            az = -params.g - drag_coeff * rel_v_mag * rel_vz
        else:
            ax = 0.0
            ay = 0.0
            az = -params.g

        return np.array([vx, vy, vz, ax, ay, az])

    def simulate_trajectory(
        self,
        initial_velocity: float,
        launch_angle: float = 90.0,
        azimuth_angle: float = 0.0,
        t_max: float = 30.0,
        dt: float = 0.01
    ) -> TrajectoryResult:
        angle_rad = math.radians(launch_angle)
        azimuth_rad = math.radians(azimuth_angle)

        vx0 = initial_velocity * math.cos(angle_rad) * math.cos(azimuth_rad)
        vy0 = initial_velocity * math.cos(angle_rad) * math.sin(azimuth_rad)
        vz0 = initial_velocity * math.sin(angle_rad)

        initial_state = np.array([0.0, 0.0, 0.0, vx0, vy0, vz0])

        def hit_ground(t, state):
            return state[2]

        hit_ground.terminal = True
        hit_ground.direction = -1

        t_eval = np.arange(0, t_max, dt)

        sol = solve_ivp(
            fun=lambda t, y: self._derivatives(t, y, self.params),
            t_span=(0, t_max),
            y0=initial_state,
            t_eval=t_eval,
            events=hit_ground,
            method='RK45',
            rtol=1e-8,
            atol=1e-8
        )

        points = []
        max_height = 0.0
        max_height_time = 0.0
        max_v = 0.0

        for i, t in enumerate(sol.t):
            x, y, z, vx, vy, vz = sol.y[:, i]

            if z > max_height:
                max_height = z
                max_height_time = t

            v_mag = np.sqrt(vx ** 2 + vy ** 2 + vz ** 2)
            max_v = max(max_v, v_mag)

            rel_vx = vx - self.params.wind_speed * math.cos(math.radians(self.params.wind_direction))
            rel_vy = vy - self.params.wind_speed * math.sin(math.radians(self.params.wind_direction))
            rel_vz = vz
            rel_v_mag = np.sqrt(rel_vx ** 2 + rel_vy ** 2 + rel_vz ** 2)
            drag_force = 0.5 * self.params.rho_air * self.params.Cd * self.params.rocket_area * rel_v_mag ** 2

            acc_mag = np.sqrt((self._derivatives(t, sol.y[:, i], self.params)[3:6] ** 2).sum())

            points.append(TrajectoryPoint(
                time=t,
                x=x,
                y=y,
                z=z,
                vx=vx,
                vy=vy,
                vz=vz,
                acceleration=acc_mag,
                drag_force=drag_force
            ))

        landing_time = sol.t[-1]
        landing_position = (sol.y[0, -1], sol.y[1, -1])

        return TrajectoryResult(
            points=points,
            max_height=max_height,
            max_height_time=max_height_time,
            landing_time=landing_time,
            landing_position=landing_position,
            initial_velocity=initial_velocity,
            flight_duration=landing_time,
            params=self.params
        )

    def calculate_drag_coefficient(
        self,
        velocity: float,
        altitude: float = 0.0
    ) -> float:
        temp_factor = 1 - 0.0065 * altitude / 288.15
        rho_altitude = self.params.rho_air * (temp_factor ** 4.2561)

        reynolds = (rho_altitude * velocity * self.params.rocket_diameter) / 1.81e-5

        if reynolds < 1e3:
            Cd = 0.6
        elif reynolds < 1e5:
            Cd = 0.4
        elif reynolds < 3e5:
            Cd = 0.4 + 0.2 * (reynolds - 1e5) / 2e5
        else:
            Cd = 0.2

        return Cd

    def estimate_launch_energy(
        self,
        max_height: float,
        launch_angle: float = 90.0
    ) -> Tuple[float, float]:
        angle_rad = math.radians(launch_angle)

        v_no_drag = math.sqrt(2 * self.params.g * max_height) / math.sin(angle_rad)

        def height_error(v0):
            traj = self.simulate_trajectory(v0, launch_angle)
            return (traj.max_height - max_height) ** 2

        v_guess = v_no_drag
        for _ in range(50):
            error = height_error(v_guess)
            if error < 1e-3:
                break
            dv = 0.1
            grad = (height_error(v_guess + dv) - height_error(v_guess)) / dv
            v_guess = max(1, v_guess - 0.01 * grad)

        kinetic_energy = 0.5 * self.params.rocket_mass * v_guess ** 2

        return v_guess, kinetic_energy

    def get_altitude_at_times(self, trajectory: TrajectoryResult, times: np.ndarray) -> np.ndarray:
        traj_times = np.array([p.time for p in trajectory.points])
        traj_altitudes = np.array([p.z for p in trajectory.points])

        return np.interp(times, traj_times, traj_altitudes, left=0, right=0)

    def analytical_projectile(
        self,
        initial_velocity: float,
        launch_angle: float,
        times: np.ndarray
    ) -> np.ndarray:
        angle_rad = math.radians(launch_angle)
        vz0 = initial_velocity * math.sin(angle_rad)

        z = vz0 * times - 0.5 * self.params.g * times ** 2
        z[z < 0] = 0

        return z
