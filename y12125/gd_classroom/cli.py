#!/usr/bin/env python3
import argparse
import os
import sys
import glob

import yaml

from .engine import simulate, SimulationResult
from .renderer import render_report


def _load_material(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        raise ValueError(f"材料文件格式错误：期望字典，得到 {type(data).__name__}")
    return data


def _validate_material(data: dict, filepath: str) -> list:
    errors = []
    fname = os.path.basename(filepath)

    if "loss" not in data:
        errors.append(f"[{fname}] 缺少必填字段 'loss'（损失函数表达式）")
    elif not isinstance(data["loss"], str):
        errors.append(f"[{fname}] 'loss' 必须是字符串，例如 \"x**2 + y**2\"")

    if "learning_rate" not in data:
        errors.append(f"[{fname}] 缺少必填字段 'learning_rate'")
    elif not isinstance(data["learning_rate"], (int, float)) or data["learning_rate"] <= 0:
        errors.append(f"[{fname}] 'learning_rate' 必须是正数")

    if "initial_point" not in data:
        errors.append(f"[{fname}] 缺少必填字段 'initial_point'")
    elif not isinstance(data["initial_point"], list):
        errors.append(f"[{fname}] 'initial_point' 必须是列表，例如 [1.0, 2.0]")

    return errors


def _run_material(data: dict, filepath: str) -> SimulationResult:
    fname = os.path.basename(filepath)
    name = data.get("name", os.path.splitext(fname)[0])

    try:
        result = simulate(
            loss_expr=data["loss"],
            learning_rate=float(data["learning_rate"]),
            initial_point=[float(v) for v in data["initial_point"]],
            max_iterations=int(data.get("max_iterations", 200)),
            tolerance=float(data.get("tolerance", 1e-6)),
            name=name,
            bounds=tuple(data["bounds"]) if "bounds" in data else None,
            resolution=int(data.get("resolution", 200)),
        )
    except ValueError as exc:
        print(f"  ❌ 材料 [{name}] 模拟失败：{exc}", file=sys.stderr)
        raise
    except Exception as exc:
        print(f"  ❌ 材料 [{name}] 未知错误：{exc}", file=sys.stderr)
        raise

    return result


def _print_summary(result: SimulationResult):
    status_map = {
        "converged": "✅ 收敛",
        "diverged": "❌ 发散",
        "oscillating": "⚡ 震荡",
        "flat": "🟡 局部平坦",
        "max_iter": "⏳ 未收敛",
    }
    status_str = status_map.get(result.diagnosis.status, "❓")
    steps = len(result.steps)
    final_loss = result.steps[-1].loss if result.steps else float("nan")
    final_grad = result.steps[-1].grad_norm if result.steps else float("nan")

    print(f"  {status_str} {result.name}: {steps} 步, loss={final_loss:.6f}, |∇|={final_grad:.6f}")

    for issue in result.diagnosis.issues:
        print(f"     ↳ {issue}")
    for sug in result.diagnosis.suggestions:
        print(f"     💡 {sug}")


def main():
    parser = argparse.ArgumentParser(
        prog="gd-classroom",
        description="梯度下降可视课堂 — 迭代模拟 · 轨迹可视 · 收敛解释",
    )
    parser.add_argument(
        "materials",
        nargs="*",
        default=["materials"],
        help="材料文件或目录（YAML），默认为 ./materials",
    )
    parser.add_argument(
        "-o", "--output",
        default="gd_output",
        help="输出目录，默认为 ./gd_output（同名材料会覆盖，不会累积）",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="生成后自动打开浏览器",
    )

    args = parser.parse_args()

    material_files = []
    for path in args.materials:
        if os.path.isfile(path):
            material_files.append(path)
        elif os.path.isdir(path):
            found = sorted(
                glob.glob(os.path.join(path, "*.yaml"))
                + glob.glob(os.path.join(path, "*.yml"))
            )
            material_files.extend(found)
        else:
            print(f"⚠ 路径不存在：{path}", file=sys.stderr)

    if not material_files:
        print("未找到任何材料文件（*.yaml / *.yml）。", file=sys.stderr)
        print("请准备材料文件，最简示例：", file=sys.stderr)
        print('  name: "二次函数"', file=sys.stderr)
        print('  loss: "x**2 + y**2"', file=sys.stderr)
        print('  learning_rate: 0.1', file=sys.stderr)
        print('  initial_point: [3.0, 4.0]', file=sys.stderr)
        sys.exit(1)

    all_errors = []
    for fp in material_files:
        try:
            data = _load_material(fp)
        except Exception as exc:
            all_errors.append(f"文件 {os.path.basename(fp)} 读取失败：{exc}")
            continue
        errs = _validate_material(data, fp)
        if errs:
            all_errors.extend(errs)

    if all_errors:
        print("材料校验失败：", file=sys.stderr)
        for e in all_errors:
            print(f"  • {e}", file=sys.stderr)
        sys.exit(1)

    print("🎓 梯度下降可视课堂")
    print(f"   加载 {len(material_files)} 份材料...")

    results = []
    for fp in material_files:
        data = _load_material(fp)
        name = data.get("name", os.path.splitext(os.path.basename(fp))[0])
        try:
            result = _run_material(data, fp)
            results.append(result)
            _print_summary(result)
        except Exception:
            print(f"  ⏭ 跳过材料 [{name}]，请检查上述错误", file=sys.stderr)

    if not results:
        print("所有材料均模拟失败，未生成报告。", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.output, exist_ok=True)
    report_path = os.path.join(args.output, "gradient_descent_report.html")
    render_report(results, report_path)
    print(f"\n📄 报告已生成：{os.path.abspath(report_path)}")

    if args.open:
        import webbrowser
        webbrowser.open(f"file://{os.path.abspath(report_path)}")


if __name__ == "__main__":
    main()
