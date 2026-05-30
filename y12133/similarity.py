import numpy as np
import librosa
from scipy.spatial.distance import cosine
from scipy.signal import correlate
from dataclasses import dataclass
from typing import Tuple, List, Dict
from core_audio import AudioFeatures, beat_synchronize_features, detect_transposition


@dataclass
class SimilarityResult:
    overall_similarity: float
    beat_similarity: float
    melody_similarity: float
    chroma_similarity: float
    timbre_similarity: float
    rhythmic_similarity: float
    dtw_distance: float
    aligned_beat_pairs: List[Tuple[int, int]]
    alignment_path: np.ndarray
    warp_path: np.ndarray
    transposition_invariant: bool
    applied_transposition_shift: int
    speed_normalized: bool
    applied_speed_factor: float
    beat_alignment_quality: float
    confidence: float
    matched_segments: List[Dict]


def compute_dtw(x: np.ndarray, y: np.ndarray, metric: str = 'cosine',
                downsample: int = 4) -> Tuple[float, np.ndarray, np.ndarray]:
    if downsample > 1 and x.shape[1] > 100:
        x = librosa.util.sync(x, np.arange(0, x.shape[1], downsample), aggregate=np.mean)
        y = librosa.util.sync(y, np.arange(0, y.shape[1], downsample), aggregate=np.mean)

    n, m = x.shape[1], y.shape[1]

    if metric == 'cosine':
        x_norm = x / (np.linalg.norm(x, axis=0, keepdims=True) + 1e-8)
        y_norm = y / (np.linalg.norm(y, axis=0, keepdims=True) + 1e-8)
        dist_matrix = 1 - (x_norm.T @ y_norm)
    elif metric == 'euclidean':
        dist_matrix = np.zeros((n, m))
        for i in range(n):
            for j in range(m):
                dist_matrix[i, j] = np.linalg.norm(x[:, i] - y[:, j])
    else:
        raise ValueError(f"Unknown metric: {metric}")

    D, wp = librosa.sequence.dtw(C=dist_matrix, backtrack=True)

    dtw_distance = D[-1, -1]
    alignment_path = np.flipud(wp)

    if downsample > 1:
        alignment_path = alignment_path * downsample

    max_dist = max(n, m) * np.max(dist_matrix) if np.max(dist_matrix) > 0 else 1
    normalized_distance = dtw_distance / max_dist if max_dist > 0 else 0

    return normalized_distance, alignment_path, D


def compute_beat_similarity(feat1: AudioFeatures, feat2: AudioFeatures,
                           warp_path: np.ndarray) -> float:
    beats1 = feat1.beat_times
    beats2 = feat2.beat_times

    if len(beats1) < 2 or len(beats2) < 2:
        return 0.0

    intervals1 = np.diff(beats1)
    intervals2 = np.diff(beats2)

    if len(warp_path) > 0:
        aligned_intervals1 = []
        aligned_intervals2 = []

        for i, j in warp_path:
            if i < len(intervals1) and j < len(intervals2):
                aligned_intervals1.append(intervals1[i])
                aligned_intervals2.append(intervals2[j])

        if len(aligned_intervals1) > 0 and len(aligned_intervals2) > 0:
            intervals1 = np.array(aligned_intervals1)
            intervals2 = np.array(aligned_intervals2)

    min_len = min(len(intervals1), len(intervals2))
    if min_len < 2:
        return 0.0

    intervals1_norm = intervals1[:min_len] / np.max(intervals1[:min_len]) if np.max(intervals1[:min_len]) > 0 else intervals1[:min_len]
    intervals2_norm = intervals2[:min_len] / np.max(intervals2[:min_len]) if np.max(intervals2[:min_len]) > 0 else intervals2[:min_len]

    corr = np.corrcoef(intervals1_norm, intervals2_norm)[0, 1]
    similarity = (corr + 1) / 2

    pattern1 = np.diff(intervals1[:min_len])
    pattern2 = np.diff(intervals2[:min_len])

    if len(pattern1) > 0 and len(pattern2) > 0:
        pattern_sim = 1 - np.mean(np.abs(pattern1 - pattern2)) / (np.mean(np.abs(pattern1)) + 1e-8)
        pattern_sim = np.clip(pattern_sim, 0, 1)
        similarity = 0.7 * similarity + 0.3 * pattern_sim

    return float(similarity)


