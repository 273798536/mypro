"""备注系统。

支持四种备注类型：
- supplementary: 后补备注，扫描后人工补充的排练/授权说明
- manual_annotation: 人工批注，直接标在音频或冲突上的批注
- delivery: 交付备注，随交付清单一起的说明
- system: 系统备注，工具自动生成的记录

备注可以挂在：
- 单个音频文件 (audio_file)
- 单个冲突 (conflict)
- 全局 (global)
"""

from typing import List, Optional, Dict
from datetime import datetime

from .models import Note, AudioFile, Conflict, _new_id


class NoteManager:
    """备注管理器。

    提供添加、查询、更新备注的接口，
    保证备注与对应实体的关联关系稳定。
    """

    def __init__(self):
        self._notes: Dict[str, Note] = {}

    def add_supplementary_note(
        self,
        content: str,
        author: str = "anonymous",
        target_type: str = "global",
        target_id: str = "global",
    ) -> Note:
        """添加一条后补备注。

        这是日常脚本中最常用的接口，参数名保持稳定。

        Args:
            content: 备注内容
            author: 作者
            target_type: 目标类型 audio_file / conflict / global
            target_id: 目标 ID

        Returns:
            新建的 Note 对象
        """
        note = Note(
            note_id=_new_id("nt"),
            note_type="supplementary",
            target_type=target_type,
            target_id=target_id,
            content=content,
            author=author,
        )
        self._notes[note.note_id] = note
        return note

    def add_manual_annotation(
        self,
        content: str,
        author: str,
        target_type: str,
        target_id: str,
    ) -> Note:
        """添加一条人工批注。"""
        note = Note(
            note_id=_new_id("nt"),
            note_type="manual_annotation",
            target_type=target_type,
            target_id=target_id,
            content=content,
            author=author,
        )
        self._notes[note.note_id] = note
        return note

    def add_delivery_note(
        self,
        content: str,
        author: str = "system",
    ) -> Note:
        """添加一条交付备注。"""
        note = Note(
            note_id=_new_id("nt"),
            note_type="delivery",
            target_type="global",
            target_id="global",
            content=content,
            author=author,
        )
        self._notes[note.note_id] = note
        return note

    def add_system_note(
        self,
        content: str,
        target_type: str = "global",
        target_id: str = "global",
    ) -> Note:
        """添加一条系统备注。"""
        note = Note(
            note_id=_new_id("nt"),
            note_type="system",
            target_type=target_type,
            target_id=target_id,
            content=content,
        )
        self._notes[note.note_id] = note
        return note

    def get_note(self, note_id: str) -> Optional[Note]:
        """根据 ID 获取备注。"""
        return self._notes.get(note_id)

    def list_notes(
        self,
        note_type: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
    ) -> List[Note]:
        """按条件筛选备注。

        Args:
            note_type: 按备注类型筛选
            target_type: 按目标类型筛选
            target_id: 按目标 ID 筛选

        Returns:
            符合条件的备注列表，按创建时间升序
        """
        results = list(self._notes.values())

        if note_type:
            results = [n for n in results if n.note_type == note_type]
        if target_type:
            results = [n for n in results if n.target_type == target_type]
        if target_id:
            results = [n for n in results if n.target_id == target_id]

        results.sort(key=lambda n: n.created_at)
        return results

    def update_note(self, note_id: str, content: str) -> Optional[Note]:
        """更新备注内容。"""
        note = self._notes.get(note_id)
        if not note:
            return None
        note.content = content
        note.updated_at = datetime.now().isoformat()
        return note

    def delete_note(self, note_id: str) -> bool:
        """删除备注。"""
        if note_id in self._notes:
            del self._notes[note_id]
            return True
        return False

    def count(self) -> int:
        """备注总数。"""
        return len(self._notes)

    def to_dict(self) -> Dict[str, dict]:
        """导出为字典，用于持久化。"""
        return {nid: n.to_dict() for nid, n in self._notes.items()}

    @classmethod
    def from_dict(cls, data: Dict[str, dict]) -> "NoteManager":
        """从字典恢复。"""
        mgr = cls()
        for nid, ndata in data.items():
            mgr._notes[nid] = Note.from_dict(ndata)
        return mgr

    def all_notes(self) -> Dict[str, Note]:
        """返回所有备注的字典（只读使用）。"""
        return dict(self._notes)


def format_note_summary(notes: List[Note]) -> str:
    """将备注列表格式化为人类可读的摘要。"""
    if not notes:
        return "（无备注）"

    lines = []
    type_labels = {
        "supplementary": "后补备注",
        "manual_annotation": "人工批注",
        "delivery": "交付备注",
        "system": "系统备注",
    }

    for i, note in enumerate(notes, 1):
        ntype = type_labels.get(note.note_type, note.note_type)
        lines.append(
            f"  [{i}] {ntype} · {note.author} · {note.created_at}"
        )
        lines.append(f"      {note.content}")

    return "\n".join(lines)
