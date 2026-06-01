from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum
import uuid
import time


class InstrumentType(Enum):
    PIANO = "piano"
    VIOLIN = "violin"
    DRUM = "drum"
    BASS = "bass"
    TRUMPET = "trumpet"
    SAXOPHONE = "saxophone"


class CommandType(Enum):
    PLAY_NOTE = "play_note"
    REST = "rest"
    INCREASE_VOLUME = "increase_volume"
    DECREASE_VOLUME = "decrease_volume"
    SET_VOLUME = "set_volume"
    DELAY_ENTRY = "delay_entry"
    STOP = "stop"


class VolumeMaskLevel(Enum):
    NONE = "none"
    LIGHT = "light"
    MEDIUM = "medium"
    HEAVY = "heavy"
    COMPLETE = "complete"


@dataclass
class Note:
    pitch: str
    duration: float
    velocity: int
    start_time: float = 0.0


@dataclass
class Command:
    command_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    command_type: CommandType = CommandType.PLAY_NOTE
    parameters: Dict[str, Any] = field(default_factory=dict)
    scheduled_time: float = 0.0
    actual_time: Optional[float] = None
    executed: bool = False
    triggered_by: Optional[str] = None
    score_impact: float = 0.0


@dataclass
class RobotMusician:
    musician_id: str
    name: str
    instrument: InstrumentType
    base_volume: int
    current_volume: int = 70
    is_active: bool = True
    entry_delay: float = 0.0
    current_track_id: Optional[str] = None
    command_queue: List[Command] = field(default_factory=list)


@dataclass
class Track:
    track_id: str
    name: str
    musician_id: str
    notes: List[Note] = field(default_factory=list)
    volume_levels: Dict[float, int] = field(default_factory=dict)


@dataclass
class VolumeMaskEvent:
    time: float
    masker_musician_id: str
    masked_musician_id: str
    mask_level: VolumeMaskLevel
    masker_volume: int
    masked_volume: int
    affected_notes: List[str]
    score_impact: float


@dataclass
class QueueBlockEvent:
    time: float
    musician_id: str
    blocked_commands: List[str]
    block_duration: float
    reason: str
    score_impact: float


@dataclass
class ScheduledEvent:
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = ""
    time: float = 0.0
    musician_id: Optional[str] = None
    track_id: Optional[str] = None
    command_id: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Metronome:
    bpm: int = 120
    beats_per_measure: int = 4
    is_active: bool = True
    withdrawn: bool = False
    withdrawn_time: Optional[float] = None


@dataclass
class GameState:
    game_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    musicians: Dict[str, RobotMusician] = field(default_factory=dict)
    tracks: Dict[str, Track] = field(default_factory=dict)
    commands: List[Command] = field(default_factory=list)
    volume_mask_events: List[VolumeMaskEvent] = field(default_factory=list)
    queue_block_events: List[QueueBlockEvent] = field(default_factory=list)
    scheduled_events: List[ScheduledEvent] = field(default_factory=list)
    metronome: Metronome = field(default_factory=Metronome)
    current_time: float = 0.0
    total_score: float = 100.0
    is_complete: bool = False
    seed: int = field(default_factory=lambda: int(time.time()))


@dataclass
class ReplayStep:
    step_number: int
    time: float
    action_type: str
    musician_id: Optional[str]
    command_id: Optional[str]
    state_snapshot: Dict[str, Any]
    score_before: float
    score_after: float
    score_delta: float
    reason: str
