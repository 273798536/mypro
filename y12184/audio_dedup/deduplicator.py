import os
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .fingerprint import AudioFingerprint, FingerprintExtractor, FingerprintComparator


class DuplicateType(Enum):
    EXACT = "exact_duplicate"
    NEAR = "near_duplicate"
    SPEED_VARIED = "speed_variation"
    SAME_NAME_DIFFERENT = "same_name_different"
    SHORT_AUDIO_FALSE_POSITIVE = "short_audio_false_positive"
    UNIQUE = "unique"


class ConfirmStatus(Enum):
    PENDING = "pending_confirmation"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    AUTO_CONFIRMED = "auto_confirmed"


@dataclass
class DuplicateMatch:
    fingerprint1: AudioFingerprint
    fingerprint2: AudioFingerprint
    duplicate_type: DuplicateType
    similarity: float
    chroma_similarity: float
    mfcc_similarity: float
    speed_ratio: Optional[float] = None
    confirm_status: ConfirmStatus = ConfirmStatus.PENDING
    notes: str = ""
    responsible_person: str = ""
    
    def get_next_action(self) -> str:
        if self.duplicate_type == DuplicateType.SPEED_VARIED:
            return "请声音设计师确认变速版本是否保留"
        elif self.duplicate_type == DuplicateType.SAME_NAME_DIFFERENT:
            return "请声音设计师和策划核对命名规范"
        elif self.duplicate_type == DuplicateType.SHORT_AUDIO_FALSE_POSITIVE:
            return "短音频误报，建议人工试听确认"
        elif self.duplicate_type == DuplicateType.NEAR:
            return "近重复，建议声音设计师试听确认"
        elif self.duplicate_type == DuplicateType.EXACT:
            return "精确重复，可安全删除重复项"
        else:
            return "无需操作"


@dataclass
class DedupResult:
    all_fingerprints: List[AudioFingerprint] = field(default_factory=list)
    duplicate_groups: List[List[DuplicateMatch]] = field(default_factory=list)
    exact_duplicates: List[DuplicateMatch] = field(default_factory=list)
    near_duplicates: List[DuplicateMatch] = field(default_factory=list)
    speed_variations: List[DuplicateMatch] = field(default_factory=list)
    same_name_different: List[DuplicateMatch] = field(default_factory=list)
    short_audio_candidates: List[DuplicateMatch] = field(default_factory=list)
    unique_files: List[AudioFingerprint] = field(default_factory=list)
    modification_history: List[Dict] = field(default_factory=list)
    
    def record_modification(self, action: str, match: DuplicateMatch, user: str = "system"):
        self.modification_history.append({
            "action": action,
            "file1": match.fingerprint1.file_name,
            "file2": match.fingerprint2.file_name,
            "old_status": match.confirm_status.value,
            "user": user,
            "timestamp": None
        })


