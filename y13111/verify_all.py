import os
import sys
import json
import zipfile
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from queue_window_checker import (
    load_csv_answer,
    load_window_config,
    ReportGenerator,
)

results = []

def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    results.append((name, status, detail))
    print(f"[{status}] {name} {detail}")
    return condition

print("=" * 60)
print("导出链路完整验证")
print("=" * 60)
print()

check("1. 依赖可用性", True, "Python=" + sys.version.split()[0])
try:
    import pandas
    check("   pandas", True, pandas.__version__)
except Exception as e:
    check("   pandas", False, str(e))
try:
    import openpyxl
    check("   openpyxl", True, openpyxl.__version__)
except Exception as e:
    check("   openpyxl", False, str(e))

print()
print("-- 样例文件存在性检查 --")
sample_files = [
    "samples/现场案例A.csv",
    "samples/现场案例B.csv",
    "samples/现场案例C.csv",
    "samples/现场案例D.csv",
    "config/default_window_config.json",
    "config/tuned_window_config.json",
]
for sf in sample_files:
    check(f"   {sf}", os.path.exists(sf), os.path.abspath(sf) if os.path.exists(sf) else "MISSING")

print()
print("-- CSV 导入功能检查 --")
try:
    answer_a = load_csv_answer("samples/现场案例A.csv")
    check("   现场案例A 导入", True, f"ID={answer_a.answer_id}, 材料数={len(answer_a.materials)}")
    check("   混入名称不一致材料", any(not m.is_name_matched for m in answer_a.materials),
          f"M003: name={answer_a.materials[2].name}, expected={answer_a.materials[2].expected_name}")
except Exception as e:
    check("   现场案例A 导入", False, str(e))

try:
    answer_b = load_csv_answer("samples/现场案例B.csv")
    check("   现场案例B 导入", True, f"ID={answer_b.answer_id}, 材料数={len(answer_b.materials)}")
except Exception as e:
    check("   现场案例B 导入", False, str(e))

try:
    answer_c = load_csv_answer("samples/现场案例C.csv")
    check("   现场案例C 导入（空集合）", True, f"材料数={len(answer_c.materials)}")
except Exception as e:
    check("   现场案例C 导入", False, str(e))

print()
print("-- 参数配置加载检查 --")
try:
    cfg = load_window_config("config/default_window_config.json")
    check("   默认配置加载", True, f"窗口={cfg.window_size}{cfg.window_unit.value}, 区间=[{cfg.lower_bound},{cfg.upper_bound}]")
except Exception as e:
    check("   默认配置加载", False, str(e))

try:
    cfg2 = load_window_config("config/tuned_window_config.json")
    check("   调参配置加载", True, f"窗口={cfg2.window_size}{cfg2.window_unit.value}, 区间=[{cfg2.lower_bound},{cfg2.upper_bound}]")
except Exception as e:
    check("   调参配置加载", False, str(e))

print()
print("-- 命令行接口检查 --")
from subprocess import run, PIPE

help_proc = run([sys.executable, "main.py", "--help"], capture_output=True, text=True, cwd=".")
check("   --help", help_proc.returncode == 0, f"exit={help_proc.returncode}")

basic_proc = run(
    [sys.executable, "main.py",
     "--input", "samples/现场案例A.csv",
     "--config", "config/default_window_config.json",
     "--output", "output",
     "--prefix", "verify_basic"],
    capture_output=True, text=True, cwd=".",
)
check("   基础模式 --input/--config", basic_proc.returncode == 0, f"exit={basic_proc.returncode}")

tune_proc = run(
    [sys.executable, "main.py",
     "--input", "samples/现场案例A.csv",
     "--config", "config/default_window_config.json",
     "--tune", "config/tuned_window_config.json",
     "--output", "output",
     "--prefix", "verify_tune"],
    capture_output=True, text=True, cwd=".",
)
check("   调参对比模式 --tune", tune_proc.returncode == 0, f"exit={tune_proc.returncode}")

missing_proc = run([sys.executable, "main.py"], capture_output=True, text=True, cwd=".")
check("   缺少参数时提示帮助", missing_proc.returncode != 0, f"exit={missing_proc.returncode} (预期非0)")

print()
print("-- 导出文件格式可靠性检查 --")
output_dir = "output"
reporter = ReportGenerator(output_dir)
answer_a = load_csv_answer("samples/现场案例A.csv")
cfg = load_window_config("config/default_window_config.json")
from queue_window_checker import QueueWindowValidator, ChangeTracer
validator = QueueWindowValidator(cfg)
result = validator.validate(answer_a)
tracer = ChangeTracer()
tracer.record(cfg, result)
cfg2 = load_window_config("config/tuned_window_config.json")
validator2 = QueueWindowValidator(cfg2)
result2 = validator2.validate(answer_a)
tracer.record(cfg2, result2)
diffs = tracer.diff_all()

txt_path = reporter.export_text_report(answer_a, result2, diffs, "verify_txt_check_report.txt")
xlsx_path = reporter.export_excel(answer_a, result2, diffs, "verify_xlsx_check_report.xlsx")
json_path = reporter.export_json(answer_a, result2, diffs, "verify_json_check_report.json")
handover_path = reporter.quick_handover({"验证答案A": answer_a.source_file or ""})

