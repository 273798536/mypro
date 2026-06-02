from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

from models import (
    AnomalySource,
    CurveType,
    DataSource,
    EquipmentInfo,
    FlagType,
    MaintenanceRecord,
    PredictionDetail,
    VibrationSample,
)
from importer import auto_import
from inspector import Inspector, mark_model_backfill_impact
from predictor import LifePredictor
from reporter import Reporter


def generate_demo_data(output_dir: str | Path) -> dict:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    vibration_samples = []
    maintenance_records = []
    equipment_list = []

    for i in range(1, 5):
        eid = f"PUMP-{i:03d}"
        model_backfilled = i == 2
        equipment_list.append({
            "equipment_id": eid,
            "model": f"Model-X{i}" if not model_backfilled else f"Model-Y{i}",
            "model_backfilled": model_backfilled,
            "model_backfill_time": (now - timedelta(days=10)).isoformat() if model_backfilled else None,
            "installation_date": (now - timedelta(days=365)).isoformat(),
            "location": f"车间A-{i}号位",
        })

        base_val = 2.0 + i * 0.5
        for j in range(20):
            ts = now - timedelta(hours=(20 - j) * 12)
            degradation = base_val + j * 0.08
            is_missing = j == 8 and i in (1, 3)
            is_spike = j == 12 and i in (2, 4)
            source = "backfill" if (is_spike and i == 2) else "original"
            anomaly_source = "backfill" if (is_spike and i == 2) else ("original" if is_spike else "")

            vibration_samples.append({
                "equipment_id": eid,
                "timestamp": ts.isoformat(),
                "value": 0.0 if is_missing else (degradation * 2.5 if is_spike else degradation),
                "is_missing_sample": is_missing,
                "is_anomaly_spike": is_spike,
                "anomaly_source": anomaly_source,
                "source": source,
                "note": "补录数据" if source == "backfill" else "",
            })

        maintenance_records.append({
            "equipment_id": eid,
            "date": (now - timedelta(days=30 * i)).isoformat(),
            "maintenance_type": "定期保养",
            "description": f"更换轴承，检查密封",
            "source": "backfill" if i == 2 else "original",
            "note": "",
        })

    vib_path = output_dir / "vibration_data.json"
    with open(vib_path, "w", encoding="utf-8") as f:
        json.dump(vibration_samples, f, ensure_ascii=False, indent=2)

    maint_path = output_dir / "maintenance_data.json"
    with open(maint_path, "w", encoding="utf-8") as f:
        json.dump(maintenance_records, f, ensure_ascii=False, indent=2)

    equip_path = output_dir / "equipment_data.json"
    with open(equip_path, "w", encoding="utf-8") as f:
        json.dump(equipment_list, f, ensure_ascii=False, indent=2)

    return {
        "vibration": str(vib_path),
        "maintenance": str(maint_path),
        "equipment": str(equip_path),
    }


def run_pipeline(data_dir: str | Path, output_dir: str | Path) -> None:
    data_dir = Path(data_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/5] 导入数据: {data_dir}")
    imported = auto_import(data_dir)
    vibration = imported["vibration"]
    maintenance = imported["maintenance"]
    equipment = imported["equipment"]
    print(f"  振动采样: {len(vibration)} 条")
    print(f"  维修记录: {len(maintenance)} 条")
    print(f"  设备信息: {len(equipment)} 条")

    if not vibration:
        print("错误: 未导入任何振动数据，无法继续")
        sys.exit(1)

    print("\n[2/5] 数据检查")
    inspector = Inspector(vibration, maintenance, equipment)
    flags = inspector.run()
    print(f"  检查标记: {len(flags)} 条")
    for f in flags:
        src = "补录" if f.source == AnomalySource.BACKFILL else "原始材料"
        print(f"    [{f.flag_type.value}] {f.equipment_id} (来源:{src}): {f.message}")

    print("\n[3/5] 型号补填影响追踪")
    affected = mark_model_backfill_impact(equipment, vibration, maintenance)
    for eid, is_affected in affected.items():
        print(f"  {eid}: {'受型号补录影响' if is_affected else '无影响'}")

    print("\n[4/5] 曲线拟合寿命预测")
    predictor = LifePredictor(vibration, maintenance, equipment)
    predictions = predictor.predict_all(affected_by_backfill=affected)
    for p in predictions:
        backfill_tag = " [型号补录影响]" if p.affected_by_model_backfill else ""
        print(
            f"  {p.equipment_id}: 剩余寿命={p.predicted_remaining_life_hours:.1f}h, "
            f"置信区间=[{p.confidence_lower:.1f}, {p.confidence_upper:.1f}]h, "
            f"曲线={p.curve_type.value}, R²={p.r_squared:.4f}, "
            f"采样={p.sample_count} 缺采样={p.missing_sample_count}{backfill_tag}",
        )

    print("\n[5/5] 生成报告")
    sample_review = inspector.get_sample_review(
        predictions_affected_by_model_backfill=affected,
    )
    reporter = Reporter(predictions, vibration, maintenance, flags, sample_review)
    report = reporter.build_report()

    text_path = output_dir / "prediction_report.txt"
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(reporter.to_text(report))
    print(f"  文本报告: {text_path}")

    json_path = output_dir / "prediction_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        f.write(reporter.to_json(report))
    print(f"  JSON报告: {json_path}")

    csv_dir = output_dir / "csv_details"
    reporter.to_csv(report, csv_dir)
    print(f"  CSV明细: {csv_dir}/")

    print("\n完成。")


def main():
    base = Path(__file__).parent
    data_dir = base / "data"
    output_dir = base / "output"

    if not data_dir.is_dir() or not any(data_dir.iterdir()):
        print("未找到数据目录，生成示例数据...")
        demo_paths = generate_demo_data(data_dir)
        print(f"  示例数据已生成:")
        for k, v in demo_paths.items():
            print(f"    {k}: {v}")

    run_pipeline(data_dir, output_dir)


if __name__ == "__main__":
    main()
