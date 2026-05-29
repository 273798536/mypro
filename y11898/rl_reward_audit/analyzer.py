import statistics
from typing import List, Dict, Any
from collections import defaultdict

from .models import (
    Trajectory,
    Step,
    RewardAggregation,
    ParsingResult,
    AnalysisResult,
)


class RewardAnalyzer:
    def __init__(self, parsing_result: ParsingResult):
        self.parsing_result = parsing_result
        self.trajectories = parsing_result.trajectories

    def analyze(self) -> AnalysisResult:
        reward_aggregations = self._aggregate_rewards()
        summary = self._generate_summary(reward_aggregations)

        return AnalysisResult(
            parsing_result=self.parsing_result,
            reward_aggregations=reward_aggregations,
            anomalies=[],
            summary=summary,
        )

    def _aggregate_rewards(self) -> Dict[str, RewardAggregation]:
        all_reward_data: Dict[str, List[float]] = defaultdict(list)
        total_reward_sum = 0.0

        for trajectory in self.trajectories:
            for step in trajectory.steps:
                for reward_item in step.reward_items:
                    all_reward_data[reward_item.name].append(
                        reward_item.weighted_value
                    )
                    total_reward_sum += reward_item.weighted_value

        aggregations = {}
        for reward_name, values in all_reward_data.items():
            if not values:
                continue

            total = sum(values)
            mean = statistics.mean(values) if len(values) > 0 else 0.0
            std = statistics.stdev(values) if len(values) > 1 else 0.0
            min_val = min(values)
            max_val = max(values)
            contribution_ratio = (total / total_reward_sum) if total_reward_sum > 0 else 0.0

            aggregations[reward_name] = RewardAggregation(
                reward_name=reward_name,
                total=total,
                mean=mean,
                std=std,
                min=min_val,
                max=max_val,
                per_step=values,
                contribution_ratio=contribution_ratio,
            )

        return aggregations

    def _generate_summary(
        self, reward_aggregations: Dict[str, RewardAggregation]
    ) -> Dict[str, Any]:
        total_steps = sum(t.total_steps for t in self.trajectories)
        total_reward = sum(t.total_reward for t in self.trajectories)
        complete_trajectories = sum(1 for t in self.trajectories if t.is_complete)

        reward_by_trajectory = []
        for traj in self.trajectories:
            reward_by_trajectory.append(
                {
                    "trajectory_id": traj.trajectory_id,
                    "total_reward": traj.total_reward,
                    "steps": traj.total_steps,
                    "complete": traj.is_complete,
                }
            )

        reward_contribution = sorted(
            [
                {"name": name, "ratio": agg.contribution_ratio, "total": agg.total}
                for name, agg in reward_aggregations.items()
            ],
            key=lambda x: x["ratio"],
            reverse=True,
        )

        return {
            "num_trajectories": len(self.trajectories),
            "num_complete_trajectories": complete_trajectories,
            "total_steps": total_steps,
            "total_reward": total_reward,
            "avg_reward_per_trajectory": total_reward / len(self.trajectories)
            if self.trajectories
            else 0.0,
            "avg_steps_per_trajectory": total_steps / len(self.trajectories)
            if self.trajectories
            else 0.0,
            "reward_by_trajectory": reward_by_trajectory,
            "reward_contribution": reward_contribution,
            "num_corrections": len(self.parsing_result.corrections),
            "num_errors": len(self.parsing_result.errors),
        }

    def get_reward_trend(self, reward_name: str, window_size: int = 10) -> List[float]:
        all_values = []
        for trajectory in self.trajectories:
            for step in trajectory.steps:
                step_reward = 0.0
                for r in step.reward_items:
                    if r.name == reward_name:
                        step_reward += r.weighted_value
                all_values.append(step_reward)

        if not all_values:
            return []

        smoothed = []
        for i in range(len(all_values)):
            start = max(0, i - window_size + 1)
            window = all_values[start : i + 1]
            smoothed.append(sum(window) / len(window))

        return smoothed

    def get_reward_correlation(self) -> Dict[str, Dict[str, float]]:
        reward_names = set()
        for trajectory in self.trajectories:
            for step in trajectory.steps:
                for r in step.reward_items:
                    reward_names.add(r.name)

        reward_names = list(reward_names)
        if len(reward_names) < 2:
            return {}

        reward_sequences: Dict[str, List[float]] = {name: [] for name in reward_names}
        for trajectory in self.trajectories:
            for step in trajectory.steps:
                step_rewards = {name: 0.0 for name in reward_names}
                for r in step.reward_items:
                    step_rewards[r.name] += r.weighted_value
                for name, value in step_rewards.items():
                    reward_sequences[name].append(value)

        correlations = {}
        for i, name1 in enumerate(reward_names):
            correlations[name1] = {}
            for j, name2 in enumerate(reward_names):
                if i == j:
                    correlations[name1][name2] = 1.0
                else:
                    corr = self._pearson_correlation(
                        reward_sequences[name1], reward_sequences[name2]
                    )
                    correlations[name1][name2] = corr

        return correlations

    def _pearson_correlation(self, x: List[float], y: List[float]) -> float:
        if len(x) != len(y) or len(x) == 0:
            return 0.0

        n = len(x)
        mean_x = sum(x) / n
        mean_y = sum(y) / n

        numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        denominator = (
            sum((x[i] - mean_x) ** 2 for i in range(n))
            * sum((y[i] - mean_y) ** 2 for i in range(n))
        ) ** 0.5

        if denominator == 0:
            return 0.0

        return numerator / denominator

    def get_per_step_reward_breakdown(
        self, trajectory_id: str
    ) -> List[Dict[str, Any]]:
        trajectory = next(
            (t for t in self.trajectories if t.trajectory_id == trajectory_id), None
        )
        if not trajectory:
            return []

        breakdown = []
        for step in trajectory.steps:
            step_data = {
                "step_id": step.step_id,
                "total_reward": step.total_reward,
                "rewards": step.reward_breakdown,
                "action": step.action.name if step.action else None,
                "done": step.done,
            }
            breakdown.append(step_data)

        return breakdown
