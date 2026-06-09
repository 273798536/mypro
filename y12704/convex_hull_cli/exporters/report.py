import csv
import json
import os
from typing import Optional
from ..core.unified_data import UnifiedDataset


class ReportExporter:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_json(self, dataset: UnifiedDataset, filename: Optional[str] = None) -> str:
        payload = dataset.export_payload()
        if not filename:
            filename = f"report_{payload['result_id']}.json"
        out_path = os.path.join(self.output_dir, filename)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
        return out_path

    def export_csv(self, dataset: UnifiedDataset, filename_prefix: Optional[str] = None) -> str:
        payload = dataset.export_payload()
        prefix = filename_prefix or f"report_{payload['result_id']}"

        points_path = os.path.join(self.output_dir, f"{prefix}_points.csv")
        with open(points_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["record_id", "x", "y", "unit", "source"])
            writer.writeheader()
            for p in payload["points"]:
                writer.writerow(p)

        anomalies_path = os.path.join(self.output_dir, f"{prefix}_anomalies.csv")
        with open(anomalies_path, "w", encoding="utf-8-sig", newline="") as f:
            fieldnames = ["action", "type", "record_id", "description", "details",
                          "affected_fields", "next_step", "is_blocking"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for action_key, items in payload["anomalies_by_action"].items():
                for a in items:
                    row = dict(a)
                    row["action"] = action_key
                    row["affected_fields"] = ",".join(a.get("affected_fields") or [])
                    writer.writerow(row)

        return os.path.join(self.output_dir, prefix)

    def export_text_report(self, dataset: UnifiedDataset, filename: Optional[str] = None) -> str:
        payload = dataset.export_payload()
        if not filename:
            filename = f"report_{payload['result_id']}.txt"
        out_path = os.path.join(self.output_dir, filename)

        with open(out_path, "w", encoding="utf-8") as f:
            f.write("=" * 60 + "\n")
            f.write("       凸包面积试算报告\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"结果 ID       : {payload['result_id']}\n")
            f.write(f"计算时间       : {payload['created_at']}\n")
            f.write(f"参数表版本     : {payload['summary']['parameter_version'] or '未指定'}\n")
            f.write(f"是否有效       : {'是' if payload['is_valid'] else '否（存在阻断性异常）'}\n\n")

            f.write("-" * 60 + "\n")
            f.write("【计算结果汇总】\n")
            f.write("-" * 60 + "\n")
            s = payload["summary"]
            f.write(f"  输入点总数     : {s['total_points']}\n")
            f.write(f"  凸包顶点数     : {s['hull_vertices']}\n")
            f.write(f"  凸包原始面积   : {s['raw_area']:.6f}\n")
            f.write(f"  校准后面积     : {s['converted_area'] if s['converted_area'] is not None else '未校准（阻断）'}\n")
            f.write(f"  单位           : {s['unit'] or '未统一'}\n\n")

            ans = payload["anomaly_summary"]
            f.write("-" * 60 + "\n")
            f.write(f"【异常概览】  共 {ans['total']} 项  (阻断 {ans['blocking']} / 提示 {ans['warning']})\n")
            f.write("-" * 60 + "\n")
            for action, cnt in ans["by_action"].items():
                action_cn = {
                    "supplement_material": "补材料",
                    "adjust_caliber": "改口径",
                    "review_data": "核对数据",
                    "wait_parameter": "等参数表"
                }.get(action, action)
                f.write(f"  · 下一步【{action_cn}】: {cnt} 条\n")
            f.write("\n")

            if payload["anomalies_by_action"]:
                f.write("-" * 60 + "\n")
                f.write("【异常明细与处理指引】\n")
                f.write("-" * 60 + "\n\n")
                for action_key, items in payload["anomalies_by_action"].items():
                    action_cn = {
                        "supplement_material": "补材料",
                        "adjust_caliber": "改口径",
                        "review_data": "核对数据",
                        "wait_parameter": "等参数表"
                    }.get(action_key, action_key)
                    for idx, a in enumerate(items, 1):
                        tag = "【阻断】" if a["is_blocking"] else "【提示】"
                        f.write(f"  {tag} [{action_cn}] #{idx} {a['type']}\n")
                        f.write(f"      说明     : {a['description']}\n")
                        if a.get("record_id"):
                            f.write(f"      关联记录  : {a['record_id']}\n")
                        if a.get("details"):
                            f.write(f"      详情     : {a['details']}\n")
                        if a.get("affected_fields"):
                            f.write(f"      影响字段  : {', '.join(a['affected_fields'])}\n")
                        f.write(f"      下一步   : {a['next_step']}\n\n")

            if not payload["is_valid"]:
                f.write("=" * 60 + "\n")
                f.write("【重要提示】本报告因存在阻断性异常被拦截，面积结果仅供参考。\n")
                f.write("          请按上述【下一步】指引完成整改后重新计算。\n")
                f.write("          数学老师复核时可通过 anomaly_summary.by_action 查看\n")
                f.write("          每条异常被拦截的具体原因（如单位缺失则无法校准面积）。\n")
                f.write("=" * 60 + "\n")

            if payload.get("notes"):
                f.write(f"\n备注: {payload['notes']}\n")

        return out_path
