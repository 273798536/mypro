"""生成测试用MIDI文件 - 包含各类异常场景"""

import os
import sys
import mido
from mido import Message, MidiFile, MidiTrack
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


def generate_test_midi(output_path: str):
    """生成包含各类异常的测试MIDI文件"""

    mid = MidiFile()
    track = MidiTrack()
    mid.tracks.append(track)

    track.append(Message('program_change', program=0, time=0))
    track.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, clocks_per_click=24, notated_32nd_notes_per_beat=8, time=0))
    track.append(mido.MetaMessage('key_signature', key='C', time=0))
    track.append(mido.MetaMessage('set_tempo', tempo=500000, time=0))

    ticks_per_beat = mid.ticks_per_beat
    beat = ticks_per_beat
    measure = beat * 4

    notes = []

    def add_note(pitch: int, velocity: int, start_tick: int, duration: int, measure_num: int):
        """添加一个音符"""
        notes.append({
            'pitch': pitch,
            'velocity': velocity,
            'start_tick': start_tick,
            'duration': duration,
            'measure': measure_num
        })

    current_tick = 0

    for m in range(1, 5):
        for i in range(4):
            pitch = 60 + i
            velocity = 64 + random.randint(-10, 10)
            add_note(pitch, velocity, current_tick, beat // 2, m)
            current_tick += beat // 2

    for m in range(5, 9):
        for i in range(4):
            pitch = 60 + i
            if i == 1 and m == 5:
                velocity = 127
            elif i == 2 and m == 6:
                velocity = 5
            elif i == 0 and m == 7:
                velocity = 0
            else:
                velocity = 70 + random.randint(-5, 5)
            add_note(pitch, velocity, current_tick, beat // 2, m)
            current_tick += beat // 2

    for m in range(9, 13):
        for i in range(4):
            pitch = 60 + i
            if i == 1 and m == 9:
                velocity = 120
            elif i == 1 and m == 10:
                velocity = 50
            elif i == 1 and m == 11:
                velocity = 115
            else:
                velocity = 75 + random.randint(-3, 3)
            add_note(pitch, velocity, current_tick, beat // 2, m)
            current_tick += beat // 2

    for m in range(13, 17):
        for i in range(4):
            pitch = 60 + i
            velocity = 60 + random.randint(-5, 5)
            start_offset = 0
            if m == 13 and i == 0:
                start_offset = -ticks_per_beat // 8
            elif m == 14 and i == 1:
                start_offset = -ticks_per_beat // 4
            elif m == 15 and i == 2:
                start_offset = -ticks_per_beat // 3
            add_note(pitch, velocity, current_tick + start_offset, beat // 2, m)
            current_tick += beat // 2

    for m in range(17, 21):
        base_velocity = 70
        for i in range(4):
            pitch = 60 + i
            if i == 0:
                velocity = base_velocity + 40
            elif i == 1:
                velocity = base_velocity - 35
            else:
                velocity = base_velocity + random.randint(-3, 3)
            add_note(pitch, velocity, current_tick, beat // 2, m)
            current_tick += beat // 2

    for m in range(21, 25):
        for i in range(4):
            pitch = 60 + i
            velocity = 65 + random.randint(-5, 5)
            if m == 21 and i == 1:
                duration = 0
            else:
                duration = beat // 2
            add_note(pitch, velocity, current_tick, duration, m)
            current_tick += beat // 2

    sorted_notes = sorted(notes, key=lambda n: n['start_tick'])

    prev_end_tick = 0
    for note in sorted_notes:
        delta_start = note['start_tick'] - prev_end_tick
        if delta_start < 0:
            delta_start = 0

        track.append(Message('note_on', note=note['pitch'], velocity=note['velocity'], time=delta_start))
        track.append(Message('note_off', note=note['pitch'], velocity=0, time=note['duration']))

        prev_end_tick = note['start_tick'] + note['duration']

    mid.save(output_path)
    print(f"测试MIDI文件已生成: {output_path}")
    print(f"  总音符数: {len(notes)}")
    print(f"  包含异常类型:")
    print(f"    - 正常乐句 (1-4小节)")
    print(f"    - 力度爆点/极值 (5-8小节): 127, 5, 0")
    print(f"    - 局部异常值 (9-12小节)")
    print(f"    - 小节错位/节拍偏移 (13-16小节)")
    print(f"    - 力度突变 (17-20小节)")
    print(f"    - 零时长音符 (21-24小节)")

    return output_path


if __name__ == '__main__':
    output_dir = os.path.join(os.path.dirname(__file__), 'test_files')
    os.makedirs(output_dir, exist_ok=True)

    random.seed(42)

    midi_path = os.path.join(output_dir, 'test_with_anomalies.mid')
    generate_test_midi(midi_path)
