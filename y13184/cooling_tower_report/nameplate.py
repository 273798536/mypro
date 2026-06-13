"""
设备铭牌管理模块

核心职责：
- 管理冷却塔设备铭牌的完整版本历史
- 记录阈值、单位、备注的每一次变更
- 支持"撤回记录"——错了的说法要留痕，不能一删了之
- 为报告提供"某时间点的铭牌说法"快照

为什么单独一个模块？
实验老师小林最怕的就是"铭牌里翻出一条旧说法，最后报警和备注对不上"。
所以铭牌本身必须是版本化的，每一条判断都能追到它当时依据的是哪版铭牌。
"""

import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Optional, Dict, Any
import hashlib


@dataclass
class ThresholdConfig:
    """安全阈值配置"""
    water_drop_temp_high: float = 35.0
    water_drop_temp_low: float = 5.0
    water_drop_flow_high: float = 100.0
    water_drop_flow_low: float = 10.0
    unit: str = "L/min"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class NameplateNote:
    """铭牌备注——每条备注都要说清它改变了哪些判断"""
    note_id: str
    timestamp: str
    operator: str
    content: str
    impact_description: str
    is_retracted: bool = False
    retract_reason: str = ""
    retract_timestamp: str = ""
    retract_operator: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class NameplateVersion:
    """铭牌的一个版本——某一时刻铭牌的完整快照"""
    version: int
    timestamp: str
    operator: str
    change_reason: str
    thresholds: ThresholdConfig
    notes: List[NameplateNote]
    device_model: str = "CT-2000"
    device_id: str = "CT-001"
    factory_date: str = "2023-03-15"

    def snapshot_hash(self) -> str:
        """快照哈希——用来校验报告和铭牌是否对得上"""
        raw = asdict(self)
        data = json.dumps(raw, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(data.encode("utf-8")).hexdigest()[:16]

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["snapshot_hash"] = self.snapshot_hash()
        return d


class NameplateManager:
    """
    设备铭牌管理器

    使用方式：
        mgr = NameplateManager("data/nameplate.json")
        mgr.add_note(operator="小林", content="临时调低高温阈值",
                     impact="所有高于32度的水滴都改为报警")
        snapshot = mgr.get_snapshot_at("2024-06-14 15:00:00")
    """

    def __init__(self, data_path: str):
        self.data_path = data_path
        self.versions: List[NameplateVersion] = []
        self._load()

    def _load(self) -> None:
        if os.path.exists(self.data_path):
            with open(self.data_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for v in data.get("versions", []):
                thresholds = ThresholdConfig(**v["thresholds"])
                notes = [NameplateNote(**n) for n in v.get("notes", [])]
                version = NameplateVersion(
                    version=v["version"],
                    timestamp=v["timestamp"],
                    operator=v["operator"],
                    change_reason=v["change_reason"],
                    thresholds=thresholds,
                    notes=notes,
                    device_model=v.get("device_model", "CT-2000"),
                    device_id=v.get("device_id", "CT-001"),
                    factory_date=v.get("factory_date", "2023-03-15"),
                )
                self.versions.append(version)
        else:
            self._init_first_version()

    def _init_first_version(self) -> None:
        """初始化第一版铭牌——出厂状态"""
        first = NameplateVersion(
            version=1,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            operator="system",
            change_reason="初始铭牌——出厂默认配置",
            thresholds=ThresholdConfig(),
            notes=[],
        )
        self.versions.append(first)
        self._save()

    def _save(self) -> None:
        os.makedirs(os.path.dirname(self.data_path), exist_ok=True)
        data = {
            "versions": [v.to_dict() for v in self.versions],
        }
        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _new_version(self, operator: str, reason: str,
                     thresholds: Optional[ThresholdConfig] = None,
                     notes: Optional[List[NameplateNote]] = None) -> NameplateVersion:
        """创建一个新版本，基于上一版"""
        prev = self.versions[-1]
        new_version = NameplateVersion(
            version=prev.version + 1,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            operator=operator,
            change_reason=reason,
            thresholds=thresholds or ThresholdConfig(**prev.thresholds.to_dict()),
            notes=notes or [NameplateNote(**n.to_dict()) for n in prev.notes],
            device_model=prev.device_model,
            device_id=prev.device_id,
            factory_date=prev.factory_date,
        )
        self.versions.append(new_version)
        self._save()
        return new_version

    def update_thresholds(self, operator: str, reason: str,
                          **threshold_kwargs) -> NameplateVersion:
        """
        修改安全阈值——必须说明原因和操作人

        为什么要留 operator 和 reason？
        报告跳变时，要能一眼看出是"小林改了阈值"还是"数据本身变了"。
        """
        prev = self.versions[-1]
        new_th = ThresholdConfig(**prev.thresholds.to_dict())
        for k, v in threshold_kwargs.items():
            if hasattr(new_th, k):
                setattr(new_th, k, v)
        return self._new_version(operator, reason, thresholds=new_th)

    def add_note(self, operator: str, content: str,
                 impact_description: str) -> NameplateVersion:
        """
        追加一条铭牌备注

        参数：
            operator: 操作人，比如"小林"
            content: 备注内容
            impact_description: 这条备注改变了哪些判断——必须写清楚

        为什么要有 impact_description？
        下午换班前小林临时补一条备注，如果不说清"改了哪些判断"，
        排班同事看报告时就会疑惑：这报警是按新说法还是旧说法算的？
        """
        prev = self.versions[-1]
        note_id = f"note_{prev.version + 1}_{len(prev.notes) + 1}"
        new_note = NameplateNote(
            note_id=note_id,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            operator=operator,
            content=content,
            impact_description=impact_description,
        )
        new_notes = [NameplateNote(**n.to_dict()) for n in prev.notes]
        new_notes.append(new_note)
        return self._new_version(
            operator, f"追加备注：{content[:30]}", notes=new_notes
        )

    def retract_note(self, operator: str, note_id: str,
                     reason: str) -> NameplateVersion:
        """
        撤回一条备注——错了的说法不能删，要标成"已撤回"并说明原因

        为什么不直接删？
        如果报告是按那条备注算的，后来又撤回了，历史报告就不能"消失"。
        必须留痕，让跳变分析能说清："X点到Y点的异常，是因为一条已撤回的备注"。
        """
        prev = self.versions[-1]
        new_notes = [NameplateNote(**n.to_dict()) for n in prev.notes]
        found = False
        for note in new_notes:
            if note.note_id == note_id and not note.is_retracted:
                note.is_retracted = True
                note.retract_reason = reason
                note.retract_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                note.retract_operator = operator
                found = True
                break
        if not found:
            raise ValueError(f"未找到可撤回的备注：{note_id}")
        return self._new_version(
            operator, f"撤回备注 {note_id}：{reason[:30]}", notes=new_notes
        )

    def get_latest(self) -> NameplateVersion:
        """获取最新版铭牌"""
        return self.versions[-1]

    def get_snapshot_at(self, timestamp: str) -> NameplateVersion:
        """
        获取某个时间点的铭牌快照

        报告生成时会调用这个，确保"报告里的判断"和"当时的铭牌说法"一一对应。
        """
        target = timestamp
        for v in reversed(self.versions):
            if v.timestamp <= target:
                return v
        return self.versions[0]

    def get_version_count(self) -> int:
        return len(self.versions)

    def list_versions(self) -> List[Dict[str, Any]]:
        """列出所有版本摘要，方便快速查看变更历史"""
        return [
            {
                "version": v.version,
                "timestamp": v.timestamp,
                "operator": v.operator,
                "change_reason": v.change_reason,
                "snapshot_hash": v.snapshot_hash(),
                "note_count": len(v.notes),
                "active_note_count": sum(1 for n in v.notes if not n.is_retracted),
            }
            for v in self.versions
        ]
