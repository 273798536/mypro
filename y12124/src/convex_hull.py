import pandas as pd
import numpy as np
from shapely.geometry import Point, Polygon, MultiPoint
from shapely.ops import unary_union
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import math


@dataclass
class CoverageResult:
    warehouse_id: str
    warehouse_name: str
    center: Tuple[float, float]
    radius_km: float
    convex_hull: Polygon
    hull_area_km2: float
    covered_communities: List[Dict]
    covered_population: int
    total_communities_count: int


class ConvexHullAnalyzer:
    def __init__(self):
        pass

    def _haversine_distance_km(self, lng1: float, lat1: float, 
                                lng2: float, lat2: float) -> float:
        R = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)
        
        a = math.sin(delta_phi / 2) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def _generate_circle_points(self, center_lng: float, center_lat: float, 
                                 radius_km: float, num_points: int = 64) -> List[Tuple[float, float]]:
        points = []
        for i in range(num_points):
            angle = 2 * math.pi * i / num_points
            lat_offset = (radius_km / 6371.0) * math.cos(angle) * (180 / math.pi)
            lng_offset = (radius_km / (6371.0 * math.cos(math.radians(center_lat)))) * math.sin(angle) * (180 / math.pi)
            points.append((center_lng + lng_offset, center_lat + lat_offset))
        return points

    def compute_convex_hull(self, communities: pd.DataFrame, 
                            warehouse: pd.Series) -> CoverageResult:
        center_lng = warehouse['lng']
        center_lat = warehouse['lat']
        radius_km = warehouse.get('radius_km', 3.0)
        
        covered_communities = []
        for _, comm in communities.iterrows():
            dist = self._haversine_distance_km(
                center_lng, center_lat, comm['lng'], comm['lat']
            )
            if dist <= radius_km:
                covered_communities.append({
                    'id': comm['id'],
                    'name': comm['name'],
                    'lng': comm['lng'],
                    'lat': comm['lat'],
                    'distance_km': round(dist, 2),
                    'population': comm.get('population', 0)
                })
        
        if len(covered_communities) < 3:
            circle_points = self._generate_circle_points(center_lng, center_lat, radius_km)
            hull_polygon = Polygon(circle_points)
        else:
            points = [(c['lng'], c['lat']) for c in covered_communities]
            points.append((center_lng, center_lat))
            multi_point = MultiPoint(points)
            hull_polygon = multi_point.convex_hull
        
        covered_population = sum(c['population'] for c in covered_communities)
        
        return CoverageResult(
            warehouse_id=warehouse['id'],
            warehouse_name=warehouse['name'],
            center=(center_lng, center_lat),
            radius_km=radius_km,
            convex_hull=hull_polygon,
            hull_area_km2=round(self._polygon_area_km2(hull_polygon, center_lat), 3),
            covered_communities=covered_communities,
            covered_population=covered_population,
            total_communities_count=len(covered_communities)
        )

    def _polygon_area_km2(self, polygon: Polygon, reference_lat: float) -> float:
        coords = list(polygon.exterior.coords)
        if len(coords) < 3:
            return 0.0
        
        total_area = 0.0
        for i in range(len(coords) - 1):
            lng1, lat1 = coords[i]
            lng2, lat2 = coords[i + 1]
            lng3, lat3 = coords[0]
            
            x1 = lng1 * 111.32 * math.cos(math.radians(reference_lat))
            y1 = lat1 * 111.32
            x2 = lng2 * 111.32 * math.cos(math.radians(reference_lat))
            y2 = lat2 * 111.32
            x3 = lng3 * 111.32 * math.cos(math.radians(reference_lat))
            y3 = lat3 * 111.32
            
            area = 0.5 * abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
            total_area += area
        
        return total_area / (len(coords) - 2) if len(coords) > 3 else total_area

    def analyze_all_warehouses(self, communities: pd.DataFrame, 
                                warehouses: pd.DataFrame) -> Dict:
        results = {
            'individual_coverage': [],
            'combined_hull': None,
            'overall_coverage': {},
            'uncovered_communities': []
        }
        
        all_covered_ids = set()
        
        for _, warehouse in warehouses.iterrows():
            coverage = self.compute_convex_hull(communities, warehouse)
            results['individual_coverage'].append(coverage)
            
            for comm in coverage.covered_communities:
                all_covered_ids.add(comm['id'])
        
        all_hulls = [cov.convex_hull for cov in results['individual_coverage']]
        if all_hulls:
            combined_hull = unary_union(all_hulls)
            if hasattr(combined_hull, 'convex_hull'):
                results['combined_hull'] = combined_hull.convex_hull
            else:
                results['combined_hull'] = combined_hull
        
        covered_pop = sum(
            comm.get('population', 0) 
            for _, comm in communities.iterrows() 
            if comm['id'] in all_covered_ids
        )
        
        results['overall_coverage'] = {
            'total_communities': len(communities),
            'covered_communities': len(all_covered_ids),
            'coverage_rate': round(len(all_covered_ids) / len(communities) * 100, 1),
            'total_population': communities.get('population', pd.Series([0])).sum(),
            'covered_population': covered_pop,
            'population_coverage_rate': round(
                covered_pop / communities.get('population', pd.Series([1])).sum() * 100, 1
            ) if communities.get('population', pd.Series([0])).sum() > 0 else 0
        }
        
        results['uncovered_communities'] = [
            {
                'id': comm['id'],
                'name': comm['name'],
                'lng': comm['lng'],
                'lat': comm['lat']
            }
            for _, comm in communities.iterrows()
            if comm['id'] not in all_covered_ids
        ]
        
        return results

    def compare_warehouse_candidates(self, communities: pd.DataFrame, 
                                     warehouses: pd.DataFrame) -> pd.DataFrame:
        comparison_data = []
        
        for _, warehouse in warehouses.iterrows():
            coverage = self.compute_convex_hull(communities, warehouse)
            
            comparison_data.append({
                '仓库ID': warehouse['id'],
                '仓库名称': warehouse['name'],
                '服务半径(km)': coverage.radius_km,
                '覆盖小区数': coverage.total_communities_count,
                '覆盖人口': coverage.covered_population,
                '凸包面积(km²)': coverage.hull_area_km2,
                '覆盖效率(人/km²)': round(
                    coverage.covered_population / coverage.hull_area_km2 
                    if coverage.hull_area_km2 > 0 else 0, 1
                )
            })
        
        return pd.DataFrame(comparison_data).sort_values('覆盖人口', ascending=False)
