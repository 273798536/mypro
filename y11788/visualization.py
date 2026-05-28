import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.patches as mpatches
from matplotlib.lines import Line2D
import numpy as np
from typing import List, Dict, Optional, Tuple
import os
import platform
from config import system_config
from models import Waypoint, Route, NoFlyZone, WindCondition, AnomalySeverity
from geo_utils import haversine_distance

def _setup_cjk_font():
    cjk_candidates = [
        'PingFang SC', 'Heiti SC', 'STHeiti', 'SimHei', 'WenQuanYi Micro Hei',
        'Noto Sans CJK SC', 'Arial Unicode MS', 'Hiragino Sans GB'
    ]
    available = {f.name for f in fm.fontManager.ttflist}
    for candidate in cjk_candidates:
        if candidate in available:
            plt.rcParams['font.sans-serif'] = [candidate, 'DejaVu Sans']
            plt.rcParams['axes.unicode_minus'] = False
            return
    plt.rcParams['axes.unicode_minus'] = False

_setup_cjk_font()

class RouteVisualizer:
    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir or system_config.OUTPUT_DIR
        os.makedirs(self.output_dir, exist_ok=True)
    
    def plot_routes_comparison(
        self,
        routes: List[Route],
        waypoints: List[Waypoint],
        filename: str = "routes_comparison.png"
    ) -> str:
        if not routes:
            return ""
        
        fig, axes = plt.subplots(1, 3, figsize=(18, 5))
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        
        colors = plt.cm.Set2(np.linspace(0, 1, len(routes)))
        
        energies = [r.total_energy_wh for r in routes]
        distances = [r.total_distance_m / 1000 for r in routes]
        times = [r.total_flight_time_s / 60 for r in routes]
        route_labels = [f"路线{i+1}" for i in range(len(routes))]
        
        axes[0].bar(route_labels, energies, color=colors, alpha=0.7)
        axes[0].set_title('能耗对比 (Wh)')
        axes[0].set_ylabel('总能耗 (Wh)')
        axes[0].tick_params(axis='x', rotation=45)
        for i, v in enumerate(energies):
            axes[0].text(i, v + max(energies)*0.01, f'{v:.1f}', ha='center')
        
        axes[1].bar(route_labels, distances, color=colors, alpha=0.7)
        axes[1].set_title('距离对比 (km)')
        axes[1].set_ylabel('总距离 (km)')
        axes[1].tick_params(axis='x', rotation=45)
        for i, v in enumerate(distances):
            axes[1].text(i, v + max(distances)*0.01, f'{v:.2f}', ha='center')
        
        axes[2].bar(route_labels, times, color=colors, alpha=0.7)
        axes[2].set_title('飞行时间对比 (min)')
        axes[2].set_ylabel('总时间 (分钟)')
        axes[2].tick_params(axis='x', rotation=45)
        for i, v in enumerate(times):
            axes[2].text(i, v + max(times)*0.01, f'{v:.1f}', ha='center')
        
        plt.tight_layout()
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        
        return filepath
    
    def plot_route_map(
        self,
        route: Route,
        waypoints: List[Waypoint],
        no_fly_zones: List[NoFlyZone],
        wind_conditions: List[WindCondition] = None,
        filename: str = "route_map.png"
    ) -> str:
        fig, ax = plt.subplots(figsize=(12, 10))
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        
        lats = [wp.latitude for wp in waypoints]
        lons = [wp.longitude for wp in waypoints]
        margin_lat = (max(lats) - min(lats)) * 0.2 if lats else 0.01
        margin_lon = (max(lons) - min(lons)) * 0.2 if lons else 0.01
        
        for zone in no_fly_zones:
            poly_lons = [coord[1] for coord in zone.polygon_coordinates]
            poly_lats = [coord[0] for coord in zone.polygon_coordinates]
            ax.fill(poly_lons, poly_lats, color='red', alpha=0.3, label='禁飞区')
            ax.plot(poly_lons + [poly_lons[0]], poly_lats + [poly_lats[0]], 'r--', linewidth=2)
        
        route_lons = []
        route_lats = []
        for wp_id in route.waypoint_order:
            wp = wp_map.get(wp_id)
            if wp:
                route_lons.append(wp.longitude)
                route_lats.append(wp.latitude)
        
        if route.is_valid:
            line_color = 'green'
            line_label = '最优航线'
        else:
            line_color = 'orange'
            line_label = '航线(有异常)'
        
        ax.plot(route_lons, route_lats, color=line_color, linewidth=3, 
                linestyle='-', marker='o', markersize=8, label=line_label)
        
        for i, wp_id in enumerate(route.waypoint_order):
            wp = wp_map.get(wp_id)
            if wp:
                ax.annotate(f"{i+1}. {wp.name}", 
                           (wp.longitude, wp.latitude),
                           xytext=(5, 5), textcoords='offset points',
                           fontsize=9, fontweight='bold')
        
        if wind_conditions:
            wind = wind_conditions[0]
            wind_rad = np.radians(wind.direction_deg)
            center_lon = np.mean(lons) if lons else 0
            center_lat = np.mean(lats) if lats else 0
            
            dx = wind.speed_m_s * 0.001 * np.sin(wind_rad)
            dy = wind.speed_m_s * 0.001 * np.cos(wind_rad)
            ax.arrow(center_lon, center_lat, dx, dy,
                    head_width=0.005, head_length=0.008,
                    fc='blue', ec='blue', alpha=0.7, label='风向')
        
        ax.set_xlabel('经度')
        ax.set_ylabel('纬度')
        ax.set_title(f'航线规划图 - 总能耗: {route.total_energy_wh:.1f} Wh')
        ax.legend(loc='best')
        ax.grid(True, alpha=0.3)
        
        if lats and lons:
            ax.set_xlim(min(lons) - margin_lon, max(lons) + margin_lon)
            ax.set_ylim(min(lats) - margin_lat, max(lats) + margin_lat)
        
        plt.tight_layout()
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        
        return filepath
    
    def plot_energy_profile(
        self,
        route: Route,
        waypoints: List[Waypoint],
        filename: str = "energy_profile.png"
    ) -> str:
        if not route.segments:
            return ""
        
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        segment_indices = range(len(route.segments))
        segment_labels = []
        for seg in route.segments:
            start_wp = wp_map.get(seg.start_waypoint_id)
            end_wp = wp_map.get(seg.end_waypoint_id)
            segment_labels.append(f"{start_wp.name if start_wp else '?'}->{end_wp.name if end_wp else '?'}")
        
        energies = [seg.energy_used_wh for seg in route.segments]
        axes[0, 0].bar(segment_indices, energies, color='steelblue', alpha=0.7)
        axes[0, 0].set_title('各航段能耗 (Wh)')
        axes[0, 0].set_ylabel('能耗 (Wh)')
        axes[0, 0].set_xticks(segment_indices)
        axes[0, 0].set_xticklabels(segment_labels, rotation=45, ha='right')
        
        headwinds = [seg.wind_component_m_s for seg in route.segments]
        colors = ['red' if hw > 0 else 'green' for hw in headwinds]
        axes[0, 1].bar(segment_indices, headwinds, color=colors, alpha=0.7)
        axes[0, 1].axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        axes[0, 1].set_title('逆风分量 (m/s) - 正=逆风,负=顺风')
        axes[0, 1].set_ylabel('逆风分量 (m/s)')
        axes[0, 1].set_xticks(segment_indices)
        axes[0, 1].set_xticklabels(segment_labels, rotation=45, ha='right')
        
        distances = [seg.distance_m for seg in route.segments]
        axes[1, 0].bar(segment_indices, distances, color='lightgreen', alpha=0.7)
        axes[1, 0].set_title('各航段距离 (m)')
        axes[1, 0].set_ylabel('距离 (m)')
        axes[1, 0].set_xticks(segment_indices)
        axes[1, 0].set_xticklabels(segment_labels, rotation=45, ha='right')
        
        cumulative_energy = np.cumsum(energies)
        axes[1, 1].plot(segment_indices, cumulative_energy, 'b-o', linewidth=2, markersize=6)
        axes[1, 1].set_title('累积能耗曲线')
        axes[1, 1].set_xlabel('航段')
        axes[1, 1].set_ylabel('累积能耗 (Wh)')
        axes[1, 1].set_xticks(segment_indices)
        axes[1, 1].set_xticklabels(segment_labels, rotation=45, ha='right')
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        
        return filepath
    
    def plot_anomaly_summary(
        self,
        all_anomalies: List,
        filename: str = "anomaly_summary.png"
    ) -> str:
        if not all_anomalies:
            return ""
        
        from collections import Counter
        
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        anomaly_types = [a.anomaly_type.value for a in all_anomalies]
        type_counts = Counter(anomaly_types)
        
        axes[0].bar(type_counts.keys(), type_counts.values(), color='coral', alpha=0.7)
        axes[0].set_title('异常类型分布')
        axes[0].set_ylabel('数量')
        axes[0].tick_params(axis='x', rotation=45)
        
        severities = [a.severity.value for a in all_anomalies]
        severity_counts = Counter(severities)
        severity_colors = {'critical': 'red', 'warning': 'orange', 'info': 'blue'}
        colors = [severity_colors.get(s, 'gray') for s in severity_counts.keys()]
        
        axes[1].bar(severity_counts.keys(), severity_counts.values(), color=colors, alpha=0.7)
        axes[1].set_title('异常严重程度分布')
        axes[1].set_ylabel('数量')
        
        plt.tight_layout()
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        
        return filepath
    
    def generate_all_charts(
        self,
        optimal_route: Route,
        candidate_routes: List[Route],
        waypoints: List[Waypoint],
        no_fly_zones: List[NoFlyZone],
        wind_conditions: List[WindCondition],
        all_anomalies: List
    ) -> Dict[str, str]:
        chart_files = {}
        
        chart_files['comparison'] = self.plot_routes_comparison(
            candidate_routes[:5], waypoints, "routes_comparison.png"
        )
        
        chart_files['route_map'] = self.plot_route_map(
            optimal_route, waypoints, no_fly_zones, wind_conditions, "optimal_route_map.png"
        )
        
        chart_files['energy_profile'] = self.plot_energy_profile(
            optimal_route, waypoints, "energy_profile.png"
        )
        
        if all_anomalies:
            chart_files['anomalies'] = self.plot_anomaly_summary(
                all_anomalies, "anomaly_summary.png"
            )
        
        return chart_files