class AudioDeduplicator:
    def __init__(self, sample_rate: int = 22050):
        self.extractor = FingerprintExtractor(sample_rate=sample_rate)
        self.fingerprints: List[AudioFingerprint] = []
        self.file_to_fingerprint: Dict[str, AudioFingerprint] = {}
        
    def scan_directory(self, directory: str, extensions: List[str] = None) -> List[AudioFingerprint]:
        if extensions is None:
            extensions = ['.wav', '.mp3', '.ogg', '.flac', '.m4a']
        
        fingerprints = []
        for root, _, files in os.walk(directory):
            for file in files:
                if any(file.lower().endswith(ext) for ext in extensions):
                    file_path = os.path.join(root, file)
                    fp = self.extractor.extract(file_path)
                    if fp:
                        fingerprints.append(fp)
                        self.file_to_fingerprint[file_path] = fp
        
        self.fingerprints = fingerprints
        return fingerprints
    
    def add_file(self, file_path: str) -> Optional[AudioFingerprint]:
        fp = self.extractor.extract(file_path)
        if fp:
            self.fingerprints.append(fp)
            self.file_to_fingerprint[file_path] = fp
        return fp
    
    def _check_same_name_different(self, fp1: AudioFingerprint, 
                                    fp2: AudioFingerprint) -> bool:
        name1 = os.path.splitext(fp1.file_name)[0].lower()
        name2 = os.path.splitext(fp2.file_name)[0].lower()
        return name1 == name2 and fp1.file_path != fp2.file_path
    
    def _is_short_audio(self, fp: AudioFingerprint, threshold: float = 1.0) -> bool:
        return fp.duration < threshold
    
    def find_duplicates(self) -> DedupResult:
        result = DedupResult(all_fingerprints=self.fingerprints)
        
        n = len(self.fingerprints)
        processed_pairs = set()
        file_groups: Dict[str, List[AudioFingerprint]] = defaultdict(list)
        
        for i in range(n):
            fp1 = self.fingerprints[i]
            is_duplicate = False
            
            for j in range(i + 1, n):
                fp2 = self.fingerprints[j]
                pair_key = tuple(sorted([fp1.file_path, fp2.file_path]))
                
                if pair_key in processed_pairs:
                    continue
                processed_pairs.add(pair_key)
                
                overall_sim = FingerprintComparator.overall_similarity(fp1, fp2)
                chroma_sim = FingerprintComparator.chroma_similarity(fp1, fp2)
                mfcc_sim = FingerprintComparator.mfcc_similarity(fp1, fp2)
                is_speed_varied, speed_ratio = FingerprintComparator.detect_speed_variation(fp1, fp2)
                
                is_short1 = self._is_short_audio(fp1)
                is_short2 = self._is_short_audio(fp2)
                is_short_audio = is_short1 or is_short2
                
                same_name = self._check_same_name_different(fp1, fp2)
                
                dup_type = None
                notes = ""
                status = ConfirmStatus.PENDING
                
                if same_name and overall_sim < 0.7:
                    dup_type = DuplicateType.SAME_NAME_DIFFERENT
                    notes = "同名但音频内容差异较大，可能是命名冲突"
                    status = ConfirmStatus.PENDING
                elif is_short_audio and 0.6 <= overall_sim < 0.9:
                    dup_type = DuplicateType.SHORT_AUDIO_FALSE_POSITIVE
                    notes = "短音频匹配，可能是误报，建议人工确认"
                    status = ConfirmStatus.PENDING
                elif is_speed_varied:
                    dup_type = DuplicateType.SPEED_VARIED
                    notes = f"检测到变速，速率比约为 {speed_ratio:.2f}x"
                    status = ConfirmStatus.PENDING
                elif FingerprintComparator.is_exact_duplicate(fp1, fp2):
                    dup_type = DuplicateType.EXACT
                    notes = "精确重复，内容几乎完全一致"
                    status = ConfirmStatus.AUTO_CONFIRMED
                elif FingerprintComparator.is_near_duplicate(fp1, fp2):
                    dup_type = DuplicateType.NEAR
                    notes = "近重复，内容相似但有差异"
                    status = ConfirmStatus.PENDING
                
                if dup_type:
                    match = DuplicateMatch(
                        fingerprint1=fp1,
                        fingerprint2=fp2,
                        duplicate_type=dup_type,
                        similarity=overall_sim,
                        chroma_similarity=chroma_sim,
                        mfcc_similarity=mfcc_sim,
                        speed_ratio=speed_ratio if is_speed_varied else None,
                        confirm_status=status,
                        notes=notes
                    )
                    
                    is_duplicate = True
                    file_groups[fp1.file_path].append(fp2)
                    
                    if dup_type == DuplicateType.EXACT:
                        result.exact_duplicates.append(match)
                    elif dup_type == DuplicateType.NEAR:
                        result.near_duplicates.append(match)
                    elif dup_type == DuplicateType.SPEED_VARIED:
                        result.speed_variations.append(match)
                    elif dup_type == DuplicateType.SAME_NAME_DIFFERENT:
                        result.same_name_different.append(match)
                    elif dup_type == DuplicateType.SHORT_AUDIO_FALSE_POSITIVE:
                        result.short_audio_candidates.append(match)
            
            if not is_duplicate:
                result.unique_files.append(fp1)
        
        return result
    
    def get_statistics(self, result: DedupResult) -> Dict:
        total = len(result.all_fingerprints)
        dup_count = len(result.exact_duplicates) + len(result.near_duplicates)
        
        return {
            "total_files": total,
            "unique_files": len(result.unique_files),
            "exact_duplicates": len(result.exact_duplicates),
            "near_duplicates": len(result.near_duplicates),
            "speed_variations": len(result.speed_variations),
            "same_name_different": len(result.same_name_different),
            "short_audio_candidates": len(result.short_audio_candidates),
            "duplicate_ratio": dup_count / total if total > 0 else 0
        }
