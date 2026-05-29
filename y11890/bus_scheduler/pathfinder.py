import heapq
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from .models import ScheduleInput, Stop, Road, RoadStatus


class PathFinder:
    def __init__(self, schedule_input: ScheduleInput):
        self.input = schedule_input
        self._build_graph()

    def _build_graph(self):
        self.graph: Dict[str, Dict[str, float]] = defaultdict(dict)
        self.road_map: Dict[Tuple[str, str], Road] = {}

        for road in self.input.roads:
            if road.status == RoadStatus.CLOSED:
                continue

            from_stop = road.from_stop_id
            to_stop = road.to_stop_id
            duration = road.duration_minutes

            self.graph[from_stop][to_stop] = duration
            self.graph[to_stop][from_stop] = duration

            self.road_map[(from_stop, to_stop)] = road
            self.road_map[(to_stop, from_stop)] = road

        all_stops = [self.input.school] + self.input.stops
        for stop in all_stops:
            if stop.stop_id not in self.graph:
                self.graph[stop.stop_id] = {}

    def shortest_path(self, start_id: str, end_id: str) -> Tuple[Optional[List[str]], float]:
        if start_id == end_id:
            return [start_id], 0.0

        distances = {node: float('inf') for node in self.graph}
        distances[start_id] = 0
        previous = {node: None for node in self.graph}
        visited = set()

        priority_queue = [(0, start_id)]

        while priority_queue:
            current_distance, current_node = heapq.heappop(priority_queue)

            if current_node in visited:
                continue
            visited.add(current_node)

            if current_node == end_id:
                break

            for neighbor, weight in self.graph[current_node].items():
                if neighbor in visited:
                    continue

                distance = current_distance + weight
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    heapq.heappush(priority_queue, (distance, neighbor))

        if distances[end_id] == float('inf'):
            return None, float('inf')

        path = []
        current = end_id
        while current is not None:
            path.append(current)
            current = previous[current]
        path.reverse()

        return path, distances[end_id]

    def get_shortest_distance(self, start_id: str, end_id: str) -> float:
        _, distance = self.shortest_path(start_id, end_id)
        return distance

    def all_pairs_shortest_paths(self) -> Dict[Tuple[str, str], Tuple[Optional[List[str]], float]]:
        all_stops = [self.input.school] + self.input.stops
        results = {}

        for start in all_stops:
            for end in all_stops:
                if start.stop_id < end.stop_id:
                    path, distance = self.shortest_path(start.stop_id, end.stop_id)
                    results[(start.stop_id, end.stop_id)] = (path, distance)
                    results[(end.stop_id, start.stop_id)] = (
                        list(reversed(path)) if path else None,
                        distance
                    )

        for stop in all_stops:
            results[(stop.stop_id, stop.stop_id)] = ([stop.stop_id], 0.0)

        return results

    def get_distance_matrix(self) -> Dict[str, Dict[str, float]]:
        all_stops = [self.input.school] + self.input.stops
        stop_ids = [s.stop_id for s in all_stops]

        matrix: Dict[str, Dict[str, float]] = defaultdict(dict)

        for from_id in stop_ids:
            for to_id in stop_ids:
                matrix[from_id][to_id] = self.get_shortest_distance(from_id, to_id)

        return matrix

    def find_nearest_neighbor_order(self, start_id: str, visit_ids: List[str]) -> Tuple[List[str], float]:
        if not visit_ids:
            return [start_id], 0.0

        unvisited = set(visit_ids)
        current = start_id
        order = [start_id]
        total_distance = 0.0

        while unvisited:
            nearest = None
            nearest_dist = float('inf')

            for candidate in unvisited:
                dist = self.get_shortest_distance(current, candidate)
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest = candidate

            if nearest is None:
                break

            order.append(nearest)
            total_distance += nearest_dist
            current = nearest
            unvisited.remove(nearest)

        return order, total_distance

    def calculate_route_duration(self, stop_order: List[str]) -> float:
        if len(stop_order) <= 1:
            return 0.0

        total = 0.0
        for i in range(len(stop_order) - 1):
            total += self.get_shortest_distance(stop_order[i], stop_order[i + 1])
        return total

    def optimize_route_order(self, stop_order: List[str], start_id: str, end_id: str) -> Tuple[List[str], float]:
        visit_stops = [s for s in stop_order if s not in {start_id, end_id}]

        if not visit_stops:
            return [start_id, end_id], self.get_shortest_distance(start_id, end_id)

        best_order = None
        best_distance = float('inf')

        import itertools
        for perm in itertools.permutations(visit_stops):
            full_order = [start_id] + list(perm) + [end_id]
            distance = self.calculate_route_duration(full_order)
            if distance < best_distance:
                best_distance = distance
                best_order = full_order

        if best_order is None:
            nn_order, nn_dist = self.find_nearest_neighbor_order(start_id, visit_stops)
            best_order = nn_order + [end_id]
            best_distance = nn_dist + self.get_shortest_distance(nn_order[-1], end_id)

        return best_order, best_distance

    def get_route_details(self, stop_order: List[str]) -> List[Dict]:
        details = []
        for i in range(len(stop_order) - 1):
            from_id = stop_order[i]
            to_id = stop_order[i + 1]
            path, duration = self.shortest_path(from_id, to_id)

            from_stop = self.input.get_stop(from_id)
            to_stop = self.input.get_stop(to_id)

            details.append({
                'from': from_stop.name if from_stop else from_id,
                'from_id': from_id,
                'to': to_stop.name if to_stop else to_id,
                'to_id': to_id,
                'duration': duration,
                'path': path
            })

        return details
