import numpy as np
import librosa
import librosa.display
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


@dataclass
class AudioFeatures:
    file_path: str
    duration: float
    sr: int
    y: np.ndarray
    tempo: float
    beat_frames: np.ndarray
    beat_times: np.ndarray
    chroma: np.ndarray
    mfcc: np.ndarray
    spectral_centroid: np.ndarray
    rms: np.ndarray
    pitch_contour: np.ndarray
    pitch_times: np.ndarray
    chroma_times: np.ndarray

    def summary(self) -> dict:
        return {
            "file_path": self.file_path,
            "duration_seconds": round(self.duration, 2),
            "sample_rate": self.sr,
            "tempo_bpm": round(self.tempo, 2),
            "num_beats": len(self.beat_frames),
            "avg_beat_interval_ms": round(np.mean(np.diff(self.beat_times)) * 1000, 1) if len(self.beat_times) > 1 else 0
        }


def load_audio(file_path: str, sr: int = 22050, mono: bool = True) -> Tuple[np.ndarray, int]:
    y, sr = librosa.load(file_path, sr=sr, mono=mono)
    return y, sr


def extract_beats(y: np.ndarray, sr: int) -> Tuple[float, np.ndarray, np.ndarray]:
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    if isinstance(tempo, np.ndarray):
        tempo = float(tempo[0]) if tempo.size > 0 else 0.0
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    return float(tempo), beat_frames, beat_times


def extract_pitch_contour(y: np.ndarray, sr: int, fmin: float = librosa.note_to_hz('C2'),
                         fmax: float = librosa.note_to_hz('C7')) -> Tuple[np.ndarray, np.ndarray]:
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr, fmin=fmin, fmax=fmax)
    pitch_contour = []
    pitch_times = librosa.times_like(pitches, sr=sr)

    for t in range(pitches.shape[1]):
        idx = magnitudes[:, t].argmax()
        pitch = pitches[idx, t] if magnitudes[idx, t] > 0 else 0
        pitch_contour.append(pitch)

    return np.array(pitch_contour), pitch_times


def extract_chroma(y: np.ndarray, sr: int) -> Tuple[np.ndarray, np.ndarray]:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)
    chroma_times = librosa.times_like(chroma, sr=sr, hop_length=512)
    return chroma, chroma_times


def extract_mfcc(y: np.ndarray, sr: int, n_mfcc: int = 20) -> np.ndarray:
    return librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)


def extract_spectral_features(y: np.ndarray, sr: int) -> Tuple[np.ndarray, np.ndarray]:
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    rms = librosa.feature.rms(y=y)
    return spectral_centroid[0], rms[0]


def extract_all_features(file_path: str, sr: int = 22050) -> AudioFeatures:
    y, sr = load_audio(file_path, sr=sr)
    duration = librosa.get_duration(y=y, sr=sr)
    tempo, beat_frames, beat_times = extract_beats(y, sr)
    chroma, chroma_times = extract_chroma(y, sr)
    mfcc = extract_mfcc(y, sr)
    spectral_centroid, rms = extract_spectral_features(y, sr)
    pitch_contour, pitch_times = extract_pitch_contour(y, sr)

    return AudioFeatures(
        file_path=file_path,
        duration=duration,
        sr=sr,
        y=y,
        tempo=tempo,
        beat_frames=beat_frames,
        beat_times=beat_times,
        chroma=chroma,
        mfcc=mfcc,
        spectral_centroid=spectral_centroid,
        rms=rms,
        pitch_contour=pitch_contour,
        pitch_times=pitch_times,
        chroma_times=chroma_times
    )


