import json
import csv
import os
from typing import Optional
from .models import CompareResult


def export_result(result: CompareResult, output_dir: str = "output", format: str = "json") -> str:
    os.makedirs(output_dir, exist_ok=True)
    filename = f"compare_{result.version_old}_vs_{result.version_new}"

    if format == "json":
        path = os.path.join(output_dir, f"{filename}.json")
        _export_json(result, path)
    elif format == "csv":
        path = os.path.join(output_dir, f"{filename}.csv")
        _export_csv(result, path)
    elif format == "both":
        json_path = os.path.join(output_dir, f"{filename}.json")
        csv_path = os.path.join(output_dir, f"{filename}.csv")
        _export_json(result, json_path)
        _export_csv(result, csv_path)
        return json_path
    else:
        raise ValueError(f"不支持的导出格式: {format}")

    return path


def _export_json(result: CompareResult, path: str):
    data = {
        "version_old": result.version_old,
        "version_new": result.version_new,
        "summary": {
            "total_old": result.total_clusters_old,
            "total_new": result.total_clusters_new,
            "new_clusters_count": len(result.new_clusters),
            "removed_clusters_count": len(result.removed_clusters),
            "changed_clusters_count": len(result.changed_clusters),
            "citation_issues_count": len(result.citation_issues),
        },
        "parse_stats": {
            "old": {
                "total": result.parse_stats_old.total,
                "processed": result.parse_stats_old.processed,
                "bad_lines": result.parse_stats_old.bad_lines,
                "skipped_lines": result.parse_stats_old.skipped_lines,
            },
            "new": {
                "total": result.parse_stats_new.total,
                "processed": result.parse_stats_new.processed,
                "bad_lines": result.parse_stats_new.bad_lines,
                "skipped_lines": result.parse_stats_new.skipped_lines,
            },
        },
        "new_clusters": result.new_clusters,
        "removed_clusters": result.removed_clusters,
        "changed_clusters": result.changed_clusters,
        "sentiment_changes": result.sentiment_changes,
        "confidence_stats": result.confidence_stats,
        "threshold_metrics": result.threshold_metrics,
        "manual_correction_impact": result.manual_correction_impact,
        "citation_issues": result.citation_issues,
        "parse_details": {
            "old_bad_details": result.parse_stats_old.bad_details,
            "old_skipped_details": result.parse_stats_old.skipped_details,
            "new_bad_details": result.parse_stats_new.bad_details,
            "new_skipped_details": result.parse_stats_new.skipped_details,
        },
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _export_csv(result: CompareResult, path: str):
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)

        writer.writerow(["【概览】"])
        writer.writerow(["版本对比", f"{result.version_old} -> {result.version_new}"])
        writer.writerow(["旧版聚类数", result.total_clusters_old])
        writer.writerow(["新版聚类数", result.total_clusters_new])
        writer.writerow(["新增聚类", len(result.new_clusters)])
        writer.writerow(["删除聚类", len(result.removed_clusters)])
        writer.writerow(["变化聚类", len(result.changed_clusters)])
        writer.writerow(["引用缺失告警", len(result.citation_issues)])
        writer.writerow([])

        writer.writerow(["【解析统计】"])
        writer.writerow(["项目", "旧版", "新版"])
        writer.writerow(["总行数", result.parse_stats_old.total, result.parse_stats_new.total])
        writer.writerow(["已处理行", result.parse_stats_old.processed, result.parse_stats_new.processed])
        writer.writerow(["坏行", result.parse_stats_old.bad_lines, result.parse_stats_new.bad_lines])
        writer.writerow(["跳过行", result.parse_stats_old.skipped_lines, result.parse_stats_new.skipped_lines])
        writer.writerow([])

        writer.writerow(["【阈值指标】"])
        writer.writerow(["阈值", result.threshold_metrics["threshold"]])
        writer.writerow(["旧版高于阈值", result.threshold_metrics["old_above_threshold"]])
        writer.writerow(["新版高于阈值", result.threshold_metrics["new_above_threshold"]])
        writer.writerow(["差异", result.threshold_metrics["diff_above_threshold"]])
        writer.writerow([])

        writer.writerow(["【置信度统计】"])
        writer.writerow(["指标", "旧版", "新版"])
        writer.writerow(["平均值", result.confidence_stats["old_avg"], result.confidence_stats["new_avg"]])
        writer.writerow(["最小值", result.confidence_stats["old_min"], result.confidence_stats["new_min"]])
        writer.writerow(["最大值", result.confidence_stats["old_max"], result.confidence_stats["new_max"]])
        writer.writerow(["中位数", result.confidence_stats["old_median"], result.confidence_stats["new_median"]])
        writer.writerow([])

        writer.writerow(["【情感变化】"])
        for key in ["positive", "negative", "neutral"]:
            writer.writerow([key, result.sentiment_changes.get(key, 0)])
        writer.writerow(["总计", result.sentiment_changes.get("total", 0)])
        writer.writerow([])

        if result.citation_issues:
            writer.writerow(["【引用缺失告警】"])
            for issue in result.citation_issues:
                writer.writerow([issue])
            writer.writerow([])

        if result.manual_correction_impact:
            writer.writerow(["【人工修正影响】"])
            writer.writerow(["修正ID", "聚类ID", "聚类标题", "字段", "旧值", "新值", "操作人", "备注"])
            for item in result.manual_correction_impact:
                writer.writerow([
                    item["correction_id"],
                    item["cluster_id"],
                    item["cluster_title"],
                    item["field"],
                    item["old_value"],
                    item["new_value"],
                    item["operator"],
                    item["remark"],
                ])
            writer.writerow([])

        if result.new_clusters:
            writer.writerow(["【新增聚类】"])
            writer.writerow(["聚类ID"])
            for cid in result.new_clusters:
                writer.writerow([cid])
            writer.writerow([])

        if result.removed_clusters:
            writer.writerow(["【删除聚类】"])
            writer.writerow(["聚类ID"])
            for cid in result.removed_clusters:
                writer.writerow([cid])
            writer.writerow([])

        if result.changed_clusters:
            writer.writerow(["【变化聚类】"])
            writer.writerow(["聚类ID", "标题", "变更字段", "旧值", "新值"])
            for item in result.changed_clusters:
                for change in item["changes"]:
                    writer.writerow([
                        item["cluster_id"],
                        item["title"],
                        change["field"],
                        change["old"],
                        change["new"],
                    ])
