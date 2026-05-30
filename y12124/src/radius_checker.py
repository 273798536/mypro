import pandas as pd
import math
from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum


class RadiusIssueType(Enum):
    OVER_RADIUS = "超出服务半径"
    NEAR_BOUNDARY = "接近边界"
    ROAD_BLOCK = "疑似道路隔断"


@dataclass
class RadiusIssue:
    community_id: str
    community_name: str
    warehouse_id: str
    warehouse_name: str
    issue_type: RadiusIssueType
    distance_km: float
    radius_km: float
    overage_km: float
    human_reason: str
    record_link: str


class RadiusChecker:
    def __init__(self, boundary_warning_ratio: float = 0.9):
        self.boundary_warning_ratio = boundary_warning_ratio

    def haversine_distance_km(self, lng1: float, lat1: float, 
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

    def check_radius_violations(self, communities: pd.DataFrame, 
                                warehouses: pd.DataFrame) -> Dict:
        results = {
            'over_radius': [],
            'near_boundary': [],
            'summary': {}
        }
        
        for _, warehouse in warehouses.iterrows():
            warehouse_id = warehouse['id']
            warehouse_name = warehouse['name']
            radius_km = warehouse.get('radius_km', 3.0)
            warning_radius = radius_km * self.boundary_warning_ratio
            
            for _, community in communities.iterrows():
                distance = self.haversine_distance_km(
                    warehouse['lng'], warehouse['lat'],
                    community['lng'], community['lat']
                )
                
                record_link = f"小区[{community['id']}] - 仓库[{warehouse_id}]"
                
                if distance > radius_km:
                    overage = round(distance - radius_km, 2)
                    reason = (
                        f"「{community['name']}」到「{warehouse_name}」的直线距离是{distance:.2f}公里，"
                        f"超出了{radius_km}公里的服务半径，超了{overage}公里。"
                        f"\n\n【为什么要关注？】"
                        f"\n超出服务半径意味着这个小区不在预设的配送范围内。"
                        f"如果强行纳入，配送时间会延长、成本会增加，"
                        f"还可能影响对其他小区的服务质量。"
                    )
                    
                    results['over_radius'].append(RadiusIssue(
                        community_id=community['id'],
                        community_name=community['name'],
                        warehouse_id=warehouse_id,
                        warehouse_name=warehouse_name,
                        issue_type=RadiusIssueType.OVER_RADIUS,
                        distance_km=round(distance, 2),
                        radius_km=radius_km,
                        overage_km=overage,
                        human_reason=reason,
                        record_link=record_link
                    ))
                
                elif distance >= warning_radius:
                    reason = (
                        f"「{community['name']}」到「{warehouse_name}」的距离是{distance:.2f}公里，"
                        f"已经很接近{radius_km}公里的服务边界了（达到{distance/radius_km*100:.0f}%）。"
                        f"\n\n【为什么要关注？】"
                        f"\n虽然还在半径内，但如果实际道路不是直线，"
                        f"或者遇到修路、堵车，很可能就超出承诺的配送时间了。"
                    )
                    
                    results['near_boundary'].append(RadiusIssue(
                        community_id=community['id'],
                        community_name=community['name'],
                        warehouse_id=warehouse_id,
                        warehouse_name=warehouse_name,
                        issue_type=RadiusIssueType.NEAR_BOUNDARY,
                        distance_km=round(distance, 2),
                        radius_km=radius_km,
                        overage_km=0,
                        human_reason=reason,
                        record_link=record_link
                    ))
        
        results['summary'] = {
            'total_checked_pairs': len(warehouses) * len(communities),
            'over_radius_count': len(results['over_radius']),
            'near_boundary_count': len(results['near_boundary']),
            'affected_communities': len(set(c.community_id for c in results['over_radius'])),
            'affected_warehouses': len(set(c.warehouse_id for c in results['over_radius']))
        }
        
        return results

    def format_radius_report(self, radius_issues: Dict) -> str:
        report_parts = []
        
        report_parts.append("# 半径越界检测报告\n")
        
        summary = radius_issues['summary']
        report_parts.append("## 检测概览")
        report_parts.append(f"- 检查的仓-区配对数：{summary['total_checked_pairs']} 对")
        report_parts.append(f"- 超出服务半径：{summary['over_radius_count']} 对")
        report_parts.append(f"- 接近边界需关注：{summary['near_boundary_count']} 对")
        report_parts.append(f"- 受影响的小区数：{summary['affected_communities']} 个")
        report_parts.append(f"- 受影响的仓库候选：{summary['affected_warehouses']} 个")
        report_parts.append("")
        
        if radius_issues['over_radius']:
            report_parts.append("## 一、超出服务半径（必须处理）")
            for i, issue in enumerate(radius_issues['over_radius'], 1):
                report_parts.append(f"\n### 问题 #{i} - {issue.record_link}")
                report_parts.append(f"\n**问题说明：**")
                report_parts.append(issue.human_reason)
                report_parts.append(f"\n**数据记录：**")
                report_parts.append(f"- 距离：{issue.distance_km} 公里（服务半径：{issue.radius_km} 公里）")
                report_parts.append(f"- 超出：{issue.overage_km} 公里")
                report_parts.append(f"\n**处理建议：**")
                report_parts.append("1. 如果这个小区很重要，考虑：")
                report_parts.append("   - 扩大该仓库的服务半径")
                report_parts.append("   - 或者换一个更近的仓库候选点")
                report_parts.append("2. 如果这个小区不重要，可以暂时排除，后续再考虑设新仓")
                report_parts.append("---")
        
        if radius_issues['near_boundary']:
            report_parts.append("\n## 二、接近服务边界（建议关注）")
            for i, issue in enumerate(radius_issues['near_boundary'], 1):
                report_parts.append(f"\n### 关注点 #{i} - {issue.record_link}")
                report_parts.append(f"\n**情况说明：**")
                report_parts.append(issue.human_reason)
                report_parts.append(f"\n**数据记录：**")
                report_parts.append(f"- 距离：{issue.distance_km} 公里（服务半径：{issue.radius_km} 公里）")
                report_parts.append(f"- 已达半径的：{issue.distance_km/issue.radius_km*100:.0f}%")
                report_parts.append(f"\n**建议：**")
                report_parts.append("建议实地考察一下实际路况，看是否需要调整配送路线或设备用方案。")
                report_parts.append("---")
        
        return "\n".join(report_parts)
