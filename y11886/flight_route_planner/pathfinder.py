from __future__ import annotations

import itertools
from typing import List, Optional, Tuple

from .energy import EnergyModel
from .models import (
    AircraftSpec,
    BatterySpec,
    LegResult,
    NoFlyZone,
    PlanResult,
    Waypoint,
    Wind,
)


class Pathfinder:
    def __init__(self, energy_model: EnergyModel):
        self.energy_model = energy_model

    def plan_greedy(
        self,
        waypoints: List[Waypoint],
        start_index: int = 0,
        end_index: Optional[int] = None,
    ) -> Tuple[List[Waypoint], List[LegResult]]:
        if not waypoints:
            return [], []

        if len(waypoints) <= 2:
            legs = self.energy_model.compute_route(waypoints)
            return list(waypoints), legs

        if end_index is None:
            end_index = len(waypoints) - 1

        start_wp = waypoints[start_index]
        end_wp = waypoints[end_index]
        middle = [wp for i, wp in enumerate(waypoints) if i != start_index and i != end_index]

        ordered = [start_wp]
        remaining = list(middle)
        cumulative = 0.0
        leg_results = []
        leg_idx = 0

        while remaining:
            best_wp = None
            best_cost = float("inf")
            best_leg = None

            for wp in remaining:
                cost = self.energy_model.leg_cost(ordered[-1], wp, cumulative, leg_idx)
                if cost < best_cost:
                    best_cost = cost
                    best_wp = wp

            if best_wp is None:
                break

            leg, _ = self.energy_model.compute_leg(ordered[-1], best_wp, cumulative, leg_idx)
            leg_results.append(leg)
            cumulative = leg.cumulative_energy_wh
            ordered.append(best_wp)
            remaining.remove(best_wp)
            leg_idx += 1

        leg, _ = self.energy_model.compute_leg(ordered[-1], end_wp, cumulative, leg_idx)
        leg_results.append(leg)
        ordered.append(end_wp)

        return ordered, leg_results

    def plan_optimal(
        self,
        waypoints: List[Waypoint],
        start_index: int = 0,
        end_index: Optional[int] = None,
        max_permutations: int = 50000,
    ) -> Tuple[List[Waypoint], List[LegResult]]:
        if not waypoints:
            return [], []

        if len(waypoints) <= 2:
            legs = self.energy_model.compute_route(waypoints)
            return list(waypoints), legs

        if end_index is None:
            end_index = len(waypoints) - 1

        start_wp = waypoints[start_index]
        end_wp = waypoints[end_index]
        middle = [wp for i, wp in enumerate(waypoints) if i != start_index and i != end_index]

        best_order = None
        best_total = float("inf")
        best_legs = None

        count = 0
        for perm in itertools.permutations(middle):
            if count >= max_permutations:
                break
            candidate = [start_wp] + list(perm) + [end_wp]
            legs = self.energy_model.compute_route(candidate)
            total = sum(l.energy_wh for l in legs)
            if total < best_total:
                best_total = total
                best_order = candidate
                best_legs = legs
            count += 1

        if best_order is None:
            return self.plan_greedy(waypoints, start_index, end_index)

        return best_order, best_legs

    def compare_routes(
        self,
        waypoints: List[Waypoint],
        start_index: int = 0,
        end_index: Optional[int] = None,
    ) -> List[Tuple[str, List[Waypoint], List[LegResult]]]:
        greedy_order, greedy_legs = self.plan_greedy(waypoints, start_index, end_index)
        results = [("greedy", greedy_order, greedy_legs)]

        if len(waypoints) <= 9:
            optimal_order, optimal_legs = self.plan_optimal(waypoints, start_index, end_index)
            results.append(("optimal", optimal_order, optimal_legs))

        original_legs = self.energy_model.compute_route(waypoints)
        results.append(("original", list(waypoints), original_legs))

        return results
