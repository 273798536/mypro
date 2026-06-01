from typing import Dict, List, Optional, Tuple
from .models import (
    GameState, RobotMusician, Track, Command, CommandType,
    VolumeMaskEvent, VolumeMaskLevel, QueueBlockEvent,
    ScheduledEvent, Note
)
import random


class EnsembleEngine:
    VOLUME_MASK_THRESHOLDS = {
        VolumeMaskLevel.NONE: 0,
        VolumeMaskLevel.LIGHT: 15,
        VolumeMaskLevel.MEDIUM: 30,
        VolumeMaskLevel.HEAVY: 50,
        VolumeMaskLevel.COMPLETE: 70
    }

    QUEUE_BLOCK_THRESHOLD = 5
    MAX_QUEUE_SIZE = 10

    def __init__(self, game_state: GameState):
        self.game_state = game_state
        self._rng = random.Random(game_state.seed)

    def calculate_volume_mask(
        self,
        masker: RobotMusician,
        masked: RobotMusician,
        current_time: float
    ) -> Tuple[VolumeMaskLevel, float]:
        volume_diff = masker.current_volume - masked.current_volume

        if volume_diff <= self.VOLUME_MASK_THRESHOLDS[VolumeMaskLevel.NONE]:
            return VolumeMaskLevel.NONE, 0.0
        elif volume_diff < self.VOLUME_MASK_THRESHOLDS[VolumeMaskLevel.LIGHT]:
            return VolumeMaskLevel.LIGHT, -2.0
        elif volume_diff < self.VOLUME_MASK_THRESHOLDS[VolumeMaskLevel.MEDIUM]:
            return VolumeMaskLevel.MEDIUM, -5.0
        elif volume_diff < self.VOLUME_MASK_THRESHOLDS[VolumeMaskLevel.HEAVY]:
            return VolumeMaskLevel.HEAVY, -10.0
        else:
            return VolumeMaskLevel.COMPLETE, -15.0

    def check_volume_masks(self, current_time: float) -> List[VolumeMaskEvent]:
        events = []
        musicians = list(self.game_state.musicians.values())

        for i, masker in enumerate(musicians):
            if not masker.is_active:
                continue

            for j, masked in enumerate(musicians):
                if i == j or not masked.is_active:
                    continue

                mask_level, score_impact = self.calculate_volume_mask(
                    masker, masked, current_time
                )

                if mask_level != VolumeMaskLevel.NONE:
                    affected_notes = self._get_affected_notes(
                        masked.musician_id, current_time
                    )

                    event = VolumeMaskEvent(
                        time=current_time,
                        masker_musician_id=masker.musician_id,
                        masked_musician_id=masked.musician_id,
                        mask_level=mask_level,
                        masker_volume=masker.current_volume,
                        masked_volume=masked.current_volume,
                        affected_notes=affected_notes,
                        score_impact=score_impact
                    )
                    events.append(event)

        return events

    def _get_affected_notes(self, musician_id: str, current_time: float) -> List[str]:
        track_id = self.game_state.musicians[musician_id].current_track_id
        if not track_id:
            return []

        track = self.game_state.tracks.get(track_id)
        if not track:
            return []

        affected = []
        for note in track.notes:
            if note.start_time <= current_time < note.start_time + note.duration:
                affected.append(note.pitch)
        return affected

    def check_queue_block(
        self,
        musician: RobotMusician,
        current_time: float
    ) -> Optional[QueueBlockEvent]:
        queue_size = len(musician.command_queue)

        if queue_size >= self.QUEUE_BLOCK_THRESHOLD:
            block_duration = 0.5 * (queue_size - self.QUEUE_BLOCK_THRESHOLD + 1)
            blocked_commands = [
                cmd.command_id for cmd in musician.command_queue[:3]
            ]

            reason = "队列堵塞"
            if queue_size >= self.MAX_QUEUE_SIZE:
                reason = "队列已满，新指令被丢弃"

            score_impact = -3.0 * (queue_size - self.QUEUE_BLOCK_THRESHOLD + 1)

            return QueueBlockEvent(
                time=current_time,
                musician_id=musician.musician_id,
                blocked_commands=blocked_commands,
                block_duration=block_duration,
                reason=reason,
                score_impact=score_impact
            )

        return None

    def apply_delay_entry(
        self,
        musician: RobotMusician,
        delay_seconds: float,
        current_time: float
    ) -> ScheduledEvent:
        musician.entry_delay = delay_seconds
        musician.is_active = False

        event = ScheduledEvent(
            event_type="delay_entry",
            time=current_time,
            musician_id=musician.musician_id,
            details={
                "delay_seconds": delay_seconds,
                "resume_time": current_time + delay_seconds
            }
        )

        self.game_state.scheduled_events.append(event)
        return event

    def execute_command(
        self,
        musician: RobotMusician,
        command: Command,
        current_time: float
    ) -> Tuple[float, str]:
        command.actual_time = current_time
        command.executed = True

        score_delta = 0.0
        reason = ""

        if command.command_type == CommandType.PLAY_NOTE:
            score_delta, reason = self._execute_play_note(musician, command, current_time)
        elif command.command_type == CommandType.SET_VOLUME:
            score_delta, reason = self._execute_set_volume(musician, command)
        elif command.command_type == CommandType.INCREASE_VOLUME:
            score_delta, reason = self._execute_increase_volume(musician, command)
        elif command.command_type == CommandType.DECREASE_VOLUME:
            score_delta, reason = self._execute_decrease_volume(musician, command)
        elif command.command_type == CommandType.REST:
            score_delta, reason = self._execute_rest(musician, command)
        elif command.command_type == CommandType.DELAY_ENTRY:
            score_delta, reason = self._execute_delay_entry(musician, command, current_time)
        elif command.command_type == CommandType.STOP:
            score_delta, reason = self._execute_stop(musician)

        command.score_impact = score_delta
        return score_delta, reason

    def _execute_play_note(
        self,
        musician: RobotMusician,
        command: Command,
        current_time: float
    ) -> Tuple[float, str]:
        pitch = command.parameters.get("pitch", "C4")
        duration = command.parameters.get("duration", 1.0)

        if musician.entry_delay > 0:
            return -5.0, f"乐手 {musician.name} 仍在延迟进入状态，无法演奏 {pitch}"

        note = Note(
            pitch=pitch,
            duration=duration,
            velocity=musician.current_volume,
            start_time=current_time
        )

        track_id = musician.current_track_id
        if track_id and track_id in self.game_state.tracks:
            self.game_state.tracks[track_id].notes.append(note)

        return 1.0, f"乐手 {musician.name} 演奏 {pitch} (音量: {musician.current_volume})"

    def _execute_set_volume(
        self,
        musician: RobotMusician,
        command: Command
    ) -> Tuple[float, str]:
        new_volume = command.parameters.get("volume", 70)
        old_volume = musician.current_volume
        musician.current_volume = max(0, min(100, new_volume))

        delta = musician.current_volume - old_volume
        if delta > 20:
            return -2.0, f"音量骤升 {delta}，可能造成音量遮盖"
        elif delta < -20:
            return -1.0, f"音量骤降 {abs(delta)}，声部可能丢失"

        return 0.5, f"乐手 {musician.name} 音量设置为 {musician.current_volume}"

    def _execute_increase_volume(
        self,
        musician: RobotMusician,
        command: Command
    ) -> Tuple[float, str]:
        amount = command.parameters.get("amount", 10)
        musician.current_volume = min(100, musician.current_volume + amount)
        return 0.3, f"乐手 {musician.name} 音量增加到 {musician.current_volume}"

    def _execute_decrease_volume(
        self,
        musician: RobotMusician,
        command: Command
    ) -> Tuple[float, str]:
        amount = command.parameters.get("amount", 10)
        musician.current_volume = max(0, musician.current_volume - amount)
        return 0.3, f"乐手 {musician.name} 音量降低到 {musician.current_volume}"

    def _execute_rest(
        self,
        musician: RobotMusician,
        command: Command
    ) -> Tuple[float, str]:
        duration = command.parameters.get("duration", 1.0)
        return 0.5, f"乐手 {musician.name} 休止 {duration} 拍"

    def _execute_delay_entry(
        self,
        musician: RobotMusician,
        command: Command,
        current_time: float
    ) -> Tuple[float, str]:
        delay = command.parameters.get("delay", 2.0)
        self.apply_delay_entry(musician, delay, current_time)
        return -2.0, f"乐手 {musician.name} 延迟 {delay} 秒进入"

    def _execute_stop(
        self,
        musician: RobotMusician
    ) -> Tuple[float, str]:
        musician.is_active = False
        musician.command_queue.clear()
        return -3.0, f"乐手 {musician.name} 停止演奏"

    def advance_time(self, time_step: float = 0.1) -> Dict[str, any]:
        old_time = self.game_state.current_time
        new_time = old_time + time_step
        self.game_state.current_time = new_time

        events_triggered = []
        total_score_delta = 0.0

        for event in self.game_state.scheduled_events:
            if event.event_type == "delay_entry":
                resume_time = event.details.get("resume_time", 0)
                if old_time < resume_time <= new_time:
                    musician_id = event.musician_id
                    if musician_id in self.game_state.musicians:
                        musician = self.game_state.musicians[musician_id]
                        musician.is_active = True
                        musician.entry_delay = 0.0
                        events_triggered.append({
                            "type": "musician_resumed",
                            "musician_id": musician_id,
                            "time": new_time
                        })

        mask_events = self.check_volume_masks(new_time)
        for mask_event in mask_events:
            self.game_state.volume_mask_events.append(mask_event)
            total_score_delta += mask_event.score_impact
            events_triggered.append({
                "type": "volume_mask",
                "masker": mask_event.masker_musician_id,
                "masked": mask_event.masked_musician_id,
                "level": mask_event.mask_level.value,
                "score_impact": mask_event.score_impact
            })

        for musician in self.game_state.musicians.values():
            block_event = self.check_queue_block(musician, new_time)
            if block_event:
                self.game_state.queue_block_events.append(block_event)
                total_score_delta += block_event.score_impact
                events_triggered.append({
                    "type": "queue_block",
                    "musician_id": musician.musician_id,
                    "reason": block_event.reason,
                    "score_impact": block_event.score_impact
                })

        self.game_state.total_score += total_score_delta

        return {
            "old_time": old_time,
            "new_time": new_time,
            "score_delta": total_score_delta,
            "events": events_triggered
        }

    def queue_command(
        self,
        musician_id: str,
        command: Command,
        triggered_by: Optional[str] = None
    ) -> bool:
        if musician_id not in self.game_state.musicians:
            return False

        musician = self.game_state.musicians[musician_id]
        command.triggered_by = triggered_by

        if len(musician.command_queue) >= self.MAX_QUEUE_SIZE:
            return False

        musician.command_queue.append(command)
        self.game_state.commands.append(command)
        return True

    def process_command_queue(self, current_time: float) -> List[Dict[str, any]]:
        results = []

        for musician in self.game_state.musicians.values():
            if not musician.is_active:
                continue

            if musician.command_queue:
                command = musician.command_queue.pop(0)
                score_delta, reason = self.execute_command(
                    musician, command, current_time
                )
                self.game_state.total_score += score_delta
                results.append({
                    "musician_id": musician.musician_id,
                    "command_id": command.command_id,
                    "score_delta": score_delta,
                    "reason": reason
                })

        return results
