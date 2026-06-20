import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from report_generator import generate_markdown

md = generate_markdown()
print("=== 完整 Markdown 报告输出 ===")
print(md)
print()
print("=== 关键行校验：每行列数是否一致 ===")
lines = md.split("\n")
in_table = False
header_cols = 0
bad = []
for i, line in enumerate(lines, 1):
    if line.startswith("| ID | 文件名 |"):
        in_table = True
        header_cols = len(line.split("|")) - 1
        print(f"  表头行{i}: 列数={header_cols}")
        continue
    if in_table and line.startswith("|----|"):
        sep_cols = len(line.split("|")) - 1
        print(f"  分隔行{i}: 列数={sep_cols}")
        continue
    if in_table and line.startswith("|"):
        cols = len(line.split("|")) - 1
        if cols != header_cols:
            bad.append((i, cols, line[:90]))
        if "Drum_005_v4" in line:
            ok = "OK" if cols == header_cols else "BROKEN"
            print(f"  第5条行{i}: 列数={cols} (期望{header_cols}) -> {ok}")
            print(f"     内容: {line}")
if bad:
    print(f"  ❌ 炸列 {len(bad)} 行")
    for ln, c, prev in bad:
        print(f"     行{ln} 列数={c}: {prev}")
else:
    print(f"  ✅ 全部数据行列数={header_cols}，无炸列")
