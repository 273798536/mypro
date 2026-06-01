import heapq
from typing import Dict, List, Tuple, Optional, Set
from .models import Road, RoadStatus


class ShortestPathCalculator:
    def __init__(self, roads: Optional[List[Road]] = None):
        self.graph: Dict[str, List[Tuple[str, float, str]]] = {}
        self.blocked_roads: Set[str] = set()
        if roads:
            self.build_graph(roads)

    def build_graph(self, roads: List[Road]) -> None:
        self.graph.clear()
        self.blocked_roads.clear()
        
        for road in roads:
            if road.status == RoadStatus.BLOCKED:
                self.blocked_roads.add(road.road_id)
                continue
            
            if road.from_location not in self.graph:
                self.graph[road.from_location] = []
            self.graph[road.from_location].append(
                (road.to_location, road.distance, road.road_id)
            )
            
            if road.to_location not in self.graph:
                self.graph[road.to_location] = []
            self.graph[road.to_location].append(
                (road.from_location, road.distance, road.road_id)
            )

    def dijkstra(self, start: str, end: Optional[str] = None) -> Tuple[
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
            
            if current_node not in self.graph:
                continue
            
            for neighbor, weight, road_id in self.graph[current_node]:
                distance = current_distance + weight
                
                if neighbor not in distances or distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    road_used[neighbor] = road_id
                    heapq.heappush(pq, (distance, neighbor))
        
        return distances, previous, road_used

    def get_shortest_path(self, start: str, end: str) -> Tuple[
        Optional[List[str]], float, List[str]
    ]:
        if start not in self.graph:
            return None, float('inf'), []
        
        distances, previous, road_used = self.dijkstra(start, end)
        
        if end not in distances or distances[end] == float('inf'):
            return None, float('inf'), []
        
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
        
        return path, distances[end], road_ids

    def find_all_paths_through_blocked(self, start: str, end: str, blocked_road_id: str) -> List[Dict]:
        failed_paths = []
        
        roads_list = []
        for from_loc, edges in self.graph.items():
            for to_loc, dist, rid in edges:
                roads_list.append({
                    'from': from_loc,
                    'to': to_loc,
                    'distance': dist,
                    'road_id': rid
                })
        
        for road_info in roads_list:
            if road_info['road_id'] == blocked_road_id:
                temp_graph = self.graph.copy()
                if road_info['from'] in temp_graph:
                    temp_graph[road_info['from']] = [
                        e for e in temp_graph[road_info['from']] 
                        if e[2] != blocked_road_id
                    ]
                
                original_graph = self.graph
                self.graph = temp_graph
                
                path, distance, roads = self.get_shortest_path(start, end)
                
                self.graph = original_graph
                
                if path is None:
                    failed_paths.append({
                        'from': road_info['from'],
                        'to': road_info['to'],
                        'blocked_road': blocked_road_id,
                        'attempted_path': [road_info['from'], road_info['to']],
                        'reason': '道路中断导致路径无法通行'
                    })
        
        return failed_paths

    def get_nearest_warehouse(self, demand_location: str, warehouse_locations: List[str]) -> Tuple[Optional[str], float]:
        if demand_location not in self.graph:
            return None, float('inf')
        
        distances, _, _ = self.dijkstra(demand_location)
        
        nearest_warehouse = None
        min_distance = float('inf')
        
        for warehouse_loc in warehouse_locations:
            if warehouse_loc in distances and distances[warehouse_loc] < min_distance:
                min_distance = distances[warehouse_loc]
                nearest_warehouse = warehouse_loc
        
        return nearest_warehouse, min_distance
