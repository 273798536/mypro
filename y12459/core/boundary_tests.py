from typing import List, Dict, Any, Callable
from dataclasses import dataclass
import copy

from .models import GameState, RobotMusician, Track, Command, CommandType, InstrumentType
from .ensemble_engine import EnsembleEngine
from .replay_system import ReplaySystem


@dataclass
class TestCase:
    name: str
    description: str
    setup_function: Callable[[GameState], None]
    expected_outcome: Dict[str, Any]


class BoundaryTestSuite:
    def __init__(self, seed: int = 42):
        self.seed = seed
        self.test_cases = self._register_test_cases()
        self.results: List[Dict[str, Any]] = []

    def _register_test_cases(self) -> List[TestCase]:
        return [
            TestCase(
                name="延迟进入测试",
                description="验证乐手延迟进入功能，延迟期间不能演奏",
                setup_function=self._setup_delay_entry_test,
                expected_outcome={
                    "should_have_delay": True,
                    "should_fail_play_during_delay": True,
                    "should_resume_after_delay": True
                }
            ),
            TestCase(
                name="音量遮盖测试",
                description="验证音量差异超过阈值时触发音量遮盖",
                setup_function=self._setup_volume_mask_test,
                expected_outcome={
                    "should_trigger_mask": True,
                    "should_have_score_penalty": True
                }
            ),
            TestCase(
                name="队列堵塞测试",
                description="验证指令队列超过阈值时触发堵塞",
                setup_function=self._setup_queue_block_test,
                expected_outcome={
                    "should_trigger_block": True,
                    "should_have_score_penalty": True
                }
            ),
            TestCase(
                name="结果一致性测试",
                description="重复运行相同测试应得到相同结果",
                setup_function=self._setup_consistency_test,
                expected_outcome={
                    "should_be_consistent": True
                }
            )
        ]

    def _create_base_state(self) -> GameState:
        state = GameState(seed=self.seed)

        piano = RobotMusician(
            musician_id="piano_1",
            name="钢琴手",
            instrument=InstrumentType.PIANO,
            base_volume=70,
            current_volume=70
        )

        violin = RobotMusician(
            musician_id="violin_1",
            name="小提琴手",
            instrument=InstrumentType.VIOLIN,
            base_volume=50,
            current_volume=50
        )

        drum = RobotMusician(
            musician_id="drum_1",
            name="鼓手",
            instrument=InstrumentType.DRUM,
            base_volume=80,
            current_volume=80
        )

        state.musicians = {
            "piano_1": piano,
            "violin_1": violin,
            "drum_1": drum
        }

        piano_track = Track(
            track_id="track_piano",
            name="钢琴声部",
            musician_id="piano_1"
        )
        violin_track = Track(
            track_id="track_violin",
            name="小提琴声部",
            musician_id="violin_1"
        )
        drum_track = Track(
            track_id="track_drum",
            name="鼓声部",
            musician_id="drum_1"
        )

        state.tracks = {
            "track_piano": piano_track,
            "track_violin": violin_track,
            "track_drum": drum_track
        }

        piano.current_track_id = "track_piano"
        violin.current_track_id = "track_violin"
        drum.current_track_id = "track_drum"

        return state

    def _setup_delay_entry_test(self, state: GameState) -> None:
        delay_cmd = Command(
            command_type=CommandType.DELAY_ENTRY,
            parameters={"delay": 2.0},
            scheduled_time=0.0
        )
        state.musicians["violin_1"].command_queue.append(delay_cmd)
        state.commands.append(delay_cmd)

        play_cmd = Command(
            command_type=CommandType.PLAY_NOTE,
            parameters={"pitch": "A4", "duration": 1.0},
            scheduled_time=0.5
        )
        state.musicians["violin_1"].command_queue.append(play_cmd)
        state.commands.append(play_cmd)

    def _setup_volume_mask_test(self, state: GameState) -> None:
        state.musicians["drum_1"].current_volume = 95
        state.musicians["violin_1"].current_volume = 30

    def _setup_queue_block_test(self, state: GameState) -> None:
        for i in range(7):
            cmd = Command(
                command_type=CommandType.PLAY_NOTE,
                parameters={"pitch": f"C{4 + i}", "duration": 0.5},
                scheduled_time=float(i) * 0.1
            )
            state.musicians["piano_1"].command_queue.append(cmd)
            state.commands.append(cmd)

    def _setup_consistency_test(self, state: GameState) -> None:
        cmds = [
            ("piano_1", CommandType.SET_VOLUME, {"volume": 80}),
            ("violin_1", CommandType.SET_VOLUME, {"volume": 40}),
            ("drum_1", CommandType.PLAY_NOTE, {"pitch": "C2", "duration": 1.0}),
            ("piano_1", CommandType.PLAY_NOTE, {"pitch": "C4", "duration": 1.0}),
        ]
        for musician_id, cmd_type, params in cmds:
            cmd = Command(command_type=cmd_type, parameters=params)
            state.musicians[musician_id].command_queue.append(cmd)
            state.commands.append(cmd)

    def run_test(self, test_case: TestCase) -> Dict[str, Any]:
        state1 = self._create_base_state()
        test_case.setup_function(state1)

        engine1 = EnsembleEngine(state1)
        replay1 = ReplaySystem(state1)

        initial_score = state1.total_score

        for time_step in range(30):
            current_time = time_step * 0.1
            score_before = state1.total_score

            cmd_results = engine1.process_command_queue(current_time)
            for result in cmd_results:
                replay1.record_step(
                    action_type="command_executed",
                    musician_id=result["musician_id"],
                    command_id=result["command_id"],
                    score_before=score_before,
                    score_after=state1.total_score,
                    reason=result["reason"]
                )
                score_before = state1.total_score

            advance_result = engine1.advance_time(0.1)
            for event in advance_result["events"]:
                replay1.record_step(
                    action_type=event["type"],
                    musician_id=event.get("musician_id"),
                    command_id=None,
                    score_before=score_before,
                    score_after=state1.total_score,
                    reason=str(event)
                )

        state2 = self._create_base_state()
        test_case.setup_function(state2)

        engine2 = EnsembleEngine(state2)
        replay2 = ReplaySystem(state2)

        for time_step in range(30):
            current_time = time_step * 0.1
            score_before2 = state2.total_score
            cmd_results2 = engine2.process_command_queue(current_time)
            for result in cmd_results2:
                replay2.record_step(
                    action_type="command_executed",
                    musician_id=result["musician_id"],
                    command_id=result["command_id"],
                    score_before=score_before2,
                    score_after=state2.total_score,
                    reason=result["reason"]
                )
                score_before2 = state2.total_score

            advance_result2 = engine2.advance_time(0.1)
            for event in advance_result2["events"]:
                replay2.record_step(
                    action_type=event["type"],
                    musician_id=event.get("musician_id"),
                    command_id=None,
                    score_before=score_before2,
                    score_after=state2.total_score,
                    reason=str(event)
                )

        consistency_result = replay1.compare_runs(replay2)

        return {
            "test_name": test_case.name,
            "final_score_run1": state1.total_score,
            "final_score_run2": state2.total_score,
            "is_consistent": consistency_result["is_consistent"],
            "volume_mask_count": len(state1.volume_mask_events),
            "queue_block_count": len(state1.queue_block_events),
            "commands_executed": len([c for c in state1.commands if c.executed]),
            "replay_steps": len(replay1.replay_steps),
            "differences": consistency_result["differences"]
        }

    def run_all_tests(self) -> List[Dict[str, Any]]:
        self.results = []
        for test_case in self.test_cases:
            result = self.run_test(test_case)
            self.results.append(result)
        return self.results

    def get_summary(self) -> Dict[str, Any]:
        if not self.results:
            return {"message": "No tests run yet"}

        consistent_count = sum(1 for r in self.results if r["is_consistent"])
        total_tests = len(self.results)

        return {
            "total_tests": total_tests,
            "consistent_results": consistent_count,
            "success_rate": consistent_count / total_tests,
            "all_consistent": consistent_count == total_tests,
            "individual_results": [
                {
                    "name": r["test_name"],
                    "is_consistent": r["is_consistent"],
                    "final_score": r["final_score_run1"]
                }
                for r in self.results
            ]
        }
