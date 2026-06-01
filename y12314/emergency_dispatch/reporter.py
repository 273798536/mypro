import json
from datetime import datetime
from typing import Dict, List
from .models import DispatchContext, ErrorType
from .dispatcher import DispatchResult


class ReportGenerator:
    def __init__(self, context: DispatchContext):
        self.context = context

    def generate_summary(self, result: DispatchResult) -> Dict:
        total_demands = len(self.context.demands)
        assigned_count = len(result.assigned_routes)
        failed_count = len([
            d for d in self.context.demands.values()
            if d.status.value == "failed"
        ])
        
        return {
            "context_id": self.context.context_id,
            "context_name": self.context.name,
            "generated_at": datetime.now().isoformat(),
            "overview": {
                "total_warehouses": len(self.context.warehouses),
                "total_roads": len(self.context.roads),
                "total_vehicles": len(self.context.vehicles),
                "total_demands": total_demands,
                "assigned_demands": assigned_count,
                "failed_demands": failed_count,
                "unassigned_demands": len(result.unassigned_demands),
                "total_distance": round(result.total_distance, 2),
                "success_rate": round(assigned_count / max(1, total_demands) * 100, 2)
            }
        }

    def generate_error_report(self) -> List[Dict]:
        error_report = []
        
        for error in self.context.errors:
            error_entry = {
                "error_id": error.error_id,
                "error_type": error.error_type.value,
                "error_type_name": self._get_error_type_name(error.error_type),
                "source_file": error.source_file,
                "location": error.location,
                "timestamp": error.timestamp.isoformat(),
                "details": error.details,
                "next_step": error.next_step,
                "severity": self._get_error_severity(error.error_type)
            }
            error_report.append(error_entry)
        
        return error_report

    def _get_error_type_name(self, error_type: ErrorType) -> str:
        names = {
            ErrorType.ROAD_BLOCKED: "道路中断",
            ErrorType.DUPLICATE_DEMAND: "需求重复",
            ErrorType.VEHICLE_OVERLOAD: "车辆超载"
        }
        return names.get(error_type, "未知错误")

    def _get_error_severity(self, error_type: ErrorType) -> str:
        severities = {
            ErrorType.ROAD_BLOCKED: "high",
            ErrorType.DUPLICATE_DEMAND: "medium",
            ErrorType.VEHICLE_OVERLOAD: "high"
        }
        return severities.get(error_type, "low")

    def generate_routes_report(self, result: DispatchResult) -> List[Dict]:
        routes_report = []
        
        for i, route in enumerate(result.assigned_routes, 1):
            route_entry = {
                "route_no": i,
                "demand_id": route["demand_id"],
                "warehouse": {
                    "id": route["warehouse_id"],
                    "name": route["warehouse_name"]
                },
                "vehicle": {
                    "id": route["vehicle_id"],
                    "plate": route["vehicle_plate"]
                },
                "path": " -> ".join(route["path"]),
                "path_locations": route["path"],
                "road_ids": route["road_ids"],
                "distance": round(route["distance"], 2),
                "items": route["items"]
            }
            routes_report.append(route_entry)
        
        return routes_report

    def generate_blocked_roads_report(self) -> List[Dict]:
        blocked_roads = []
        for road in self.context.roads.values():
            if road.status.value == "blocked":
                blocked_roads.append({
                    "road_id": road.road_id,
                    "from": road.from_location,
                    "to": road.to_location,
                    "distance": road.distance,
                    "status": road.status.value
                })
        return blocked_roads

    def generate_full_report(self, result: DispatchResult) -> Dict:
        return {
            "summary": self.generate_summary(result),
            "errors": self.generate_error_report(),
            "routes": self.generate_routes_report(result),
            "blocked_roads": self.generate_blocked_roads_report(),
            "unassigned_demands": result.unassigned_demands
        }

    def export_json(self, result: DispatchResult, filepath: str) -> None:
        report = self.generate_full_report(result)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

    def export_text(self, result: DispatchResult, filepath: str) -> None:
        report = self.generate_full_report(result)
        
        lines = []
        lines.append("=" * 60)
        lines.append("应急物资调度复盘报告")
        lines.append("=" * 60)
        lines.append(f"任务ID: {report['summary']['context_id']}")
        lines.append(f"任务名称: {report['summary']['context_name']}")
        lines.append(f"生成时间: {report['summary']['generated_at']}")
        lines.append("")
        
        lines.append("-" * 60)
        lines.append("一、概览")
        lines.append("-" * 60)
        overview = report['summary']['overview']
        lines.append(f"仓库数量: {overview['total_warehouses']}")
        lines.append(f"道路数量: {overview['total_roads']}")
        lines.append(f"车辆数量: {overview['total_vehicles']}")
        lines.append(f"需求总数: {overview['total_demands']}")
        lines.append(f"已分配: {overview['assigned_demands']}")
        lines.append(f"失败: {overview['failed_demands']}")
        lines.append(f"未分配: {overview['unassigned_demands']}")
        lines.append(f"总配送距离: {overview['total_distance']} km")
        lines.append(f"成功率: {overview['success_rate']}%")
        lines.append("")
        
        if report['blocked_roads']:
            lines.append("-" * 60)
            lines.append("二、中断道路列表")
            lines.append("-" * 60)
            for road in report['blocked_roads']:
                lines.append(f"  [{road['road_id']}] {road['from']} -> {road['to']} ({road['distance']} km)")
            lines.append("")
        
        if report['errors']:
            lines.append("-" * 60)
            lines.append("三、错误详情")
            lines.append("-" * 60)
            for i, error in enumerate(report['errors'], 1):
                lines.append(f"{i}. [{error['error_type_name']}] {error['error_id']}")
                lines.append(f"   来源文件: {error['source_file']}")
                lines.append(f"   位置: {error['location']}")
                lines.append(f"   详情: {json.dumps(error['details'], ensure_ascii=False)}")
                lines.append(f"   下一步: {error['next_step']}")
                lines.append("")
        
        if report['routes']:
            lines.append("-" * 60)
            lines.append("四、配送路线")
            lines.append("-" * 60)
            for route in report['routes']:
                lines.append(f"路线 {route['route_no']}:")
                lines.append(f"  需求ID: {route['demand_id']}")
                lines.append(f"  仓库: {route['warehouse']['name']} ({route['warehouse']['id']})")
                lines.append(f"  车辆: {route['vehicle']['plate']} ({route['vehicle']['id']})")
                lines.append(f"  路径: {route['path']}")
                lines.append(f"  距离: {route['distance']} km")
                lines.append(f"  物资: {json.dumps(route['items'], ensure_ascii=False)}")
                lines.append("")
        
        if report['unassigned_demands']:
            lines.append("-" * 60)
            lines.append("五、未分配需求")
            lines.append("-" * 60)
            for demand_id in report['unassigned_demands']:
                lines.append(f"  - {demand_id}")
            lines.append("")
        
        lines.append("=" * 60)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
