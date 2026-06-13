import os
from src.config import PROCESSED_DATA_DIR
from src.loader import load_raw_records, save_raw_backup
from src.unit_normalizer import normalize_units, save_normalized_report
from src.calculator import calculate_heat_dissipation, save_calculation_report
from src.dedup import detect_duplicate_devices, save_duplicate_report
from src.jump_detector import detect_jumps, save_jump_report
from src.status_summary import classify_processing_status, save_status_summary


def run_pipeline(input_file=None):
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

    print("=" * 60)
    print("  冷却塔水滴实验复算 - 处理链启动")
    print("=" * 60)

    print("\n[1/6] 加载原始传感器日志...")
    records = load_raw_records(input_file)
    print(f"  共加载 {len(records)} 条记录")
    save_raw_backup(
        records,
        os.path.join(PROCESSED_DATA_DIR, "01_raw_backup.csv")
    )
    print("  -> 原始数据备份: data/processed/01_raw_backup.csv")

    print("\n[2/6] 单位归一化与数量级校验...")
    records = normalize_units(records)
    unit_issues = sum(1 for r in records if r["processing_status"] == "unit_or_threshold_issue")
    print(f"  单位/阈值异常: {unit_issues} 条")
    save_normalized_report(
        records,
        os.path.join(PROCESSED_DATA_DIR, "02_normalized_units.csv")
    )
    print("  -> 归一化结果: data/processed/02_normalized_units.csv")

    print("\n[3/6] 散热功率计算与失败原因分类...")
    records = calculate_heat_dissipation(records)
    calc_success = sum(1 for r in records if r.get("calculated", {}).get("calculation_success") is True)
    calc_fail = sum(1 for r in records if r.get("calculated", {}) and r.get("calculated", {}).get("calculation_success") is False)
    print(f"  计算成功: {calc_success} 条, 计算失败: {calc_fail} 条")
    save_calculation_report(
        records,
        os.path.join(PROCESSED_DATA_DIR, "03_calculation_results.csv")
    )
    print("  -> 计算结果: data/processed/03_calculation_results.csv")

    print("\n[4/6] 设备编号去重检查...")
    records, dup_records, _ = detect_duplicate_devices(records)
    print(f"  重复设备记录: {len(dup_records)} 条")
    save_duplicate_report(
        dup_records,
        os.path.join(PROCESSED_DATA_DIR, "04_duplicate_devices.csv")
    )
    print("  -> 重复设备清单: data/processed/04_duplicate_devices.csv")

    print("\n[5/6] 结果跳变检测与归因...")
    records, jump_records = detect_jumps(records)
    print(f"  跳变记录: {len(jump_records)} 条")
    save_jump_report(
        jump_records,
        os.path.join(PROCESSED_DATA_DIR, "05_jump_detection.csv")
    )
    print("  -> 跳变检测报告: data/processed/05_jump_detection.csv")

    print("\n[6/6] 处理状态汇总与证据清单...")
    records, summary = classify_processing_status(records)
    save_status_summary(
        records,
        summary,
        os.path.join(PROCESSED_DATA_DIR, "06_status_detail.csv"),
        os.path.join(PROCESSED_DATA_DIR, "06_status_summary.csv"),
    )
    print(f"  已处理: {summary['processed_ok']} 条")
    print(f"  待补证据: {summary['pending_evidence']} 条")
    print("  -> 状态明细: data/processed/06_status_detail.csv")
    print("  -> 状态汇总: data/processed/06_status_summary.csv")

    print("\n" + "=" * 60)
    print("  处理链完成！")
    print("=" * 60)

    return records, summary


if __name__ == "__main__":
    run_pipeline()
