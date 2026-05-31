import hashlib
import os
from dataclasses import dataclass, field
from typing import List, Tuple, Optional

import librosa
import numpy as np


@dataclass
class AudioFingerprint:
    file_path: str
    file_name: str
    duration: float
    sample_rate: int
    chroma_fingerprint: np.ndarray = field(repr=False)
    mfcc_fingerprint: np.ndarray = field(repr=False)
    spectral_contrast: np.ndarray = field(repr=False)
    tempo: float
    hash_str: str = ""
    file_size: int = 0

    def __post_init__(self):
        if not self.hash_str:
            self.hash_str = self._generate_hash()
        if not self.file_size:
            self.file_size = os.path.getsize(self.file_path)

    def _generate_hash(self) -> str:
        combined = np.concatenate([
            self.chroma_fingerprint.flatten()[:100],
            self.mfcc_fingerprint.flatten()[:100]
        ])
        hash_obj = hashlib.md5(combined.tobytes())
        return hash_obj.hexdigest()


class FingerprintExtractor:
    def __init__(self, sample_rate: int = 22050, n_mfcc: int = 20):
        self.sample_rate = sample_rate
        self.n_mfcc = n_mfcc

    def extract(self, file_path: str) -> Optional[AudioFingerprint]:
        try:
            y, sr = librosa.load(file_path, sr=self.sample_rate, duration=None)
            
            if len(y) < sr * 0.1:
                return None

            duration = librosa.get_duration(y=y, sr=sr)
            
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)
            chroma_avg = np.mean(chroma, axis=1)
            
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.n_mfcc)
            mfcc_avg = np.mean(mfcc, axis=1)
            
            spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
            spectral_contrast_avg = np.mean(spectral_contrast, axis=1)
            
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

            return AudioFingerprint(
                file_path=file_path,
                file_name=os.path.basename(file_path),
                duration=duration,
                sample_rate=sr,
                chroma_fingerprint=chroma_avg,
                mfcc_fingerprint=mfcc_avg,
                spectral_contrast=spectral_contrast_avg,
                tempo=float(tempo)
            )
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
            return None


class FingerprintComparator:
    @staticmethod
    def chroma_similarity(fp1: AudioFingerprint, fp2: AudioFingerprint) -> float:
        """计算色度相似度 (0-1)，适用于变速检测"""
        corr = np.corrcoef(fp1.chroma_fingerprint, fp2.chroma_fingerprint)[0, 1]
        return max(0, corr)

    @staticmethod
    def mfcc_similarity(fp1: AudioFingerprint, fp2: AudioFingerprint) -> float:
        """计算MFCC相似度 (0-1)"""
        dist = np.linalg.norm(fp1.mfcc_fingerprint - fp2.mfcc_fingerprint)
        return 1 / (1 + dist / 100)

    @staticmethod
    def spectral_similarity(fp1: AudioFingerprint, fp2: AudioFingerprint) -> float:
        """计算频谱对比度相似度"""
        dist = np.linalg.norm(fp1.spectral_contrast - fp2.spectral_contrast)
        return 1 / (1 + dist / 50)

    @staticmethod
    def overall_similarity(fp1: AudioFingerprint, fp2: AudioFingerprint) -> float:
        """综合相似度评分"""
        chroma_sim = FingerprintComparator.chroma_similarity(fp1, fp2)
        mfcc_sim = FingerprintComparator.mfcc_similarity(fp1, fp2)
        spectral_sim = FingerprintComparator.spectral_similarity(fp1, fp2)
        
        weights = [0.4, 0.4, 0.2]
        return chroma_sim * weights[0] + mfcc_sim * weights[1] + spectral_sim * weights[2]

    @staticmethod
    def detect_speed_variation(fp1: AudioFingerprint, fp2: AudioFingerprint) -> Tuple[bool, float]:
        """检测是否为变速版本
        返回 (是否变速, 估计的速度比率)
        """
        duration_ratio = fp1.duration / fp2.duration if fp2.duration > 0 else 1
        chroma_sim = FingerprintComparator.chroma_similarity(fp1, fp2)
        
        is_speed_varied = (
            chroma_sim > 0.85 and
            0.5 < duration_ratio < 2.0 and
            abs(duration_ratio - 1.0) > 0.1
        )
        
        return is_speed_varied, duration_ratio

    @staticmethod
    def is_exact_duplicate(fp1: AudioFingerprint, fp2: AudioFingerprint, threshold: float = 0.95) -> bool:
        """判断是否为精确重复"""
        return FingerprintComparator.overall_similarity(fp1, fp2) >= threshold

    @staticmethod
    def is_near_duplicate(fp1: AudioFingerprint, fp2: AudioFingerprint, 
                         min_threshold: float = 0.7, max_threshold: float = 0.95) -> bool:
        """判断是否为近重复（需要确认）"""
        sim = FingerprintComparator.overall_similarity(fp1, fp2)
        return min_threshold <= sim < max_threshold
