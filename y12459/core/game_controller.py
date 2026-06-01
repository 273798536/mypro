from typing import Dict, Any, Optional, List
import copy

from .models import (
    GameState, RobotMusician, Track, Command, CommandType,
    InstrumentType, Metronome
)
from .ensemble_engine import EnsembleEngine
from .replay_system import ReplaySystem
from .report_generator import ReportGenerator


class GameController:
    def __init__(self, seed: int = 42):
        self.game_state = GameState(seed=seed)
        self.engine = EnsembleEngine(self.game_state)
        self.replay = ReplaySystem(self.game_state)
        self.is_running = False

    def setup_default_ensemble(self) -> None:
        musicians_config = [
            ("piano_1", "钢琴手", InstrumentType.PIANO, 70),
            ("violin_1", "小提琴手", InstrumentType.VIOLIN, 50),
            ("drum_1", "鼓手", InstrumentType.DRUM, 80),
            ("bass_1", "贝斯手", InstrumentType.BASS, 60),
            ("trumpet_1", "小号手", InstrumentType.TRUMPET, 75),
        ]

        for m_id, name, instrument, base_volume in musicians_config:
            musician = RobotMusician(
                musician_id=m_id,
                name=name,
                instrument=instrument,
                base_volume=base_volume,
                current_volume=base_volume
            )
            self.game_state.musicians[m_id] = musician

            track_id = f"track_{m_id}"
            track = Track(
                track_id=track_id,
                name=f"{name}声部",
                musician_id=m_id
            )
            self.game_state.tracks[track_id] = track
            musician.current_track_id = track_id

    def add_musician(
        self,
        musician_id: str,
        name: str,
        instrument: InstrumentType,
        base_volume: int
    ) -> bool:
        if musician_id in self.game_state.musicians:
            return False

        musician = RobotMusician(
            musician_id=musician_id,
            name=name,
            instrument=instrument,
            base_volume=base_volume,
            current_volume=base_volume
        )
        self.game_state.musicians[musician_id] = musician

        track_id = f"track_{musician_id}"
        track = Track(
            track_id=track_id,
            name=f"{name}声部",
            musician_id=musician_id
        )
        self.game_state.tracks[track_id] = track
        musician.current_track_id = track_id

        return True

    def player_action(
        self,
        musician_id: str,
        command_type: CommandType,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if parameters is None:
            parameters = {}

        command = Command(
            command_type=command_type,
            parameters=parameters,
            scheduled_time=self.game_state.current_time
        )

        score_before = self.game_state.total_score
        success = self.engine.queue_command(
            musician_id, command, triggered_by="player"
        )

        if success:
            self.replay.record_step(
                action_type="player_action",
                musician_id=musician_id,
                command_id=command.command_id,
                score_before=score_before,
                score_after=self.game_state.total_score,
                reason=f"玩家为乐手 {self.game_state.musicians[musician_id].name} 发送指令: {command_type.value}"
            )

        return {
            "success": success,
            "command_id": command.command_id if success else None,
            "score_before": score_before,
            "score_after": self.game_state.total_score
        }

    def run_game_step(self, time_step: float = 0.1) -> Dict[str, Any]:
        current_time = self.game_state.current_time
        score_before = self.game_state.total_score

        cmd_results = self.engine.process_command_queue(current_time)
        for result in cmd_results:
            self.replay.record_step(
                action_type="command_executed",
                musician_id=result["musician_id"],
                command_id=result["command_id"],
                score_before=score_before,
                score_after=self.game_state.total_score,
                reason=result["reason"]
            )
            score_before = self.game_state.total_score

        advance_result = self.engine.advance_time(time_step)
        for event in advance_result["events"]:
            self.replay.record_step(
                action_type=event["type"],
                musician_id=event.get("musician_id"),
                command_id=None,
                score_before=score_before,
                score_after=self.game_state.total_score,
                reason=str(event)
            )

        return {
            "time": self.game_state.current_time,
            "commands_executed": len(cmd_results),
            "events_triggered": len(advance_result["events"]),
            "current_score": self.game_state.total_score
        }

    def withdraw_metronome(self) -> None:
        self.game_state.metronome.withdrawn = True
        self.game_state.metronome.withdrawn_time = self.game_state.current_time
        self.game_state.metronome.is_active = False

    def end_game(self) -> Dict[str, Any]:
        self.game_state.is_complete = True

        report_gen = ReportGenerator(self.game_state, self.replay)
        report = report_gen.generate_full_report()

        return {
            "final_score": self.game_state.total_score,
            "report": report,
            "replay_steps_count": len(self.replay.replay_steps)
        }

    def get_trigger_analysis(self) -> Dict[str, Any]:
        return self.replay.get_trigger_analysis()

    def export_replay(self, filepath: str) -> None:
        self.replay.export_replay(filepath)

    def export_report(self, filepath: str, format: str = "text") -> None:
        report_gen = ReportGenerator(self.game_state, self.replay)
        if format == "json":
            report_gen.export_report_json(filepath)
        else:
            report_gen.export_report_text(filepath)

    def get_current_status(self) -> Dict[str, Any]:
        state = self.game_state
        return {
            "current_time": state.current_time,
            "current_score": state.total_score,
            "is_complete": state.is_complete,
            "metronome_active": state.metronome.is_active,
            "metronome_withdrawn": state.metronome.withdrawn,
            "musicians": [
                {
                    "id": m_id,
                    "name": m.name,
                    "volume": m.current_volume,
                    "active": m.is_active,
                    "queue_size": len(m.command_queue)
                }
                for m_id, m in state.musicians.items()
            ],
            "volume_mask_events": len(state.volume_mask_events),
            "queue_block_events": len(state.queue_block_events)
        }
