import folium
from folium import plugins
import pandas as pd
from shapely.geometry import Polygon
from typing import Dict, List
import math
from datetime import datetime


class MapVisualizer:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        self.colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
            '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
        ]

    def create_coverage_map(self, communities: pd.DataFrame, 
                            warehouses: pd.DataFrame, 
                            coverage_results: Dict,
                            filename: str = None) -> str:
        if filename is None:
            filename = f"coverage_map_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        center_lng = communities['lng'].mean()
        center_lat = communities['lat'].mean()
        
        m = folium.Map(
            location=[center_lat, center_lng],
            zoom_start=13,
            tiles='CartoDB positron'
        )
        
        plugins.Fullscreen().add_to(m)
        plugins.MeasureControl(position='topleft').add_to(m)
        
        individual_coverages = coverage_results.get('individual_coverage', [])
        for idx, coverage in enumerate(individual_coverages):
            color = self.colors[idx % len(self.colors)]
            self._add_warehouse_coverage(m, coverage, color)
        
        self._add_communities_layer(m, communities, coverage_results)
        
        legend_html = self._generate_legend(len(individual_coverages))
        m.get_root().html.add_child(folium.Element(legend_html))
        
        filepath = f"{self.output_dir}/{filename}"
        m.save(filepath)
        
        return filepath

    def _add_warehouse_coverage(self, m: folium.Map, coverage, color: str):
        center_lat, center_lng = coverage.center[1], coverage.center[0]
        
        folium.Circle(
            location=[center_lat, center_lng],
            radius=coverage.radius_km * 1000,
            color=color,
            weight=2,
            fill=True,
            fill_opacity=0.1,
            popup=f"{coverage.warehouse_name} - 服务半径({coverage.radius_km}km)"
        ).add_to(m)
        
        hull = coverage.convex_hull
        if hull and hasattr(hull, 'exterior'):
            hull_coords = [(lat, lng) for lng, lat in hull.exterior.coords]
            folium.Polygon(
                locations=hull_coords,
                color=color,
                weight=3,
                fill=True,
                fill_opacity=0.2,
                popup=f"{coverage.warehouse_name} - 凸包覆盖<br>覆盖小区: {coverage.total_communities_count}个<br>覆盖人口: {coverage.covered_population}人"
            ).add_to(m)
        
        folium.Marker(
            location=[center_lat, center_lng],
            icon=folium.Icon(color='red', icon='warehouse', prefix='fa'),
            popup=folium.Popup(
                f"<b>{coverage.warehouse_name}</b><br>"
                f"ID: {coverage.warehouse_id}<br>"
                f"服务半径: {coverage.radius_km}km<br>"
                f"覆盖小区: {coverage.total_communities_count}个<br>"
                f"覆盖人口: {coverage.covered_population}人",
                max_width=300
            )
        ).add_to(m)

    def _add_communities_layer(self, m: folium.Map, communities: pd.DataFrame, 
                                coverage_results: Dict):
        covered_ids = set()
        for coverage in coverage_results.get('individual_coverage', []):
            for comm in coverage.covered_communities:
                covered_ids.add(comm['id'])
        
        community_group = folium.FeatureGroup(name="小区分布")
        
        for _, comm in communities.iterrows():
            is_covered = comm['id'] in covered_ids
            color = 'green' if is_covered else 'orange'
            icon = 'home'
            
            pop_content = f"""
            <b>{comm['name']}</b><br>
            ID: {comm['id']}<br>
            人口: {comm.get('population', 'N/A')}<br>
            状态: {'已覆盖' if is_covered else '未覆盖'}
            """
            
            folium.CircleMarker(
                location=[comm['lat'], comm['lng']],
                radius=8,
                color=color,
                fill=True,
                fill_opacity=0.8,
                popup=folium.Popup(pop_content, max_width=250)
            ).add_to(community_group)
        
        community_group.add_to(m)
        folium.LayerControl().add_to(m)

    def _generate_legend(self, warehouse_count: int) -> str:
        color_items = []
        for i in range(min(warehouse_count, len(self.colors))):
            color_items.append(f"""
                <div style="display: flex; align-items: center; margin: 4px 0;">
                    <div style="width: 20px; height: 15px; background: {self.colors[i]}; 
                         opacity: 0.5; border: 2px solid {self.colors[i]}; margin-right: 8px;"></div>
                    <span>仓库 #{i+1} 覆盖范围</span>
                </div>
            """)
        
        legend_html = f'''
        <div style="position: fixed; bottom: 50px; left: 50px; 
                    background: white; padding: 15px; border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1000;
                    font-family: Arial, sans-serif; font-size: 12px;">
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">图例</div>
            {''.join(color_items)}
            <div style="display: flex; align-items: center; margin: 4px 0;">
                <div style="width: 16px; height: 16px; background: green; 
                     border-radius: 50%; margin-right: 8px;"></div>
                <span>已覆盖小区</span>
            </div>
            <div style="display: flex; align-items: center; margin: 4px 0;">
                <div style="width: 16px; height: 16px; background: orange; 
                     border-radius: 50%; margin-right: 8px;"></div>
                <span>未覆盖小区</span>
            </div>
            <div style="display: flex; align-items: center; margin: 4px 0;">
                <div style="width: 16px; height: 16px; background: red; 
                     margin-right: 8px; display: flex; align-items: center; 
                     justify-content: center; color: white; font-size: 10px;">📍</div>
                <span>仓库位置</span>
            </div>
        </div>
        '''
        return legend_html

    def create_comparison_map(self, communities: pd.DataFrame,
                               warehouse_options: List[Dict],
                               filename: str = None) -> str:
        if filename is None:
            filename = f"comparison_map_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        center_lng = communities['lng'].mean()
        center_lat = communities['lat'].mean()
        
        m = folium.Map(
            location=[center_lat, center_lng],
            zoom_start=13,
            tiles='CartoDB positron'
        )
        
        for idx, option in enumerate(warehouse_options):
            color = self.colors[idx % len(self.colors)]
            layer = folium.FeatureGroup(name=f"方案 {idx+1}: {option['name']}")
            
            folium.Circle(
                location=[option['lat'], option['lng']],
                radius=option['radius_km'] * 1000,
                color=color,
                weight=2,
                fill=True,
                fill_opacity=0.15,
                popup=f"{option['name']} - {option['radius_km']}km半径"
            ).add_to(layer)
            
            folium.Marker(
                location=[option['lat'], option['lng']],
                icon=folium.Icon(color='red', icon='info-sign'),
                popup=f"{option['name']}<br>覆盖人口: {option.get('covered_population', 0)}人"
            ).add_to(layer)
            
            layer.add_to(m)
        
        comm_layer = folium.FeatureGroup(name="小区分布")
        for _, comm in communities.iterrows():
            folium.CircleMarker(
                location=[comm['lat'], comm['lng']],
                radius=6,
                color='blue',
                fill=True,
                fill_opacity=0.7,
                popup=f"{comm['name']}<br>人口: {comm.get('population', 'N/A')}"
            ).add_to(comm_layer)
        comm_layer.add_to(m)
        
        folium.LayerControl(collapsed=False).add_to(m)
        
        filepath = f"{self.output_dir}/{filename}"
        m.save(filepath)
        
        return filepath
