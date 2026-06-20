"""
版本别名注册表
Version Alias Registry

用途：
- 允许用一个稳定别名（如"baseline_v2_backup"）指向旧文件
- 冻结别名后指向不可变更，防"重跑覆盖旧证据"
- 文件指纹校验：旧文件被人偷偷改了立刻露怯
- 支持报告里明确显示"本次回放使用了哪个别名→哪个具体文件"
"""

from __future__ import annotations

import hashlib
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from .models import (
    ProcessingRecord,
    ProcessingStage,
    VersionAlias,
)


class VersionAliasRegistry:
    """
    版本别名注册表

    使用场景：
    推荐算法小许："试跑时我放一个别名指旧文件，看它遇到乱材料会不会露怯。"
    → 注册alias="旧模型日志_20240101"指向某个.log，冻结它，
    然后回放时用alias而不是硬编码路径。
    """

    def __init__(self) -> None:
        self._aliases: Dict[str, VersionAlias] = {}
        self._records: List[ProcessingRecord] = []

    def _make_record(self, action: str, inputs: Dict, outputs: Dict,
                     notes: List[str]) -> ProcessingRecord:
        rec = ProcessingRecord(
            record_id=f"ALIAS-{uuid.uuid4().hex[:12]}",
            stage=ProcessingStage.LOG_IMPORT,
            action=action,
            inputs=inputs,
            outputs=outputs,
            log_refs=[],
            operator="VersionAliasRegistry",
            notes=notes,
        )
        self._records.append(rec)
        return rec

    @staticmethod
    def _hash_file(path: str) -> str:
        if not os.path.exists(path):
            raise FileNotFoundError(f"别名目标文件不存在: {path}")
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 16), b""):
                h.update(chunk)
        return h.hexdigest()

    def register(self, alias: str, target_path: str,
                 description: str = "",
                 freeze: bool = False,
                 verify_now: bool = True) -> VersionAlias:
        """
        注册版本别名

        Args:
            alias: 别名，如 "旧模型日志_20240101"
            target_path: 实际文件路径
            description: 说明文字
            freeze: 立即冻结（之后不能改指向）
            verify_now: 立刻算哈希并校验文件存在性

        Returns:
            VersionAlias对象
        """
        if alias in self._aliases:
            raise ValueError(f"别名[{alias}]已存在，使用update()修改（未冻结时）")

        target_hash = None
        notes = [f"别名 {alias} → {target_path}"]
        if verify_now:
            target_hash = self._hash_file(target_path)
            notes.append(f"首次校验SHA256={target_hash[:16]}...")

        va = VersionAlias(
            alias=alias,
            target_path=target_path,
            target_hash=target_hash,
            description=description,
            created_at=datetime.now(),
            is_frozen=freeze,
        )
        self._aliases[alias] = va
        if freeze:
            notes.append("注册时已冻结，后续不可修改指向")

        self._make_record(
            "注册版本别名",
            {"alias": alias, "target_path": target_path, "freeze": freeze},
            {"target_hash": target_hash, "frozen": freeze},
            notes,
        )
        return va

    def update(self, alias: str, new_target_path: str,
               verify_now: bool = True) -> VersionAlias:
        """修改别名指向（仅未冻结时允许）"""
        if alias not in self._aliases:
            raise KeyError(f"别名[{alias}]不存在")
        va = self._aliases[alias]
        if va.is_frozen:
            raise PermissionError(f"别名[{alias}]已冻结，不可修改指向（防证据被覆盖）")

        old_path = va.target_path
        old_hash = va.target_hash

        new_hash = None
        notes = [f"修改别名 {alias}: {old_path} → {new_target_path}"]
        if verify_now:
            new_hash = self._hash_file(new_target_path)
            notes.append(f"新文件SHA256={new_hash[:16]}...")

        va.target_path = new_target_path
        va.target_hash = new_hash

        self._make_record(
            "修改版本别名指向",
            {"alias": alias, "old_path": old_path, "new_path": new_target_path},
            {"old_hash": old_hash, "new_hash": new_hash},
            notes,
        )
        return va

    def freeze(self, alias: str) -> VersionAlias:
        """冻结别名，防止被改"""
        if alias not in self._aliases:
            raise KeyError(f"别名[{alias}]不存在")
        va = self._aliases[alias]
        if not va.is_frozen:
            va.is_frozen = True
            self._make_record(
                "冻结版本别名",
                {"alias": alias},
                {"is_frozen": True},
                [f"冻结别名 {alias}，后续禁止修改指向"],
            )
        return va

    def verify(self, alias: str) -> Dict[str, object]:
        """
        校验别名所指文件是否被篡改

        返回: {
            "exists": bool,
            "matches": bool,       # 哈希是否一致
            "expected_hash": str,
            "actual_hash": str,
            "size_changed": bool,
        }
        """
        if alias not in self._aliases:
            raise KeyError(f"别名[{alias}]不存在")
        va = self._aliases[alias]

        result = {
            "exists": False,
            "matches": False,
            "expected_hash": va.target_hash,
            "actual_hash": None,
            "size_changed": False,
        }

        if not os.path.exists(va.target_path):
            self._make_record(
                "校验版本别名失败(文件消失)",
                {"alias": alias, "expected_path": va.target_path},
                dict(result),
                [f"别名 {alias} 目标文件已消失：{va.target_path}"],
            )
            return result

        result["exists"] = True
        actual = self._hash_file(va.target_path)
        result["actual_hash"] = actual

        if va.target_hash is None:
            va.target_hash = actual
            result["matches"] = True
            self._make_record(
                "首次补录版本别名哈希",
                {"alias": alias, "path": va.target_path},
                {"target_hash": actual},
                [f"补录 {alias} 哈希={actual[:16]}..."],
            )
        else:
            result["matches"] = (actual == va.target_hash)
            if not result["matches"]:
                self._make_record(
                    "校验版本别名：HASH不匹配（文件被篡改！）",
                    {"alias": alias, "path": va.target_path},
                    dict(result),
                    [
                        f"期望SHA256={va.target_hash[:16]}...",
                        f"实际SHA256={actual[:16]}...",
                        "⚠️ 文件内容已变更！乱材料会露怯，已记录。",
                    ],
                )
            else:
                self._make_record(
                    "校验版本别名通过",
                    {"alias": alias, "path": va.target_path},
                    dict(result),
                    [f"{alias} 文件哈希一致，材料未被篡改"],
                )
        return result

    def resolve(self, alias: str, verify: bool = True) -> str:
        """
        通过别名拿到实际文件路径

        Args:
            alias: 别名
            verify: 是否先校验哈希

        Returns:
            文件路径字符串

        Raises:
            FileNotFoundError: 文件消失
            ValueError: Hash不匹配（即乱材料露怯了）
        """
        if alias not in self._aliases:
            raise KeyError(f"版本别名不存在: {alias}")
        if verify:
            v = self.verify(alias)
            if not v["exists"]:
                raise FileNotFoundError(f"别名[{alias}]指向的文件不存在")
            if v["expected_hash"] and not v["matches"]:
                raise ValueError(
                    f"别名[{alias}]指向的文件已被篡改！"
                    f"期望哈希{v['expected_hash'][:16]}... vs 实际{v['actual_hash'][:16]}..."
                    "——乱材料露怯了，请核查训练日志是否被重跑覆盖。"
                )
        return self._aliases[alias].target_path

    def get(self, alias: str) -> VersionAlias:
        if alias not in self._aliases:
            raise KeyError(f"别名[{alias}]不存在")
        return self._aliases[alias]

    def list_all(self) -> List[VersionAlias]:
        return list(self._aliases.values())

    def drain_records(self) -> List[ProcessingRecord]:
        recs = self._records
        self._records = []
        return recs

    def peek_records(self) -> List[ProcessingRecord]:
        return list(self._records)
