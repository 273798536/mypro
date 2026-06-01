from typing import List, Dict, Any, Optional
from dataclasses import asdict
import copy
import json

from .models import GameState, ReplayStep, Command, RobotMusician, Track


class ReplaySystem:
    def __init__(self, game_state: GameState):
        self.original_state = game_state
        self.replay_steps: List[ReplayStep] = []
        self.step_counter = 0

    def record_step(
        self,
        action_type: str,
        musician_id: Optional[str],
        command_id: Optional[str],
        score_before: float,
        score_after: float,
        reason: str,
        state_snapshot: Optional[Dict[str, Any]] = None
    ) -> ReplayStep:
        self.step_counter += 1

        if state_snapshot is None:
            state_snapshot = self._create_state_snapshot()

        step = ReplayStep(
            step_number=self.step_counter,
            time=self.original_state.current_time,
            action_type=action_type,
            musician_id=musician_id,
            command_id=command_id,
            state_snapshot=state_snapshot,
            score_before=score_before,
            score_after=score_after,
            score_delta=score_after - score_before,
            reason=reason
        )

        self.replay_steps.append(step)
        return step

    def _create_state_snapshot(self) -> Dict[str, Any]:
        state = self.original_state
        return {
            "current_time": state.current_time,
            "total_score": state.total_score,
            "musicians": {
                m_id: {
                    "name": m.name,
                    "current_volume": m.current_volume,
                    "is_active": m.is_active,
                    "entry_delay": m.entry_delay,
                    "queue_size": len(m.command_queue)
                }
                for m_id, m in state.musicians.items()
            },
            "volume_mask_count": len(state.volume_mask_events),
            "queue_block_count": len(state.queue_block_events),
            "commands_executed": len([c for c in state.commands if c.executed])
        }

    def get_steps_by_type(self, action_type: str) -> List[ReplayStep]:
        return [s for s in self.replay_steps if s.action_type == action_type]

    def get_steps_by_musician(self, musician_id: str) -> List[ReplayStep]:
        return [s for s in self.replay_steps if s.musician_id == musician_id]

    def get_score_impact_steps(self, min_delta: float = -1.0) -> List[ReplayStep]:
        return [s for s in self.replay_steps if s.score_delta <= min_delta]

    def get_trigger_analysis(self) -> Dict[str, Any]:
        command_triggers = {}
        for step in self.replay_steps:
            if step.command_id:
                command_triggers[step.command_id] = {
                    "step_number": step.step_number,
                    "time": step.time,
                    "musician_id": step.musician_id,
                    "score_impact": step.score_delta,
                    "reason": step.reason
                }

        volume_mask_steps = self.get_steps_by_type("volume_mask")
        queue_block_steps = self.get_steps_by_type("queue_block")

        return {
            "total_steps": len(self.replay_steps),
            "command_triggers": command_triggers,
            "volume_mask_events": len(volume_mask_steps),
            "queue_block_events": len(queue_block_steps),
            "score_history": [
                {"step": s.step_number, "time": s.time, "score": s.score_after}
                for s in self.replay_steps
            ]
        }

    def export_replay(self, filepath: str) -> None:
        replay_data = {
            "game_id": self.original_state.game_id,
            "seed": self.original_state.seed,
            "metronome_withdrawn": self.original_state.metronome.withdrawn,
            "metronome_withdrawn_time": self.original_state.metronome.withdrawn_time,
            "steps": [
                {
                    "step_number": s.step_number,
                    "time": s.time,
                    "action_type": s.action_type,
                    "musician_id": s.musician_id,
                    "command_id": s.command_id,
                    "score_before": s.score_before,
                    "score_after": s.score_after,
                    "score_delta": s.score_delta,
                    "reason": s.reason,
                    "state_snapshot": s.state_snapshot
                }
                for s in self.replay_steps
            ]
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(replay_data, f, ensure_ascii=False, indent=2)

    def get_step_at_time(self, target_time: float) -> Optional[ReplayStep]:
        for step in reversed(self.replay_steps):
            if step.time <= target_time:
                return step
        return None

    def compare_runs(self, other_replay: 'ReplaySystem') -> Dict[str, Any]:
        differences = []
        max_steps = max(len(self.replay_steps), len(other_replay.replay_steps))

        for i in range(max_steps):
            if i >= len(self.replay_steps) or i >= len(other_replay.replay_steps):
                differences.append({
                    "step": i + 1,
                    "difference": "步数不一致"
                })
                continue

            s1 = self.replay_steps[i]
            s2 = other_replay.replay_steps[i]

            if abs(s1.score_delta - s2.score_delta) > 0.01:
                differences.append({
                    "step": i + 1,
                    "difference": "分数变化不同",
                    "run1_score_delta": s1.score_delta,
                    "run2_score_delta": s2.score_delta
                })

            if s1.action_type != s2.action_type:
                differences.append({
                    "step": i + 1,
                    "difference": "动作类型不同",
                    "run1_action": s1.action_type,
                    "run2_action": s2.action_type
                })

        return {
            "is_consistent": len(differences) == 0,
            "differences": differences,
            "run1_final_score": self.replay_steps[-1].score_after if self.replay_steps else 0,
            "run2_final_score": other_replay.replay_steps[-1].score_after if other_replay.replay_steps else 0
        }
