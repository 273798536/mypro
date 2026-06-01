"""异常检测模块：角度越界、风速缺测、坐标反向检测"""

import numpy as np
from typing import List, Optional, Tuple
from collections import defaultdict

from .models import (
    Event,
    Anomaly,
    SourceInfo,
    BoundsConfig,
    TrajectoryPoint,
    AngleRecord,
    WindRecord,
)


class AnomalyDetector:
    """异常检测器"""

    def __init__(self, bounds: BoundsConfig):
        self.bounds = bounds
        self._anomaly_counter = 0

    def _next_anomaly_id(self) -> str:
        self._anomaly_counter += 1
        return f"anom_{self._anomaly_counter:04d}"

    def detect_all(
        self,
        events: List[Event],
        trajectory_points: Optional[List[TrajectoryPoint]] = None,
        angle_records: Optional[List[AngleRecord]] = None,
        wind_records: Optional[List[WindRecord]] = None,
    ) -> List[Anomaly]:
        """检测所有异常"""
        anomalies: List[Anomaly] = []

        anomalies.extend(self.detect_angle_overflow(events, angle_records))
        anomalies.extend(self.detect_wind_missing(events, wind_records))
        anomalies.extend(self.detect_coordinate_reverse(events, trajectory_points))
        anomalies.extend(self.detect_bounds_violations(
            trajectory_points, angle_records, wind_records
        ))

        return anomalies

    def detect_angle_overflow(
        self,
        events: List[Event],
        angle_records: Optional[List[AngleRecord]] = None,
    ) -> List[Anomaly]:
        """
        检测角度越界

        角度越界定义: angle_deg < bounds.angle_min_deg 或 angle_deg > bounds.angle_max_deg
        """
        anomalies: List[Anomaly] = []
        bounds = self.bounds

        records_to_check = []
        if angle_records:
            records_to_check.extend([(None, ar) for ar in angle_records])
        for event in events:
            if event.angle_record:
                records_to_check.append((event, event.angle_record))

        for event, angle_record in records_to_check:
            angle = angle_record.angle_deg
            if (
                angle < bounds.angle_min_deg
                or angle > bounds.angle_max_deg
            ):
                source = angle_record.source
                overflow_amount = min(
                    angle - bounds.angle_max_deg,
                    bounds.angle_min_deg - angle
                )
                overflow_amount = max(overflow_amount, angle - bounds.angle_max_deg, key=abs)

                if angle < bounds.angle_min_deg:
                    overflow_amount = bounds.angle_min_deg - angle
                    direction = "低于下限"
                else:
                    overflow_amount = angle - bounds.angle_max_deg
                    direction = "高于上限"

                message = (
                    f"角度越界: {angle:.2f} deg {direction} "
                    f"[{bounds.angle_min_deg}, {bounds.angle_max_deg}] deg, "
                    f"超出 {abs(overflow_amount):.2f} deg"
                )

                next_step = self._get_angle_overflow_next_step(
                    angle, bounds, angle_record.t, source
                )

                anomaly = Anomaly(
                    anomaly_id=self._next_anomaly_id(),
                    anomaly_type="angle_overflow",
                    severity="error",
                    message=message,
                    t=angle_record.t,
                    event=event,
                    source=source,
                    value=angle,
                    bound_min=bounds.angle_min_deg,
                    bound_max=bounds.angle_max_deg,
                    unit="deg",
                    next_step=next_step,
                )
                anomalies.append(anomaly)

        return anomalies

    def detect_wind_missing(
        self,
        events: List[Event],
        wind_records: Optional[List[WindRecord]] = None,
    ) -> List[Anomaly]:
        """
        检测风速缺测

        风速缺测定义:
        1. 某时刻有轨迹点或角度记录，但没有对应的风速记录
        2. 风速记录中 wind_speed 为 NaN 或超出边界
        """
        anomalies: List[Anomaly] = []
        bounds = self.bounds

        event_times = {e.t for e in events if e.trajectory_point or e.angle_record}
        wind_times = set()

        if wind_records:
            for wr in wind_records:
                wind_times.add(wr.t)
                if np.isnan(wr.wind_speed) or np.isnan(wr.wind_direction_deg):
                    source = wr.source
                    message = f"风速记录存在空值 (NaN): t={wr.t:.2f}s"
                    next_step = (
                        f"检查风速记录文件 {source.file_path}，"
                        f"补全 t={wr.t:.2f}s 时刻的风速和风向数据"
                    )
                    anomaly = Anomaly(
                        anomaly_id=self._next_anomaly_id(),
                        anomaly_type="wind_missing",
                        severity="warning",
                        message=message,
                        t=wr.t,
                        source=source,
                        value=None,
                        bound_min=bounds.wind_speed_min,
                        bound_max=bounds.wind_speed_max,
                        unit="m/s",
                        next_step=next_step,
                    )
                    anomalies.append(anomaly)
                elif (
                    wr.wind_speed < bounds.wind_speed_min
                    or wr.wind_speed > bounds.wind_speed_max
                ):
                    source = wr.source
                    if wr.wind_speed < bounds.wind_speed_min:
                        direction = "低于下限"
                        overflow = bounds.wind_speed_min - wr.wind_speed
                    else:
                        direction = "高于上限"
                        overflow = wr.wind_speed - bounds.wind_speed_max
                    message = (
                        f"风速值越界: {wr.wind_speed:.2f} m/s {direction} "
                        f"[{bounds.wind_speed_min}, {bounds.wind_speed_max}] m/s, "
                        f"超出 {overflow:.2f} m/s"
                    )
                    next_step = (
                        f"1. 核实风速测量设备是否正常工作\n"
                        f"2. 检查 t={wr.t:.2f}s 时刻的风速记录是否有读取错误\n"
                        f"3. 若确为异常值，考虑插值或标记为无效数据"
                    )
                    anomaly = Anomaly(
                        anomaly_id=self._next_anomaly_id(),
                        anomaly_type="wind_missing",
                        severity="warning",
                        message=message,
                        t=wr.t,
                        source=source,
                        value=wr.wind_speed,
                        bound_min=bounds.wind_speed_min,
                        bound_max=bounds.wind_speed_max,
                        unit="m/s",
                        next_step=next_step,
                    )
                    anomalies.append(anomaly)

        missing_times = event_times - wind_times
        for t in sorted(missing_times):
            event = next((e for e in events if abs(e.t - t) < 1e-6), None)
            sources = event.sources if event else []
            source_info = sources[0] if sources else None

            if source_info is None and event:
                if event.trajectory_point:
                    source_info = event.trajectory_point.source
                elif event.angle_record:
                    source_info = event.angle_record.source

            message = f"风速缺测: t={t:.2f}s 时刻有轨迹/角度记录但无风速记录"
            next_step = self._get_wind_missing_next_step(t, event, source_info)

            anomaly = Anomaly(
                anomaly_id=self._next_anomaly_id(),
                anomaly_type="wind_missing",
                severity="error",
                message=message,
                t=t,
                event=event,
                source=source_info,
                value=None,
                bound_min=None,
                bound_max=None,
                unit="m/s",
                next_step=next_step,
            )
            anomalies.append(anomaly)

        return anomalies

    def detect_coordinate_reverse(
        self,
        events: List[Event],
        trajectory_points: Optional[List[TrajectoryPoint]] = None,
    ) -> List[Anomaly]:
        """
        检测坐标反向

        坐标反向定义:
        1. x坐标随时间递减 (正常抛体x应递增或不变)
        2. 或坐标值超出边界范围
        """
        anomalies: List[Anomaly] = []
        bounds = self.bounds

        all_points: List[TrajectoryPoint] = []
        if trajectory_points:
            all_points.extend(trajectory_points)
        for event in events:
            if event.trajectory_point:
                all_points.append(event.trajectory_point)

        all_points.sort(key=lambda p: p.t)

        for i, point in enumerate(all_points):
            source = point.source
            event = next(
                (e for e in events if e.trajectory_point is point), None
            )

            if (
                point.x < bounds.coordinate_x_min
                or point.x > bounds.coordinate_x_max
                or point.y < bounds.coordinate_y_min
                or point.y > bounds.coordinate_y_max
            ):
                x_violation = point.x < bounds.coordinate_x_min or point.x > bounds.coordinate_x_max
                y_violation = point.y < bounds.coordinate_y_min or point.y > bounds.coordinate_y_max

                if x_violation:
                    if point.x < bounds.coordinate_x_min:
                        overflow = bounds.coordinate_x_min - point.x
                        message = (
                            f"x坐标越界: {point.x:.2f} m 低于下限 "
                            f"{bounds.coordinate_x_min} m, 超出 {overflow:.2f} m"
                        )
                    else:
                        overflow = point.x - bounds.coordinate_x_max
                        message = (
                            f"x坐标越界: {point.x:.2f} m 高于上限 "
                            f"{bounds.coordinate_x_max} m, 超出 {overflow:.2f} m"
                        )
                    coord_type = "x"
                    value = point.x
                    bmin, bmax = bounds.coordinate_x_min, bounds.coordinate_x_max
                    unit = "m"
                else:
                    if point.y < bounds.coordinate_y_min:
                        overflow = bounds.coordinate_y_min - point.y
                        message = (
                            f"y坐标越界: {point.y:.2f} m 低于下限 "
                            f"{bounds.coordinate_y_min} m, 超出 {overflow:.2f} m"
                        )
                    else:
                        overflow = point.y - bounds.coordinate_y_max
                        message = (
                            f"y坐标越界: {point.y:.2f} m 高于上限 "
                            f"{bounds.coordinate_y_max} m, 超出 {overflow:.2f} m"
                        )
                    coord_type = "y"
                    value = point.y
                    bmin, bmax = bounds.coordinate_y_min, bounds.coordinate_y_max
                    unit = "m"

                next_step = (
                    f"1. 检查 {source.file_path} 中 t={point.t:.2f}s 的{coord_type}坐标\n"
                    f"2. 确认测量坐标系方向是否正确 (x向右为正, y向上为正)\n"
                    f"3. 核实是否存在坐标单位转换错误 (如 cm 误作 m)\n"
                    f"4. 检查数据采集设备是否正常"
                )

                anomaly = Anomaly(
                    anomaly_id=self._next_anomaly_id(),
                    anomaly_type="coordinate_reverse",
                    severity="error",
                    message=message,
                    t=point.t,
                    event=event,
                    source=source,
                    value=value,
                    bound_min=bmin,
                    bound_max=bmax,
                    unit=unit,
                    next_step=next_step,
                )
                anomalies.append(anomaly)

        for i in range(1, len(all_points)):
            prev_point = all_points[i - 1]
            curr_point = all_points[i]
            source = curr_point.source

            if curr_point.x < prev_point.x:
                reverse_amount = prev_point.x - curr_point.x
                message = (
                    f"x坐标反向: t={prev_point.t:.2f}s 时 x={prev_point.x:.2f}m, "
                    f"t={curr_point.t:.2f}s 时 x={curr_point.x:.2f}m, "
                    f"反向 {reverse_amount:.2f}m"
                )
                next_step = self._get_coordinate_reverse_next_step(
                    prev_point, curr_point
                )

                event = next(
                    (e for e in events if e.trajectory_point is curr_point), None
                )

                anomaly = Anomaly(
                    anomaly_id=self._next_anomaly_id(),
                    anomaly_type="coordinate_reverse",
                    severity="error",
                    message=message,
                    t=curr_point.t,
                    event=event,
                    source=source,
                    value=curr_point.x,
                    bound_min=None,
                    bound_max=None,
                    unit="m",
                    next_step=next_step,
                )
                anomalies.append(anomaly)

        return anomalies

    def detect_bounds_violations(
        self,
        trajectory_points: Optional[List[TrajectoryPoint]] = None,
        angle_records: Optional[List[AngleRecord]] = None,
        wind_records: Optional[List[WindRecord]] = None,
    ) -> List[Anomaly]:
        """检测时间边界违规"""
        anomalies: List[Anomaly] = []
        bounds = self.bounds

        all_items = []
        if trajectory_points:
            all_items.extend(("trajectory", p, p.t, p.source) for p in trajectory_points)
        if angle_records:
            all_items.extend(("angle", r, r.t, r.source) for r in angle_records)
        if wind_records:
            all_items.extend(("wind", r, r.t, r.source) for r in wind_records)

        for dtype, item, t, source in all_items:
            if t < bounds.time_min or t > bounds.time_max:
                if t < bounds.time_min:
                    overflow = bounds.time_min - t
                    direction = "早于"
                else:
                    overflow = t - bounds.time_max
                    direction = "晚于"

                message = (
                    f"时间越界: {dtype}记录 t={t:.2f}s {direction}允许范围 "
                    f"[{bounds.time_min}, {bounds.time_max}]s, 超出 {overflow:.2f}s"
                )
                next_step = (
                    f"检查 {source.file_path} 中的时间戳，确认是否为单位错误 "
                    f"(如 ms 误作 s) 或数据录入错误"
                )

                anomaly = Anomaly(
                    anomaly_id=self._next_anomaly_id(),
                    anomaly_type="time_overflow",
                    severity="warning",
                    message=message,
                    t=t,
                    source=source,
                    value=t,
                    bound_min=bounds.time_min,
                    bound_max=bounds.time_max,
                    unit="s",
                    next_step=next_step,
                )
                anomalies.append(anomaly)

        return anomalies

    def _get_angle_overflow_next_step(
        self,
        angle: float,
        bounds: BoundsConfig,
        t: float,
        source: SourceInfo,
    ) -> str:
        """生成角度越界的下一步建议"""
        steps = []

        if angle > bounds.angle_max_deg:
            steps.append(
                f"1. 立即检查 t={t:.2f}s 时刻的角度测量设备，确认是否存在传感器故障或读数错误"
            )
            if angle > 90:
                steps.append(
                    f"2. 角度 {angle:.2f}° 超过 90°，可能是："
                    f"① 传感器安装方向颠倒；② 读数时误读了 180°-实际角度；"
                    f"③ 坐标系定义不一致"
                )
            elif angle > 60:
                steps.append(
                    f"2. 角度 {angle:.2f}° 偏高，核实抛射方向是否垂直向上，或是否存在测量误差"
                )
        elif angle < bounds.angle_min_deg:
            steps.append(
                f"1. 立即检查 t={t:.2f}s 时刻的角度测量设备，确认是否存在传感器故障或读数错误"
            )
            if angle < -45:
                steps.append(
                    f"2. 角度 {angle:.2f}° 远低于 0°，可能是："
                    f"① 抛体已过最高点急剧下坠；② 传感器方向安装错误；"
                    f"③ 正负号定义与系统不一致"
                )
            else:
                steps.append(
                    f"2. 角度 {angle:.2f}° 略低于 0°，核实是否为正常抛体下落阶段，或存在测量误差"
                )

        steps.append(f"3. 核对角度记录文件: {source.file_path or '未知'}")
        steps.append(f"4. 检查同一时刻 t={t:.2f}s 的轨迹点，从位置变化反推速度方向验证角度")
        steps.append(f"5. 如确认数据错误，标记该点为无效或进行修正后重试")

        return "\n".join(steps)

    def _get_wind_missing_next_step(
        self,
        t: float,
        event: Optional[Event],
        source: Optional[SourceInfo],
    ) -> str:
        """生成风速缺测的下一步建议"""
        steps = []

        steps.append(f"1. 检查风速记录文件，确认 t={t:.2f}s 时刻是否确实没有数据")

        if source:
            steps.append(f"2. 核对关联文件 {source.file_path} 中的时间戳")
        if event and event.trajectory_point:
            steps.append(
                f"3. t={t:.2f}s 时刻轨迹点: x={event.trajectory_point.x:.2f}m, "
                f"y={event.trajectory_point.y:.2f}m，可从轨迹变化推断风阻影响"
            )
        if event and event.angle_record:
            steps.append(
                f"4. t={t:.2f}s 时刻角度记录: {event.angle_record.angle_deg:.2f}°"
            )

        steps.append(f"5. 补救方法（按优先级）：")
        steps.append(f"   - 方法1：从相邻时刻的风速记录线性插值补全")
        steps.append(f"   - 方法2：使用该批次试验的平均风速")
        steps.append(f"   - 方法3：将该时刻标记为无效，从分析中排除")
        steps.append(f"   - 方法4：使用无风假设（C_d=0）进行对比分析")

        return "\n".join(steps)

    def _get_coordinate_reverse_next_step(
        self,
        prev_point: TrajectoryPoint,
        curr_point: TrajectoryPoint,
    ) -> str:
        """生成坐标反向的下一步建议"""
        dt = curr_point.t - prev_point.t
        reverse_amount = prev_point.x - curr_point.x
        vx_reverse = reverse_amount / dt if dt > 0 else 0

        steps = []
        steps.append(
            f"1. 检查时间区间 [{prev_point.t:.2f}s, {curr_point.t:.2f}s] "
            f"内的所有数据点"
        )
        steps.append(
            f"2. x方向变化: {curr_point.x - prev_point.x:.2f}m, "
            f"平均速度: {vx_reverse:.2f}m/s (反向)"
        )
        steps.append(f"3. 可能原因排查：")
        steps.append(f"   - 原因1：数据采集时 x 轴方向定义错误 (向左为正)")
        steps.append(f"   - 原因2：时间戳顺序错误，数据点排序有误")
        steps.append(f"   - 原因3：抛体确实遇到强逆风导致短时间后退")
        steps.append(f"   - 原因4：测量设备存在随机误差或干扰")

        steps.append(f"4. 验证方法：")
        steps.append(f"   - 检查 y 方向运动是否符合物理规律")
        steps.append(f"   - 对比同时刻的角度记录，速度方向应与角度一致")
        steps.append(f"   - 检查风速记录，是否有强逆风 (风向=180°)")
        steps.append(f"   - 查看相邻更多数据点，判断是单点异常还是趋势性反向")

        source = curr_point.source
        steps.append(f"5. 数据来源: {source.material_name} ({source.file_path or '未知'})")

        return "\n".join(steps)

    def group_anomalies_by_source(
        self,
        anomalies: List[Anomaly],
    ) -> dict:
        """按来源材料分组异常"""
        groups = defaultdict(list)
        for anomaly in anomalies:
            key = (
                anomaly.source.material_id
                if anomaly.source
                else "unknown"
            )
            groups[key].append(anomaly)
        return dict(groups)

    def group_anomalies_by_type(
        self,
        anomalies: List[Anomaly],
    ) -> dict:
        """按异常类型分组"""
        groups = defaultdict(list)
        for anomaly in anomalies:
            groups[anomaly.anomaly_type].append(anomaly)
        return dict(groups)
