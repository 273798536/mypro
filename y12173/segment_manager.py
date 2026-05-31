"""分段管理模块 - 处理歌词草稿、韵脚表、分段标记对齐"""

import json
from pathlib import Path


class SegmentManager:
    def __init__(self):
        self.segments_dir = Path("segments")
        self.segments_dir.mkdir(exist_ok=True)

    def auto_detect(self, content):
        lines = content.split("\n")
        segments = {}
        current_seg = None
        current_lines = []
        seg_index = 0

        for i, line in enumerate(lines, 1):
            stripped = line.strip()

            if not stripped:
                if current_seg and current_lines:
                    segments[current_seg] = {
                        "type": self._detect_type(current_seg),
                        "lines": current_lines,
                        "expected_rhyme": None
                    }
                    current_lines = []
                current_seg = None
                continue

            if stripped.startswith(("【", "[", "(")) or stripped in [
                "主歌", "副歌", "桥段", "前奏", "间奏", "尾声",
                "Verse", "Chorus", "Bridge", "Pre-Chorus"
            ]:
                if current_seg and current_lines:
                    segments[current_seg] = {
                        "type": self._detect_type(current_seg),
                        "lines": current_lines,
                        "expected_rhyme": None
                    }
                current_seg = stripped.strip("【】[]()")
                current_lines = []
                continue

            if current_seg is None:
                seg_index += 1
                current_seg = f"段落{seg_index}"

            current_lines.append(i)

        if current_seg and current_lines:
            segments[current_seg] = {
                "type": self._detect_type(current_seg),
                "lines": current_lines,
                "expected_rhyme": None
            }

        return segments

    def _detect_type(self, seg_name):
        name = seg_name.lower()
        if any(k in name for k in ["主歌", "verse"]):
            return "主歌"
        if any(k in name for k in ["副歌", "chorus", "hook"]):
            return "副歌"
        if any(k in name for k in ["桥段", "bridge"]):
            return "桥段"
        if any(k in name for k in ["pre", "pre-chorus"]):
            return "预副歌"
        return "其他"

    def save_segments(self, version_id, segments):
        seg_file = self.segments_dir / f"{version_id}.json"
        seg_file.write_text(json.dumps(segments, ensure_ascii=False, indent=2))

    def get_segments(self, version_id):
        seg_file = self.segments_dir / f"{version_id}.json"
        if seg_file.exists():
            return json.loads(seg_file.read_text())

        from version_manager import VersionManager
        vm = VersionManager()
        version = vm.get_version(version_id)
        if version:
            segments = self.auto_detect(version["content"])
            self.save_segments(version_id, segments)
            return segments

        return {}

    def set_expected_rhyme(self, version_id, segment_id, rhyme):
        segments = self.get_segments(version_id)
        if segment_id in segments:
            segments[segment_id]["expected_rhyme"] = rhyme
            self.save_segments(version_id, segments)
            return True
        return False
