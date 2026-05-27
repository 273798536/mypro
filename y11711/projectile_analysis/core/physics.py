import math
from typing import List, Dict, Tuple
from .models import ProjectileParams


class ProjectilePhysics:
    @staticmethod
    def ideal_trajectory(params: ProjectileParams, dt: float = 0.01) -> List[Dict[str, float]]:
        angle_rad = math.radians(params.angle_deg)
        vx0 = params.v0 * math.cos(angle_rad)
        vy0 = params.v0 * math.sin(angle_rad)

        points = []
        t = 0.0
        y = params.release_height

        while y >= 0:
            x = vx0 * t
            y = params.release_height + vy0 * t - 0.5 * params.g * t * t
            vx = vx0
            vy = vy0 - params.g * t
            v = math.sqrt(vx * vx + vy * vy)

            points.append({
                "t": round(t, 4),
                "x": round(x, 4),
                "y": round(max(y, 0), 4),
                "vx": round(vx, 4),
                "vy": round(vy, 4),
                "v": round(v, 4)
            })
            t += dt

        if points and points[-1]["y"] > 0:
            t_last = points[-1]["t"]
            x_last = points[-1]["x"]
            y_last = points[-1]["y"]
            vy_last = points[-1]["vy"]

            t_landing = t_last + (y_last / (vy_last + 0.5 * params.g * dt)) if vy_last > 0 else \
                t_last + (math.sqrt(vy_last * vy_last + 2 * params.g * y_last) + vy_last) / params.g
            x_landing = x_last + vx0 * (t_landing - t_last)

            points.append({
                "t": round(t_landing, 4),
                "x": round(x_landing, 4),
                "y": 0.0,
                "vx": round(vx0, 4),
                "vy": round(vy_last - params.g * (t_landing - t_last), 4),
                "v": round(math.sqrt(vx0 * vx0 + (vy_last - params.g * (t_landing - t_last)) ** 2), 4)
            })

        return points

    @staticmethod
    def trajectory_with_air_resistance(params: ProjectileParams,
                                        dt: float = 0.001) -> List[Dict[str, float]]:
        if not params.air_resistance_enabled:
            return ProjectilePhysics.ideal_trajectory(params, dt)

        if params.drag_coefficient is None or params.mass is None or params.cross_sectional_area is None:
            raise ValueError(
                "Air resistance requires drag_coefficient, mass, and cross_sectional_area")

        angle_rad = math.radians(params.angle_deg)
        vx = params.v0 * math.cos(angle_rad)
        vy = params.v0 * math.sin(angle_rad)
        x = 0.0
        y = params.release_height
        t = 0.0

        k = 0.5 * params.air_density * params.drag_coefficient * params.cross_sectional_area

        points = [{
            "t": 0.0,
            "x": 0.0,
            "y": params.release_height,
            "vx": round(vx, 4),
            "vy": round(vy, 4),
            "v": round(params.v0, 4)
        }]

        while y >= 0:
            v = math.sqrt(vx * vx + vy * vy)

            if v > 0:
                drag_x = -k * v * vx / params.mass
                drag_y = -k * v * vy / params.mass
            else:
                drag_x = 0.0
                drag_y = 0.0

            ax = drag_x
            ay = -params.g + drag_y

            vx += ax * dt
            vy += ay * dt
            x += vx * dt
            y += vy * dt
            t += dt

            v_current = math.sqrt(vx * vx + vy * vy)

            if y >= 0:
                points.append({
                    "t": round(t, 4),
                    "x": round(x, 4),
                    "y": round(y, 4),
                    "vx": round(vx, 4),
                    "vy": round(vy, 4),
                    "v": round(v_current, 4)
                })
            else:
                t_prev = points[-1]["t"]
                y_prev = points[-1]["y"]
                x_prev = points[-1]["x"]
                fraction = y_prev / (y_prev - y)
                t_landing = t_prev + fraction * dt
                x_landing = x_prev + fraction * (x - x_prev)
                vx_landing = points[-1]["vx"] + fraction * (vx - points[-1]["vx"])
                vy_landing = points[-1]["vy"] + fraction * (vy - points[-1]["vy"])

                points.append({
                    "t": round(t_landing, 4),
                    "x": round(x_landing, 4),
                    "y": 0.0,
                    "vx": round(vx_landing, 4),
                    "vy": round(vy_landing, 4),
                    "v": round(math.sqrt(vx_landing * vx_landing + vy_landing * vy_landing), 4)
                })

        return points

    @staticmethod
    def compute_landing(params: ProjectileParams) -> Tuple[float, float]:
        if params.air_resistance_enabled:
            trajectory = ProjectilePhysics.trajectory_with_air_resistance(params)
            last = trajectory[-1]
            return last["x"], last["t"]

        angle_rad = math.radians(params.angle_deg)
        vx0 = params.v0 * math.cos(angle_rad)
        vy0 = params.v0 * math.sin(angle_rad)
        h = params.release_height
        g = params.g

        discriminant = vy0 * vy0 + 2 * g * h
        t_flight = (vy0 + math.sqrt(discriminant)) / g
        x_landing = vx0 * t_flight

        return x_landing, t_flight

    @staticmethod
    def compute_max_height(params: ProjectileParams) -> float:
        angle_rad = math.radians(params.angle_deg)
        vy0 = params.v0 * math.sin(angle_rad)
        return params.release_height + (vy0 * vy0) / (2 * params.g)

    @staticmethod
    def estimate_params_from_landing(x_landing: float, h: float, angle_deg: float,
                                      g: float = 9.81, air_resistance_enabled: bool = False,
                                      **kwargs) -> ProjectileParams:
        if air_resistance_enabled:
            return ProjectilePhysics._estimate_with_air_resistance(
                x_landing, h, angle_deg, g, **kwargs)

        angle_rad = math.radians(angle_deg)
        vx = math.cos(angle_rad)
        vy = math.sin(angle_rad)

        numerator = x_landing * x_landing * g
        denominator = 2 * vx * vx * (h + x_landing * vy / vx)
        v0 = math.sqrt(numerator / denominator)

        return ProjectileParams(
            v0=v0,
            angle_deg=angle_deg,
            release_height=h,
            g=g,
            air_resistance_enabled=False
        )

    @staticmethod
    def _estimate_with_air_resistance(x_target: float, h: float, angle_deg: float,
                                       g: float = 9.81, **kwargs) -> ProjectileParams:
        v0_low = 1.0
        v0_high = 50.0

        params = ProjectileParams(
            v0=v0_low,
            angle_deg=angle_deg,
            release_height=h,
            g=g,
            air_resistance_enabled=True,
            drag_coefficient=kwargs.get("drag_coefficient", 0.47),
            mass=kwargs.get("mass", 7.26),
            cross_sectional_area=kwargs.get("cross_sectional_area", 0.0113),
            air_density=kwargs.get("air_density", 1.225)
        )

        for _ in range(50):
            v0_mid = (v0_low + v0_high) / 2
            params.v0 = v0_mid
            x_actual, _ = ProjectilePhysics.compute_landing(params)

            if abs(x_actual - x_target) < 0.001:
                break
            elif x_actual < x_target:
                v0_low = v0_mid
            else:
                v0_high = v0_mid

        return params
