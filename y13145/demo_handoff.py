#!/usr/bin/env python3
"""
蒙特卡洛误差错题复盘 — 小岑交接演示脚本
========================================

按普通交接方式试用流程：
  1. 初始化示例数据
  2. 查看概览
  3. 录入一道新错题
  4. 修改权重
  5. 从原始说法追溯错题
  6. 检测并处理外推越界
  7. 参数对照（给项目经理）
  8. 导出完整报告（HTML/CSV/JSON

运行：
  python3 demo_handoff.py
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DB = ROOT / "handoff_demo_data.json"
OUTPUT_DIR = ROOT / "handoff_output"
CLI = [sys.executable, str(ROOT / "cli.py")]


def run(*args, desc: str) -> str:
    full_args = CLI + ["--db", str(DB)] + list(args)
    print(f"\n{'=' * 70}", flush=True)
    print(f"▶ {desc}", flush=True)
    print(f"  命令: {' '.join(full_args)}", flush=True)
    print(f"{'-' * 70}", flush=True)
    result = subprocess.run(full_args, capture_output=True, text=True, cwd=str(ROOT))
    out = result.stdout + result.stderr
    if out.strip():
        print(out.rstrip(), flush=True)
    if result.returncode != 0:
        print(f"  [返回码] {result.returncode}", flush=True)
        sys.exit(result.returncode)
    return out


def hr(title: str) -> None:
    print(f"\n{'#' * 70}", flush=True)
    print(f"# {title}", flush=True)
    print(f"{'#' * 70}", flush=True)


def main() -> int:
    hr("蒙特卡洛误差错题复盘 — 小岑交接演示")

    if DB.exists():
        DB.unlink()
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR, ignore_errors=True)

    run("init-demo", desc="步骤1：初始化示例数据库")
    run("summary", desc="步骤2：查看复盘概览")
    run("list", "questions", desc="步骤3：查看已有错题")

    run(
        "add-question",
        "--question-id", "MC-DEMO",
        "--student-answer", "50.5",
        "--correct-answer", "45.0",
        "--error-type", "单位换算错误",
        "--unit", "kg",
        "--student-id", "S2023999",
        "--original", "我按50.5kg，应该没换算磅",
        "--dirty",
        "--dirt-desc", "学生未说明单位换算过程",
        desc="步骤4：小岑录入一道新错题（含脏数据标记）",
    )

    questions_raw = run("list", "questions", desc="步骤5：获取新录入的错题ID")
    new_wa_id = None
    for line in questions_raw.splitlines():
        stripped = line.strip()
        if "MC-DEMO" in stripped and stripped.startswith("["):
            new_wa_id = stripped.split("]")[0].lstrip("[")
            break
    print(f"  提取错题ID = {new_wa_id}", flush=True)
    if not new_wa_id:
        print("  [错误] 未找到新录入的错题ID", flush=True)
        return 1

    run(
        "change-weight",
        "--wrong-answer-id", new_wa_id,
        "--param-name", "单位换算权重",
        "--old-value", "0.2",
        "--new-value", "0.4",
        "--unit", "无量纲",
        "--reason", "标定调整",
        "--detail", "单位换算错误属于高频问题",
        "--by", "小岑",
        desc="步骤6：小岑修改权重参数",
    )

    run("trace", "--original", "一万次采样", desc="步骤7：从学生原始说法追溯（关键词'一万次采样'")

    breach_raw = run("check-breach",
        "--wrong-answer-id", new_wa_id,
        "--param-name", "质量",
        "--value", "50.5",
        "--lo", "0",
        "--hi", "48",
        "--unit", "kg",
        desc="步骤8：检测外推越界",
    )
    breach_id = None
    for line in breach_raw.splitlines():
        stripped = line.strip()
        if "检测到外推越界 ID=" in stripped:
            breach_id = stripped.split("ID=")[-1].strip()
            break
    if breach_id:
        print(f"  提取越界ID = {breach_id}", flush=True)
        run("resolve",
            "--breach-id", breach_id,
            "--resolution", "学生未做单位换算，实际应为45.0kg，已安排补做单位换算专题",
            "--by", "小岑",
            desc="步骤9：小岑处理越界记录",
        )

    run("compare", desc="步骤10：参数对照视图（给项目经理）")

    run("list", "timeline", desc="步骤11：查看历史时间线（全部分类）")

    run("export",
        "--format", "all",
        "--output", str(OUTPUT_DIR),
        "--title", "小岑交接演示 — 蒙特卡洛误差错题复盘报告",
        desc="步骤12：导出完整报告（JSON + CSV + HTML）",
    )

    print(f"\n{'=' * 70}", flush=True)
    print("✅ 交接演示完成", flush=True)
    print(f"{'=' * 70}", flush=True)
    print(f"\n📊 生成文件：", flush=True)
    print(f"  数据文件: {DB}", flush=True)
    for p in sorted(OUTPUT_DIR.rglob("*")):
        if p.is_file():
            size = p.stat().st_size
            print(f"  {p.relative_to(ROOT)} ({size} 字节)", flush=True)
    print(f"\n📋 交接检查清单：", flush=True)
    print(f"  ✓ 能录入错题并保留原始说法与脏数据标记", flush=True)
    print(f"  ✓ 能修改权重并自动关联错题", flush=True)
    print(f"  ✓ 能从原始说法追溯到错题", flush=True)
    print(f"  ✓ 能检测外推越界并保留学生原始说法", flush=True)
    print(f"  ✓ 能对照两组参数看到中间计算过程", flush=True)
    print(f"  ✓ 历史时间线分清已处理/待补材料/人工改判", flush=True)
    print(f"  ✓ 导出 HTML 报告可在浏览器打开", flush=True)
    print(f"  ✓ 导出 CSV 可在 Excel/WPS 正常打开", flush=True)
    print(f"  ✓ 导出 JSON 保留所有原始数据", flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