def compute_chroma_similarity(chroma1: np.ndarray, chroma2: np.ndarray,
                             warp_path: np.ndarray,
                             transpose_shift: int = 0) -> Tuple[float, np.ndarray]:
    if chroma1.shape[1] < 2 or chroma2.shape[1] < 2:
        return 0.0, np.array([])

    if transpose_shift != 0:
        chroma2_aligned = np.roll(chroma2, transpose_shift, axis=0)
    else:
        chroma2_aligned = chroma2

    similarities = []
    matched_frames = []

    for i, j in warp_path:
        if i < chroma1.shape[1] and j < chroma2_aligned.shape[1]:
            c1 = chroma1[:, i]
            c2 = chroma2_aligned[:, j]
            if np.any(c1) and np.any(c2):
                sim = 1 - cosine(c1, c2)
                similarities.append(sim)
                matched_frames.append((i, j, sim))

    if not similarities:
        return 0.0, np.array([])

    avg_sim = np.mean(similarities)
    return float(avg_sim), np.array(matched_frames)


def compute_melody_similarity(pitch1: np.ndarray, pitch2: np.ndarray,
                             times1: np.ndarray, times2: np.ndarray,
                             warp_path: np.ndarray,
                             chroma1: np.ndarray, chroma2: np.ndarray,
                             transpose_shift: int = 0) -> float:
    if len(pitch1) < 2 or len(pitch2) < 2:
        return 0.0

    pitch1_hz = pitch1.copy()
    pitch2_hz = pitch2.copy()

    if transpose_shift != 0:
        pitch2_hz = pitch2_hz * (2 ** (transpose_shift / 12))

    pitch1_midi = np.array([librosa.hz_to_midi(p) if p > 0 else 0 for p in pitch1_hz])
    pitch2_midi = np.array([librosa.hz_to_midi(p) if p > 0 else 0 for p in pitch2_hz])

    pitch1_norm = pitch1_midi - np.median(pitch1_midi[pitch1_midi > 0]) if np.any(pitch1_midi > 0) else pitch1_midi
    pitch2_norm = pitch2_midi - np.median(pitch2_midi[pitch2_midi > 0]) if np.any(pitch2_midi > 0) else pitch2_midi

    valid_sims = []
    for i, j in warp_path:
        time_idx1 = np.argmin(np.abs(times1 - librosa.frames_to_time(i, sr=22050, hop_length=512)))
        time_idx2 = np.argmin(np.abs(times2 - librosa.frames_to_time(j, sr=22050, hop_length=512)))

        if time_idx1 < len(pitch1_norm) and time_idx2 < len(pitch2_norm):
            p1 = pitch1_norm[time_idx1]
            p2 = pitch2_norm[time_idx2]
            if p1 != 0 and p2 != 0:
                semitone_diff = abs(p1 - p2)
                sim = max(0, 1 - semitone_diff / 12)
                valid_sims.append(sim)

    if not valid_sims:
        chroma_sim, _ = compute_chroma_similarity(chroma1, chroma2, warp_path, transpose_shift)
        return 0.5 * chroma_sim

    contour1 = np.diff(pitch1_norm[pitch1_norm != 0]) if np.any(pitch1_norm != 0) else np.array([0])
    contour2 = np.diff(pitch2_norm[pitch2_norm != 0]) if np.any(pitch2_norm != 0) else np.array([0])

    min_len = min(len(contour1), len(contour2))
    if min_len > 5:
        direction1 = np.sign(contour1[:min_len])
        direction2 = np.sign(contour2[:min_len])
        direction_sim = np.mean(direction1 == direction2)
        overall_sim = 0.6 * np.mean(valid_sims) + 0.4 * direction_sim
    else:
        overall_sim = np.mean(valid_sims)

    return float(overall_sim)


