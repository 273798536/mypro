from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict, Counter

from .models import (
    Trajectory,
    Step,
    Action,
    Anomaly,
    AnomalyType,
    AnalysisResult,
    ParsingResult,
)


class AnomalyDetector:
    def __init__(
        self,
        parsing_result: ParsingResult,
        reward_leakage_threshold: float = 3.0,
        loop_min_length: int = 3,
        loop_max_repeat: int = 3,
    ):
        self.parsing_result = parsing_result
        self.trajectories = parsing_result.trajectories
        self.reward_leakage_threshold = reward_leakage_threshold
        self.loop_min_length = loop_min_length
        self.loop_max_repeat = loop_max_repeat
        self.anomalies: List[Anomaly] = []

    def detect_all(self, analysis_result: Optional[AnalysisResult] = None) -> List[Anomaly]:
        self.anomalies = []

        self.detect_reward_leakage()
        self.detect_action_loops()
        self.detect_termination_errors()
        self.detect_suspicious_rewards()

        return self.anomalies

    def detect_reward_leakage(self) -> List[Anomaly]:
        anomalies = []

        for trajectory in self.trajectories:
            reward_stats = self._calculate_reward_stats(trajectory)

            for reward_name, stats in reward_stats.items():
                if stats["std"] == 0:
                    continue

                for step_idx, step in enumerate(trajectory.steps):
                    for reward_item in step.reward_items:
                        if reward_item.name != reward_name:
                            continue

                        z_score = (
                            reward_item.weighted_value - stats["mean"]
                        ) / stats["std"]

                        if abs(z_score) > self.reward_leakage_threshold:
                            anomaly = Anomaly(
                                anomaly_type=AnomalyType.REWARD_LEAKAGE,
                                severity="high" if abs(z_score) > 5 else "medium",
                                trajectory_id=trajectory.trajectory_id,
                                step_id=step.step_id,
                                description=(
                                    f"检测到奖励泄漏: 奖励项 '{reward_name}' 在步骤 {step.step_id} "
                                    f"的值 {reward_item.weighted_value:.4f} 显著偏离平均值 "
                                    f"(Z-score: {z_score:.2f})"
                                ),
                                evidence={
                                    "reward_name": reward_name,
                                    "actual_value": reward_item.weighted_value,
                                    "expected_mean": stats["mean"],
                                    "expected_std": stats["std"],
                                    "z_score": z_score,
                                    "step_id": step.step_id,
                                    "state": step.state,
                                    "action": step.action.name if step.action else None,
                                },
                                recommendation=(
                                    f"检查奖励函数中 '{reward_name}' 的计算逻辑。"
                                    f"可能是状态特征被误用来获取额外奖励，或者奖励阈值设置不合理。"
                                    f"建议查看步骤 {step.step_id} 前后的状态变化，确认奖励条件是否被智能体利用。"
                                ),
                            )
                            anomalies.append(anomaly)
                            self.anomalies.append(anomaly)

        return anomalies

    def _calculate_reward_stats(
        self, trajectory: Trajectory
    ) -> Dict[str, Dict[str, float]]:
        reward_values: Dict[str, List[float]] = defaultdict(list)

        for step in trajectory.steps:
            for reward_item in step.reward_items:
                reward_values[reward_item.name].append(reward_item.weighted_value)

        stats = {}
        for name, values in reward_values.items():
            if len(values) > 1:
                mean = sum(values) / len(values)
                variance = sum((v - mean) ** 2 for v in values) / len(values)
                std = variance**0.5
                stats[name] = {"mean": mean, "std": std, "values": values}

        return stats

    def detect_action_loops(self) -> List[Anomaly]:
        anomalies = []

        for trajectory in self.trajectories:
            actions = trajectory.get_action_sequence()
            if len(actions) < self.loop_min_length * 2:
                continue

            loops = self._find_action_loops(actions)

            for loop_info in loops:
                if loop_info["repeat_count"] >= self.loop_max_repeat:
                    anomaly = Anomaly(
                        anomaly_type=AnomalyType.ACTION_LOOP,
                        severity="medium",
                        trajectory_id=trajectory.trajectory_id,
                        step_id=loop_info["start_step"],
                        description=(
                            f"检测到动作循环: 从步骤 {loop_info['start_step']} 开始，"
                            f"动作序列 {[a.name for a in loop_info['pattern']]} "
                            f"重复了 {loop_info['repeat_count']} 次"
                        ),
                        evidence={
                            "start_step": loop_info["start_step"],
                            "end_step": loop_info["end_step"],
                            "pattern": [a.name for a in loop_info["pattern"]],
                            "pattern_length": len(loop_info["pattern"]),
                            "repeat_count": loop_info["repeat_count"],
                        },
                        recommendation=(
                            "该动作循环表明智能体可能陷入了局部最优策略。"
                            "建议检查奖励函数是否存在激励循环行为的设计缺陷，"
                            "或者考虑增加探索率、修改终止条件。"
                        ),
                    )
                    anomalies.append(anomaly)
                    self.anomalies.append(anomaly)

        return anomalies

    def _find_action_loops(
        self, actions: List[Action]
    ) -> List[Dict[str, Any]]:
        loops = []
        n = len(actions)

        for pattern_len in range(self.loop_min_length, min(n // 2, 10) + 1):
            for start in range(n - pattern_len * 2 + 1):
                pattern = actions[start : start + pattern_len]
                repeat_count = 1
                end = start + pattern_len

                while end + pattern_len <= n:
                    if actions[end : end + pattern_len] == pattern:
                        repeat_count += 1
                        end += pattern_len
                    else:
                        break

                if repeat_count >= self.loop_max_repeat:
                    loops.append(
                        {
                            "start_step": start,
                            "end_step": end - 1,
                            "pattern": pattern,
                            "pattern_length": pattern_len,
                            "repeat_count": repeat_count,
                        }
                    )

        return self._merge_overlapping_loops(loops)

    def _merge_overlapping_loops(
        self, loops: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        if not loops:
            return []

        loops.sort(key=lambda x: x["start_step"])
        merged = [loops[0]]

        for loop in loops[1:]:
            last = merged[-1]
            if loop["start_step"] <= last["end_step"]:
                if loop["repeat_count"] > last["repeat_count"]:
                    merged[-1] = loop
            else:
                merged.append(loop)

        return merged

    def detect_termination_errors(self) -> List[Anomaly]:
        anomalies = []

        for trajectory in self.trajectories:
            if not trajectory.steps:
                continue

            last_step = trajectory.steps[-1]

            if len(trajectory.steps) > 1000 and not last_step.done:
                anomaly = Anomaly(
                    anomaly_type=AnomalyType.TERMINATION_ERROR,
                    severity="medium",
                    trajectory_id=trajectory.trajectory_id,
                    step_id=last_step.step_id,
                    description=(
                        f"轨迹 {trajectory.trajectory_id} 步数过多 ({trajectory.total_steps}步) "
                        "但未正常终止，可能存在终止条件缺陷"
                    ),
                    evidence={
                        "total_steps": trajectory.total_steps,
                        "final_done": last_step.done,
                        "final_state": last_step.state,
                    },
                    recommendation=(
                        "检查环境的终止条件设置。可能需要增加最大步数限制，"
                        "或者调整终止条件的触发逻辑以确保智能体能够正常结束任务。"
                    ),
                )
                anomalies.append(anomaly)
                self.anomalies.append(anomaly)

            if last_step.done and len(trajectory.steps) < 5:
                anomaly = Anomaly(
                    anomaly_type=AnomalyType.TERMINATION_ERROR,
                    severity="low",
                    trajectory_id=trajectory.trajectory_id,
                    step_id=last_step.step_id,
                    description=(
                        f"轨迹 {trajectory.trajectory_id} 过早终止 (仅 {trajectory.total_steps}步)，"
                        "可能是终止条件过于宽松"
                    ),
                    evidence={
                        "total_steps": trajectory.total_steps,
                        "final_done": last_step.done,
                        "final_state": last_step.state,
                    },
                    recommendation=(
                        "检查终止条件是否过于严格或宽松。如果是探索阶段，这可能是正常的；"
                        "但如果是训练后期，可能需要调整终止条件。"
                    ),
                )
                anomalies.append(anomaly)
                self.anomalies.append(anomaly)

        return anomalies

    def detect_suspicious_rewards(self) -> List[Anomaly]:
        anomalies = []

        for trajectory in self.trajectories:
            for step_idx, step in enumerate(trajectory.steps):
                if step.total_reward > 0 and step.action is None:
                    anomaly = Anomaly(
                        anomaly_type=AnomalyType.SUSPICIOUS_REWARD,
                        severity="medium",
                        trajectory_id=trajectory.trajectory_id,
                        step_id=step.step_id,
                        description=(
                            f"步骤 {step.step_id} 在无动作的情况下获得了奖励 "
                            f"{step.total_reward:.4f}"
                        ),
                        evidence={
                            "step_id": step.step_id,
                            "reward": step.total_reward,
                            "action": None,
                            "state": step.state,
                        },
                        recommendation=(
                            "检查奖励函数逻辑。无动作时获得奖励可能是状态奖励的正常设计，"
                            "但也可能是奖励计算错误。请确认这是否符合预期。"
                        ),
                    )
                    anomalies.append(anomaly)
                    self.anomalies.append(anomaly)

        return anomalies

    def get_anomaly_summary(self) -> Dict[str, Any]:
        summary = defaultdict(lambda: {"count": 0, "severities": Counter()})

        for anomaly in self.anomalies:
            summary[anomaly.anomaly_type.value]["count"] += 1
            summary[anomaly.anomaly_type.value]["severities"][anomaly.severity] += 1

        return dict(summary)
