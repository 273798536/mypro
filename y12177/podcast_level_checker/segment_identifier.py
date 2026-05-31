import os
import re
import csv
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple, Dict
from .audio_analyzer import AnalysisResult, AudioAnalyzer


class SegmentType(Enum):
    VOICE = "voice"
    SILENCE = "silence"
    MUSIC = "music"
    ADVERTISEMENT = "advertisement"
    MIXED = "mixed"
    UNKNOWN = "unknown"


@dataclass
class TimeMarker:
    start_ms: int
    end_ms: int
    label: str
    source_file: str
    line_number: Optional[int] = None


@dataclass
class Segment:
    start_ms: int
    end_ms: int
    segment_type: SegmentType
    confidence: float
    source_file: str
    evidence: List[str] = field(default_factory=list)
    markers: List[TimeMarker] = field(default_factory=list)
    average_rms_db: float = 0.0

    @property
    def duration_ms(self) -> int:
        return self.end_ms - self.start_ms

    @property
    def duration_str(self) -> str:
        return format_time(self.duration_ms)


def format_time(ms: int) -> str:
    seconds = ms / 1000.0
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((ms % 1000))
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"
    return f"{minutes:02d}:{secs:02d}.{millis:03d}"


def parse_time_to_ms(time_str: str) -> int:
    time_str = time_str.strip()
    patterns = [
        r'(\d+):(\d{2}):(\d{2})[.,](\d{3})',
        r'(\d+):(\d{2}):(\d{2})',
        r'(\d{2}):(\d{2})[.,](\d{3})',
        r'(\d{2}):(\d{2})',
        r'(\d+)[.,](\d{3})',
        r'(\d+)',
    ]

    for pattern in patterns:
        match = re.match(pattern, time_str)
        if match:
            groups = match.groups()
            if len(groups) == 4:
                h, m, s, ms = int(groups[0]), int(groups[1]), int(groups[2]), int(groups[3])
                return h * 3600000 + m * 60000 + s * 1000 + ms
            elif len(groups) == 3:
                if ':' in time_str and time_str.count(':') == 2:
                    h, m, s = int(groups[0]), int(groups[1]), int(groups[2])
                    return h * 3600000 + m * 60000 + s * 1000
                else:
                    m, s, ms = int(groups[0]), int(groups[1]), int(groups[2])
                    return m * 60000 + s * 1000 + ms
            elif len(groups) == 2:
                if ':' in time_str:
                    m, s = int(groups[0]), int(groups[1])
                    return m * 60000 + s * 1000
                else:
                    sec, ms = int(groups[0]), int(groups[1])
                    return sec * 1000 + ms
            elif len(groups) == 1:
                return int(groups[0])

    raise ValueError(f"无法解析时间格式: {time_str}")


