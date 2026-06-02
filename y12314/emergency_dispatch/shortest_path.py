import heapq
from typing import Dict, List, Tuple, Optional, Set
from .models import Road, RoadStatus


class ShortestPathCalculator:
    def __init__(self, roads: Optional[List[Road]] = None):
        self.full_graph: Dict[str, List[Tuple[str, float, str]]] = {}
        self.open_graph: Dict[str, List[Tuple[str, float, str]]] = {}
        self.blocked_roads: Set[str] = set()
        self.blocked_road_details: Dict[str, Road] = {}
        if roads:
            self.build_graph(roads)

    def build_graph(self, roads: List[Road]) -> None:
        self.full_graph.clear()
        self.open_graph.clear()
        self.blocked_roads.clear()
        self.blocked_road_details.clear()

        for road in roads:
            self._add_edge(self.full_graph, road)

            if road.status == RoadStatus.BLOCKED:
                self.blocked_roads.add(road.road_id)
                self.blocked_road_details[road.road_id] = road
            else:
                self._add_edge(self.open_graph, road)

    def _add_edge(self, graph: Dict[str, List[Tuple[str, float, str]]], road: Road) -> None:
        if road.from_location not in graph:
            graph[road.from_location] = []
        graph[road.from_location].append(
            (road.to_location, road.distance, road.road_id)
        )

        if road.to_location not in graph:
            graph[road.to_location] = []
        graph[road.to_location].append(
            (road.from_location, road.distance, road.road_id)
        )

    def _dijkstra(self, graph: Dict[str, List[Tuple[str, float, str]]],
                  start: str, end: Optional[str] = None) -> Tuple[
        Dict[str, float], Dict[str, Optional[str]], Dict[str, Optional[str]]
    ]:
        distances: Dict[str, float] = {start: 0}
        previous: Dict[str, Optional[str]] = {start: None}
        road_used: Dict[str, Optional[str]] = {start: None}

        pq: List[Tuple[float, str]] = [(0, start)]
        visited: Set[str] = set()

        while pq:
            current_distance, current_node = heapq.heappop(pq)

            if current_node in visited:
                continue
            visited.add(current_node)

            if end and current_node == end:
                break

            if current_node not in graph:
                continue

            for neighbor, weight, road_id in graph[current_node]:
                distance = current_distance + weight

                if neighbor not in distances or distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    road_used[neighbor] = road_id
                    heapq.heappush(pq, (distance, neighbor))

        return distances, previous, road_used

    def _reconstruct_path(self, end: str,
                          previous: Dict[str, Optional[str]],
                          road_used: Dict[str, Optional[str]]) -> Tuple[List[str], List[str]]:
        path: List[str] = []
        road_ids: List[str] = []
        current: Optional[str] = end

        while current is not None:
            path.append(current)
            if road_used.get(current):
                road_ids.append(road_used[current])
            current = previous.get(current)

        path.reverse()
        road_ids.reverse()

        return path, road_ids

    def get_shortest_path(self, start: str, end: str) -> Tuple[
        Optional[List[str]], float, List[str]
    ]:
        if start not in self.open_graph:
            return None, float('inf'), []

        distances, previous, road_used = self._dijkstra(self.open_graph, start, end)

        if end not in distances or distances[end] == float('inf'):
            return None, float('inf'), []

        path, road_ids = self._reconstruct_path(end, previous, road_used)
        return path, distances[end], road_ids

    def get_ideal_shortest_path(self, start: str, end: str) -> Tuple[
        Optional[List[str]], float, List[str]
    ]:
        if start not in self.full_graph:
            return None, float('inf'), []

        distances, previous, road_used = self._dijkstra(self.full_graph, start, end)

        if end not in distances or distances[end] == float('inf'):
            return None, float('inf'), []

        path, road_ids = self._reconstruct_path(end, previous, road_used)
        return path, distances[end], road_ids

    def find_blocked_roads_on_path(self, road_ids: List[str]) -> List[Dict]:
        blocked_on_path = []
        for rid in road_ids:
            if rid in self.blocked_roads:
                road = self.blocked_road_details[rid]
                blocked_on_path.append({
                    "road_id": rid,
                    "from": road.from_location,
                    "to": road.to_location,
                    "distance": road.distance
                })
        return blocked_on_path

    def get_nearest_warehouse(self, demand_location: str, warehouse_locations: List[str]) -> Tuple[Optional[str], float]:
        if demand_location not in self.open_graph:
            return None, float('inf')

        distances, _, _ = self._dijkstra(self.open_graph, demand_location)

        nearest_warehouse = None
        min_distance = float('inf')

        for warehouse_loc in warehouse_locations:
            if warehouse_loc in distances and distances[warehouse_loc] < min_distance:
                min_distance = distances[warehouse_loc]
                nearest_warehouse = warehouse_loc

        return nearest_warehouse, min_distance
