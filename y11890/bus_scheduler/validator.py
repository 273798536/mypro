from collections import defaultdict, deque
from typing import Dict, Set, List
from .models import (
    ScheduleInput, ValidationIssue, Stop, Road, RoadStatus
)


class DataValidator:
    def __init__(self, schedule_input: ScheduleInput):
        self.input = schedule_input
        self.issues: List[ValidationIssue] = []

    def validate(self) -> List[ValidationIssue]:
        self.issues = []

        self._validate_duplicate_stops()
        self._validate_coordinates()
        self._validate_student_counts()
        self._validate_road_references()
        self._validate_road_durations()
        self._validate_closed_roads()
        self._validate_vehicle_capacities()
        self._validate_isolated_stops()
        self._validate_reachability()
        self._validate_capacity_sufficiency()

        return self.issues

    def _add_issue(self, level: str, code: str, message: str, **details):
        self.issues.append(ValidationIssue(
            level=level,
            code=code,
            message=message,
            details=details
        ))

    def _validate_duplicate_stops(self):
        id_counts: Dict[str, int] = defaultdict(int)
        name_counts: Dict[str, int] = defaultdict(int)
        coord_map: Dict[tuple, List[str]] = defaultdict(list)

        all_stops = [self.input.school] + self.input.stops

        for stop in all_stops:
            id_counts[stop.stop_id] += 1
            name_counts[stop.name] += 1
            coord_key = (round(stop.lat, 6), round(stop.lng, 6))
            coord_map[coord_key].append(f"{stop.name}({stop.stop_id})")

        for stop_id, count in id_counts.items():
            if count > 1:
                self._add_issue(
                    "ERROR",
                    "DUPLICATE_STOP_ID",
                    f"站点ID重复: {stop_id} 出现了 {count} 次",
                    stop_id=stop_id,
                    count=count
                )

        for name, count in name_counts.items():
            if count > 1:
                self._add_issue(
                    "WARNING",
                    "DUPLICATE_STOP_NAME",
                    f"站点名称重复: '{name}' 出现了 {count} 次",
                    stop_name=name,
                    count=count
                )

        for coord, stop_names in coord_map.items():
            if len(stop_names) > 1:
                self._add_issue(
                    "WARNING",
                    "IDENTICAL_COORDINATES",
                    f"多个站点坐标完全相同: {', '.join(stop_names)}",
                    coordinates=str(coord),
                    stops=stop_names
                )

    def _validate_coordinates(self):
        all_stops = [self.input.school] + self.input.stops

        for stop in all_stops:
            issues = []

            if stop.lat < -90 or stop.lat > 90:
                issues.append(f"纬度超出有效范围(-90到90): {stop.lat}")

            if stop.lng < -180 or stop.lng > 180:
                issues.append(f"经度超出有效范围(-180到180): {stop.lng}")

            if stop.lat == 0 and stop.lng == 0:
                issues.append("坐标为(0,0)，可能是未填写的默认值")

            if abs(stop.lat) < 0.001 and abs(stop.lng) < 0.001:
                issues.append("坐标接近(0,0)，可能是测试数据或错误输入")

            if issues:
                self._add_issue(
                    "ERROR",
                    "INVALID_COORDINATE",
                    f"站点'{stop.name}'({stop.stop_id})坐标无效: {'; '.join(issues)}",
                    stop_id=stop.stop_id,
                    stop_name=stop.name,
                    lat=stop.lat,
                    lng=stop.lng,
                    reasons=issues
                )

    def _validate_student_counts(self):
        for stop in self.input.stops:
            if stop.student_count < 0:
                self._add_issue(
                    "ERROR",
                    "NEGATIVE_STUDENT_COUNT",
                    f"站点'{stop.name}'({stop.stop_id})学生人数为负数: {stop.student_count}",
                    stop_id=stop.stop_id,
                    student_count=stop.student_count
                )
            elif stop.student_count == 0:
                self._add_issue(
                    "WARNING",
                    "ZERO_STUDENT_COUNT",
                    f"站点'{stop.name}'({stop.stop_id})学生人数为0",
                    stop_id=stop.stop_id
                )

    def _validate_road_references(self):
        valid_stop_ids = {s.stop_id for s in [self.input.school] + self.input.stops}

        for road in self.input.roads:
            if road.from_stop_id not in valid_stop_ids:
                self._add_issue(
                    "ERROR",
                    "ROAD_FROM_INVALID_STOP",
                    f"道路'{road.road_id}'的起点站点不存在: {road.from_stop_id}",
                    road_id=road.road_id,
                    from_stop_id=road.from_stop_id
                )
            if road.to_stop_id not in valid_stop_ids:
                self._add_issue(
                    "ERROR",
                    "ROAD_TO_INVALID_STOP",
                    f"道路'{road.road_id}'的终点站点不存在: {road.to_stop_id}",
                    road_id=road.road_id,
                    to_stop_id=road.to_stop_id
                )
            if road.from_stop_id == road.to_stop_id:
                self._add_issue(
                    "ERROR",
                    "ROAD_SAME_START_END",
                    f"道路'{road.road_id}'的起点和终点相同: {road.from_stop_id}",
                    road_id=road.road_id,
                    stop_id=road.from_stop_id
                )

    def _validate_road_durations(self):
        for road in self.input.roads:
            if road.duration_minutes <= 0:
                self._add_issue(
                    "ERROR",
                    "INVALID_ROAD_DURATION",
                    f"道路'{road.road_id}'的时长无效: {road.duration_minutes}分钟，必须大于0",
                    road_id=road.road_id,
                    duration=road.duration_minutes
                )
            elif road.duration_minutes > 180:
                self._add_issue(
                    "WARNING",
                    "EXCESSIVE_ROAD_DURATION",
                    f"道路'{road.road_id}'时长超过3小时: {road.duration_minutes}分钟，请确认是否正确",
                    road_id=road.road_id,
                    duration=road.duration_minutes
                )

    def _validate_closed_roads(self):
        closed_roads = [r for r in self.input.roads if r.status == RoadStatus.CLOSED]
        if closed_roads:
            for road in closed_roads:
                self._add_issue(
                    "WARNING",
                    "ROAD_CLOSED",
                    f"道路已封闭: {road.road_id} ({road.from_stop_id} -> {road.to_stop_id})" +
                    (f" - {road.note}" if road.note else ""),
                    road_id=road.road_id,
                    from_stop_id=road.from_stop_id,
                    to_stop_id=road.to_stop_id,
                    note=road.note
                )

    def _validate_vehicle_capacities(self):
        if not self.input.vehicles:
            self._add_issue(
                "ERROR",
                "NO_VEHICLES",
                "没有配置任何车辆"
            )
            return

        for vehicle in self.input.vehicles:
            if vehicle.capacity <= 0:
                self._add_issue(
                    "ERROR",
                    "INVALID_VEHICLE_CAPACITY",
                    f"车辆'{vehicle.vehicle_id}'容量无效: {vehicle.capacity}，必须大于0",
                    vehicle_id=vehicle.vehicle_id,
                    capacity=vehicle.capacity
                )

    def _validate_isolated_stops(self):
        valid_stop_ids = {s.stop_id for s in self.input.stops}
        connected_stops: Set[str] = set()

        for road in self.input.roads:
            if not road.is_closed:
                connected_stops.add(road.from_stop_id)
                connected_stops.add(road.to_stop_id)

        isolated = valid_stop_ids - connected_stops
        if self.input.school.stop_id not in connected_stops:
            self._add_issue(
                "ERROR",
                "SCHOOL_NOT_CONNECTED",
                f"学校站点'{self.input.school.name}'({self.input.school.stop_id})没有连接任何开放道路",
                stop_id=self.input.school.stop_id
            )

        for stop_id in isolated:
            stop = self.input.get_stop(stop_id)
            if stop:
                self._add_issue(
                    "ERROR",
                    "ISOLATED_STOP",
                    f"站点'{stop.name}'({stop_id})是孤立的，没有连接任何开放道路，无法安排校车",
                    stop_id=stop_id,
                    stop_name=stop.name
                )

    def _validate_reachability(self):
        open_roads = [r for r in self.input.roads if not r.is_closed]
        adjacency: Dict[str, List[str]] = defaultdict(list)

        for road in open_roads:
            adjacency[road.from_stop_id].append(road.to_stop_id)
            adjacency[road.to_stop_id].append(road.from_stop_id)

        visited = set()
        queue = deque([self.input.school.stop_id])
        visited.add(self.input.school.stop_id)

        while queue:
            current = queue.popleft()
            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        for stop in self.input.stops:
            if stop.stop_id not in visited:
                self._add_issue(
                    "ERROR",
                    "UNREACHABLE_STOP",
                    f"从学校出发无法到达站点'{stop.name}'({stop.stop_id})，"
                    f"可能是道路封闭导致，请检查道路连接",
                    stop_id=stop.stop_id,
                    stop_name=stop.name,
                    reason="道路封闭或无连通路径"
                )

    def _validate_capacity_sufficiency(self):
        total_students = sum(s.student_count for s in self.input.stops)
        total_capacity = sum(v.capacity for v in self.input.vehicles)

        if total_students > total_capacity:
            self._add_issue(
                "ERROR",
                "INSUFFICIENT_TOTAL_CAPACITY",
                f"总运力不足: 学生总数 {total_students} 人 > 车辆总容量 {total_capacity} 人，"
                f"缺少 {total_students - total_capacity} 个座位",
                total_students=total_students,
                total_capacity=total_capacity,
                deficit=total_students - total_capacity
            )
        else:
            self._add_issue(
                "INFO",
                "CAPACITY_SUFFICIENT",
                f"运力充足: 学生总数 {total_students} 人，车辆总容量 {total_capacity} 人，"
                f"剩余 {total_capacity - total_students} 个座位",
                total_students=total_students,
                total_capacity=total_capacity,
                surplus=total_capacity - total_students
            )
