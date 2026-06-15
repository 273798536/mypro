"""音频扫描与版本管理模块。

负责扫描音频文件夹，从文件名解析声部、版本、时码信息，
并判定最新版本，避免版本一多谁都不知道哪份最新。
"""

import os
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime

from .models import AudioFile, _new_id, _now_iso


AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".aac", ".ogg", ".aiff"}


def _parse_part_and_version(filename: str) -> Tuple[Optional[str], Optional[str], Optional[float]]:
    """从文件名解析声部名称、版本标签、开始时间。

    支持的命名模式示例：
      - 女高_v1.wav
      - 女高_v2-final.wav
      - 20250610_男低_排练版.mp3
      - 女高_01_start_32.5.wav  (开始时间 32.5 秒)
      - soprano_v1_review.wav
      - 女高_v1_林姐批注版.wav

    Returns:
        (part_name, version_tag, start_time_seconds)
    """
    name_no_ext = os.path.splitext(filename)[0]

    part_name = _parse_part_name(name_no_ext)
    version_tag = _parse_version_tag(name_no_ext)
    start_seconds = _parse_start_time(name_no_ext)

    return part_name, version_tag, start_seconds


def _parse_part_name(name: str) -> Optional[str]:
    """从文件名解析声部名称。"""
    part_keywords = [
        ("女高", ["女高", "soprano"]),
        ("女低", ["女低", "alto"]),
        ("男高", ["男高", "tenor"]),
        ("男低", ["男低", "bass"]),
        ("童声", ["童声", "children"]),
        ("领唱", ["领唱", "solo"]),
    ]
    for part_name, keywords in part_keywords:
        for kw in keywords:
            if re.search(r"(?:^|[_ \-])" + re.escape(kw) + r"(?:[_ \-]|$)", name, re.IGNORECASE):
                return part_name
    return None


def _parse_version_tag(name: str) -> Optional[str]:
    """从文件名解析版本标签。"""
    time_kw_pattern = r"(?:start|开始)[_\-]?\d+(?:\.\d+)?"
    clean_name = re.sub(time_kw_pattern, "", name, flags=re.IGNORECASE)
    clean_name = re.sub(r"[_ ]+", "_", clean_name).strip("_")

    v_match = re.search(
        r"(?:^|[_ \-])(v\d+(?:\.\d+)?(?:[_\-][a-zA-Z\u4e00-\u9fa5]+)*)(?:[_ \-]|$)",
        clean_name,
        re.IGNORECASE,
    )
    if v_match:
        return v_match.group(1).strip("_-")

    date_match = re.search(r"(?:^|[_ \-])(\d{8}|\d{6})(?:[_ \-]|$)", clean_name)
    if date_match:
        return date_match.group(1)

    version_keywords = ["final", "最终", "定稿", "排练版", "批注版", "review", "旧版", "old", "backup"]
    found_kws = []
    for kw in version_keywords:
        if kw.lower() in clean_name.lower():
            found_kws.append(kw)
    if found_kws:
        return "_".join(found_kws)

    return None


def _parse_start_time(name: str) -> Optional[float]:
    """从文件名解析开始时间（秒）。"""
    time_match = re.search(
        r"(?:start|开始)[_\-]?(\d+(?:\.\d+)?)",
        name,
        re.IGNORECASE,
    )
    if time_match:
        try:
            return float(time_match.group(1))
        except ValueError:
            pass
    return None


