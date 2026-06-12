"""
巡检照片流程模块
================

围绕巡检照片这条线, 支持以下操作:
  1. 重复运行 - 基于同一张/批照片重新计算漂移轨迹
  2. 补录 - 补充缺失的浮标数据后重新计算
  3. 人工确认 - 调度员对异常点、越界点进行确认

每次操作都留下记录, 可追溯。
"""

import copy
from datetime import datetime
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass, field

from models import (
    Trajectory, DriftPoint, DriftStatus,
    BuoyData, Position, DriftReport, CleanResult, CalcFailure
)
from drift_calculator import calculate_trajectory, CalculationMethod
from trajectory_cleaner import clean_trajectory
from buoy_manager import BuoyDataManager


@dataclass
class PhotoRecord:
    photo_id: str
    photo_path: str
    capture_time: datetime
    estimated_position: Position
    notes: str = ""
    linked_trajectory_ids: List[str] = field(default_factory=list)


@dataclass
class ReviewRecord:
    review_id: str
    trajectory_id: str
    point_index: int
    reviewer: str
    action: str  # "confirm", "reject", "modify"
    comment: str
    timestamp: datetime = field(default_factory=datetime.now)
    original_status: Optional[DriftStatus] = None
    new_status: Optional[DriftStatus] = None


@dataclass
class RunHistory:
    run_id: str
    trajectory_id: str
    run_type: str  # "initial", "re-run", "supplement", "review"
    timestamp: datetime
    point_count: int
    failure_count: int
    notes: str = ""


