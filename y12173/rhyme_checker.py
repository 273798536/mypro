"""押韵检测核心模块 - 处理押韵检测、多音字、英文混入"""

import json
import re
from pathlib import Path
from datetime import datetime


class RhymeChecker:
    def __init__(self):
        self.rhyme_table = self._load_rhyme_table()
        self.fixes_dir = Path("fixes")
        self.fixes_dir.mkdir(exist_ok=True)

    def _load_rhyme_table(self):
        return {
            "a": ["a", "ia", "ua"],
            "o": ["o", "uo", "ao", "iao"],
            "e": ["e", "ie", "ue", "er"],
            "i": ["i", "v", "ui", "ei"],
            "u": ["u", "ou", "iu"],
            "an": ["an", "ian", "uan", "van"],
            "en": ["en", "in", "un", "vn"],
            "ang": ["ang", "iang", "uang"],
            "eng": ["eng", "ing", "ong", "iong"]
        }

    def _get_pinyin(self, char):
        pinyin_map = {
            "花": "hua", "家": "jia", "华": "hua", "夏": "xia",
            "红": "hong", "同": "tong", "梦": "meng", "风": "feng",
            "天": "tian", "年": "nian", "边": "bian", "前": "qian",
            "山": "shan", "看": "kan", "蓝": "lan", "南": "nan",
            "心": "xin", "情": "qing", "听": "ting", "星": "xing",
            "飞": "fei", "泪": "lei", "美": "mei", "水": "shui",
            "走": "zou", "手": "shou", "头": "tou", "有": "you",
            "去": "qu", "许": "xu", "雨": "yu", "语": "yu",
            "长": ["chang", "zhang"],
            "行": ["xing", "hang"],
            "重": ["zhong", "chong"],
            "乐": ["le", "yue"],
            "了": ["le", "liao"],
        }
        return pinyin_map.get(char, None)

    def _extract_rhyme(self, pinyin):
        for rhyme, variants in self.rhyme_table.items():
            for v in variants:
                if pinyin.endswith(v):
                    return rhyme
        return pinyin

    def _has_english(self, text):
        return bool(re.search(r'[a-zA-Z]', text))

    def _get_line_fix(self, version_id, line_num):
        fix_file = self.fixes_dir / f"{version_id}.json"
        if not fix_file.exists():
            return None
        fixes = json.loads(fix_file.read_text())
        for f in fixes:
            if f["line_num"] == line_num:
                return f
        return None

    def add_fix(self, version_id, line_num, pinyin, note=None):
        fix_file = self.fixes_dir / f"{version_id}.json"
        fixes = []
        if fix_file.exists():
            fixes = json.loads(fix_file.read_text())

        fix = {
            "version_id": version_id,
            "line_num": line_num,
            "pinyin": pinyin,
            "note": note,
            "timestamp": datetime.now().isoformat()
        }
        fixes = [f for f in fixes if f["line_num"] != line_num]
        fixes.append(fix)
        fix_file.write_text(json.dumps(fixes, ensure_ascii=False, indent=2))
        return fix

    def get_fixes(self, version_id):
        fix_file = self.fixes_dir / f"{version_id}.json"
        if not fix_file.exists():
            return []
        return json.loads(fix_file.read_text())

    def check_version(self, version, segments):
        results = {
            "version": version["id"],
            "segments": {},
            "summary": {
                "total": 0,
                "matched": 0,
                "ambiguous": 0,
                "english": 0,
                "duplicates": []
            }
        }

        lines = version["content"].split("\n")
        seen_texts = {}

        for seg_id, seg_info in segments.items():
            seg_lines = seg_info["lines"]
            expected_rhyme = seg_info.get("expected_rhyme")

            seg_results = {
                "type": seg_info["type"],
                "expected_rhyme": expected_rhyme,
                "lines": []
            }

            for line_num in seg_lines:
                if line_num < 1 or line_num > len(lines):
                    continue

                text = lines[line_num - 1].strip()
                if not text:
                    continue

                if text in seen_texts:
                    results["summary"]["duplicates"].append({
                        "text": text,
                        "lines": [seen_texts[text], line_num]
                    })
                seen_texts[text] = line_num

                has_english = self._has_english(text)
                if has_english:
                    results["summary"]["english"] += 1

                last_char = text[-1] if text else ""
                pinyin = self._get_pinyin(last_char)
                is_ambiguous = isinstance(pinyin, list)
                rhyme = None
                pinyin_note = None

                fix = self._get_line_fix(version["id"], line_num)
                if fix:
                    pinyin = fix["pinyin"]
                    pinyin_note = f"已修正: {pinyin} ({fix['note'] or '人工标记'})"
                    is_ambiguous = False
                elif is_ambiguous:
                    results["summary"]["ambiguous"] += 1
                    pinyin_note = f"歧义: {', '.join(pinyin)} (用 fix 命令指定)"
                    pinyin = pinyin[0]

                if pinyin:
                    rhyme = self._extract_rhyme(pinyin)

                rhyme_match = (expected_rhyme is None) or (rhyme == expected_rhyme)

                results["summary"]["total"] += 1
                if rhyme_match:
                    results["summary"]["matched"] += 1

                seg_results["lines"].append({
                    "line_num": line_num,
                    "text": text,
                    "last_char": last_char,
                    "pinyin": pinyin,
                    "pinyin_note": pinyin_note,
                    "rhyme": rhyme,
                    "rhyme_match": rhyme_match,
                    "has_english": has_english,
                    "is_ambiguous": is_ambiguous
                })

            results["segments"][seg_id] = seg_results

        return results
