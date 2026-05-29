import heapq
from typing import List, Set, Dict, Tuple, Optional
from collections import defaultdict
from .models import Modality, ModulationEdge, ModulationPath, Issue
from .music_theory import create_modulation_edge


class ModulationGraph:
    def __init__(self):
        self.nodes: Dict[str, Modality] = {}
        self.edges: Dict[str, Dict[str, ModulationEdge]] = defaultdict(dict)
        self.issues: List[Issue] = []
    
    def add_node(self, modality: Modality):
        self.nodes[modality.id] = modality
    
    def add_edge(self, edge: ModulationEdge):
        self.edges[edge.source.id][edge.target.id] = edge
    
    def get_edge(self, source_id: str, target_id: str) -> Optional[ModulationEdge]:
        return self.edges.get(source_id, {}).get(target_id)
    
    def get_neighbors(self, modality_id: str) -> List[ModulationEdge]:
        return list(self.edges.get(modality_id, {}).values())


def build_graph(
    modalities: List[Modality],
    min_common_tones: int = 1,
    max_score_threshold: float = 15.0
) -> Tuple[ModulationGraph, List[Issue]]:
    
    graph = ModulationGraph()
    all_issues: List[Issue] = []
    
    for mod in modalities:
        graph.add_node(mod)
    
    for i, source in enumerate(modalities):
        for target in modalities[i+1:]:
            edge, issues = create_modulation_edge(source, target, min_common_tones)
            all_issues.extend(issues)
            
            if edge and edge.difficulty_score <= max_score_threshold:
                graph.add_edge(edge)
                
                reverse_edge = ModulationEdge(
                    source=target,
                    target=source,
                    common_tones=edge.common_tones,
                    difficulty_score=edge.difficulty_score,
                    modulation_type=edge.modulation_type,
                    is_enharmonic=edge.is_enharmonic,
                    needs_confirmation=edge.needs_confirmation
                )
                graph.add_edge(reverse_edge)
    
    return graph, all_issues


def dijkstra_shortest_path(
    graph: ModulationGraph,
    start_id: str,
    target_id: str,
    max_path_length: int = 5
) -> Optional[ModulationPath]:
    
    if start_id not in graph.nodes or target_id not in graph.nodes:
        return None
    
    distances: Dict[str, float] = defaultdict(lambda: float('inf'))
    distances[start_id] = 0
    
    heap: List[Tuple[float, str, List[ModulationEdge]]] = [(0.0, start_id, [])]
    
    while heap:
        current_dist, current_id, path_edges = heapq.heappop(heap)
        
        path_nodes = {e.source.id for e in path_edges}
        if current_id in path_nodes:
            continue
        
        if current_id == target_id:
            return ModulationPath(edges=path_edges)
        
        if len(path_edges) >= max_path_length:
            continue
        
        if current_dist > distances[current_id] and path_edges:
            continue
        
        for edge in graph.get_neighbors(current_id):
            next_id = edge.target.id
            
            if next_id in path_nodes:
                continue
            
            new_dist = current_dist + edge.difficulty_score
            
            if new_dist < distances.get(next_id, float('inf')) or not path_edges:
                distances[next_id] = new_dist
                new_path_edges = path_edges + [edge]
                heapq.heappush(heap, (new_dist, next_id, new_path_edges))
    
    return None


