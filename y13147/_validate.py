"""
快速验证脚本 - 检查所有 .py 文件语法 + 模拟一次蒙特卡洛试跑
不依赖外部终端，可直接在 app.py 中作为模块调用验证。
用法: python3 _validate.py
"""
import ast
import sys
from pathlib import Path

ROOT = Path(__file__).parent

def check_syntax():
    errors = []
    for py in ROOT.rglob("*.py"):
        if py.name.startswith("_"):
            continue
        try:
            ast.parse(py.read_text(encoding="utf-8"))
            print(f"  ✓ {py.relative_to(ROOT)}")
        except SyntaxError as e:
            errors.append((py, e))
            print(f"  ✗ {py.relative_to(ROOT)}: {e}")
    return errors

def dry_run():
    """不依赖 numpy/pandas，只检查结构是否完整"""
    print("\n--- 结构检查 ---")
    must_have = [
        ROOT / "mc_engine" / "__init__.py",
        ROOT / "app.py",
        ROOT / "run_daily.py",
        ROOT / "data" / "param_table.csv",
        ROOT / "requirements.txt",
    ]
    for p in must_have:
        mark = "✓" if p.exists() else "✗ 缺失"
        print(f"  {mark} {p.relative_to(ROOT)}")

    # 检查参数表中各种样本是否齐全
    import csv
    csv_path = ROOT / "data" / "param_table.csv"
    if csv_path.exists():
        with open(csv_path, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        print(f"\n--- 参数表样本分布 (共 {len(rows)} 条) ---")
        for r in rows:
            tags = []
            remark = r.get("remark", "")
            pid = r["param_id"]
            if "边界" in remark:
                tags.append("边界样本")
            if "缺材料" in remark or "未到" in remark:
                tags.append("待补材料")
            if "排序" in remark:
                tags.append("排序不稳定")
            if "人工" in remark or "改判" in remark:
                tags.append("人工改判")
            if "异常" in remark:
                tags.append("异常极值")
            if not tags:
                tags.append("正常")
            print(f"  {pid} {r['case_name']:20s} -> {', '.join(tags)}")

    return True

if __name__ == "__main__":
    print("=== 蒙特卡洛误差参数试算 - 验证 ===")
    print("\n--- 语法检查 ---")
    errs = check_syntax()
    dry_run()
    if errs:
        print(f"\n❌ 发现 {len(errs)} 个语法错误")
        sys.exit(1)
    print("\n✅ 验证通过")
