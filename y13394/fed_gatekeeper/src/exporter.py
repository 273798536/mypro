# -*- coding: utf-8 -*-
"""材料包打包 - 像现场会收到的材料，一包全带走。

包内容：
  00_README.txt              本包说明
  01_record.json             守门记录完整快照
  02_gray_config.json        当时用的灰度配置副本（便于事后审计）
  03_failures.txt            失败明细（给项目经理一眼看的版本）
  04_approvals.json          该记录的所有人工确认历史
  05_checks_table.md         检查项表格（打印友好）
  extra/                     用户通过 --extra-materials 带的文件
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


class GatekeeperExporter:
    def __init__(self, storage):
        self.storage = storage

    def pack_materials(self, record: Dict[str, Any]) -> Path:
        """生成材料包，返回压缩包路径（这里不压缩，直接生成目录，方便老周看）。"""
        rid = record["record_id"]
        pack_dir = self.storage.materials_dir / f"materials_{rid}"
        pack_dir.mkdir(parents=True, exist_ok=True)

        # 0. 说明
        self._write_readme(pack_dir, record)

        # 1. 记录快照
        (pack_dir / "01_record.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        # 2. 灰度配置副本（去掉内部字段）
        cfg_snap = {
            k: v for k, v in record.get("gray_config_snapshot", {}).items()
            if not k.startswith("__")
        }
        (pack_dir / "02_gray_config.json").write_text(
            json.dumps(cfg_snap, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        # 再存一份原始行号映射（复盘有用）
        raw_lines = record.get("gray_config_snapshot", {}).get("__raw_lines__", {})
        if raw_lines:
            (pack_dir / "02b_gray_config_lines.txt").write_text(
                "\n".join(f"{k}\t{v}" for k, v in raw_lines.items()),
                encoding="utf-8",
            )

        # 3. 失败明细（给人快速扫的）
        self._write_failures(pack_dir, record)

        # 4. 人工确认历史
        approvals = self.storage.read_approvals(rid)
        (pack_dir / "04_approvals.json").write_text(
            json.dumps(approvals, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        # 5. 检查项表格（Markdown，复制到会议纪要很方便）
        self._write_checks_table(pack_dir, record)

        # 6. 用户带的额外材料
        extras = record.get("extra_material_paths", [])
        if extras:
            extra_dir = pack_dir / "extra"
            extra_dir.mkdir(exist_ok=True)
            for ep in extras:
                src = Path(ep)
                if src.exists():
                    dst = extra_dir / src.name
                    try:
                        shutil.copy2(src, dst)
                    except Exception:
                        pass

        # 7. 打包成 zip（给老周发邮件/上传用）
        zip_path = shutil.make_archive(
            str(pack_dir), "zip", root_dir=str(pack_dir.parent), base_dir=pack_dir.name
        )
        return Path(zip_path)

    # ---------- 具体文件 ----------
    def _write_readme(self, pack_dir: Path, record: Dict[str, Any]):
        rid = record["record_id"]
        lines = [
            "=" * 60,
            "  联邦客户端上线守门 - 材料包说明",
            "=" * 60,
            "",
            f"  RECORD_ID        : {rid}",
            f"  模型版本         : {record['model_version']}",
            f"  撤回记录 ID      : {record.get('rollback_id') or '(未关联)'}",
            f"  灰度配置路径     : {record['gray_config_path']}",
            f"  守门结论         : {record['final_conclusion']}",
            f"  结论理由         : {record['final_reason']}",
            f"  打包时间         : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "-" * 60,
            "  包内容",
            "-" * 60,
            "  00_README.txt            本说明",
            "  01_record.json           守门记录完整快照（机器可读）",
            "  02_gray_config.json      灰度配置副本（审计用）",
            "  02b_gray_config_lines.txt 灰度配置字段原始行号映射",
            "  03_failures.txt          失败/警告明细（快速阅读）",
            "  04_approvals.json        该记录的所有人工确认历史",
            "  05_checks_table.md       检查项表格（会议纪要用）",
            "  extra/                   --extra-materials 附带的文件",
            "",
            "-" * 60,
            "  会后处理建议",
            "-" * 60,
            "  1. 若有 FAIL：修灰度配置 → 重跑 gatekeeper run",
            "  2. 若只有 WARN：老周人工确认 → gatekeeper approve",
            "  3. 复盘时：对照 02b 看配置原文，对照 04 看人工判断变化",
            "",
        ]
        (pack_dir / "00_README.txt").write_text("\n".join(lines), encoding="utf-8")

    def _write_failures(self, pack_dir: Path, record: Dict[str, Any]):
        lines = [
            "=" * 60,
            f"  失败/警告明细 - {record['record_id']}",
            "=" * 60,
            "",
        ]
        if not record["failure_messages"]:
            lines.append("  (无失败或警告，全部通过 🎉)")
        else:
            for fm in record["failure_messages"]:
                lines.append(fm)
        lines.append("")
        (pack_dir / "03_failures.txt").write_text("\n".join(lines), encoding="utf-8")

    def _write_checks_table(self, pack_dir: Path, record: Dict[str, Any]):
        lines = [
            f"# 检查项表 - {record['record_id']}",
            "",
            "| # | 检查项 | 状态 | 定位 | 消息 |",
            "|---|---|---|---|---|",
        ]
        for i, c in enumerate(record["checks"], 1):
            loc = c.get("raw_line") or c.get("source", "")
            lines.append(
                f"| {i} | {c['name']} | **{c['status']}** | {loc} | {c['message']} |"
            )
        lines.append("")
        lines.append(f"**结论：{record['final_conclusion']}** — {record['final_reason']}")
        lines.append("")
        (pack_dir / "05_checks_table.md").write_text("\n".join(lines), encoding="utf-8")
