import json
from typing import Dict, Any
from .models import (
    Stop, Road, Vehicle, ScheduleInput, RoadStatus, ValidationIssue
)


class InputParser:
    def __init__(self):
        self.issues: list[ValidationIssue] = []

    def parse(self, filepath: str) -> ScheduleInput:
        self.issues = []
        with open(filepath, 'r', encoding='utf-8') as f:
            raw = json.load(f)

        school = self._parse_school(raw.get('school', {}))
        stops = self._parse_stops(raw.get('stops', []))
        roads = self._parse_roads(raw.get('roads', []))
        vehicles = self._parse_vehicles(raw.get('vehicles', []))

        schedule_input = ScheduleInput(
            school=school,
            stops=stops,
            roads=roads,
            vehicles=vehicles
        )

        return schedule_input

    def _parse_school(self, raw: Dict[str, Any]) -> Stop:
        return self._parse_stop(raw, is_school=True)

    def _parse_stops(self, raw_stops: list[Dict[str, Any]]) -> list[Stop]:
        stops = []
        for idx, raw in enumerate(raw_stops):
            try:
                stop = self._parse_stop(raw, is_school=False)
                stops.append(stop)
            except Exception as e:
                self.issues.append(ValidationIssue(
                    level="ERROR",
                    code="PARSE_STOP_ERROR",
                    message=f"解析站点失败: {e}",
                    details={"index": idx, "raw": raw}
                ))
        return stops

    def _parse_stop(self, raw: Dict[str, Any], is_school: bool = False) -> Stop:
        required_fields = ['id', 'name', 'lat', 'lng']
        for field in required_fields:
            if field not in raw:
                raise ValueError(f"缺少必填字段: {field}")

        stop_id = str(raw['id'])
        name = str(raw['name'])

        try:
            lat = float(raw['lat'])
            lng = float(raw['lng'])
        except (ValueError, TypeError) as e:
            raise ValueError(f"坐标格式错误: {e}")

        student_count = int(raw.get('student_count', 0)) if not is_school else 0

        return Stop(
            stop_id=stop_id,
            name=name,
            lat=lat,
            lng=lng,
            student_count=student_count
        )

    def _parse_roads(self, raw_roads: list[Dict[str, Any]]) -> list[Road]:
        roads = []
        for idx, raw in enumerate(raw_roads):
            try:
                road = self._parse_road(raw)
                roads.append(road)
            except Exception as e:
                self.issues.append(ValidationIssue(
                    level="ERROR",
                    code="PARSE_ROAD_ERROR",
                    message=f"解析道路失败: {e}",
                    details={"index": idx, "raw": raw}
                ))
        return roads

    def _parse_road(self, raw: Dict[str, Any]) -> Road:
        required_fields = ['id', 'from', 'to', 'duration_minutes']
        for field in required_fields:
            if field not in raw:
                raise ValueError(f"缺少必填字段: {field}")

        status_str = raw.get('status', 'open').lower()
        try:
            status = RoadStatus(status_str)
        except ValueError:
            self.issues.append(ValidationIssue(
                level="WARNING",
                code="INVALID_ROAD_STATUS",
                message=f"无效的道路状态: {status_str}, 默认为开放",
                details={"road_id": raw.get('id')}
            ))
            status = RoadStatus.OPEN

        return Road(
            road_id=str(raw['id']),
            from_stop_id=str(raw['from']),
            to_stop_id=str(raw['to']),
            duration_minutes=float(raw['duration_minutes']),
            status=status,
            note=raw.get('note', '')
        )

    def _parse_vehicles(self, raw_vehicles: list[Dict[str, Any]]) -> list[Vehicle]:
        vehicles = []
        for idx, raw in enumerate(raw_vehicles):
            try:
                vehicle = self._parse_vehicle(raw)
                vehicles.append(vehicle)
            except Exception as e:
                self.issues.append(ValidationIssue(
                    level="ERROR",
                    code="PARSE_VEHICLE_ERROR",
                    message=f"解析车辆失败: {e}",
                    details={"index": idx, "raw": raw}
                ))
        return vehicles

    def _parse_vehicle(self, raw: Dict[str, Any]) -> Vehicle:
        required_fields = ['id', 'capacity']
        for field in required_fields:
            if field not in raw:
                raise ValueError(f"缺少必填字段: {field}")

        try:
            capacity = int(raw['capacity'])
        except (ValueError, TypeError) as e:
            raise ValueError(f"容量格式错误: {e}")

        if capacity <= 0:
            self.issues.append(ValidationIssue(
                level="WARNING",
                code="INVALID_VEHICLE_CAPACITY",
                message=f"车辆容量必须大于0, 当前值: {capacity}",
                details={"vehicle_id": raw.get('id')}
            ))

        return Vehicle(
            vehicle_id=str(raw['id']),
            capacity=capacity,
            description=raw.get('description', '')
        )
