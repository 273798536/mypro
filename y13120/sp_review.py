#!/usr/bin/env python3
"""最短路径错题复盘工具 (Shortest-Path Error Review)

一条命令跑完整包样例: python3 sp_review.py run-all
退出提示会标注排序不稳定卡在哪; 保留原始来源不洗脏数据;
把影响范围和来源行记录下来; 历史备注/状态/截图说明跨重跑一致.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import sys
import textwrap
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent
SAMPLES_DIR = ROOT / "samples"
STORE_DIR = ROOT / "store"
OUTPUT_DIR = ROOT / "output"
SCREENSHOTS_DIR = ROOT / "screenshots"

STATE_FILE = STORE_DIR / "state.json"
REPORT_FILE = OUTPUT_DIR / "latest_report.md"
HUMAN_REPORT_FILE = OUTPUT_DIR / "human_readable_report.md"

EXIT_OK = 0
EXIT_SORT_UNSTABLE = 3
EXIT_EMPTY_INPUT = 4
EXIT_DATA_ERROR = 5


# ---------- 工具函数 ----------

def _now_iso() -> str:
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _hash_str(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]


def _ensure_dirs() -> None:
    for d in (SAMPLES_DIR, STORE_DIR, OUTPUT_DIR, SCREENSHOTS_DIR):
        d.mkdir(parents=True, exist_ok=True)


# ---------- 持久化状态层 ----------

DEFAULT_STATE: Dict[str, Any] = {
    "runs": [],                  # 历史运行记录
    "notes": {},                 # 备注: {run_id: [note, ...]}
    "screenshots": {},           # 截图说明: {run_id: [{"path":..., "caption":...}, ...]}
    "current_run_id": None,
    "last_updated": None,
}


def load_state() -> Dict[str, Any]:
    _ensure_dirs()
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            for k, v in DEFAULT_STATE.items():
                data.setdefault(k, v if not isinstance(v, list) else list(v))
            return data
        except (json.JSONDecodeError, OSError):
            pass
    return dict(DEFAULT_STATE)


def save_state(state: Dict[str, Any]) -> None:
    _ensure_dirs()
    state["last_updated"] = _now_iso()
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


# ---------- 样例数据包 ----------

def ensure_samples() -> List[Path]:
    """生成/校验样例数据包, 返回样例文件列表. 用 csv.writer 保证含逗号的字段被正确引号包裹."""
    _ensure_dirs()
    samples = [
        {
            "name": "sample01_basic_ok.csv",
            "desc": "基础题: 5节点单源最短路径, 答案正确",
            "rows": [
                ["A", "B", "4", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "3", "草稿P12-3"],
                ["A", "C", "5", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "4", "草稿P12-4"],
                ["A", "D", "2", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "5", "草稿P12-5"],
                ["D", "B", "3", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "6", "草稿P12-6"],
                ["D", "E", "3", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "7", "草稿P12-7"],
                ["B", "C", "1", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "8", "草稿P12-8"],
                ["C", "E", "1", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "9", "草稿P12-9"],
            ],
        },
        {
            "name": "sample02_wrong_distance.csv",
            "desc": "错题: Dijkstra未选最小顶点, C的距离应为8而非9",
            "rows": [
                ["A", "B", "4", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',8),('D',6),('E',8)]", "11", "草稿P13-2"],
                ["A", "C", "5", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',8),('D',6),('E',8)]", "12", "草稿P13-3"],
                ["A", "D", "2", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',8),('D',6),('E',8)]", "13", "草稿P13-4"],
                ["D", "B", "3", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',8),('D',6),('E',8)]", "14", "草稿P13-5"],
                ["D", "E", "3", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',8),('D',6),('E',8)]", "15", "草稿P13-6"],
                ["B", "C", "1", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',8),('D',6),('E',8)]", "16", "草稿P13-7"],
                ["C", "E", "1", "[('A',0),('B',4),('C',9),('D',6),('E',8)]", "[('A',0),('B',4),('C',8),('D',6),('E',8)]", "17", "草稿P13-8"],
            ],
        },
        {
            "name": "sample03_sort_unstable.csv",
            "desc": "排序不稳定: 同距离顶点B和E先后顺序在student_answer中与期望不同",
            "rows": [
                ["A", "B", "5", "[('A',0),('B',5),('E',5),('C',8),('D',9)]", "[('A',0),('E',5),('B',5),('C',8),('D',9)]", "21", "草稿P14-2 注意B=5,E=5同权"],
                ["A", "E", "5", "[('A',0),('B',5),('E',5),('C',8),('D',9)]", "[('A',0),('E',5),('B',5),('C',8),('D',9)]", "22", "草稿P14-3"],
                ["A", "C", "9", "[('A',0),('B',5),('E',5),('C',8),('D',9)]", "[('A',0),('E',5),('B',5),('C',8),('D',9)]", "23", "草稿P14-4"],
                ["B", "C", "3", "[('A',0),('B',5),('E',5),('C',8),('D',9)]", "[('A',0),('E',5),('B',5),('C',8),('D',9)]", "24", "草稿P14-5"],
                ["E", "D", "4", "[('A',0),('B',5),('E',5),('C',8),('D',9)]", "[('A',0),('E',5),('B',5),('C',8),('D',9)]", "25", "草稿P14-6"],
                ["C", "D", "1", "[('A',0),('B',5),('E',5),('C',8),('D',9)]", "[('A',0),('E',5),('B',5),('C',8),('D',9)]", "26", "草稿P14-7"],
            ],
        },
        {
            "name": "sample04_empty_set.csv",
            "desc": "空集合输入: student_answer为[] — 阿宁月底最怕被这种拖住",
            "rows": [
                ["A", "B", "2", "[]", "[('A',0),('B',2),('C',5),('D',6)]", "31", "草稿P15-1 空了!!"],
                ["A", "C", "5", "[]", "[('A',0),('B',2),('C',5),('D',6)]", "32", "草稿P15-2"],
                ["B", "C", "3", "[]", "[('A',0),('B',2),('C',5),('D',6)]", "33", "草稿P15-3"],
                ["B", "D", "4", "[]", "[('A',0),('B',2),('C',5),('D',6)]", "34", "草稿P15-4"],
                ["C", "D", "1", "[]", "[('A',0),('B',2),('C',5),('D',6)]", "35", "草稿P15-5"],
            ],
        },
        {
            "name": "sample05_dirty_draft.csv",
            "desc": "脏数据: 草稿格式乱七八糟, 保留原样不清洗",
            "rows": [
                ["A", "B", "?", "{A->0,B->10,C->INF,D->??}", "[('A',0),('B',10),('C',14),('D',16)]", "41", "学生手写: 边权写了问号/草稿P16左页"],
                ["A", "C", "?", "{A->0,B->10,C->INF,D->??}", "[('A',0),('B',10),('C',14),('D',16)]", "42", "草稿P16-2 学生用INF代表无穷"],
                ["B", "C", "4", "{A->0,B->10,C->INF,D->??}", "[('A',0),('B',10),('C',14),('D',16)]", "43", "草稿P16-3"],
                ["B", "D", "6", "{A->0,B->10,C->INF,D->??}", "[('A',0),('B',10),('C',14),('D',16)]", "44", "草稿P16-4 学生D的距离写了两个问号"],
                ["C", "D", "2", "{A->0,B->10,C->INF,D->??}", "[('A',0),('B',10),('C',14),('D',16)]", "45", "草稿P16-5"],
            ],
        },
    ]
    header = ["source", "target", "weight", "student_answer", "expected_answer", "source_line", "origin_draft"]
    paths: List[Path] = []
    for s in samples:
        p = SAMPLES_DIR / s["name"]
        if not p.exists():
            with open(p, "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
                w.writerow(header)
                for row in s["rows"]:
                    w.writerow(row)
        paths.append(p)
    return paths


# ---------- 核心校验逻辑 ----------

def _parse_dist_list(raw: str) -> List[Tuple[str, Any]]:
    """尽量宽容地解析学生答案, 不洗数据, 保留原始解析异常."""
    raw = raw.strip()
    if not raw or raw in ("[]", "{}", "()", "null", "None"):
        return []  # 空集合 - 不抛异常但返回空, 由上层标注
    result: List[Tuple[str, Any]] = []
    # 预处理多种格式: [('A',0), ('B',4)] 或 {A->0,B->4} 或 [(A,0),(B,4)]
    normalized = (
        raw.replace("{", "[").replace("}", "]")
           .replace("->", ":").replace("：", ":")  # 箭头和全角冒号都转冒号
           .replace("，", ",")
    )
    try:
        inner = normalized.replace("'", "").replace('"', "").strip("[]")
        if not inner.strip():
            return []
        # 先尝试按 "),(" 分割 (标准tuple列表), 否则按 "," 整体切
        chunks: List[str]
        if ")," in inner or "),(" in inner:
            chunks = [c.strip() for c in inner.split("),")]
        elif "," in inner and ":" in inner:
            # 无括号, A:0,B:10 风格
            chunks = [c.strip() for c in inner.split(",")]
        else:
            # 退化为整体逗号切
            chunks = [c.strip() for c in inner.split(",")]
        for chunk in chunks:
            chunk = chunk.strip().strip("()")
            if not chunk:
                continue
            # 解析键值对: 支持 "A,0" 和 "A:0" 两种分隔
            if ":" in chunk:
                sep = ":"
            elif "," in chunk:
                sep = ","
            else:
                result.append((chunk, "__PARSE_ERROR__"))
                continue
            inner_parts = chunk.split(sep, 1)
            if len(inner_parts) != 2:
                result.append((chunk, "__PARSE_ERROR__"))
                continue
            node = inner_parts[0].strip()
            if not node:
                result.append((chunk, "__PARSE_ERROR__"))
                continue
            val_raw = inner_parts[1].strip()
            try:
                dist_val: Any = int(val_raw)
            except ValueError:
                dist_val = val_raw  # 保留原始脏值(如 INF, ??, ?)
            result.append((node, dist_val))
    except Exception:
        result.append(("__RAW__", raw))  # 完全解析不出, 保留原文
    return result


def compare_answers(student: str, expected: str) -> Dict[str, Any]:
    """对比学生答案与期望答案, 返回问题细节.

    返回键:
      is_empty_input: bool  - 空集合输入
      parse_error: bool     - 解析失败
      distance_errors: list - 距离错误 [(节点, 学生值, 期望值)]
      sort_unstable: bool   - 排序不稳定
      sort_unstable_detail: dict - 不稳定细节 {same_weights, student_order, expected_order, stuck_position}
    """
    s_list = _parse_dist_list(student)
    e_list = _parse_dist_list(expected)
    info: Dict[str, Any] = {
        "is_empty_input": len(s_list) == 0,
        "parse_error": any(v == "__PARSE_ERROR__" or k == "__RAW__" for k, v in s_list),
        "distance_errors": [],
        "sort_unstable": False,
        "sort_unstable_detail": None,
        "student_parsed": s_list,
        "expected_parsed": e_list,
    }

    if info["is_empty_input"] or not e_list:
        return info

    # 距离校验: 把期望转为字典
    e_dict = {k: v for k, v in e_list}
    s_dict: Dict[str, Any] = {}
    for k, v in s_list:
        if k in ("__RAW__",):
            continue
        s_dict[k] = v
    for node, exp_dist in e_dict.items():
        stu_dist = s_dict.get(node, "__MISSING__")
        if stu_dist != exp_dist and stu_dist != "__MISSING__":
            info["distance_errors"].append((node, stu_dist, exp_dist))

    # 排序不稳定检测: 同距离顶点在学生/期望中顺序不同
    if len(s_list) >= 2 and len(e_list) >= 2:
        # 找同距离顶点的顺序分组
        def _order_by_dist(parsed: List[Tuple[str, Any]]) -> Dict[Any, List[str]]:
            groups: Dict[Any, List[str]] = defaultdict(list)
            for n, d in parsed:
                if isinstance(d, int):
                    groups[d].append(n)
            return groups

        s_groups = _order_by_dist(s_list)
        e_groups = _order_by_dist(e_list)
        for dist, s_nodes in s_groups.items():
            if dist in e_groups and len(s_nodes) > 1:
                e_nodes = e_groups[dist]
                if len(e_nodes) == len(s_nodes) and sorted(s_nodes) == sorted(e_nodes):
                    # 节点集合相同但顺序不同 -> 排序不稳定
                    if s_nodes != e_nodes:
                        # 找出第一个卡住的位置
                        stuck = 0
                        for i, (sn, en) in enumerate(zip(s_nodes, e_nodes)):
                            if sn != en:
                                stuck = i
                                break
                        info["sort_unstable"] = True
                        info["sort_unstable_detail"] = {
                            "same_distance": dist,
                            "same_weight_nodes": sorted(s_nodes),
                            "student_order": s_nodes,
                            "expected_order": e_nodes,
                            "stuck_position": stuck,
                            "stuck_student_node": s_nodes[stuck] if stuck < len(s_nodes) else None,
                            "stuck_expected_node": e_nodes[stuck] if stuck < len(e_nodes) else None,
                        }
                        break
    return info


# ---------- 运行主流程 ----------

def run_all(extra_note: Optional[str] = None) -> int:
    state = load_state()
    _ensure_dirs()
    samples = ensure_samples()
    run_id = _now_iso().replace(" ", "_").replace(":", "-")
    run_summary: Dict[str, Any] = {
        "run_id": run_id,
        "started_at": _now_iso(),
        "samples": [],
        "totals": {},
        "exit_code": EXIT_OK,
        "exit_hint": "",
    }

    totals = {
        "total_rows": 0,
        "ok_rows": 0,
        "distance_error_rows": 0,
        "sort_unstable_rows": 0,
        "empty_input_rows": 0,
        "parse_error_rows": 0,
        "unique_sort_unstable_cases": 0,
    }
    sort_unstable_impacts: Dict[str, Dict[str, Any]] = {}  # 按样例名聚合不稳定影响

    # 为每个样例计算签名, 用作原始来源指纹
    for sp in samples:
        raw_text = sp.read_text(encoding="utf-8")
        fingerprint = _hash_str(raw_text)
        sample_result = {
            "file": sp.name,
            "fingerprint": fingerprint,
            "desc": "",
            "rows": [],
            "row_count": 0,
        }
        with open(sp, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for lineno, row in enumerate(reader, start=2):  # 1行表头, 所以从2开始
                totals["total_rows"] += 1
                sample_result["row_count"] += 1
                stu = row.get("student_answer", "")
                exp = row.get("expected_answer", "")
                src_line = row.get("source_line", f"csv_line_{lineno}")
                origin = row.get("origin_draft", "")
                cmp = compare_answers(stu, exp)

                issues: List[str] = []
                row_ok = True
                if cmp["is_empty_input"]:
                    totals["empty_input_rows"] += 1
                    row_ok = False
                    issues.append("EMPTY_INPUT")
                if cmp["parse_error"]:
                    totals["parse_error_rows"] += 1
                    row_ok = False
                    issues.append("PARSE_ERROR")
                if cmp["distance_errors"]:
                    totals["distance_error_rows"] += 1
                    row_ok = False
                    issues.append(f"DISTANCE_WRONG:{cmp['distance_errors']}")
                if cmp["sort_unstable"]:
                    totals["sort_unstable_rows"] += 1
                    row_ok = False
                    det = cmp["sort_unstable_detail"] or {}
                    issues.append(
                        f"SORT_UNSTABLE@dist={det.get('same_distance')}:"
                        f"stu={det.get('student_order')} vs exp={det.get('expected_order')}"
                    )
                    # 聚合影响范围
                    key = f"{sp.name}::dist={det.get('same_distance')}"
                    if key not in sort_unstable_impacts:
                        sort_unstable_impacts[key] = {
                            "file": sp.name,
                            "same_distance": det.get("same_distance"),
                            "nodes": det.get("same_weight_nodes", []),
                            "student_order": det.get("student_order", []),
                            "expected_order": det.get("expected_order", []),
                            "stuck_position": det.get("stuck_position"),
                            "source_lines": [],
                            "row_count": 0,
                        }
                        totals["unique_sort_unstable_cases"] += 1
                    sort_unstable_impacts[key]["source_lines"].append({
                        "source_line": src_line,
                        "origin_draft": origin,
                        "csv_line": lineno,
                    })
                    sort_unstable_impacts[key]["row_count"] += 1

                if row_ok:
                    totals["ok_rows"] += 1

                # 保留原始来源字段, 不清洗
                sample_result["rows"].append({
                    "csv_line": lineno,
                    "source_line": src_line,
                    "origin_draft": origin,  # 原始草稿原样保留
                    "raw_student_answer": stu,  # 原文
                    "raw_expected_answer": exp,
                    "parsed_student": cmp["student_parsed"],
                    "parsed_expected": cmp["expected_parsed"],
                    "issues": issues,
                    "ok": row_ok,
                    "sort_unstable_detail": cmp["sort_unstable_detail"],
                })
        run_summary["samples"].append(sample_result)

    run_summary["totals"] = totals
    run_summary["sort_unstable_impacts"] = list(sort_unstable_impacts.values())

    # 决定退出码和退出提示
    exit_code = EXIT_OK
    hint_parts: List[str] = []
    if totals["empty_input_rows"] > 0:
        exit_code = max(exit_code, EXIT_EMPTY_INPUT)
        hint_parts.append(f"空集合输入 {totals['empty_input_rows']} 行 (阿宁别再被拖了)")
    if totals["parse_error_rows"] > 0:
        exit_code = max(exit_code, EXIT_DATA_ERROR)
        hint_parts.append(f"解析异常 {totals['parse_error_rows']} 行 — 已保留原始草稿未清洗")
    if totals["sort_unstable_rows"] > 0:
        exit_code = max(exit_code, EXIT_SORT_UNSTABLE)
        cases = run_summary["sort_unstable_impacts"]
        for c in cases:
            hint_parts.append(
                f"排序不稳定卡住 @ {c['file']} 距离={c['same_distance']}: "
                f"第{c['stuck_position']}位 学生写{c.get('student_order', [])[c['stuck_position']] if c.get('student_order') else '?'} "
                f"但应为{c.get('expected_order', [])[c['stuck_position']] if c.get('expected_order') else '?'}; "
                f"涉及节点{c['nodes']}, 影响{c['row_count']}行"
            )
    if totals["distance_error_rows"] > 0:
        hint_parts.append(f"距离值错误 {totals['distance_error_rows']} 行")
    if exit_code == EXIT_OK:
        hint_parts.append("全部校验通过 ✅")

    run_summary["exit_code"] = exit_code
    run_summary["exit_hint"] = " | ".join(hint_parts)
    run_summary["finished_at"] = _now_iso()

    # 持久化
    state["current_run_id"] = run_id
    state["runs"].append(run_summary)
    if extra_note:
        state["notes"].setdefault(run_id, []).append({
            "time": _now_iso(),
            "text": extra_note,
        })
    save_state(state)

    # 输出报告
    write_reports(run_summary, state)

    # 控制台输出
    print("\n========== 最短路径错题复盘 · 执行报告 ==========")
    print(f"运行编号: {run_id}")
    print(f"样例文件: {len(samples)} 份, 数据行: {totals['total_rows']}")
    print(f"  ✅ 正确: {totals['ok_rows']}")
    print(f"  ❌ 距离错: {totals['distance_error_rows']}")
    print(f"  🔀 排序不稳: {totals['sort_unstable_rows']} 行 ({totals['unique_sort_unstable_cases']} 组)")
    print(f"  ∅  空集合: {totals['empty_input_rows']} 行")
    print(f"  ⚠️  解析脏: {totals['parse_error_rows']} 行 (已保留原稿)")
    print(f"退出码: {exit_code}")
    print("提示: " + run_summary["exit_hint"])
    print(f"\n详细报告: {REPORT_FILE}")
    print(f"白话报告: {HUMAN_REPORT_FILE}")
    print(f"状态存储: {STATE_FILE}")
    return exit_code


# ---------- 报告生成 ----------

def write_reports(run: Dict[str, Any], state: Dict[str, Any]) -> None:
    _ensure_dirs()
    # ----- 技术报告 -----
    lines: List[str] = []
    lines.append(f"# 最短路径错题复盘 · 技术报告\n")
    lines.append(f"- 运行编号: `{run['run_id']}`")
    lines.append(f"- 起止: {run['started_at']} → {run.get('finished_at','')}")
    lines.append(f"- 退出码: `{run['exit_code']}`")
    lines.append(f"- 退出提示: {run['exit_hint']}\n")

    totals = run["totals"]
    lines.append("## 统计汇总\n")
    lines.append(f"| 指标 | 数量 |")
    lines.append(f"|------|------|")
    lines.append(f"| 总行数 | {totals['total_rows']} |")
    lines.append(f"| 正确 | {totals['ok_rows']} |")
    lines.append(f"| 距离错误 | {totals['distance_error_rows']} |")
    lines.append(f"| 排序不稳定 | {totals['sort_unstable_rows']} (独立{totals['unique_sort_unstable_cases']}组) |")
    lines.append(f"| 空集合输入 | {totals['empty_input_rows']} |")
    lines.append(f"| 解析异常(脏数据) | {totals['parse_error_rows']} |\n")

    # 排序不稳定-影响范围和来源行
    impacts = run.get("sort_unstable_impacts", [])
    if impacts:
        lines.append("## 🔀 排序不稳定 · 影响范围与来源行\n")
        for c in impacts:
            lines.append(f"### {c['file']} · 距离={c['same_distance']}\n")
            lines.append(f"- 同权节点: `{c['nodes']}`")
            lines.append(f"- 学生顺序: `{c['student_order']}`")
            lines.append(f"- 期望顺序: `{c['expected_order']}`")
            lines.append(f"- **卡住位置**: 第 {c['stuck_position']} 位 "
                         f"(学生写 `{c['student_order'][c['stuck_position']]}` / 期望 `{c['expected_order'][c['stuck_position']]}`)")
            lines.append(f"- 影响 {c['row_count']} 行, 来源行明细:\n")
            lines.append("| source_line | origin_draft | CSV行号 |")
            lines.append("|-------------|--------------|---------|")
            for sl in c["source_lines"]:
                lines.append(f"| {sl['source_line']} | {sl['origin_draft']} | {sl['csv_line']} |")
            lines.append("")

    # 各样例行级细节(保留原始来源)
    lines.append("## 样例行级明细 (原始来源未清洗)\n")
    for smp in run["samples"]:
        lines.append(f"### {smp['file']} `指纹:{smp['fingerprint']}`\n")
        lines.append("| #行 | source_line | origin_draft | 问题 | 学生原文 |")
        lines.append("|-----|-------------|--------------|------|----------|")
        for r in smp["rows"]:
            issues = "<br>".join(r["issues"]) if r["issues"] else "✅OK"
            student_short = (r["raw_student_answer"][:40] + "...") if len(r["raw_student_answer"]) > 40 else r["raw_student_answer"]
            lines.append(f"| {r['csv_line']} | {r['source_line']} | {r['origin_draft']} | {issues} | `{student_short}` |")
        lines.append("")

    # 历史备注/截图
    rid = run["run_id"]
    notes = state.get("notes", {}).get(rid, [])
    shots = state.get("screenshots", {}).get(rid, [])
    if notes or shots:
        lines.append("## 备注与截图\n")
        if notes:
            lines.append("### 历史备注\n")
            for n in notes:
                lines.append(f"- [{n['time']}] {n['text']}")
            lines.append("")
        if shots:
            lines.append("### 截图说明\n")
            for s in shots:
                lines.append(f"- `{s['path']}` → {s['caption']}")
            lines.append("")

    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")

    # ----- 白话报告 (给不看代码的人) -----
    h: List[str] = []
    h.append("# 最短路径错题复盘 · 白话说明\n")
    h.append(f"_生成于 {_now_iso()}_\n")
    h.append("## 这是什么\n")
    h.append("我们把教研编辑阿宁手上的「最短路径错题」包了一次电子体检, 下面用大白话讲清楚数字从哪来、问题出在哪.\n")
    h.append("## 数字怎么来的 (线索)\n")
    h.append(f"- 我们拿了 **{len(run['samples'])} 份样例文件** ({', '.join(s['file'] for s in run['samples'])})")
    h.append(f"- 每份文件里每一行对应一道题的一条边, 总共 **{totals['total_rows']} 行**")
    h.append(f"- 每行都带着: 学生写的答案(`student_answer`)、参考正确答案(`expected_answer`)、原始草稿页码(`origin_draft`)、老师标过的来源行号(`source_line`)")
    h.append(f"- 所有数字都可以对照 `samples/` 目录里的原文件, 原始草稿字段我们一个字都没改.\n")
    h.append("## 结果怎么读\n")
    h.append(f"- **{totals['ok_rows']} 行** 学生答案对得上 → 绿勾")
    h.append(f"- **{totals['distance_error_rows']} 行** 学生把某个节点的距离算错了 → 红叉, 可在 `origin_draft` 里找到对应草稿页")
    h.append(f"- **{totals['sort_unstable_rows']} 行** 距离没错但顺序摆错了 (同距离的节点谁在前谁在后不一致)")
    if impacts:
        h.append("  - 具体卡在哪:")
        for c in impacts:
            stu_pick = c['student_order'][c['stuck_position']] if c['student_order'] else "?"
            exp_pick = c['expected_order'][c['stuck_position']] if c['expected_order'] else "?"
            h.append(f"    - 在 {c['file']} 里, 距离={c['same_distance']} 的节点 {c['nodes']},"
                     f" 第 {c['stuck_position']+1} 位学生先写了 **{stu_pick}**, 但应该先写 **{exp_pick}**"
                     f" (可查来源行 {', '.join(sl['source_line'] for sl in c['source_lines'][:3])}{' 等' if len(c['source_lines'])>3 else ''})")
    h.append(f"- **{totals['empty_input_rows']} 行** 学生交了空答案 → 空集合千万别当成正常输入放过去 (阿宁的痛点)")
    h.append(f"- **{totals['parse_error_rows']} 行** 学生草稿上乱写 (比如 `INF`/`??`/`?`) → 我们**保留原稿没洗**, 方便教研看原始笔迹\n")
    h.append("## 数字要追查怎么办\n")
    h.append("1. 打开 `samples/` 下对应文件名")
    h.append("2. 看 `source_line` 列 → 回到老师原来标的行号")
    h.append("3. 看 `origin_draft` 列 → 回到学生手写草稿的页码")
    h.append("4. 再不信 → 看 `store/state.json` 里 `runs[].fingerprint` 做文件指纹比对\n")
    HUMAN_REPORT_FILE.write_text("\n".join(h), encoding="utf-8")


# ---------- 子命令 ----------

def cmd_status(args: argparse.Namespace) -> int:
    state = load_state()
    rid = state.get("current_run_id")
    if not rid or not state["runs"]:
        print("尚无运行记录. 先执行: python3 sp_review.py run-all")
        return 0
    run = next((r for r in state["runs"] if r["run_id"] == rid), state["runs"][-1])
    print(f"当前运行: {run['run_id']}")
    print(f"退出码: {run['exit_code']}")
    print(f"提示: {run['exit_hint']}")
    totals = run["totals"]
    print(f"总行 {totals['total_rows']}, 正确{totals['ok_rows']}, 距离错{totals['distance_error_rows']}, "
          f"排序不稳{totals['sort_unstable_rows']}, 空集{totals['empty_input_rows']}, 脏数据{totals['parse_error_rows']}")
    notes = state.get("notes", {}).get(rid, [])
    shots = state.get("screenshots", {}).get(rid, [])
    print(f"备注数: {len(notes)}, 截图说明: {len(shots)}")
    if shots:
        print("\n截图说明:")
        for s in shots:
            print(f"  - {s['path']}: {s['caption']}")
    return 0


def cmd_add_note(args: argparse.Namespace) -> int:
    state = load_state()
    rid = args.run_id or state.get("current_run_id")
    if not rid:
        print("未指定 run_id 且无当前运行. 请先 run-all.")
        return 1
    state["notes"].setdefault(rid, []).append({"time": _now_iso(), "text": args.text})
    save_state(state)
    print(f"已为 {rid} 添加备注.")
    return 0


def cmd_add_screenshot(args: argparse.Namespace) -> int:
    state = load_state()
    rid = args.run_id or state.get("current_run_id")
    if not rid:
        print("未指定 run_id 且无当前运行. 请先 run-all.")
        return 1
    path = os.path.relpath(args.path, start=str(ROOT))
    state["screenshots"].setdefault(rid, []).append({
        "path": path,
        "caption": args.caption,
        "added_at": _now_iso(),
    })
    save_state(state)
    # 重建报告让截图说明出现在文档中
    run = next((r for r in state["runs"] if r["run_id"] == rid), None)
    if run:
        write_reports(run, state)
    print(f"已为 {rid} 记录截图: {path} → {args.caption}")
    return 0


def cmd_show_screenshots(args: argparse.Namespace) -> int:
    state = load_state()
    rid = args.run_id or state.get("current_run_id")
    if not rid:
        print("未指定 run_id 且无当前运行. 请先 run-all.")
        return 1
    shots = state.get("screenshots", {}).get(rid, [])
    print(f"运行 {rid} 截图说明 (共{len(shots)}张):")
    if not shots:
        print("  (暂无)")
        return 0
    for i, s in enumerate(shots, 1):
        print(f"  {i}. {s['path']}")
        print(f"     说明: {s['caption']}")
        print(f"     记录: {s.get('added_at','')}")
    return 0


def cmd_list_runs(args: argparse.Namespace) -> int:
    state = load_state()
    if not state["runs"]:
        print("尚无运行记录.")
        return 0
    for r in state["runs"]:
        marker = " ← 当前" if r["run_id"] == state.get("current_run_id") else ""
        t = r["totals"]
        print(f"{r['run_id']}{marker} | 退出{r['exit_code']} | "
              f"行{t['total_rows']}/对{t['ok_rows']}/距错{t['distance_error_rows']}"
              f"/序错{t['sort_unstable_rows']}/空{t['empty_input_rows']}/脏{t['parse_error_rows']}")
    return 0


# ---------- CLI ----------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="sp_review",
        description="最短路径错题复盘: 一条命令跑完整包样例, 标清排序不稳+影响范围+来源行, 跨重启一致",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
        常用三件事:
          1. 启动跑全部:  python3 sp_review.py run-all
          2. 重跑:          python3 sp_review.py run-all
          3. 看截图说明:    python3 sp_review.py show-screenshots
        """),
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("run-all", help="一条命令跑完最短路径错题复盘整包样例")
    pr.add_argument("--note", help="给本次运行加一条备注")
    pr.set_defaults(func=lambda a: run_all(a.note))

    ps = sub.add_parser("status", help="查看当前运行状态/历史备注数/截图说明数")
    ps.set_defaults(func=cmd_status)

    pn = sub.add_parser("add-note", help="给指定/当前运行加历史备注")
    pn.add_argument("text", help="备注内容")
    pn.add_argument("--run-id", help="指定run_id, 不填则用当前运行")
    pn.set_defaults(func=cmd_add_note)

    pss = sub.add_parser("add-screenshot", help="给指定/当前运行登记截图及其说明")
    pss.add_argument("path", help="截图文件路径")
    pss.add_argument("caption", help="说明文字 (要能对上复盘内容)")
    pss.add_argument("--run-id", help="指定run_id, 不填则用当前运行")
    pss.set_defaults(func=cmd_add_screenshot)

    psh = sub.add_parser("show-screenshots", help="查看当前/指定运行的所有截图说明")
    psh.add_argument("--run-id", help="指定run_id, 不填则用当前运行")
    psh.set_defaults(func=cmd_show_screenshots)

    pl = sub.add_parser("list-runs", help="列出所有历史运行")
    pl.set_defaults(func=cmd_list_runs)
    return p


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
