# -*- coding: utf-8 -*-
"""两次守门结果对比 - 给项目经理看差异用。

项目经理要对照两次结果看有什么变了：
- 模型版本变了？
- 灰度比例变了？
- 检查项结论变了？
- 人工确认变了？（旧的不被盖，都能看到）
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple


class GatekeeperDiff:
    def compare(
        self,
        r1: Dict[str, Any],
        r2: Dict[str, Any],
        a1: List[Dict[str, Any]],
        a2: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """对比两条记录 + 各自的人工确认历史。"""
        result = {
            "record_id_1": r1["record_id"],
            "record_id_2": r2["record_id"],
            "basic_diffs": [],
            "gray_config_diffs": [],
            "check_diffs": [],
            "approval_diffs": [],
        }

        # 1. 基础信息对比
        basic_fields = [
            ("model_version", "模型版本"),
            ("rollback_id", "撤回记录 ID"),
            ("final_conclusion", "最终结论"),
            ("final_reason", "结论理由"),
            ("gray_config_path", "灰度配置路径"),
        ]
        for k, label in basic_fields:
            v1 = r1.get(k)
            v2 = r2.get(k)
            if v1 != v2:
                result["basic_diffs"].append({
                    "field": k,
                    "label": label,
                    "record_1": v1,
                    "record_2": v2,
                })

        # 2. 灰度配置核心字段对比（去掉内部字段）
        cfg1 = self._clean_cfg(r1.get("gray_config_snapshot", {}))
        cfg2 = self._clean_cfg(r2.get("gray_config_snapshot", {}))
        self._diff_dict(cfg1, cfg2, "gray_config", result["gray_config_diffs"])

        # 3. 检查项对比（按 name 对齐）
        checks1 = {c["name"]: c for c in r1.get("checks", [])}
        checks2 = {c["name"]: c for c in r2.get("checks", [])}
        all_names = sorted(set(checks1.keys()) | set(checks2.keys()))
        for name in all_names:
            c1 = checks1.get(name)
            c2 = checks2.get(name)
            if c1 is None:
                result["check_diffs"].append({
                    "name": name,
                    "record_1": "(无此检查项)",
                    "record_2": f"{c2['status']}: {c2['message']}",
                    "change_type": "新增检查",
                })
            elif c2 is None:
                result["check_diffs"].append({
                    "name": name,
                    "record_1": f"{c1['status']}: {c1['message']}",
                    "record_2": "(无此检查项)",
                    "change_type": "移除检查",
                })
            elif c1["status"] != c2["status"]:
                result["check_diffs"].append({
                    "name": name,
                    "record_1": f"{c1['status']}: {c1['message']}",
                    "record_2": f"{c2['status']}: {c2['message']}",
                    "change_type": f"状态变化 {c1['status']}->{c2['status']}",
                })
            elif c1.get("message") != c2.get("message"):
                result["check_diffs"].append({
                    "name": name,
                    "record_1": c1.get("message"),
                    "record_2": c2.get("message"),
                    "change_type": "描述变化",
                })

        # 4. 人工确认对比（所有历史都列出来，因为不会被覆盖）
        result["approval_diffs"] = {
            "record_1_approvals": a1,
            "record_2_approvals": a2,
            "count_1": len(a1),
            "count_2": len(a2),
            "note": (
                "人工确认不会被覆盖。模型版本变更会生成新的 record_id，"
                "旧 record_id 的人工确认完整保存在 approvals/ 目录。"
            ),
        }

        return result

    def print_human(self, diff: Dict[str, Any]):
        """人能看懂的输出。"""
        print()
        print("=" * 70)
        print(f"  守门记录对比  {diff['record_id_1']}  ↔  {diff['record_id_2']}")
        print("=" * 70)

        # 基础差异
        print("\n▎基础信息变化")
        if not diff["basic_diffs"]:
            print("  (无变化)")
        else:
            for d in diff["basic_diffs"]:
                print(f"  · {d['label']:<14}:  {d['record_1']!r}  →  {d['record_2']!r}")

        # 灰度配置差异
        print("\n▎灰度配置变化")
        if not diff["gray_config_diffs"]:
            print("  (无变化)")
        else:
            for d in diff["gray_config_diffs"]:
                tag = d["change_type"]
                if tag == "改值":
                    print(
                        f"  · {d['path']:<26}: "
                        f"{self._brief(d['record_1'])}  →  {self._brief(d['record_2'])}"
                    )
                elif tag == "新增":
                    print(f"  + {d['path']:<26}: {self._brief(d['record_2'])}")
                else:  # 删除
                    print(f"  - {d['path']:<26}: {self._brief(d['record_1'])}")

        # 检查项差异
        print("\n▎检查项变化")
        if not diff["check_diffs"]:
            print("  (无变化)")
        else:
            for d in diff["check_diffs"]:
                print(f"\n  [{d['change_type']}] {d['name']}")
                print(f"    记录1: {d['record_1']}")
                print(f"    记录2: {d['record_2']}")

        # 人工确认对比
        print("\n▎人工确认（不被覆盖，均保留）")
        ad = diff["approval_diffs"]
        print(f"  记录1 人工确认数: {ad['count_1']}")
        for i, a in enumerate(ad["record_1_approvals"], 1):
            print(
                f"    [{i}] {a['timestamp']} {a['approver']} → {a['decision']}"
                f" | {a['comment']}"
            )
        print(f"  记录2 人工确认数: {ad['count_2']}")
        for i, a in enumerate(ad["record_2_approvals"], 1):
            print(
                f"    [{i}] {a['timestamp']} {a['approver']} → {a['decision']}"
                f" | {a['comment']}"
            )
        print(f"\n  [说明] {ad['note']}")

        print("=" * 70)
        print()

    # ---------- helpers ----------
    @staticmethod
    def _clean_cfg(cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {k: v for k, v in cfg.items() if not k.startswith("__")}

    @staticmethod
    def _brief(x: Any) -> str:
        s = str(x)
        if len(s) > 60:
            s = s[:57] + "..."
        return s

    def _diff_dict(
        self,
        d1: Dict[str, Any],
        d2: Dict[str, Any],
        prefix: str,
        out: List[Dict[str, Any]],
    ):
        keys = sorted(set(d1.keys()) | set(d2.keys()))
        for k in keys:
            path = f"{prefix}.{k}" if prefix else k
            v1 = d1.get(k, _SENTINEL)
            v2 = d2.get(k, _SENTINEL)
            if v1 is _SENTINEL:
                out.append({"path": path, "change_type": "新增", "record_2": v2})
            elif v2 is _SENTINEL:
                out.append({"path": path, "change_type": "删除", "record_1": v1})
            elif isinstance(v1, dict) and isinstance(v2, dict):
                self._diff_dict(v1, v2, path, out)
            elif v1 != v2:
                out.append({
                    "path": path,
                    "change_type": "改值",
                    "record_1": v1,
                    "record_2": v2,
                })


_SENTINEL = object()
