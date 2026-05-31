import os
import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from pydub import AudioSegment


@dataclass
class AudioFrame:
    start_ms: int
    end_ms: int
    rms_db: float
    peak_db: float
    source_file: str

    @property
    def duration_ms(self) -> int:
        return self.end_ms - self.start_ms


@dataclass
class AnalysisResult:
    source_file: str
    duration_ms: int
    sample_rate: int
    frames: List[AudioFrame] = field(default_factory=list)
    average_rms_db: float = 0.0
    min_rms_db: float = 0.0
    max_rms_db: float = 0.0

    def frame_at_time(self, ms: int) -> Optional[AudioFrame]:
        for f in self.frames:
            if f.start_ms <= ms < f.end_ms:
                return f
        return None


class AudioAnalyzer:
    def __init__(self, frame_ms: int = 100, silence_threshold_db: float = -40.0,
                 music_loud_threshold_db: float = -15.0):
        self.frame_ms = frame_ms
        self.silence_threshold_db = silence_threshold_db
        self.music_loud_threshold_db = music_loud_threshold_db

    def load_audio(self, file_path: str) -> AudioSegment:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"音频文件不存在: {file_path}")
        return AudioSegment.from_file(file_path)

    def analyze_file(self, file_path: str) -> AnalysisResult:
        audio = self.load_audio(file_path)
        duration_ms = len(audio)
        sample_rate = audio.frame_rate

        frames = []
        rms_values = []

        for start_ms in range(0, duration_ms, self.frame_ms):
            end_ms = min(start_ms + self.frame_ms, duration_ms)
            segment = audio[start_ms:end_ms]

            rms = segment.rms
            if rms > 0:
                rms_db = 20 * np.log10(rms / 32768.0)
            else:
                rms_db = -60.0

            peak = segment.max
            if peak > 0:
                peak_db = 20 * np.log10(peak / 32768.0)
            else:
                peak_db = -60.0

            rms_values.append(rms_db)
            frames.append(AudioFrame(
                start_ms=start_ms,
                end_ms=end_ms,
                rms_db=round(rms_db, 2),
                peak_db=round(peak_db, 2),
                source_file=file_path
            ))

        if rms_values:
            avg_rms = np.mean(rms_values)
            min_rms = np.min(rms_values)
            max_rms = np.max(rms_values)
        else:
            avg_rms = min_rms = max_rms = -60.0

        return AnalysisResult(
            source_file=file_path,
            duration_ms=duration_ms,
            sample_rate=sample_rate,
            frames=frames,
            average_rms_db=round(avg_rms, 2),
            min_rms_db=round(min_rms, 2),
            max_rms_db=round(max_rms, 2)
        )

    def analyze_directory(self, dir_path: str) -> List[AnalysisResult]:
        if not os.path.isdir(dir_path):
            raise NotADirectoryError(f"目录不存在: {dir_path}")

        audio_extensions = {'.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'}
        results = []

        for root, _, files in os.walk(dir_path):
            for f in files:
                if os.path.splitext(f)[1].lower() in audio_extensions:
                    file_path = os.path.join(root, f)
                    try:
                        result = self.analyze_file(file_path)
                        results.append(result)
                    except Exception as e:
                        print(f"警告: 无法分析 {file_path}: {e}")

        return results

    def detect_silence_segments(self, result: AnalysisResult,
                                min_duration_ms: int = 500) -> List[Tuple[int, int]]:
        segments = []
        silence_start = None

        for frame in result.frames:
            is_silent = frame.rms_db < self.silence_threshold_db
            if is_silent and silence_start is None:
                silence_start = frame.start_ms
            elif not is_silent and silence_start is not None:
                duration = frame.start_ms - silence_start
                if duration >= min_duration_ms:
                    segments.append((silence_start, frame.start_ms))
                silence_start = None

        if silence_start is not None:
            duration = result.duration_ms - silence_start
            if duration >= min_duration_ms:
                segments.append((silence_start, result.duration_ms))

        return segments

    def detect_loud_music_segments(self, result: AnalysisResult,
                                   min_duration_ms: int = 1000,
                                   voice_reference_db: Optional[float] = None) -> List[Tuple[int, int]]:
        threshold = self.music_loud_threshold_db
        if voice_reference_db is not None:
            threshold = voice_reference_db + 3.0

        segments = []
        loud_start = None

        for frame in result.frames:
            is_loud = frame.rms_db > threshold
            if is_loud and loud_start is None:
                loud_start = frame.start_ms
            elif not is_loud and loud_start is not None:
                duration = frame.start_ms - loud_start
                if duration >= min_duration_ms:
                    segments.append((loud_start, frame.start_ms))
                loud_start = None

        if loud_start is not None:
            duration = result.duration_ms - loud_start
            if duration >= min_duration_ms:
                segments.append((loud_start, result.duration_ms))

        return segments