def detect_speed_change(features1: AudioFeatures, features2: AudioFeatures) -> dict:
    tempo_ratio = features2.tempo / features1.tempo if features1.tempo > 0 else 1.0
    duration_ratio = features1.duration / features2.duration if features2.duration > 0 else 1.0

    avg_interval1 = np.mean(np.diff(features1.beat_times)) if len(features1.beat_times) > 1 else 1.0
    avg_interval2 = np.mean(np.diff(features2.beat_times)) if len(features2.beat_times) > 1 else 1.0
    interval_ratio = avg_interval1 / avg_interval2 if avg_interval2 > 0 else 1.0

    speed_factor = (tempo_ratio + interval_ratio + duration_ratio) / 3.0
    is_speed_changed = abs(speed_factor - 1.0) > 0.08

    result = {
        "is_speed_changed": is_speed_changed,
        "speed_factor": round(speed_factor, 4),
        "tempo_ratio": round(tempo_ratio, 4),
        "duration_ratio": round(duration_ratio, 4),
        "interval_ratio": round(interval_ratio, 4),
        "tempo1_bpm": round(features1.tempo, 2),
        "tempo2_bpm": round(features2.tempo, 2),
        "confidence": 0.0
    }

    if is_speed_changed:
        agreement = abs(tempo_ratio - interval_ratio) < 0.1 and abs(tempo_ratio - duration_ratio) < 0.15
        result["confidence"] = 0.85 if agreement else 0.6
        result["direction"] = "加速" if speed_factor > 1 else "减速"
        result["severity"] = "轻微" if abs(speed_factor - 1.0) < 0.15 else "中度" if abs(speed_factor - 1.0) < 0.3 else "显著"
    else:
        result["confidence"] = 0.9

    return result


def detect_transposition(features1: AudioFeatures, features2: AudioFeatures) -> dict:
    chroma1_mean = np.mean(features1.chroma, axis=1)
    chroma2_mean = np.mean(features2.chroma, axis=1)

    correlations = []
    for shift in range(12):
        rolled = np.roll(chroma2_mean, shift)
        corr = np.corrcoef(chroma1_mean, rolled)[0, 1]
        correlations.append((shift, corr))

    best_shift, best_corr = max(correlations, key=lambda x: x[1])
    is_transposed = best_shift != 0 and best_corr > 0.7

    pitch1_valid = features1.pitch_contour[features1.pitch_contour > 0]
    pitch2_valid = features2.pitch_contour[features2.pitch_contour > 0]

    pitch_diff_semitones = 0
    if len(pitch1_valid) > 0 and len(pitch2_valid) > 0:
        median_pitch1 = np.median(pitch1_valid)
        median_pitch2 = np.median(pitch2_valid)
        if median_pitch1 > 0 and median_pitch2 > 0:
            pitch_diff_semitones = round(12 * np.log2(median_pitch2 / median_pitch1))

    chroma_shift_confirmed = abs(best_shift - (pitch_diff_semitones % 12)) < 2 or abs(best_shift - ((pitch_diff_semitones % 12) - 12)) < 2

    result = {
        "is_transposed": is_transposed,
        "semitone_shift": best_shift if best_shift <= 6 else best_shift - 12,
        "raw_shift": best_shift,
        "chroma_correlation": round(best_corr, 4),
        "pitch_based_shift": pitch_diff_semitones,
        "shift_confirmed": chroma_shift_confirmed,
        "confidence": 0.0
    }

    if is_transposed:
        result["confidence"] = 0.9 if chroma_shift_confirmed and best_corr > 0.85 else 0.7 if best_corr > 0.75 else 0.55
        direction = "升调" if result["semitone_shift"] > 0 else "降调"
        result["direction"] = f"{direction} {abs(result['semitone_shift'])} 个半音"
        result["severity"] = "轻微" if abs(result["semitone_shift"]) <= 2 else "中度" if abs(result["semitone_shift"]) <= 4 else "显著"
    else:
        result["confidence"] = 0.85

    return result


def beat_synchronize_features(features: AudioFeatures) -> dict:
    beat_chroma = librosa.util.sync(features.chroma, features.beat_frames, aggregate=np.mean)
    beat_mfcc = librosa.util.sync(features.mfcc, features.beat_frames, aggregate=np.mean)

    if len(features.beat_times) > 0:
        rms_beat_frames = librosa.time_to_frames(features.beat_times, sr=features.sr, hop_length=256)
        rms_beat_frames = np.clip(rms_beat_frames, 0, len(features.rms) - 1)
        beat_rms = features.rms[rms_beat_frames]
    else:
        beat_rms = np.array([])

    return {
        "beat_chroma": beat_chroma,
        "beat_mfcc": beat_mfcc,
        "beat_rms": beat_rms,
        "beat_times": features.beat_times
    }
