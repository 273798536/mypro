"""MIDI文件解析模块"""

import os
import json
import hashlib
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Tuple, Dict
from datetime import datetime

import mido


@dataclass
class Note:
    """音符数据结构"""
    note_id: int
    pitch: int
    velocity: int
    start_time: float
    end_time: float
    duration: float
    track: int
    channel: int
    measure: int = 0
    beat_position: float = 0.0
    is_manually_corrected: bool = False
    original_velocity: Optional[int] = None
    correction_reason: Optional[str] = None


@dataclass
class TimeSignature:
    """时间签名"""
    numerator: int
    denominator: int
    time: float


@dataclass
class KeySignature:
    """调号"""
    key: str
    time: float


@dataclass
class TempoChange:
    """速度变化"""
    bpm: float
    time: float


@dataclass
class MidiMetadata:
    """MIDI文件元数据"""
    file_path: str
    file_name: str
    file_hash: str
    file_size: int
    created_at: str
    parsed_at: str
    ticks_per_beat: int
    total_duration: float
    time_signatures: List[TimeSignature]
    key_signatures: List[KeySignature]
    tempo_changes: List[TempoChange]
    track_names: List[str]
    source_version: str = "unknown"
    track_version: str = "unknown"


@dataclass
class ParsedMidi:
    """解析后的MIDI数据"""
    metadata: MidiMetadata
    notes: List[Note]
    bad_rows: List[Dict] = field(default_factory=list)


