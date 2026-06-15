"""文件解析模块 - 解析Excel和文件名"""
import os
import re
from datetime import datetime
from typing import List, Tuple
import uuid

import pandas as pd

from .models import (
    RepertoireItem, CopyrightFile, Note, NoteType, Actor,
    HistoryEntry, ProcessingContext
)


class FileParser:
    """文件解析器"""

    def __init__(self, raw_data_dir: str):
        self.raw_data_dir = raw_data_dir
        self.track_id_pattern = re.compile(r'^(TRK\d{3})_')
        self.version_pattern = re.compile(r'_(旧版|正式版|彩排版|Demo版)\.')

    def parse_all(self, context: ProcessingContext) -> ProcessingContext:
        """解析所有文件"""
        self._parse_repertoire(context)
        self._parse_copyright_files(context)
        self._parse_notes(context)

        self._add_history_entry(
            context,
            actor=Actor.SYSTEM,
            action="文件解析完成",
            details={
                "曲目数量": len(context.repertoire),
                "版权文件数量": len(context.copyright_files),
                "备注数量": len(context.notes)
            }
        )

        return context

    def _parse_repertoire(self, context: ProcessingContext):
        """解析曲目表（当前版+旧版）"""
        current_path = os.path.join(self.raw_data_dir, "曲目表_当前版.xlsx")
        old_path = os.path.join(self.raw_data_dir, "曲目表_旧版.xlsx")

        for path, is_active in [(current_path, True), (old_path, False)]:
            if not os.path.exists(path):
                continue

            df = pd.read_excel(path)
            for _, row in df.iterrows():
                item = RepertoireItem(
                    track_id=str(row.get("曲目ID", "")).strip(),
                    track_name=str(row.get("曲目名称", "")).strip(),
                    artist=str(row.get("演唱者", "")).strip(),
                    copyright_owner=str(row.get("版权方", "")).strip(),
                    authorization_type=str(row.get("授权类型", "")).strip(),
                    version=str(row.get("版本", "正式版")).strip(),
                    is_active=bool(row.get("是否启用", is_active))
                )
                context.repertoire.append(item)

        self._add_history_entry(
            context,
            actor=Actor.SYSTEM,
            action="曲目表解析完成",
            details={
                "当前版曲目数": sum(1 for r in context.repertoire if r.is_active),
                "旧版曲目数": sum(1 for r in context.repertoire if not r.is_active)
            }
        )

    def _parse_copyright_files(self, context: ProcessingContext):
        """解析版权文件清单"""
        files_dir = os.path.join(self.raw_data_dir, "copyright_files")
        if not os.path.exists(files_dir):
            return

        for filename in os.listdir(files_dir):
            if not filename.endswith(".pdf"):
                continue

            track_name, artist, track_id, version = self._parse_filename(filename)

            cf = CopyrightFile(
                filename=filename,
                file_path=os.path.join(files_dir, filename),
                track_name_from_file=track_name,
                artist_from_file=artist,
                track_id_from_file=track_id,
                version_from_file=version
            )
            context.copyright_files.append(cf)

        context.copyright_files.sort(key=lambda x: x.filename)

        self._add_history_entry(
            context,
            actor=Actor.SYSTEM,
            action="版权文件解析完成",
            details={
                "文件总数": len(context.copyright_files),
                "有ID文件数": sum(1 for f in context.copyright_files if f.track_id_from_file),
                "无ID文件数": sum(1 for f in context.copyright_files if not f.track_id_from_file)
            }
        )

    def _parse_filename(self, filename: str) -> Tuple[str, str, str, str]:
        """解析文件名提取信息"""
        name_without_ext = filename.replace(".pdf", "")
        parts = name_without_ext.split("_")

        track_id = None
        if parts and self.track_id_pattern.match(filename):
            track_id = parts[0]
            parts = parts[1:]

        version = "正式版"
        for i, part in enumerate(parts):
            if part in ["旧版", "正式版", "彩排版", "Demo版"]:
                version = part
                parts = parts[:i]
                break

        track_name = ""
        artist = ""

        if len(parts) >= 2:
            track_name = parts[0]
            artist = "_".join(parts[1:])
        elif len(parts) == 1:
            track_name = parts[0]

        return track_name, artist, track_id, version

    def _parse_notes(self, context: ProcessingContext):
        """解析备注记录文件"""
        notes_path = os.path.join(self.raw_data_dir, "备注记录.txt")
        if not os.path.exists(notes_path):
            return

        with open(notes_path, "r", encoding="utf-8") as fp:
            content = fp.read()

        note_blocks = content.split("-" * 50)

        for block in note_blocks:
            block = block.strip()
            if not block:
                continue

            lines = block.split("\n")
            lines = [l for l in lines if l.strip() and "===" not in l]
            cleaned_block = "\n".join(lines)

            if not cleaned_block.strip():
                continue

            note = self._parse_note_block(cleaned_block)
            if note:
                context.notes.append(note)

        context.notes.sort(key=lambda x: x.timestamp)

        self._add_history_entry(
            context,
            actor=Actor.SYSTEM,
            action="备注记录解析完成",
            details={
                "后补备注数": sum(1 for n in context.notes if n.note_type == NoteType.SUPPLEMENTARY),
                "口头备注数": sum(1 for n in context.notes if n.note_type == NoteType.VERBAL),
                "运营备注数": sum(1 for n in context.notes if n.note_type == NoteType.OPERATION)
            }
        )

    def _parse_note_block(self, block: str) -> Note:
        """解析单个备注块"""
        lines = block.strip().split("\n")
        data = {}

        for line in lines:
            line = line.strip()
            if line.startswith("[") and line.endswith("]"):
                ts_str = line[1:-1]
                try:
                    data["timestamp"] = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    data["timestamp"] = datetime.now()
            elif ":" in line:
                key, value = line.split(":", 1)
                data[key.strip()] = value.strip()

        if "timestamp" not in data:
            return None

        note_type_map = {v.value: v for v in NoteType}
        actor_map = {v.value: v for v in Actor}

        note_type = note_type_map.get(data.get("类型", ""), NoteType.MANUAL)
        actor = actor_map.get(data.get("记录人", ""), Actor.MANUAL)

        target_track_id = data.get("关联曲目", "")
        if target_track_id == "无":
            target_track_id = None

        target_filename = data.get("关联文件", "")
        if target_filename == "无":
            target_filename = None

        return Note(
            note_id=f"NOTE_{uuid.uuid4().hex[:8]}",
            note_type=note_type,
            content=data.get("内容", ""),
            actor=actor,
            timestamp=data["timestamp"],
            target_track_id=target_track_id,
            target_filename=target_filename
        )

    def _add_history_entry(self, context: ProcessingContext, actor: Actor, action: str,
                           details: dict, target_filename: str = None,
                           target_track_id: str = None):
        """添加历史记录"""
        entry = HistoryEntry(
            entry_id=f"HIST_{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(),
            actor=actor,
            action=action,
            details=details,
            target_filename=target_filename,
            target_track_id=target_track_id
        )
        context.history.append(entry)
