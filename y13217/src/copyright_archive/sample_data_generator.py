"""样例数据生成器 - 生成包含各种场景的测试数据"""
import os
import random
from datetime import datetime, timedelta
from typing import List

import pandas as pd

from .models import (
    RepertoireItem, CopyrightFile, Note, NoteType, Actor,
    MismatchReason
)


class SampleDataGenerator:
    """样例数据生成器"""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.raw_dir = os.path.join(output_dir, "raw_data")
        os.makedirs(self.raw_dir, exist_ok=True)

    def generate_all(self) -> dict:
        """生成所有样例数据"""
        results = {}

        results["repertoire_current"] = self._generate_current_repertoire()
        results["repertoire_old"] = self._generate_old_repertoire()
        results["copyright_files"] = self._generate_copyright_files_metadata()
        results["notes"] = self._generate_notes()

        self._write_excel_files(results)
        self._generate_physical_files(results["copyright_files"])
        self._write_notes_file(results["notes"])

        return results

    def _generate_current_repertoire(self) -> List[RepertoireItem]:
        """生成当前版曲目表"""
        return [
            RepertoireItem(
                track_id="TRK001",
                track_name="夜空中最亮的星",
                artist="逃跑计划",
                copyright_owner="天韵文化",
                authorization_type="独家授权",
                version="正式版",
                is_active=True
            ),
            RepertoireItem(
                track_id="TRK002",
                track_name="平凡之路",
                artist="朴树",
                copyright_owner="魔音唱片",
                authorization_type="非独家授权",
                version="正式版",
                is_active=True
            ),
            RepertoireItem(
                track_id="TRK003",
                track_name="青花瓷",
                artist="周杰伦",
                copyright_owner="杰威尔音乐",
                authorization_type="独家授权",
                version="正式版",
                is_active=True
            ),
            RepertoireItem(
                track_id="TRK004",
                track_name="成都",
                artist="赵雷",
                copyright_owner="街声音乐",
                authorization_type="独家授权",
                version="正式版",
                is_active=True
            ),
            RepertoireItem(
                track_id="TRK005",
                track_name="演员",
                artist="薛之谦",
                copyright_owner="太合音乐",
                authorization_type="非独家授权",
                version="正式版",
                is_active=True
            ),
        ]

    def _generate_old_repertoire(self) -> List[RepertoireItem]:
        """生成旧版曲目表 - 包含一些已变更的条目"""
        return [
            RepertoireItem(
                track_id="TRK001",
                track_name="夜空中最亮的星星",  # 名称略有不同
                artist="逃跑计划乐队",  # 歌手名多了"乐队"
                copyright_owner="天韵文化",
                authorization_type="独家授权",
                version="旧版",
                is_active=False
            ),
            RepertoireItem(
                track_id="TRK002",
                track_name="平凡之路",
                artist="朴树",
                copyright_owner="魔音唱片",
                authorization_type="独家授权",  # 旧版是独家
                version="旧版",
                is_active=False
            ),
            RepertoireItem(
                track_id="TRK006",  # 已下架曲目
                track_name="某首下架歌",
                artist="某歌手",
                copyright_owner="某公司",
                authorization_type="非独家授权",
                version="旧版",
                is_active=False
            ),
        ]

    def _generate_copyright_files_metadata(self) -> List[CopyrightFile]:
        """生成版权文件元数据 - 包含各种不匹配情况"""
        return [
            CopyrightFile(
                filename="TRK001_夜空中最亮的星_逃跑计划_独家授权.pdf",
                file_path="TRK001_夜空中最亮的星_逃跑计划_独家授权.pdf",
                track_name_from_file="夜空中最亮的星",
                artist_from_file="逃跑计划",
                track_id_from_file="TRK001",
                version_from_file="正式版"
            ),
            CopyrightFile(
                filename="TRK002_平凡之路_朴树_非独家授权.pdf",
                file_path="TRK002_平凡之路_朴树_非独家授权.pdf",
                track_name_from_file="平凡之路",
                artist_from_file="朴树",
                track_id_from_file="TRK002",
                version_from_file="正式版"
            ),
            CopyrightFile(
                filename="TRK003_青花瓷_周杰伦_Jay_独家授权.pdf",  # 多了Jay
                file_path="TRK003_青花瓷_周杰伦_Jay_独家授权.pdf",
                track_name_from_file="青花瓷",
                artist_from_file="周杰伦",
                track_id_from_file="TRK003",
                version_from_file="正式版"
            ),
            CopyrightFile(
                filename="成都_赵雷_独家授权.pdf",  # 缺少曲目ID
                file_path="成都_赵雷_独家授权.pdf",
                track_name_from_file="成都",
                artist_from_file="赵雷",
                track_id_from_file=None,
                version_from_file="正式版"
            ),
            CopyrightFile(
                filename="TRK005_演员_薛之谦_非独家授权_彩排版.pdf",  # 有额外后缀
                file_path="TRK005_演员_薛之谦_非独家授权_彩排版.pdf",
                track_name_from_file="演员",
                artist_from_file="薛之谦",
                track_id_from_file="TRK005",
                version_from_file="彩排版"
            ),
            CopyrightFile(
                filename="TRK001_夜空中最亮的星星_逃跑计划乐队_独家授权.pdf",  # 旧版名称
                file_path="TRK001_夜空中最亮的星星_逃跑计划乐队_独家授权.pdf",
                track_name_from_file="夜空中最亮的星星",
                artist_from_file="逃跑计划乐队",
                track_id_from_file="TRK001",
                version_from_file="旧版"
            ),
        ]

    def _generate_notes(self) -> List[Note]:
        """生成各种备注"""
        base_time = datetime.now() - timedelta(days=7)

        return [
            Note(
                note_id="NOTE001",
                note_type=NoteType.SUPPLEMENTARY,
                content="TRK003 文件名中的_Jay是标注别名，不影响匹配，按周杰伦处理",
                actor=Actor.LIN_JIE,
                timestamp=base_time + timedelta(hours=2),
                target_track_id="TRK003",
                target_filename="TRK003_青花瓷_周杰伦_Jay_独家授权.pdf"
            ),
            Note(
                note_id="NOTE002",
                note_type=NoteType.VERBAL,
                content="林姐口头确认：TRK005的彩排版可以用，版权覆盖彩排场景",
                actor=Actor.LIN_JIE,
                timestamp=base_time + timedelta(hours=6),
                target_track_id="TRK005",
                target_filename="TRK005_演员_薛之谦_非独家授权_彩排版.pdf"
            ),
            Note(
                note_id="NOTE003",
                note_type=NoteType.VERBAL,
                content="林姐口头说：成都这首歌虽然没有ID，但确实是TRK004，已确认",
                actor=Actor.LIN_JIE,
                timestamp=base_time + timedelta(days=1, hours=3),
                target_track_id="TRK004",
                target_filename="成都_赵雷_独家授权.pdf"
            ),
            Note(
                note_id="NOTE004",
                note_type=NoteType.OPERATION,
                content="彩排前临时调整：TRK002 授权类型由'独家'改为'非独家'，已与版权方确认",
                actor=Actor.OPERATION_MANAGER,
                timestamp=base_time + timedelta(days=5, hours=4),
                target_track_id="TRK002",
                target_filename="TRK002_平凡之路_朴树_非独家授权.pdf"
            ),
            Note(
                note_id="NOTE005",
                note_type=NoteType.VERBAL,
                content="林姐口头判断：旧版文件名TRK001是归档用的，不参与当前匹配",
                actor=Actor.LIN_JIE,
                timestamp=base_time + timedelta(days=2, hours=1),
                target_track_id="TRK001",
                target_filename="TRK001_夜空中最亮的星星_逃跑计划乐队_独家授权.pdf"
            ),
        ]

    def _write_excel_files(self, data: dict):
        """写入Excel文件"""
        current_df = pd.DataFrame([
            {
                "曲目ID": item.track_id,
                "曲目名称": item.track_name,
                "演唱者": item.artist,
                "版权方": item.copyright_owner,
                "授权类型": item.authorization_type,
                "版本": item.version,
                "是否启用": item.is_active
            }
            for item in data["repertoire_current"]
        ])
        current_path = os.path.join(self.raw_dir, "曲目表_当前版.xlsx")
        current_df.to_excel(current_path, index=False)

        old_df = pd.DataFrame([
            {
                "曲目ID": item.track_id,
                "曲目名称": item.track_name,
                "演唱者": item.artist,
                "版权方": item.copyright_owner,
                "授权类型": item.authorization_type,
                "版本": item.version,
                "是否启用": item.is_active
            }
            for item in data["repertoire_old"]
        ])
        old_path = os.path.join(self.raw_dir, "曲目表_旧版.xlsx")
        old_df.to_excel(old_path, index=False)

        files_df = pd.DataFrame([
            {
                "文件名": f.filename,
                "文件路径": f.file_path,
                "提取的曲目名": f.track_name_from_file,
                "提取的演唱者": f.artist_from_file,
                "提取的曲目ID": f.track_id_from_file or "",
                "提取的版本": f.version_from_file
            }
            for f in data["copyright_files"]
        ])
        files_path = os.path.join(self.raw_dir, "版权文件清单.xlsx")
        files_df.to_excel(files_path, index=False)

    def _generate_physical_files(self, files: List[CopyrightFile]):
        """生成物理文件（空文件占位）"""
        files_dir = os.path.join(self.raw_dir, "copyright_files")
        os.makedirs(files_dir, exist_ok=True)

        for f in files:
            file_path = os.path.join(files_dir, f.filename)
            with open(file_path, "w") as fp:
                fp.write(f"版权授权文件占位符\n\n")
                fp.write(f"曲目: {f.track_name_from_file}\n")
                fp.write(f"演唱: {f.artist_from_file}\n")
                fp.write(f"曲目ID: {f.track_id_from_file or '未标注'}\n")
                fp.write(f"版本: {f.version_from_file}\n")

    def _write_notes_file(self, notes: List[Note]):
        """写入备注文件"""
        notes_path = os.path.join(self.raw_dir, "备注记录.txt")
        with open(notes_path, "w", encoding="utf-8") as fp:
            fp.write("=== 版权授权清单归档 - 备注记录 ===\n\n")
            for note in notes:
                fp.write(f"[{note.timestamp.strftime('%Y-%m-%d %H:%M:%S')}]\n")
                fp.write(f"类型: {note.note_type.value}\n")
                fp.write(f"记录人: {note.actor.value}\n")
                fp.write(f"关联曲目: {note.target_track_id or '无'}\n")
                fp.write(f"关联文件: {note.target_filename or '无'}\n")
                fp.write(f"内容: {note.content}\n")
                fp.write("-" * 50 + "\n")