class MidiParser:
    """MIDI文件解析器"""

    def __init__(self, source_version: str = "unknown", track_version: str = "unknown"):
        self.source_version = source_version
        self.track_version = track_version

    def parse_file(self, file_path: str) -> ParsedMidi:
        """解析单个MIDI文件"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"MIDI文件不存在: {file_path}")

        file_hash = self._calculate_file_hash(file_path)
        file_size = os.path.getsize(file_path)
        file_name = os.path.basename(file_path)
        created_at = datetime.fromtimestamp(os.path.getctime(file_path)).isoformat()
        parsed_at = datetime.now().isoformat()

        mid = mido.MidiFile(file_path)
        ticks_per_beat = mid.ticks_per_beat

        time_signatures: List[TimeSignature] = []
        key_signatures: List[KeySignature] = []
        tempo_changes: List[TempoChange] = []
        track_names: List[str] = []

        notes: List[Note] = []
        bad_rows: List[Dict] = []
        note_id = 0

        for track_idx, track in enumerate(mid.tracks):
            track_name = f"Track {track_idx}"
            current_time = 0.0
            active_notes: Dict[Tuple[int, int], Dict] = {}
            current_tempo = 500000
            current_time_sig = (4, 4)

            for msg in track:
                if msg.type == 'track_name':
                    track_name = msg.name
                elif msg.type == 'time_signature':
                    current_time_sig = (msg.numerator, msg.denominator)
                    time_signatures.append(TimeSignature(
                        numerator=msg.numerator,
                        denominator=msg.denominator,
                        time=current_time
                    ))
                elif msg.type == 'key_signature':
                    key_signatures.append(KeySignature(
                        key=msg.key,
                        time=current_time
                    ))
                elif msg.type == 'set_tempo':
                    current_tempo = msg.tempo
                    bpm = mido.tempo2bpm(msg.tempo)
                    tempo_changes.append(TempoChange(
                        bpm=bpm,
                        time=current_time
                    ))

                delta_seconds = mido.tick2second(msg.time, ticks_per_beat, current_tempo)
                current_time += delta_seconds

                if msg.type == 'note_on' and msg.velocity > 0:
                    key = (msg.note, msg.channel)
                    if key in active_notes:
                        bad_rows.append({
                            "type": "overlapping_note",
                            "track": track_idx,
                            "channel": msg.channel,
                            "pitch": msg.note,
                            "time": current_time,
                            "description": f"音符重叠，音高{msg.note}在同一轨道同一通道上重复触发"
                        })
                    active_notes[key] = {
                        "start_time": current_time,
                        "velocity": msg.velocity,
                        "track": track_idx,
                        "channel": msg.channel
                    }

                elif (msg.type == 'note_off' or
                      (msg.type == 'note_on' and msg.velocity == 0)):
                    key = (msg.note, msg.channel)
                    if key in active_notes:
                        note_data = active_notes.pop(key)
                        duration = current_time - note_data["start_time"]

                        if duration <= 0:
                            bad_rows.append({
                                "type": "zero_duration",
                                "track": track_idx,
                                "channel": msg.channel,
                                "pitch": msg.note,
                                "start_time": note_data["start_time"],
                                "end_time": current_time,
                                "velocity": note_data["velocity"],
                                "description": "零时长音符"
                            })
                            continue

                        if note_data["velocity"] < 0 or note_data["velocity"] > 127:
                            bad_rows.append({
                                "type": "invalid_velocity",
                                "track": track_idx,
                                "channel": msg.channel,
                                "pitch": msg.note,
                                "time": note_data["start_time"],
                                "velocity": note_data["velocity"],
                                "description": f"无效力度值: {note_data['velocity']}"
                            })

                        measure, beat_pos = self._calculate_measure_beat(
                            note_data["start_time"],
                            current_time_sig,
                            tempo_changes,
                            ticks_per_beat
                        )

                        note = Note(
                            note_id=note_id,
                            pitch=msg.note,
                            velocity=note_data["velocity"],
                            start_time=note_data["start_time"],
                            end_time=current_time,
                            duration=duration,
                            track=track_idx,
                            channel=msg.channel,
                            measure=measure,
                            beat_position=beat_pos
                        )
                        notes.append(note)
                        note_id += 1
                    else:
                        bad_rows.append({
                            "type": "orphan_note_off",
                            "track": track_idx,
                            "channel": msg.channel,
                            "pitch": msg.note,
                            "time": current_time,
                            "description": "孤立的音符关闭事件，没有对应的音符开启"
                        })

            track_names.append(track_name)

            for key, note_data in active_notes.items():
                bad_rows.append({
                    "type": "unclosed_note",
                    "track": track_idx,
                    "channel": key[1],
                    "pitch": key[0],
                    "start_time": note_data["start_time"],
                    "velocity": note_data["velocity"],
                    "description": "未关闭的音符，轨道结束时仍在播放"
                })

        total_duration = mid.length

        metadata = MidiMetadata(
            file_path=os.path.abspath(file_path),
            file_name=file_name,
            file_hash=file_hash,
            file_size=file_size,
            created_at=created_at,
            parsed_at=parsed_at,
            ticks_per_beat=ticks_per_beat,
            total_duration=total_duration,
            time_signatures=time_signatures,
            key_signatures=key_signatures,
            tempo_changes=tempo_changes,
            track_names=track_names,
            source_version=self.source_version,
            track_version=self.track_version
        )

        return ParsedMidi(
            metadata=metadata,
            notes=notes,
            bad_rows=bad_rows
        )

    def _calculate_file_hash(self, file_path: str) -> str:
        """计算文件哈希用于唯一标识"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def _calculate_measure_beat(
        self,
        time: float,
        time_sig: Tuple[int, int],
        tempo_changes: List[TempoChange],
        ticks_per_beat: int
    ) -> Tuple[int, float]:
        """计算小节号和拍位"""
        if not tempo_changes:
            bpm = 120.0
        else:
            bpm = tempo_changes[-1].bpm

        beats_per_second = bpm / 60.0
        total_beats = time * beats_per_second
        beats_per_measure = time_sig[0]

        measure = int(total_beats // beats_per_measure) + 1
        beat_position = (total_beats % beats_per_measure) + 1

        return measure, round(beat_position, 3)

    def to_dict(self, parsed_midi: ParsedMidi) -> Dict:
        """转换为字典格式"""
        return {
            "metadata": {
                **asdict(parsed_midi.metadata),
                "time_signatures": [asdict(ts) for ts in parsed_midi.metadata.time_signatures],
                "key_signatures": [asdict(ks) for ks in parsed_midi.metadata.key_signatures],
                "tempo_changes": [asdict(tc) for tc in parsed_midi.metadata.tempo_changes],
            },
            "notes": [asdict(note) for note in parsed_midi.notes],
            "bad_rows": parsed_midi.bad_rows
        }

    def save_parsed(self, parsed_midi: ParsedMidi, output_path: str) -> None:
        """保存解析结果到JSON文件"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(parsed_midi), f, ensure_ascii=False, indent=2)