class InspectionWorkflow:
    """巡检照片工作流 - 围绕照片的重复运行、补录、人工确认"""

    def __init__(self):
        self._photos: Dict[str, PhotoRecord] = {}
        self._trajectories: Dict[str, Trajectory] = {}
        self._clean_results: Dict[str, CleanResult] = {}
        self._reviews: List[ReviewRecord] = []
        self._run_history: List[RunHistory] = []
        self._buoy_manager: Optional[BuoyDataManager] = None
        self._restricted_zones = []
        self._run_counter = 0
        self._review_counter = 0

    def set_buoy_manager(self, manager: BuoyDataManager):
        self._buoy_manager = manager

    def set_restricted_zones(self, zones):
        self._restricted_zones = zones

    # === 照片管理 ===

    def add_photo(self, photo_id: str, photo_path: str, capture_time: datetime,
                  estimated_position: Position, notes: str = "") -> PhotoRecord:
        """添加一张巡检照片"""
        photo = PhotoRecord(
            photo_id=photo_id,
            photo_path=photo_path,
            capture_time=capture_time,
            estimated_position=estimated_position,
            notes=notes
        )
        self._photos[photo_id] = photo
        return photo

    def get_photo(self, photo_id: str) -> Optional[PhotoRecord]:
        return self._photos.get(photo_id)

    def list_photos(self) -> List[PhotoRecord]:
        return list(self._photos.values())

    # === 轨迹计算与重复运行 ===

    def run_calculation(
        self,
        photo_id: str,
        method: CalculationMethod = CalculationMethod.COMPREHENSIVE,
        time_steps: int = 12,
        step_hours: float = 1.0,
        target_type: str = "person_in_water",
        run_type: str = "initial"
    ) -> Trajectory:
        """
        基于照片运行漂移计算

        参数:
            photo_id: 关联的照片ID
            method: 计算方法
            time_steps: 时间步数
            step_hours: 每步时长
            target_type: 目标类型
            run_type: 运行类型 (initial/re-run/supplement)

        返回: 计算得到的轨迹
        """
        photo = self._photos.get(photo_id)
        if photo is None:
            raise ValueError(f"照片 {photo_id} 不存在")

        if self._buoy_manager is None:
            raise ValueError("未设置浮标数据管理器")

        self._run_counter += 1
        traj_id = f"TRJ-{self._run_counter:03d}"

        start_pos = Position(
            lat=photo.estimated_position.lat,
            lon=photo.estimated_position.lon,
            timestamp=photo.capture_time
        )

        buoys = self._buoy_manager.buoys if self._buoy_manager else []

        trajectory, failures, missing_buoys = calculate_trajectory(
            start_pos=start_pos,
            buoys=buoys,
            time_steps=time_steps,
            step_hours=step_hours,
            target_type=target_type,
            method=method,
            restricted_zones=self._restricted_zones,
            trajectory_id=traj_id
        )

        trajectory.photo_refs.append(photo_id)
        trajectory.source = f"巡检照片 {photo_id}, {method.value}"

        self._trajectories[traj_id] = trajectory
        photo.linked_trajectory_ids.append(traj_id)

        clean_result = clean_trajectory(trajectory)
        self._clean_results[traj_id] = clean_result

        self._run_history.append(RunHistory(
            run_id=f"RUN-{self._run_counter:03d}",
            trajectory_id=traj_id,
            run_type=run_type,
            timestamp=datetime.now(),
            point_count=len(trajectory.drift_points),
            failure_count=len(failures),
            notes=f"基于照片 {photo_id} 计算, 方法: {method.value}"
        ))

        return trajectory

    def rerun_calculation(
        self,
        trajectory_id: str,
        **kwargs
    ) -> Trajectory:
        """
        重复运行 - 对已有轨迹重新计算

        常用于: 调整参数后、补录数据后重新计算
        """
        old_traj = self._trajectories.get(trajectory_id)
        if old_traj is None:
            raise ValueError(f"轨迹 {trajectory_id} 不存在")

        if not old_traj.photo_refs:
            raise ValueError(f"轨迹 {trajectory_id} 没有关联的照片, 无法重复运行")

        photo_id = old_traj.photo_refs[0]

        method = kwargs.get('method', CalculationMethod.COMPREHENSIVE)
        time_steps = kwargs.get('time_steps', len(old_traj.drift_points))
        step_hours = kwargs.get('step_hours', 1.0)
        target_type = kwargs.get('target_type', 'person_in_water')

        new_traj = self.run_calculation(
            photo_id=photo_id,
            method=method,
            time_steps=time_steps,
            step_hours=step_hours,
            target_type=target_type,
            run_type="re-run"
        )

        return new_traj

    # === 补录流程 ===

    def supplement_buoy_data(self, buoy_id: str, **kwargs) -> bool:
        """
        补录浮标数据

        成功后建议调用 rerun_calculation 重新计算
        """
        if self._buoy_manager is None:
            raise ValueError("未设置浮标数据管理器")

        success = self._buoy_manager.update_buoy_data(buoy_id, **kwargs)
        return success

    def get_supplement_tasks(self) -> List[Dict]:
        """
        获取需要补录的任务清单

        返回每个轨迹对应的缺失数据项
        """
        if self._buoy_manager is None:
            return []

        gap_report = self._buoy_manager.get_gap_report()
        tasks = []

        for buoy_id, missing_fields in gap_report.items():
            buoy = self._buoy_manager.get_buoy_by_id(buoy_id)
            tasks.append({
                "buoy_id": buoy_id,
                "buoy_position": buoy.position if buoy else None,
                "missing_fields": missing_fields,
                "affected_trajectories": [
                    tid for tid, traj in self._trajectories.items()
                    if any(dp.source_buoy == buoy_id for dp in traj.drift_points)
                ]
            })

        return tasks

    # === 人工确认 ===

    def review_point(
        self,
        trajectory_id: str,
        point_index: int,
        reviewer: str,
        action: str,
        comment: str = "",
        new_status: Optional[DriftStatus] = None
    ) -> ReviewRecord:
        """
        人工复核某个漂移点

        参数:
            trajectory_id: 轨迹ID
            point_index: 点索引
            reviewer: 复核人
            action: "confirm" (确认无误) / "reject" (驳回/标记异常) / "modify" (修改状态)
            comment: 复核意见
            new_status: 修改后的状态 (action=modify 时有效)
        """
        traj = self._trajectories.get(trajectory_id)
        if traj is None:
            raise ValueError(f"轨迹 {trajectory_id} 不存在")

        if point_index < 0 or point_index >= len(traj.drift_points):
            raise ValueError(f"点索引 {point_index} 超出范围")

        point = traj.drift_points[point_index]
        original_status = point.status

        self._review_counter += 1
        review_id = f"REV-{self._review_counter:03d}"

        if action == "confirm":
            point.status = DriftStatus.CONFIRMED
            point.notes.append(f"人工确认无误 (复核人: {reviewer})")
            new_s = DriftStatus.CONFIRMED
        elif action == "reject":
            point.status = DriftStatus.PENDING_REVIEW
            point.notes.append(f"被驳回, 需重新处理 (复核人: {reviewer}, 原因: {comment})")
            new_s = DriftStatus.PENDING_REVIEW
        elif action == "modify":
            if new_status is None:
                raise ValueError("modify 动作需要提供 new_status")
            point.status = new_status
            point.notes.append(f"人工修改状态: {original_status.value} → {new_status.value} (复核人: {reviewer})")
            new_s = new_status
        else:
            raise ValueError(f"未知的复核动作: {action}")

        traj.review_count += 1

        review = ReviewRecord(
            review_id=review_id,
            trajectory_id=trajectory_id,
            point_index=point_index,
            reviewer=reviewer,
            action=action,
            comment=comment,
            original_status=original_status,
            new_status=new_s
        )
        self._reviews.append(review)

        return review

    def get_pending_reviews(self, trajectory_id: Optional[str] = None) -> List[Dict]:
        """
        获取待复核的点列表
        """
        pending = []
        trajs = {}
        if trajectory_id:
            if trajectory_id in self._trajectories:
                trajs[trajectory_id] = self._trajectories[trajectory_id]
        else:
            trajs = self._trajectories

        for tid, traj in trajs.items():
            for idx, point in enumerate(traj.drift_points):
                if point.status in [
                    DriftStatus.PENDING_REVIEW,
                    DriftStatus.EXCEEDED_RESTRICTED,
                    DriftStatus.LATE_NOTIFICATION,
                    DriftStatus.CALC_FAILED,
                    DriftStatus.DATA_MISSING
                ]:
                    pending.append({
                        "trajectory_id": tid,
                        "point_index": idx,
                        "status": point.status,
                        "position": point.position,
                        "confidence": point.confidence,
                        "notes": point.notes,
                        "in_restricted_zone": point.in_restricted_zone
                    })

        return pending

    # === 查询方法 ===

    def get_trajectory(self, traj_id: str) -> Optional[Trajectory]:
        return self._trajectories.get(traj_id)

    def get_clean_result(self, traj_id: str) -> Optional[CleanResult]:
        return self._clean_results.get(traj_id)

    def get_run_history(self) -> List[RunHistory]:
        return list(self._run_history)

    def get_review_history(self) -> List[ReviewRecord]:
        return list(self._reviews)

    def list_trajectories(self) -> List[Trajectory]:
        return list(self._trajectories.values())
