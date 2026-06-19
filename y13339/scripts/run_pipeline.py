#!/usr/bin/env python3
"""
日常脚本入口 - 稳定的CLI调用方式，参数名固定不变。
接手同事直接运行：  python scripts/run_pipeline.py --name "xxx" --materials materials.json --recalls recalls.json
"""
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import RunRecord, RecallResult
from app import storage
from app.material_manager import register_material, find_material_by_name
from app.metrics import compute_metrics
from app.leak_detector import detect_sample_leak
from app import errors


def load_json_file(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[E401] 文件读取失败: {path}, 原因: {e}", file=sys.stderr)
        sys.exit(401)


def main():
    parser = argparse.ArgumentParser(description="知识库召回指标看板 - 稳定的日常调用脚本")
    parser.add_argument("--name", required=True, help="运行名称（必填，会出现在公示里）")
    parser.add_argument("--materials", required=True, help="材料JSON文件路径（必填）")
    parser.add_argument("--recalls", required=True, help="召回结果JSON文件路径（必填）")
    parser.add_argument("--confirm-leak", action="store_true", help="（可选）若检测到泄漏，自动确认并继续")
    parser.add_argument("--leak-note", default="", help="（可选）泄漏确认说明")
    parser.add_argument("--output", default="", help="（可选）输出报告JSON的路径")
    args = parser.parse_args()

    print(f"==> 创建运行: {args.name}")
    record = RunRecord(run_name=args.name)

    print("==> 载入材料...")
    materials_data = load_json_file(args.materials)
    if not isinstance(materials_data, list):
        print("[E102] 参数格式错误: materials 应为数组", file=sys.stderr)
        sys.exit(102)

    changed_materials = []
    override_conflicts = []
    for m in materials_data:
        mat, ec, em = register_material(
            materials=record.materials,
            material_name=m.get("material_name", ""),
            material_content=m.get("material_content", ""),
            source_type=m.get("source_type", "model"),
            aliases=m.get("aliases", []),
            change_note=m.get("change_note", ""),
            is_manual_override=m.get("is_manual_override", False),
            override_note=m.get("override_note", ""),
        )
        if ec == errors.ERR_VERSION_CONFLICT:
            print(f"    [!] 口径变更: {mat.material_name} v{mat.version} - {em}")
            changed_materials.append(mat.material_id)
            record.changed_materials.append(mat.material_id)
            record.pending_evidences.append(f"changed:{mat.material_id}")
        elif ec == errors.ERR_MANUAL_OVERRIDE_EXISTS:
            print(f"    [!] 人工修正冲突: {mat.material_name} - {em}")
            override_conflicts.append(mat.material_id)
            record.pending_evidences.append(f"override_check:{mat.material_id}")
    print(f"    材料载入完成: {len(record.materials)} 份, 变更 {len(changed_materials)}, 冲突 {len(override_conflicts)}")

    print("==> 载入召回结果...")
    recalls_data = load_json_file(args.recalls)
    if not isinstance(recalls_data, list):
        print("[E102] 参数格式错误: recalls 应为数组", file=sys.stderr)
        sys.exit(102)

    added, warnings = 0, []
    for item in recalls_data:
        for f in ["sample_id", "query", "recalled_material_ids", "recalled_scores"]:
            if f not in item:
                warnings.append(f"样本缺少字段 {f}, 已跳过")
                continue
        expected_name = item.get("expected_material_name")
        expected_id = item.get("expected_material_id")
        if expected_name and not expected_id:
            found = find_material_by_name(record.materials, expected_name)
            if found:
                expected_id = found.material_id
            else:
                warnings.append(f"样本 {item['sample_id']}: 无法匹配材料名 '{expected_name}'")
        rec = RecallResult(
            sample_id=item["sample_id"],
            query=item["query"],
            recalled_material_ids=list(item["recalled_material_ids"]),
            recalled_scores=list(item["recalled_scores"]),
            expected_material_id=expected_id,
            expected_material_name=expected_name,
            tags=list(item.get("tags", [])),
        )
        record.recall_results.append(rec)
        added += 1
    for w in warnings:
        print(f"    [!] {w}")
    print(f"    召回载入完成: {added} 条")

    print("==> 检测样本泄漏...")
    record.status = "processing"
    leak_info, leak_warns = detect_sample_leak(record.recall_results, record.materials)
    record.leak_info = leak_info

    if leak_info.detected:
        print(f"    [E301] {errors.ERR_SAMPLE_LEAK_DETECTED_MSG}")
        print(f"    影响范围: {leak_info.impact_scope}")
        for r in leak_info.reasons:
            print(f"      - {r}")
        if not args.confirm_leak:
            record.status = "paused_leak"
            record.status_note = "; ".join(leak_info.reasons[:3])
            storage.save_record(record)
            print(f"    运行已保存为暂停状态: run_id={record.run_id}")
            print("    处理方式: 1) 检查样本 2) 再次运行加 --confirm-leak 或在Web界面确认")
            _output_report(record, args.output)
            sys.exit(301)
        else:
            print(f"    --confirm-leak 已指定，继续计算")
            record.leak_info.confirmed = True
            record.leak_info.confirmed_note = args.leak_note or "CLI自动确认"
            for sid in leak_info.suspected_samples:
                record.pending_evidences.append(f"leak:{sid}")

    print("==> 计算指标...")
    try:
        metrics, outliers = compute_metrics(record.recall_results)
        for k, v in metrics.items():
            print(f"    {k}: {v}")
        print(f"    拉偏结论的异常样本数: {len(outliers)}")
        for o in outliers:
            print(f"      - {o}")
            record.pending_evidences.append(f"outlier:{o}")
        record.total_samples = metrics["total_samples"]
        record.recall_at_1 = metrics["recall_at_1"]
        record.recall_at_3 = metrics["recall_at_3"]
        record.recall_at_5 = metrics["recall_at_5"]
        record.mrr = metrics["mrr"]
        record.outlier_samples = outliers
        record.status = "done"
        record.status_note = errors.ERR_OK_MSG
        storage.save_record(record)
        print(f"==> 完成！run_id={record.run_id}")
        print(f"    待补证据条目数: {len(record.pending_evidences)}")
        for pe in record.pending_evidences:
            print(f"      - {pe}")
        _output_report(record, args.output)
    except Exception as e:
        record.status = "error"
        record.status_note = str(e)
        storage.save_record(record)
        print(f"[E500] 指标计算失败: {e}", file=sys.stderr)
        sys.exit(500)


def _output_report(record: RunRecord, path: str):
    if not path:
        return
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record.to_dict(), f, ensure_ascii=False, indent=2)
    print(f"    报告已输出到: {path}")


if __name__ == "__main__":
    main()