check("   TXT 导出", os.path.exists(txt_path), txt_path)
if os.path.exists(txt_path):
    with open(txt_path, "r", encoding="utf-8") as fp:
        content = fp.read()
    check("   TXT 可读/非空", len(content) > 0 and "步骤追踪" in content, f"{len(content)} 字符")
    check("   TXT 含参数差异说明", "参数调档差异" in content, "是" if "参数调档差异" in content else "否")

check("   Excel 导出", os.path.exists(xlsx_path), xlsx_path)
if os.path.exists(xlsx_path):
    try:
        with zipfile.ZipFile(xlsx_path, "r") as zf:
            has_wb = "xl/workbook.xml" in zf.namelist()
        check("   Excel 是有效zip", has_wb, "是" if has_wb else "否")
        xl = pd.ExcelFile(xlsx_path, engine="openpyxl")
        sheets = xl.sheet_names
        check("   Excel sheet 数量", len(sheets) >= 6, f"{sheets}")
        required = ["概览", "材料清单", "步骤追踪", "异常列表", "边界样本", "参数调档差异"]
        for r in required:
            check(f"   Excel 含{r}", r in sheets, "是" if r in sheets else "否")
    except Exception as e:
        check("   Excel 可读", False, str(e))

check("   JSON 导出", os.path.exists(json_path), json_path)
if os.path.exists(json_path):
    try:
        with open(json_path, "r", encoding="utf-8") as fp:
            data = json.load(fp)
        check("   JSON 解析成功", isinstance(data, dict), f"顶级键: {list(data.keys())}")
        check("   JSON 含 historical_answer", "historical_answer" in data, "是")
        check("   JSON 含 result", "result" in data, "是")
        check("   JSON 含 param_diffs", "param_diffs" in data, "是")
        check("   JSON 可追溯材料行号", all("source_line" in m for m in data["historical_answer"]["materials"]), "是")
    except Exception as e:
        check("   JSON 解析", False, str(e))

check("   交接卡导出", os.path.exists(handover_path), handover_path)
if os.path.exists(handover_path):
    with open(handover_path, "r", encoding="utf-8") as fp:
        hc = fp.read()
    check("   交接卡含真实CSV路径", "samples/现场案例A.csv" in hc or "/samples/" in hc, "是")
    check("   交接卡含命令示例", "--input" in hc and "--config" in hc, "是")
    check("   交接卡含导出格式说明", "TXT" in hc and "Excel" in hc and "JSON" in hc, "是")

print()
print("-- 导出内容与源数据一致性检查 --")
if os.path.exists(xlsx_path):
    try:
        xl = pd.ExcelFile(xlsx_path, engine="openpyxl")
        df_mats = xl.parse("材料清单")
        check("   Excel材料数与CSV一致", len(df_mats) == len(answer_a.materials), f"{len(df_mats)} vs {len(answer_a.materials)}")
        csv_df = pd.read_csv("samples/现场案例A.csv", dtype=str, keep_default_na=False)
        check("   Excel材料名与CSV一致", list(df_mats["名称"]) == [r["name"] for _, r in csv_df.iterrows() if r["name"]], "是")
        df_anoms = xl.parse("异常列表")
        check("   Excel异常数与计算一致", len(df_anoms) == len(result2.anomalies), f"{len(df_anoms)} vs {len(result2.anomalies)}")
    except Exception as e:
        check("   Excel内容一致性", False, str(e))

print()
print("-- 边界情况检查 --")
try:
    answer_c = load_csv_answer("samples/现场案例C.csv")
    validator_c = QueueWindowValidator(cfg)
    result_c = validator_c.validate(answer_c)
    check("   空集合状态=挂起", result_c.status.value == "挂起", f"状态={result_c.status.value}")
    has_empty_anom = any(a.anomaly_type.value == "空集合" for a in result_c.anomalies)
    check("   空集合异常记录", has_empty_anom, "是")
except Exception as e:
    check("   空集合处理", False, str(e))

try:
    answer_b = load_csv_answer("samples/现场案例B.csv")
    validator_b = QueueWindowValidator(cfg)
    result_b = validator_b.validate(answer_b)
    check("   排序不稳定状态=挂起", result_b.status.value == "挂起", f"状态={result_b.status.value}")
    check("   排序稳定标志=False", result_b.sort_stable is False, f"sort_stable={result_b.sort_stable}")
except Exception as e:
    check("   排序不稳定处理", False, str(e))

print()
print("=" * 60)
total = len(results)
passed = sum(1 for _, s, _ in results if s == "PASS")
failed = total - passed
print(f"验证完成: {passed}/{total} 通过, {failed} 失败")
print("=" * 60)

if failed > 0:
    print("\n失败项:")
    for name, status, detail in results:
        if status == "FAIL":
            print(f"  - {name}: {detail}")
    sys.exit(1)
else:
    print("\n全部通过!")
    sys.exit(0)