class TimeMarkerParser:
    @staticmethod
    def parse_srt(file_path: str) -> List[TimeMarker]:
        markers = []
        if not os.path.exists(file_path):
            return markers

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        blocks = re.split(r'\n\n+', content.strip())
        time_pattern = re.compile(
            r'(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})'
        )

        for i, block in enumerate(blocks):
            lines = block.strip().split('\n')
            for j, line in enumerate(lines):
                match = time_pattern.search(line)
                if match:
                    start_ms = parse_time_to_ms(match.group(1))
                    end_ms = parse_time_to_ms(match.group(2))
                    label = ' '.join(lines[j + 1:]) if j + 1 < len(lines) else ''
                    markers.append(TimeMarker(
                        start_ms=start_ms,
                        end_ms=end_ms,
                        label=label.strip(),
                        source_file=file_path,
                        line_number=i + 1
                    ))
                    break

        return markers

    @staticmethod
    def parse_vtt(file_path: str) -> List[TimeMarker]:
        return TimeMarkerParser.parse_srt(file_path)

    @staticmethod
    def parse_csv(file_path: str) -> List[TimeMarker]:
        markers = []
        if not os.path.exists(file_path):
            return markers

        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, start=2):
                try:
                    start_field = row.get('start') or row.get('开始') or row.get('time')
                    end_field = row.get('end') or row.get('结束') or row.get('start')
                    label_field = row.get('label') or row.get('标签') or row.get('类型') or row.get('type') or ''

                    if not start_field:
                        continue

                    start_ms = parse_time_to_ms(str(start_field))
                    end_ms = parse_time_to_ms(str(end_field)) if end_field else start_ms + 1000

                    markers.append(TimeMarker(
                        start_ms=start_ms,
                        end_ms=end_ms,
                        label=str(label_field).strip(),
                        source_file=file_path,
                        line_number=i
                    ))
                except (ValueError, KeyError):
                    continue

        return markers

    @staticmethod
    def parse_txt(file_path: str) -> List[TimeMarker]:
        markers = []
        if not os.path.exists(file_path):
            return markers

        time_pattern = re.compile(
            r'(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)\s*[-~→]\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)'
        )
        single_time_pattern = re.compile(
            r'(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)'
        )

        with open(file_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue

                match = time_pattern.search(line)
                if match:
                    start_ms = parse_time_to_ms(match.group(1))
                    end_ms = parse_time_to_ms(match.group(2))
                    label = line[:match.start()].strip() or line[match.end():].strip()
                    markers.append(TimeMarker(
                        start_ms=start_ms,
                        end_ms=end_ms,
                        label=label,
                        source_file=file_path,
                        line_number=i
                    ))
                else:
                    match = single_time_pattern.search(line)
                    if match:
                        start_ms = parse_time_to_ms(match.group(1))
                        label = line.replace(match.group(0), '').strip()
                        markers.append(TimeMarker(
                            start_ms=start_ms,
                            end_ms=start_ms + 1000,
                            label=label,
                            source_file=file_path,
                            line_number=i
                        ))

        return markers

    @staticmethod
    def parse_file(file_path: str) -> List[TimeMarker]:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.srt':
            return TimeMarkerParser.parse_srt(file_path)
        elif ext == '.vtt':
            return TimeMarkerParser.parse_vtt(file_path)
        elif ext == '.csv':
            return TimeMarkerParser.parse_csv(file_path)
        elif ext in ['.txt', '.md']:
            return TimeMarkerParser.parse_txt(file_path)
        return []

    @staticmethod
    def parse_directory(dir_path: str, audio_file_name: str = None) -> List[TimeMarker]:
        if not os.path.isdir(dir_path):
            return []

        all_markers = []
        audio_base = os.path.splitext(os.path.basename(audio_file_name))[0] if audio_file_name else None

        for root, _, files in os.walk(dir_path):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in ['.srt', '.vtt', '.csv', '.txt', '.md']:
                    marker_base = os.path.splitext(f)[0]
                    if audio_base and marker_base != audio_base:
                        continue

                    file_path = os.path.join(root, f)
                    try:
                        markers = TimeMarkerParser.parse_file(file_path)
                        all_markers.extend(markers)
                    except Exception as e:
                        print(f"警告: 无法解析 {file_path}: {e}")

        return all_markers


class SegmentIdentifier:
    AD_KEYWORDS = {'广告', 'advertisement', 'ad', 'sponsor', '赞助', '推广', '插播', 'break'}

    def __init__(self, analyzer: AudioAnalyzer):
        self.analyzer = analyzer

    def _classify_by_level(self, avg_rms: float, voice_reference: float) -> SegmentType:
        if avg_rms < self.analyzer.silence_threshold_db:
            return SegmentType.SILENCE
        if avg_rms > voice_reference + 3.0:
            return SegmentType.MUSIC
        if self.analyzer.silence_threshold_db <= avg_rms <= voice_reference + 3.0:
            return SegmentType.VOICE
        return SegmentType.UNKNOWN

    def _has_ad_keyword(self, text: str) -> bool:
        if not text:
            return False
        text_lower = text.lower()
        return any(kw in text_lower for kw in self.AD_KEYWORDS)

    def _merge_adjacent_segments(self, segments: List[Segment],
                                 max_gap_ms: int = 300) -> List[Segment]:
        if len(segments) < 2:
            return segments

        merged = [segments[0]]
        for seg in segments[1:]:
            last = merged[-1]
            gap = seg.start_ms - last.end_ms

            if (seg.segment_type == last.segment_type and
                    gap <= max_gap_ms and
                    abs(seg.average_rms_db - last.average_rms_db) < 5.0):
                last.end_ms = seg.end_ms
                last.evidence.extend(seg.evidence)
                last.markers.extend(seg.markers)
            else:
                merged.append(seg)

        return merged

    def identify_segments(self, result: AnalysisResult,
                          markers: List[TimeMarker],
                          voice_reference_db: Optional[float] = None) -> List[Segment]:
        if voice_reference_db is None:
            voice_reference_db = result.average_rms_db

        silence_segments = self.analyzer.detect_silence_segments(result)
        loud_segments = self.analyzer.detect_loud_music_segments(
            result, voice_reference_db=voice_reference_db
        )

        segments = []
        frame_ms = self.analyzer.frame_ms

        def get_markers_in_range(start: int, end: int) -> List[TimeMarker]:
            return [m for m in markers
                    if not (m.end_ms <= start or m.start_ms >= end)]

        def get_avg_rms(start: int, end: int) -> float:
            relevant = [f.rms_db for f in result.frames
                        if f.start_ms >= start and f.end_ms <= end]
            return sum(relevant) / len(relevant) if relevant else -60.0

        current_pos = 0
        total_duration = result.duration_ms

        while current_pos < total_duration:
            seg_start = current_pos
            seg_type = SegmentType.UNKNOWN
            evidence = []
            seg_markers = get_markers_in_range(seg_start, seg_start + frame_ms * 10)

            for silence_start, silence_end in silence_segments:
                if silence_start <= current_pos < silence_end:
                    seg_start = current_pos
                    seg_end = silence_end
                    avg_rms = get_avg_rms(seg_start, seg_end)
                    segments.append(Segment(
                        start_ms=seg_start,
                        end_ms=seg_end,
                        segment_type=SegmentType.SILENCE,
                        confidence=0.9,
                        source_file=result.source_file,
                        evidence=[f"电平低于静音阈值 ({self.analyzer.silence_threshold_db}dB)"],
                        markers=get_markers_in_range(seg_start, seg_end),
                        average_rms_db=round(avg_rms, 2)
                    ))
                    current_pos = seg_end
                    break
            else:
                for loud_start, loud_end in loud_segments:
                    if loud_start <= current_pos < loud_end:
                        seg_start = current_pos
                        seg_end = loud_end
                        avg_rms = get_avg_rms(seg_start, seg_end)

                        final_type = SegmentType.MUSIC
                        confidence = 0.7
                        markers_in_range = get_markers_in_range(seg_start, seg_end)

                        for m in markers_in_range:
                            if self._has_ad_keyword(m.label):
                                final_type = SegmentType.ADVERTISEMENT
                                confidence = 0.85
                                evidence.append(f"标记包含广告关键词: '{m.label}'")
                                break

                        evidence.append(
                            f"电平高于配乐阈值 ({round(voice_reference_db + 3.0, 1)}dB), "
                            f"平均电平 {round(avg_rms, 1)}dB"
                        )

                        segments.append(Segment(
                            start_ms=seg_start,
                            end_ms=seg_end,
                            segment_type=final_type,
                            confidence=confidence,
                            source_file=result.source_file,
                            evidence=evidence,
                            markers=markers_in_range,
                            average_rms_db=round(avg_rms, 2)
                        ))
                        current_pos = seg_end
                        break
                else:
                    window_ms = frame_ms * 5
                    window_end = min(current_pos + window_ms, total_duration)
                    avg_rms = get_avg_rms(current_pos, window_end)

                    markers_in_range = get_markers_in_range(current_pos, window_end)
                    seg_type = self._classify_by_level(avg_rms, voice_reference_db)
                    confidence = 0.6

                    for m in markers_in_range:
                        if self._has_ad_keyword(m.label):
                            seg_type = SegmentType.ADVERTISEMENT
                            confidence = 0.8
                            evidence = [f"标记包含广告关键词: '{m.label}'"]
                            break
                    else:
                        evidence = [f"电平处于人声区间, 平均 {round(avg_rms, 1)}dB"]

                    next_boundary = total_duration
                    for s_start, s_end in silence_segments + loud_segments:
                        if s_start > current_pos:
                            next_boundary = min(next_boundary, s_start)

                    seg_end = min(window_end, next_boundary)

                    segments.append(Segment(
                        start_ms=current_pos,
                        end_ms=seg_end,
                        segment_type=seg_type,
                        confidence=confidence,
                        source_file=result.source_file,
                        evidence=evidence,
                        markers=markers_in_range,
                        average_rms_db=round(avg_rms, 2)
                    ))
                    current_pos = seg_end

        segments = self._merge_adjacent_segments(segments)

        for seg in segments:
            ad_markers = [m for m in seg.markers if self._has_ad_keyword(m.label)]
            if ad_markers and seg.segment_type != SegmentType.ADVERTISEMENT:
                seg.segment_type = SegmentType.ADVERTISEMENT
                seg.confidence = max(seg.confidence, 0.8)
                seg.evidence.append(f"检测到广告标记: {[m.label for m in ad_markers]}")

        return segments

    def check_missing_ads(self, segments: List[Segment]) -> List[Segment]:
        issues = []
        for seg in segments:
            if seg.segment_type != SegmentType.ADVERTISEMENT:
                has_ad_marker = any(self._has_ad_keyword(m.label) for m in seg.markers)
                if has_ad_marker:
                    issues.append(seg)
        return issues