def yen_k_shortest_paths(
    graph: ModulationGraph,
    start_id: str,
    target_id: str,
    k: int = 5,
    max_path_length: int = 5
) -> List[ModulationPath]:
    
    def path_to_edge_list(path_nodes: List[str]) -> List[ModulationEdge]:
        edges = []
        for i in range(len(path_nodes) - 1):
            edge = graph.get_edge(path_nodes[i], path_nodes[i+1])
            if edge:
                edges.append(edge)
        return edges
    
    shortest = dijkstra_shortest_path(graph, start_id, target_id, max_path_length)
    if not shortest:
        return []
    
    paths: List[ModulationPath] = [shortest]
    potential_paths: List[Tuple[float, List[str]]] = []
    
    for kth in range(1, k):
        last_path = paths[kth - 1]
        last_nodes = [m.id for m in last_path.modalities]
        
        for i in range(len(last_nodes) - 1):
            spur_node = last_nodes[i]
            root_path = last_nodes[:i + 1]
            
            removed_edges = []
            for path in paths:
                path_nodes = [m.id for m in path.modalities]
                if len(path_nodes) > i and path_nodes[:i + 1] == root_path:
                    if i + 1 < len(path_nodes):
                        edge = graph.get_edge(path_nodes[i], path_nodes[i + 1])
                        if edge:
                            removed_edges.append((path_nodes[i], path_nodes[i + 1], edge))
                            del graph.edges[path_nodes[i]][path_nodes[i + 1]]
            
            spur_path = dijkstra_shortest_path(graph, spur_node, target_id, max_path_length - i)
            
            for src_id, tgt_id, edge in removed_edges:
                graph.edges[src_id][tgt_id] = edge
            
            if spur_path:
                spur_nodes = [m.id for m in spur_path.modalities]
                total_path_nodes = root_path[:-1] + spur_nodes
                total_path_edges = path_to_edge_list(total_path_nodes)
                
                if total_path_edges:
                    total_path = ModulationPath(edges=total_path_edges)
                    total_path_nodes_list = [m.id for m in total_path.modalities]
                    existing = any([m.id for m in p.modalities] == total_path_nodes_list for p in paths)
                    if not existing:
                        heapq.heappush(potential_paths, (total_path.total_difficulty, total_path_nodes_list))
        
        if not potential_paths:
            break
        
        while potential_paths:
            _, next_path_nodes = heapq.heappop(potential_paths)
            next_path_edges = path_to_edge_list(next_path_nodes)
            if next_path_edges:
                next_path = ModulationPath(edges=next_path_edges)
                paths.append(next_path)
                break
    
    return paths


def find_all_paths(
    graph: ModulationGraph,
    start_id: str,
    target_id: str,
    max_paths: int = 10,
    max_path_length: int = 4
) -> Tuple[List[ModulationPath], List[Issue]]:
    
    issues: List[Issue] = []
    
    paths = yen_k_shortest_paths(graph, start_id, target_id, k=max_paths, max_path_length=max_path_length)
    
    if not paths:
        issues.append(Issue(
            issue_type="no_path_found",
            severity="warning",
            description=f"No valid modulation path found between {start_id} and {target_id}",
            related_items=[start_id, target_id],
            suggested_action="Try increasing max_path_length or lowering min_common_tones threshold"
        ))
    
    for path in paths:
        if path.length > 3:
            issues.append(Issue(
                issue_type="path_too_long",
                severity="info",
                description=f"Path has {path.length} steps, consider intermediate modulations",
                related_items=[str(path)],
                suggested_action="Review if a more direct path exists or break into smaller learning units"
            ))
        
        mod_ids = [m.id for m in path.modalities]
        if len(mod_ids) != len(set(mod_ids)):
            issues.append(Issue(
                issue_type="duplicate_modality",
                severity="warning",
                description=f"Path contains duplicate modalities",
                related_items=[str(path)],
                suggested_action="Remove cycles from the path"
            ))
    
    return paths, issues


def get_path_detail(path: ModulationPath) -> Dict:
    return {
        'path': str(path),
        'total_difficulty': path.total_difficulty,
        'steps': [
            {
                'from': str(edge.source),
                'to': str(edge.target),
                'common_tones': [n.name for n in edge.common_tones],
                'common_tone_count': edge.common_tone_count,
                'difficulty': edge.difficulty_score,
                'modulation_type': edge.modulation_type,
                'needs_confirmation': edge.needs_confirmation
            }
            for edge in path.edges
        ]
    }
