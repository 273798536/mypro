"""电机扭矩阈值预警 - 冒烟自检 (纯Python, 无外部依赖)."""
import os
import sys
import tempfile
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from torque_warning.cli import run
from torque_warning.models import RunConfig, WarningLevel, MaterialStatus

INPUT_DIR = os.path.join(ROOT, "sample_input")


def check(label, cond):
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {label}")
    return cond


def main():
    all_ok = True
    tmp_out = tempfile.mkdtemp(prefix="tw_out_")
    print(f"[冒烟测试] 输出目录: {tmp_out}\n")

    print("-- 第1档: L1 阈值 0% --")
    cfg1 = RunConfig(
        input_dir=INPUT_DIR,
        output_dir=tmp_out,
        threshold_adjustment_pct=0.0,
        require_confirmation=True,
        param_level=1,
    )
    recs1, confs1 = run(cfg1)

    print()
    all_ok &= check("共处理 6 台设备", len(recs1) == 6)

    by_id = {r.equipment_id: r for r in recs1}
    all_ok &= check("M-001 = 正常 (材料齐全正常)", by_id["M-001"].warning_level == WarningLevel.NORMAL and by_id["M-001"].status == MaterialStatus.PROCESSED)
    all_ok &= check("M-002 = 预警 (峰值 81.2N·m 超过 80%)", by_id["M-002"].warning_level == WarningLevel.WARNING)
    all_ok &= check("M-003 = 严重 (峰值 >=145.6N·m, 晚到附件叠加尖峰)", by_id["M-003"].warning_level == WarningLevel.CRITICAL)
    all_ok &= check("M-003 极端值被保留 (>2 条)", len(by_id["M-003"].extreme_values) >= 2)
    all_ok &= check("M-004 = 方向异常需确认 (CW/CCW/正向/反向/←/→ 混)", by_id["M-004"].direction_issue is True)
    all_ok &= check("M-004 有 1 条待确认请求", sum(1 for c in confs1 if c.equipment_id == "M-004") == 1)
    all_ok &= check("M-005 = 待补材料 (晚到附件含'待补')", by_id["M-005"].status == MaterialStatus.PENDING_SUPPLEMENT)
    all_ok &= check("M-006 = 人工改判 (后补说明阈值调至95%)", by_id["M-006"].status == MaterialStatus.MANUAL_OVERRIDE and by_id["M-006"].override_applied)
    all_ok &= check("M-002 存在边界样本 (±2%阈值 80N·m 附近)", len(by_id["M-002"].boundary_samples) >= 1)

    print()
    print("-- 第2档: L2 阈值 +5% 收严 --")
    cfg2 = RunConfig(
        input_dir=INPUT_DIR,
        output_dir=tmp_out,
        threshold_adjustment_pct=+5.0,
        require_confirmation=False,
        param_level=2,
    )
    recs2, _ = run(cfg2)
    by_id2 = {r.equipment_id: r for r in recs2}
    all_ok &= check("M-002 在 L2 下峰值仍触发预警/严重 (阈值收紧后)", by_id2["M-002"].warning_level in (WarningLevel.WARNING, WarningLevel.CRITICAL))

    print()
    print("-- 第3档: L3 阈值 -10% 放宽 --")
    cfg3 = RunConfig(
        input_dir=INPUT_DIR,
        output_dir=tmp_out,
        threshold_adjustment_pct=-10.0,
        require_confirmation=False,
        param_level=3,
    )
    recs3, _ = run(cfg3)
    by_id3 = {r.equipment_id: r for r in recs3}
    all_ok &= check("M-006 峰值 86.3N·m 在 L3 放宽阈值后 <= 70%? 仍 <= 实际=85%", by_id3["M-006"].warning_level in (WarningLevel.CAUTION, WarningLevel.WARNING))

    print()
    expected_files = ["torque_warning_report.json", "page_summary.html", "param_compare.md"]
    for fn in expected_files:
        fp = os.path.join(tmp_out, fn)
        all_ok &= check(f"输出文件存在: {fn}", os.path.exists(fp))

    print()
    print("==========", "ALL PASS" if all_ok else "HAS FAILURES", "==========")
    shutil.rmtree(tmp_out, ignore_errors=True)
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
