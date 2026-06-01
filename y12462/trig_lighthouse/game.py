"""游戏逻辑模块"""

import math
import time
from typing import List, Optional
from .models import (
    Angle, AngleUnit, Quadrant, GameStatus, GameState,
    Level, Lighthouse, Target, DataError, ErrorType,
    GameResult, UnitCirclePoint
)


class TrigLighthouseGame:
    """三角函数灯塔赛主游戏类"""

    def __init__(self):
        self.state = GameState()
        self.history: List[GameResult] = []
        self.unit_circle_history: List[UnitCirclePoint] = []

    def start_level(self, level: Level) -> None:
        """开始关卡"""
        self.state = GameState(
            current_level=level,
            status=GameStatus.PLAYING
        )

    def calculate_unit_circle(self, angle: Angle, version: str = "current") -> UnitCirclePoint:
        """计算单位圆上的点"""
        rad = angle.to_radian()
        x = math.cos(rad)
        y = math.sin(rad)

        return UnitCirclePoint(
            angle=angle,
            x=x,
            y=y,
            sin=y,
            cos=x,
            tan=y / x if abs(x) > 1e-9 else float('inf'),
            quadrant=angle.get_quadrant(),
            source_version=version
        )

    def check_quadrant_misjudge(self, angle: Angle, expected_quadrant: Quadrant) -> bool:
        """检查象限误判"""
        actual = angle.get_quadrant()
        return actual != expected_quadrant

    def check_projection_bounds(self, x: float, y: float) -> bool:
        """检查投影是否越界"""
        return abs(x) > 1.0 or abs(y) > 1.0

    def shoot_beam(self, beam_angle: Angle) -> List[str]:
        """发射光束，返回命中的目标ID"""
        if self.state.status != GameStatus.PLAYING:
            return []

        self.state.attempts += 1
        self.state.current_beam_angle = beam_angle

        point = self.calculate_unit_circle(beam_angle)
        hits: List[str] = []

        if self.check_projection_bounds(point.x, point.y):
            self.state.errors.append(DataError(
                error_type=ErrorType.PROJECTION_OUT_OF_BOUNDS,
                row_number=self.state.attempts,
                message=f"投影越界: x={point.x:.4f}, y={point.y:.4f}",
                raw_data=f"{beam_angle.value} {beam_angle.unit.value}"
            ))

        for target in self.state.current_level.targets:
            expected_deg = target.expected_angle.normalize().to_degree()
            beam_deg = beam_angle.normalize().to_degree()

            diff = abs(beam_deg - expected_deg)
            diff = min(diff, 360 - diff)

            if self.check_quadrant_misjudge(beam_angle, target.expected_quadrant):
                self.state.errors.append(DataError(
                    error_type=ErrorType.QUADRANT_MISJUDGE,
                    row_number=self.state.attempts,
                    message=f"象限误判: 期望象限={target.expected_quadrant.value}, 实际={beam_angle.get_quadrant().value}",
                    raw_data=f"{beam_angle.value}"
                ))

            if diff <= target.tolerance and not target.hit:
                target.hit = True
                target.hit_angle = beam_angle
                hits.append(target.id)
                self.state.hits.append(target.id)
                self.state.score += 100

        return hits

    def check_fail_path(self, beam_angle: Angle) -> bool:
        """检查是否进入失败路径"""
        total_targets = len(self.state.current_level.targets)
        if self.state.attempts > total_targets * 3:
            return True
        return False

    def end_game(self) -> GameResult:
        """结束游戏并生成结果"""
        hit_count = sum(1 for t in self.state.current_level.targets if t.hit)
        total = len(self.state.current_level.targets)
        accuracy = hit_count / total if total > 0 else 0.0

        if hit_count == total:
            self.state.status = GameStatus.SUCCESS
        else:
            self.state.status = GameStatus.FAILED

        result = GameResult(
            level_id=self.state.current_level.id,
            level_name=self.state.current_level.name,
            status=self.state.status,
            total_targets=total,
            hit_targets=hit_count,
            accuracy=accuracy,
            score=self.state.score,
            errors=self.state.errors,
            beam_angles=[],
            timestamp=time.time(),
            version="1.0"
        )

        self.history.append(result)
        return result

    def get_comparison_report(self, old_point: UnitCirclePoint, new_point: UnitCirclePoint) -> dict:
        """生成新旧单位圆对比报告"""
        return {
            "old_angle": f"{old_point.angle.value} {old_point.angle.unit.value}",
            "new_angle": f"{new_point.angle.value} {new_point.angle.unit.value}",
            "old_quadrant": old_point.quadrant.value,
            "new_quadrant": new_point.quadrant.value,
            "quadrant_changed": old_point.quadrant != new_point.quadrant,
            "sin_diff": abs(new_point.sin - old_point.sin),
            "cos_diff": abs(new_point.cos - old_point.cos),
            "explanation": self._explain_difference(old_point, new_point)
        }

    def _explain_difference(self, old: UnitCirclePoint, new: UnitCirclePoint) -> str:
        """解释差异"""
        explanations = []
        if old.quadrant != new.quadrant:
            explanations.append(f"象限从 {old.quadrant.value} 变为 {new.quadrant.value}")
        
        sin_diff = abs(new.sin - old.sin)
        if sin_diff > 0.1:
            explanations.append(f"正弦值变化 {sin_diff:.4f}")
        
        cos_diff = abs(new.cos - old.cos)
        if cos_diff > 0.1:
            explanations.append(f"余弦值变化 {cos_diff:.4f}")
        
        return "; ".join(explanations) if explanations else "无显著变化"