def compute_timbre_similarity(mfcc1: np.ndarray, mfcc2: np.ndarray,
                             warp_path: np.ndarray) -> float:
    if mfcc1.shape[1] < 2 or mfcc2.shape[1] < 2:
        return 0.0

    mfcc1_d = librosa.feature.delta(mfcc1)
    mfcc2_d = librosa.feature.delta(mfcc2)

    mfcc1_combined = np.vstack([mfcc1, mfcc1_d])
    mfcc2_combined = np.vstack([mfcc2, mfcc2_d])

    similarities = []
    for i, j in warp_path:
        if i < mfcc1_combined.shape[1] and j < mfcc2_combined.shape[1]:
            m1 = mfcc1_combined[:, i]
            m2 = mfcc2_combined[:, j]
            if np.std(m1) > 0 and np.std(m2) > 0:
                sim = 1 - cosine(m1, m2)
                similarities.append(sim)

    if not similarities:
        return 0.0

    return float(np.mean(similarities))


def compute_rhythmic_similarity(beat_rms1: np.ndarray, beat_rms2: np.ndarray,
                                warp_path: np.ndarray) -> float:
    if len(beat_rms1) < 2 or len(beat_rms2) < 2:
        return 0.0

    aligned_rms1 = []
    aligned_rms2 = []

    for i, j in warp_path:
        if i < len(beat_rms1) and j < len(beat_rms2):
            aligned_rms1.append(beat_rms1[i])
            aligned_rms2.append(beat_rms2[j])

    if len(aligned_rms1) < 2:
        return 0.0

    rms1 = np.array(aligned_rms1)
    rms2 = np.array(aligned_rms2)

    rms1_norm = rms1 / np.max(rms1) if np.max(rms1) > 0 else rms1
    rms2_norm = rms2 / np.max(rms2) if np.max(rms2) > 0 else rms2

    corr = np.corrcoef(rms1_norm, rms2_norm)[0, 1]
    corr_sim = (corr + 1) / 2 if not np.isnan(corr) else 0.5

    pattern1 = np.sign(np.diff(rms1_norm))
    pattern2 = np.sign(np.diff(rms2_norm))

    if len(pattern1) > 0 and len(pattern2) > 0:
        min_len = min(len(pattern1), len(pattern2))
        pattern_sim = np.mean(pattern1[:min_len] == pattern2[:min_len])
        overall = 0.6 * corr_sim + 0.4 * pattern_sim
    else:
        overall = corr_sim

    return float(overall)


def find_matched_segments(matched_frames: np.ndarray, threshold: float = 0.7,
                         min_duration: float = 0.5, sr: int = 22050) -> List[Dict]:
    if len(matched_frames) < 3:
        return []

    segments = []
    current_segment = []

    for frame in matched_frames:
        i, j, sim = frame
        if sim >= threshold:
            current_segment.append((int(i), int(j), float(sim)))
        else:
            if len(current_segment) >= 3:
                segments.append(current_segment)
            current_segment = []

    if len(current_segment) >= 3:
        segments.append(current_segment)

    result = []
    for seg in segments:
        times1 = librosa.frames_to_time([s[0] for s in seg], sr=sr, hop_length=512)
        times2 = librosa.frames_to_time([s[1] for s in seg], sr=sr, hop_length=512)
        avg_sim = np.mean([s[2] for s in seg])
        duration1 = times1[-1] - times1[0]
        duration2 = times2[-1] - times2[0]

        if duration1 >= min_duration or duration2 >= min_duration:
            result.append({
                "file1_start_time": round(times1[0], 3),
                "file1_end_time": round(times1[-1], 3),
                "file1_duration": round(duration1, 3),
                "file2_start_time": round(times2[0], 3),
                "file2_end_time": round(times2[-1], 3),
                "file2_duration": round(duration2, 3),
                "avg_similarity": round(avg_sim, 4),
                "num_frames": len(seg),
                "sim_scores": [round(s[2], 4) for s in seg]
            })

    return result