def _version_sort_key(version_tag: Optional[str], modified_at: Optional[str]) -> tuple:
    """版本排序用的 key，数字越大/越新越靠后。

    排序优先级：
    1. 有 final/最终/定稿 标签的版本最高
    2. v 数字版本（v1, v2, v3...）按数字排序
    3. 日期版本（YYYYMMDD）按日期排序
    4. 有关键词标签（批注版、排练版等）次之
    5. 旧版/备份 版本最低
    6. 文件修改时间兜底
    """
    base_score = 0
    bonus = 0

    if version_tag:
        v_lower = version_tag.lower()

        m = re.search(r"v(\d+)(?:\.(\d+))?", v_lower)
        if m:
            major = int(m.group(1))
            minor = int(m.group(2)) if m.group(2) else 0
            base_score = major * 10000 + minor * 100

        date_match = re.search(r"(\d{8}|\d{6})", v_lower)
        if date_match and not m:
            date_str = date_match.group(1)
            try:
                if len(date_str) == 8:
                    dt = datetime.strptime(date_str, "%Y%m%d")
                else:
                    dt = datetime.strptime(date_str, "%y%m%d")
                base_score = int(dt.timestamp() / 1000)
            except ValueError:
                pass

        if any(k in v_lower for k in ["final", "最终", "定稿"]):
            bonus += 999999
        if any(k in v_lower for k in ["批注", "review"]):
            bonus += 5000
        if any(k in v_lower for k in ["排练", "rehearsal"]):
            bonus += 2000
        if any(k in v_lower for k in ["old", "旧版", "backup", "备份"]):
            bonus -= 100000

    mod_score = 0
    if modified_at:
        try:
            dt = datetime.fromisoformat(modified_at)
            mod_score = int(dt.timestamp())
        except ValueError:
            pass

    return (base_score + bonus, mod_score)


def scan_audio_folder(folder_path: str) -> List[AudioFile]:
    """扫描音频文件夹，返回所有音频文件的基本信息。

    Args:
        folder_path: 音频文件夹的绝对路径

    Returns:
        AudioFile 列表

    Raises:
        FileNotFoundError: 文件夹不存在
        ValueError: 文件夹路径无效
    """
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"音频文件夹不存在: {folder_path}")
    if not os.path.isdir(folder_path):
        raise ValueError(f"路径不是文件夹: {folder_path}")

    results: List[AudioFile] = []
    now = _now_iso()

    for root, _, files in os.walk(folder_path):
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in AUDIO_EXTENSIONS:
                continue

            full_path = os.path.join(root, fname)
            rel_path = os.path.relpath(full_path, folder_path)

            try:
                mtime = os.path.getmtime(full_path)
                modified_at = datetime.fromtimestamp(mtime).isoformat()
            except OSError:
                modified_at = None

            part_name, version_tag, start_seconds = _parse_part_and_version(fname)

            audio = AudioFile(
                file_id=_new_id("af"),
                file_path=rel_path,
                file_name=fname,
                part_name=part_name,
                version_tag=version_tag,
                start_time_seconds=start_seconds,
                source="filename",
                modified_at=modified_at,
                scan_first_seen_at=now,
            )
            results.append(audio)

    return results


def mark_latest_versions(audio_files: List[AudioFile]) -> Dict[str, List[AudioFile]]:
    """按声部分组，并标记每个声部的最新版本。

    未识别出声部的文件会归入 "_unknown" 组，且不标记 is_latest。

    Returns:
        { part_name: [AudioFile, ...] } 按声部索引的字典
    """
    groups: Dict[str, List[AudioFile]] = {}

    for af in audio_files:
        af.is_latest = False
        key = af.part_name if af.part_name else "_unknown"
        groups.setdefault(key, []).append(af)

    for part, files in groups.items():
        if part == "_unknown" or len(files) == 0:
            continue

        sorted_files = sorted(
            files,
            key=lambda f: _version_sort_key(f.version_tag, f.modified_at),
        )
        sorted_files[-1].is_latest = True

    return groups


def group_by_part(audio_files: List[AudioFile]) -> Dict[str, List[AudioFile]]:
    """按声部对音频文件分组，不修改 is_latest。"""
    groups: Dict[str, List[AudioFile]] = {}
    for af in audio_files:
        key = af.part_name if af.part_name else "_unknown"
        groups.setdefault(key, []).append(af)
    return groups


def find_file_by_path(audio_files: List[AudioFile], file_path: str) -> Optional[AudioFile]:
    """根据相对路径查找音频文件。"""
    for af in audio_files:
        if af.file_path == file_path:
            return af
    return None