def evaluate_alignment_quality(warp_path: np.ndarray, n: int, m: int) -> float:
    if len(warp_path) == 0:
        return 0.0

    path_len = len(warp_path)
    optimal_len = max(n, m)
    min_len = min(n, m)

    length_ratio = min_len / path_len if path_len > 0 else 0

    monotonicity = 0
    for k in range(1, len(warp_path)):
        di = warp_path[k][0] - warp_path[k-1][0]
        dj = warp_path[k][1] - warp_path[k-1][1]
        if di >= 0 and dj >= 0:
            monotonicity += 1
    monotonicity = monotonicity / (len(warp_path) - 1) if len(warp_path) > 1 else 1.0

    diag_count = 0
    for k in range(1, len(warp_path)):
        di = warp_path[k][0] - warp_path[k-1][0]
        dj = warp_path[k][1] - warp_path[k-1][1]
        if di == 1 and dj == 1:
            diag_count += 1
    diag_ratio = diag_count / (len(warp_path) - 1) if len(warp_path) > 1 else 1.0

    quality = 0.4 * length_ratio + 0.3 * monotonicity + 0.3 * diag_ratio
    return float(min(1.0, quality))


def compute_acoustic_beat_similarity(feat1: AudioFeatures, feat2: AudioFeatures,
                                    enable_transposition_invariance: bool = True,
                                    enable_speed_normalization: bool = True,
                                    speed_factor: float = None) -> SimilarityResult:
    transpose_shift = 0
    if enable_transposition_invariance:
        transposition_result = detect_transposition(feat1, feat2)
        if transposition_result["is_transposed"] and transposition_result["confidence"] > 0.6:
            transpose_shift = transposition_result["semitone_shift"]

    beat_sync1 = beat_synchronize_features(feat1)
    beat_sync2 = beat_synchronize_features(feat2)

    chroma1 = feat1.chroma
    chroma2 = feat2.chroma

    dtw_distance, alignment_path, _ = compute_dtw(chroma1, chroma2, metric='cosine')

    warp_path = alignment_path

    beat_sim = compute_beat_similarity(feat1, feat2, warp_path)
    chroma_sim, matched_frames = compute_chroma_similarity(chroma1, chroma2, warp_path, transpose_shift)
    melody_sim = compute_melody_similarity(feat1.pitch_contour, feat2.pitch_contour,
                                           feat1.pitch_times, feat2.pitch_times,
                                           warp_path, chroma1, chroma2, transpose_shift)
    timbre_sim = compute_timbre_similarity(feat1.mfcc, feat2.mfcc, warp_path)
    rhythmic_sim = compute_rhythmic_similarity(beat_sync1["beat_rms"], beat_sync2["beat_rms"], warp_path)

    overall_sim = (
        0.35 * chroma_sim +
        0.25 * melody_sim +
        0.20 * beat_sim +
        0.10 * timbre_sim +
        0.10 * rhythmic_sim
    )

    alignment_quality = evaluate_alignment_quality(warp_path, chroma1.shape[1], chroma2.shape[1])

    confidence = (
        0.4 * alignment_quality +
        0.3 * (1 - dtw_distance) +
        0.3 * max(0, (len(warp_path) - 10) / 100)
    )
    confidence = min(1.0, confidence)

    matched_segments = find_matched_segments(matched_frames) if len(matched_frames) > 0 else []

    beat_pairs = []
    for i, (bt1, bt2) in enumerate(zip(feat1.beat_times, feat2.beat_times)):
        if i < len(feat1.beat_times) and i < len(feat2.beat_times):
            beat_pairs.append((i, i))

    applied_speed = speed_factor if speed_factor is not None else 1.0

    return SimilarityResult(
        overall_similarity=float(overall_sim),
        beat_similarity=float(beat_sim),
        melody_similarity=float(melody_sim),
        chroma_similarity=float(chroma_sim),
        timbre_similarity=float(timbre_sim),
        rhythmic_similarity=float(rhythmic_sim),
        dtw_distance=float(dtw_distance),
        aligned_beat_pairs=beat_pairs,
        alignment_path=alignment_path,
        warp_path=warp_path,
        transposition_invariant=enable_transposition_invariance,
        applied_transposition_shift=transpose_shift,
        speed_normalized=enable_speed_normalization,
        applied_speed_factor=applied_speed,
        beat_alignment_quality=float(alignment_quality),
        confidence=float(confidence),
        matched_segments=matched_segments
    )
