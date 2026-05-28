"""报告生成模块 - 导出多种格式的审计报告"""

from typing import Optional, Dict, Any, List
import os
import json
from datetime import datetime
import pandas as pd
import numpy as np

from .exceptions import ReportError, SourceLocation
from .data_loader import DataSource
from .validator import ValidationResult
from .preprocessor import PreprocessingResult
from .clusterer import ClusteringResult
from .metrics import QualityMetricsResult
from .interpreter import InterpretationResult
from .audit import AuditTrail, ActionType
from .config import Constants


def _json_default(obj: Any) -> Any:
    """JSON序列化处理numpy类型"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (pd.Series, pd.DataFrame)):
        return obj.to_dict()
    elif hasattr(obj, 'isoformat'):
        return obj.isoformat()
    else:
        return str(obj)


def _safe_json_dumps(data: Any, **kwargs) -> str:
    """安全的JSON序列化，处理numpy类型"""
    kwargs.setdefault('default', _json_default)
    kwargs.setdefault('ensure_ascii', False)
    return json.dumps(data, **kwargs)


class ReportGenerator:
    """报告生成器"""

    def __init__(
        self,
        data_source: DataSource,
        audit_trail: AuditTrail,
        validation_result: Optional[ValidationResult] = None,
        preprocessing_result: Optional[PreprocessingResult] = None,
        clustering_result: Optional[ClusteringResult] = None,
        metrics_result: Optional[QualityMetricsResult] = None,
        interpretation_result: Optional[InterpretationResult] = None,
        anomaly_records: Optional[List[Dict[str, Any]]] = None,
        previous_report: Optional[Dict[str, Any]] = None,
    ):
        self.data_source = data_source
        self.audit_trail = audit_trail
        self.validation_result = validation_result
        self.preprocessing_result = preprocessing_result
        self.clustering_result = clustering_result
        self.metrics_result = metrics_result
        self.interpretation_result = interpretation_result
        self.anomaly_records = anomaly_records or []
        self.previous_report = previous_report

    def export(
        self,
        output_path: str,
        format: Optional[str] = None,
        include_audit_trail: bool = True,
        include_raw_data: bool = False,
        include_sample_details: bool = True,
    ) -> str:
        """导出报告

        Args:
            output_path: 输出文件路径
            format: 输出格式 (xlsx, csv, html, json, md)，None表示根据扩展名自动推断
            include_audit_trail: 是否包含审计追踪
            include_raw_data: 是否包含原始数据
            include_sample_details: 是否包含样本详情

        Returns:
            实际输出的文件路径
        """
        if format is None:
            ext = os.path.splitext(output_path)[1].lower()
            format = ext.lstrip(".") if ext else "xlsx"

        if format not in [f.lstrip(".") for f in Constants.SUPPORTED_OUTPUT_FORMATS]:
            location = SourceLocation(file_path=output_path)
            raise ReportError(
                f"不支持的输出格式: {format}，支持格式: {Constants.SUPPORTED_OUTPUT_FORMATS}",
                location=location,
            )

        try:
            if format == "xlsx":
                output_path = self._export_excel(
                    output_path, include_audit_trail, include_raw_data, include_sample_details
                )
            elif format == "csv":
                output_path = self._export_csv(
                    output_path, include_audit_trail, include_sample_details
                )
            elif format == "html":
                output_path = self._export_html(
                    output_path, include_audit_trail, include_raw_data, include_sample_details
                )
            elif format == "json":
                output_path = self._export_json(
                    output_path, include_audit_trail, include_raw_data
                )
            elif format == "md":
                output_path = self._export_markdown(
                    output_path, include_audit_trail, include_sample_details
                )

            self.audit_trail.log_info(
                action_type=ActionType.REPORT_GENERATION,
                message=f"报告已导出: {output_path}",
                source_location=SourceLocation(file_path=output_path),
                format=format,
                include_audit_trail=include_audit_trail,
                include_raw_data=include_raw_data,
            )

            return output_path

        except Exception as e:
            location = SourceLocation(file_path=output_path)
            raise ReportError(
                f"导出报告失败: {str(e)}",
                location=location,
            ) from e

    def _collect_report_data(self) -> Dict[str, Any]:
        """收集所有报告数据"""
        data = {
            "report_info": {
                "generated_at": datetime.now().isoformat(),
                "version": "1.0.0",
                "data_source": self.data_source.file_path,
                "sheet_name": self.data_source.sheet_name,
                "session_id": self.audit_trail.session_id,
            },
            "summary": self._generate_summary(),
            "validation": self.validation_result.to_dict() if self.validation_result else None,
            "preprocessing": self.preprocessing_result.to_dict() if self.preprocessing_result else None,
            "clustering": self.clustering_result.to_dict() if self.clustering_result else None,
            "metrics": self.metrics_result.to_dict() if self.metrics_result else None,
            "interpretation": self.interpretation_result.to_dict() if self.interpretation_result else None,
            "audit_trail": self.audit_trail.to_dict(),
            "anomaly_records": self.anomaly_records,
        }

        if self.previous_report:
            data["previous_report_comparison"] = self._compare_with_previous()

        return data

    def _generate_summary(self) -> Dict[str, Any]:
        """生成摘要信息"""
        summary = {
            "total_samples": len(self.data_source.df),
            "feature_columns": self.preprocessing_result.feature_columns if self.preprocessing_result else [],
            "n_clusters": self.clustering_result.n_clusters if self.clustering_result else 0,
            "scaling_method": self.preprocessing_result.scaler_type if self.preprocessing_result else "none",
            "overall_quality": self.metrics_result.quality_assessment if self.metrics_result else "unknown",
            "silhouette_score": self.metrics_result.overall_silhouette_score if self.metrics_result else None,
            "errors": [],
            "warnings": [],
            "corrections": [],
        }

        if self.validation_result:
            summary["errors"].extend(self.validation_result.errors)
            summary["warnings"].extend(self.validation_result.warnings)
            summary["corrections"].extend(self.validation_result.corrections)

        if self.preprocessing_result:
            summary["warnings"].extend(self.preprocessing_result.warnings)
            summary["corrections"].extend(self.preprocessing_result.missing_value_corrections)

        if self.clustering_result:
            summary["warnings"].extend(self.clustering_result.warnings)
            summary["errors"].extend(self.clustering_result.errors)

        if self.metrics_result:
            summary["warnings"].extend(self.metrics_result.warnings)

        if self.interpretation_result:
            summary["warnings"].extend(self.interpretation_result.warnings)

        summary["total_errors"] = len(summary["errors"])
        summary["total_warnings"] = len(summary["warnings"])
        summary["total_corrections"] = len(summary["corrections"])

        return summary

    def _compare_with_previous(self) -> Dict[str, Any]:
        """与历史报告对比"""
        comparison = {
            "has_previous_report": True,
            "changes": [],
        }

        if not self.previous_report:
            comparison["has_previous_report"] = False
            return comparison

        prev = self.previous_report
        curr = self._generate_summary()

        if prev.get("n_clusters") != curr["n_clusters"]:
            comparison["changes"].append(
                {
                    "item": "聚类数",
                    "previous": prev.get("n_clusters"),
                    "current": curr["n_clusters"],
                    "type": "config_change",
                }
            )

        if prev.get("scaling_method") != curr["scaling_method"]:
            comparison["changes"].append(
                {
                    "item": "标准化方法",
                    "previous": prev.get("scaling_method"),
                    "current": curr["scaling_method"],
                    "type": "config_change",
                }
            )

        prev_silhouette = prev.get("silhouette_score")
        curr_silhouette = curr["silhouette_score"]
        if prev_silhouette is not None and curr_silhouette is not None:
            diff = curr_silhouette - prev_silhouette
            comparison["changes"].append(
                {
                    "item": "轮廓系数",
                    "previous": prev_silhouette,
                    "current": curr_silhouette,
                    "difference": diff,
                    "type": "metric_change",
                }
            )

        return comparison

    def _export_excel(
        self,
        output_path: str,
        include_audit_trail: bool,
        include_raw_data: bool,
        include_sample_details: bool,
    ) -> str:
        """导出Excel格式报告"""
        if not output_path.endswith(".xlsx"):
            output_path += ".xlsx"

        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            self._write_summary_sheet(writer)
            self._write_cluster_results_sheet(writer)
            self._write_feature_importance_sheet(writer)
            self._write_cluster_profiles_sheet(writer)
            self._write_quality_metrics_sheet(writer)

            if include_sample_details:
                self._write_sample_details_sheet(writer)

            self._write_warnings_errors_sheet(writer)
            self._write_corrections_sheet(writer)

            if include_audit_trail:
                self._write_audit_trail_sheet(writer)

            if include_raw_data:
                self.data_source.df.to_excel(
                    writer, sheet_name="原始数据", index=False
                )

        return output_path

    def _write_summary_sheet(self, writer: pd.ExcelWriter):
        """写入摘要工作表"""
        summary = self._generate_summary()

        data = []
        data.append(["KMeans分群审计报告", ""])
        data.append(["生成时间", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        data.append(["数据源", self.data_source.file_path])
        if self.data_source.sheet_name:
            data.append(["工作表", self.data_source.sheet_name])
        data.append(["", ""])
        data.append(["总样本数", summary["total_samples"]])
        data.append(["特征列数", len(summary["feature_columns"])])
        data.append(["特征列", ", ".join(summary["feature_columns"])])
        data.append(["聚类数", summary["n_clusters"]])
        data.append(["标准化方法", summary["scaling_method"]])
        data.append(["整体质量评估", summary["overall_quality"]])
        data.append(["轮廓系数", f"{summary['silhouette_score']:.4f}" if summary["silhouette_score"] is not None else "N/A"])
        data.append(["", ""])
        data.append(["错误数", summary["total_errors"]])
        data.append(["警告数", summary["total_warnings"]])
        data.append(["修正数", summary["total_corrections"]])

        df = pd.DataFrame(data, columns=["项目", "内容"])
        df.to_excel(writer, sheet_name="摘要", index=False)

    def _write_cluster_results_sheet(self, writer: pd.ExcelWriter):
        """写入聚类结果工作表"""
        if not self.clustering_result or self.clustering_result.labels is None:
            return

        result_df = self.data_source.df.copy()

        if self.clustering_result.used_samples is not None:
            used_indices = self.clustering_result.used_samples.index
            labels = self.clustering_result.labels

            result_df["聚类结果"] = None
            result_df.loc[used_indices, "聚类结果"] = labels

            if self.metrics_result and self.metrics_result.sample_silhouette_scores is not None:
                result_df["轮廓系数"] = None
                result_df.loc[used_indices, "轮廓系数"] = self.metrics_result.sample_silhouette_scores

        else:
            result_df["聚类结果"] = self.clustering_result.labels
            if self.metrics_result and self.metrics_result.sample_silhouette_scores is not None:
                result_df["轮廓系数"] = self.metrics_result.sample_silhouette_scores

        cluster_sizes = self.clustering_result.cluster_sizes
        result_df["簇大小"] = result_df["聚类结果"].map(cluster_sizes)

        result_df.to_excel(writer, sheet_name="聚类结果", index=False)

    def _write_feature_importance_sheet(self, writer: pd.ExcelWriter):
        """写入特征重要性工作表"""
        if not self.interpretation_result:
            return

        data = []
        for item in self.interpretation_result.feature_importance_ranked:
            data.append(
                {
                    "排名": item["rank"],
                    "特征": item["feature"],
                    "重要性": item["importance"],
                }
            )

        if data:
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="特征重要性", index=False)

    def _write_cluster_profiles_sheet(self, writer: pd.ExcelWriter):
        """写入簇画像工作表"""
        if not self.interpretation_result:
            return

        data = []
        for cluster_id, profile in self.interpretation_result.cluster_profiles.items():
            key_features = "; ".join(
                [f"{f['feature']}({f['direction']}, z={f['z_score']:.2f})" for f in profile["key_features"]]
            )
            data.append(
                {
                    "簇ID": cluster_id,
                    "簇名称": profile["name"],
                    "样本数": profile["size"],
                    "占比(%)": f"{profile['percentage']:.2f}",
                    "描述": profile["description"],
                    "主要特征": key_features,
                }
            )

        if data:
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="簇画像", index=False)

    def _write_quality_metrics_sheet(self, writer: pd.ExcelWriter):
        """写入质量指标工作表"""
        if not self.metrics_result:
            return

        data = [
            ["指标名称", "数值", "说明"],
            ["整体轮廓系数", self.metrics_result.overall_silhouette_score, "越高越好，>0.5较好"],
            ["CH指数", self.metrics_result.calinski_harabasz_score, "越高越好"],
            ["DB指数", self.metrics_result.davies_bouldin_score, "越低越好，<1较好"],
            ["整体质量评估", self.metrics_result.quality_assessment, "excellent/good/fair/poor/bad"],
        ]

        overall_score = self.metrics_result.quality_scores.get("overall")
        if overall_score is not None:
            data.append(["综合得分", f"{overall_score:.2f}", "0-1，越高越好"])

        df = pd.DataFrame(data[1:], columns=data[0])
        df.to_excel(writer, sheet_name="质量指标", index=False)

        if self.metrics_result.per_cluster_silhouette:
            per_cluster_data = []
            for cluster_id, stats in self.metrics_result.per_cluster_silhouette.items():
                per_cluster_data.append(
                    {
                        "簇ID": cluster_id,
                        "平均轮廓系数": stats["mean"],
                        "中位数轮廓系数": stats["median"],
                        "标准差": stats["std"],
                        "最小值": stats["min"],
                        "最大值": stats["max"],
                        "负系数样本数": stats["negative_count"],
                        "负系数比例(%)": f"{stats['negative_ratio'] * 100:.2f}",
                    }
                )
            df2 = pd.DataFrame(per_cluster_data)
            df2.to_excel(writer, sheet_name="各簇质量指标", index=False)

    def _write_sample_details_sheet(self, writer: pd.ExcelWriter):
        """写入样本详情工作表"""
        if not self.interpretation_result:
            return

        data = []
        for sample in self.interpretation_result.sample_interpretations:
            top_feats = "; ".join(
                [
                    f"{f['feature']}(距离={f['distance_to_center']:.3f})"
                    for f in sample["top_contributing_features"]
                ]
            )
            data.append(
                {
                    "样本索引": sample["index"],
                    "原始行号": sample["original_row"],
                    "所在簇": sample["cluster_id"],
                    "轮廓系数": sample["silhouette_score"],
                    "位置": sample["location"],
                    "主要贡献特征": top_feats,
                }
            )

        if data:
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="样本解释", index=False)

        if self.metrics_result and self.metrics_result.negative_silhouette_samples:
            neg_data = []
            for sample in self.metrics_result.negative_silhouette_samples[:100]:
                neg_data.append(
                    {
                        "样本索引": sample["index"],
                        "原始行号": sample["original_row"],
                        "所在簇": sample["cluster_id"],
                        "轮廓系数": sample["silhouette_score"],
                        "位置": sample["location"],
                    }
                )
            if neg_data:
                df2 = pd.DataFrame(neg_data)
                df2.to_excel(writer, sheet_name="负轮廓系数样本", index=False)

    def _write_warnings_errors_sheet(self, writer: pd.ExcelWriter):
        """写入警告和错误工作表"""
        summary = self._generate_summary()

        all_issues = []
        for error in summary["errors"]:
            all_issues.append(
                {
                    "类型": "错误",
                    "消息": error["message"],
                    "位置": error.get("location", ""),
                }
            )

        for warning in summary["warnings"]:
            all_issues.append(
                {
                    "类型": "警告",
                    "消息": warning["message"],
                    "位置": warning.get("location", ""),
                }
            )

        if all_issues:
            df = pd.DataFrame(all_issues)
            df.to_excel(writer, sheet_name="警告与错误", index=False)

    def _write_corrections_sheet(self, writer: pd.ExcelWriter):
        """写入修正记录工作表"""
        corrections = self.audit_trail.get_corrections()

        if corrections:
            data = []
            for entry in corrections:
                data.append(
                    {
                        "时间": entry.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        "操作类型": entry.action_type.value,
                        "消息": entry.message,
                        "位置": str(entry.source_location) if entry.source_location else "",
                        "修正前": str(entry.before_value) if entry.before_value is not None else "",
                        "修正后": str(entry.after_value) if entry.after_value is not None else "",
                    }
                )
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="修正记录", index=False)

    def _write_audit_trail_sheet(self, writer: pd.ExcelWriter):
        """写入审计追踪工作表"""
        entries = self.audit_trail.entries

        if entries:
            data = []
            for entry in entries:
                data.append(
                    {
                        "时间": entry.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        "操作类型": entry.action_type.value,
                        "严重程度": entry.severity.value,
                        "消息": entry.message,
                        "位置": str(entry.source_location) if entry.source_location else "",
                        "元数据": _safe_json_dumps(entry.metadata) if entry.metadata else "",
                    }
                )
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="审计追踪", index=False)

    def _export_csv(
        self,
        output_path: str,
        include_audit_trail: bool,
        include_sample_details: bool,
    ) -> str:
        """导出CSV格式报告"""
        base_path = os.path.splitext(output_path)[0]

        if self.clustering_result and self.clustering_result.labels is not None:
            result_df = self.data_source.df.copy()
            result_df["聚类结果"] = self.clustering_result.labels
            if self.metrics_result and self.metrics_result.sample_silhouette_scores is not None:
                result_df["轮廓系数"] = self.metrics_result.sample_silhouette_scores

            result_df.to_csv(f"{base_path}_聚类结果.csv", index=False, encoding="utf-8-sig")

        if self.interpretation_result:
            fi_data = [
                {
                    "排名": item["rank"],
                    "特征": item["feature"],
                    "重要性": item["importance"],
                }
                for item in self.interpretation_result.feature_importance_ranked
            ]
            if fi_data:
                pd.DataFrame(fi_data).to_csv(
                    f"{base_path}_特征重要性.csv", index=False, encoding="utf-8-sig"
                )

        if include_audit_trail:
            audit_data = self.audit_trail.to_dict()
            with open(f"{base_path}_审计追踪.json", "w", encoding="utf-8") as f:
                json.dump(audit_data, f, indent=2, ensure_ascii=False)

        return base_path + "_聚类结果.csv"

    def _export_html(
        self,
        output_path: str,
        include_audit_trail: bool,
        include_raw_data: bool,
        include_sample_details: bool,
    ) -> str:
        """导出HTML格式报告"""
        if not output_path.endswith(".html"):
            output_path += ".html"

        report_data = self._collect_report_data()

        html_content = self._generate_html_report(report_data, include_audit_trail, include_sample_details)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return output_path

    def _generate_html_report(
        self,
        report_data: Dict[str, Any],
        include_audit_trail: bool,
        include_sample_details: bool,
    ) -> str:
        """生成HTML报告内容"""
        summary = report_data["summary"]
        interpretation = report_data.get("interpretation", {})
        metrics = report_data.get("metrics", {})

        html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KMeans分群审计报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4a90d9; padding-bottom: 10px; }
        h2 { color: #4a90d9; margin-top: 30px; }
        h3 { color: #555; margin-top: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #4a90d9; }
        .summary-card .label { color: #666; font-size: 0.9em; }
        .summary-card .value { font-size: 1.5em; font-weight: bold; color: #333; }
        .quality-good { color: #28a745; }
        .quality-fair { color: #ffc107; }
        .quality-poor { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        tr:hover { background: #f5f5f5; }
        .alert { padding: 12px; margin: 10px 0; border-radius: 4px; }
        .alert-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
        .alert-warning { background: #fff3cd; color: #856404; border-left: 4px solid #ffc107; }
        .alert-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .cluster-profile { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 6px; }
        .feature-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .feature-bar-fill { height: 100%; background: linear-gradient(90deg, #4a90d9, #6cb3ff); transition: width 0.3s; }
        .metadata { color: #999; font-size: 0.85em; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
<div class="container">
    <h1>📊 KMeans分群审计报告</h1>
"""

        quality_class = "quality-good"
        if summary["overall_quality"] in ["fair", "poor", "bad"]:
            quality_class = "quality-fair" if summary["overall_quality"] == "fair" else "quality-poor"

        silhouette_display = f"{summary['silhouette_score']:.4f}" if summary["silhouette_score"] is not None else "N/A"

        html += f"""
    <div class="summary-grid">
        <div class="summary-card">
            <div class="label">总样本数</div>
            <div class="value">{summary['total_samples']}</div>
        </div>
        <div class="summary-card">
            <div class="label">聚类数</div>
            <div class="value">{summary['n_clusters']}</div>
        </div>
        <div class="summary-card">
            <div class="label">标准化方法</div>
            <div class="value">{summary['scaling_method']}</div>
        </div>
        <div class="summary-card">
            <div class="label">轮廓系数</div>
            <div class="value">{silhouette_display}</div>
        </div>
        <div class="summary-card">
            <div class="label">整体质量</div>
            <div class="value {quality_class}">{summary['overall_quality']}</div>
        </div>
        <div class="summary-card">
            <div class="label">特征数</div>
            <div class="value">{len(summary['feature_columns'])}</div>
        </div>
    </div>
"""

        if summary["total_errors"] > 0 or summary["total_warnings"] > 0:
            html += """
    <h2>⚠️ 问题汇总</h2>
"""
            if summary["total_errors"] > 0:
                for error in summary["errors"][:10]:
                    loc_str = str(error['location']) if error.get('location') else ''
                    html += f"""
    <div class="alert alert-error">
        <strong>错误:</strong> {error['message']}
        {'<br><small>位置: ' + loc_str + '</small>' if loc_str else ''}
    </div>
"""
            if summary["total_warnings"] > 0:
                for warning in summary["warnings"][:10]:
                    loc_str = str(warning['location']) if warning.get('location') else ''
                    html += f"""
    <div class="alert alert-warning">
        <strong>警告:</strong> {warning['message']}
        {'<br><small>位置: ' + loc_str + '</small>' if loc_str else ''}
    </div>
"""
            if summary["total_errors"] > 10 or summary["total_warnings"] > 10:
                html += f"""
    <p><em>... 还有 {summary['total_errors'] + summary['total_warnings'] - 20} 条问题未显示，请查看完整报告</em></p>
"""

        if interpretation.get("feature_importance_ranked"):
            html += """
    <h2>🔑 特征重要性</h2>
    <table>
        <thead>
            <tr>
                <th>排名</th>
                <th>特征</th>
                <th>重要性</th>
                <th>可视化</th>
            </tr>
        </thead>
        <tbody>
"""
            max_importance = max(item["importance"] for item in interpretation["feature_importance_ranked"]) if interpretation["feature_importance_ranked"] else 1
            for item in interpretation["feature_importance_ranked"]:
                width_pct = (item["importance"] / max_importance * 100) if max_importance > 0 else 0
                html += f"""
            <tr>
                <td>{item['rank']}</td>
                <td><strong>{item['feature']}</strong></td>
                <td>{item['importance']:.4f}</td>
                <td><div class="feature-bar"><div class="feature-bar-fill" style="width: {width_pct}%"></div></div></td>
            </tr>
"""
            html += """
        </tbody>
    </table>
"""

        if interpretation.get("cluster_profiles"):
            html += """
    <h2>👥 簇画像</h2>
"""
            for cluster_id, profile in sorted(interpretation["cluster_profiles"].items()):
                key_features_html = "<ul>"
                for feat in profile["key_features"][:5]:
                    direction_icon = "⬆️" if feat["direction"] == "high" else "⬇️"
                    key_features_html += f"<li>{direction_icon} <strong>{feat['feature']}</strong>: z-score = {feat['z_score']:.2f}, 簇均值 = {feat['cluster_mean']:.2f}, 总体均值 = {feat['overall_mean']:.2f}</li>"
                key_features_html += "</ul>"

                html += f"""
    <div class="cluster-profile">
        <h3>{profile['name']} (簇{cluster_id})</h3>
        <p><strong>样本数:</strong> {profile['size']} ({profile['percentage']:.2f}%)</p>
        <p><strong>描述:</strong> {profile['description']}</p>
        <p><strong>主要区分特征:</strong></p>
        {key_features_html}
    </div>
"""

        if metrics:
            html += """
    <h2>📈 质量指标</h2>
    <table>
        <thead>
            <tr>
                <th>指标</th>
                <th>数值</th>
                <th>说明</th>
            </tr>
        </thead>
        <tbody>
"""
            if metrics.get("overall_silhouette_score") is not None:
                html += f"""
            <tr>
                <td>整体轮廓系数</td>
                <td>{metrics['overall_silhouette_score']:.4f}</td>
                <td>越高越好，>0.5表示聚类效果较好</td>
            </tr>
"""
            if metrics.get("calinski_harabasz_score") is not None:
                html += f"""
            <tr>
                <td>CH指数</td>
                <td>{metrics['calinski_harabasz_score']:.4f}</td>
                <td>越高越好，簇间差异越大</td>
            </tr>
"""
            if metrics.get("davies_bouldin_score") is not None:
                html += f"""
            <tr>
                <td>DB指数</td>
                <td>{metrics['davies_bouldin_score']:.4f}</td>
                <td>越低越好，<1表示聚类效果较好</td>
            </tr>
"""
            html += f"""
            <tr>
                <td>整体质量评估</td>
                <td class="{quality_class}">{metrics.get('quality_assessment', 'unknown')}</td>
                <td>excellent/good/fair/poor/bad</td>
            </tr>
"""
            html += """
        </tbody>
    </table>
"""

        if include_sample_details and interpretation.get("sample_interpretations_count", 0) > 0:
            html += """
    <h2>🔍 样本解释示例</h2>
    <table>
        <thead>
            <tr>
                <th>原始行号</th>
                <th>所在簇</th>
                <th>轮廓系数</th>
                <th>主要贡献特征</th>
            </tr>
        </thead>
        <tbody>
"""
            for sample in interpretation.get("sample_interpretations", [])[:10]:
                top_feats = ", ".join(
                    [f"{f['feature']}({f['distance_to_center']:.3f})" for f in sample["top_contributing_features"][:3]]
                )
                silhouette_display = f"{sample['silhouette_score']:.4f}" if sample["silhouette_score"] is not None else "N/A"
                html += f"""
            <tr>
                <td>{sample.get('original_row', 'N/A')}</td>
                <td>簇{sample['cluster_id']}</td>
                <td>{silhouette_display}</td>
                <td>{top_feats}</td>
            </tr>
"""
            html += """
        </tbody>
    </table>
"""

        if summary["total_corrections"] > 0:
            html += f"""
    <div class="alert alert-success">
        <strong>✓ 数据修正:</strong> 本次分析共进行了 {summary['total_corrections']} 处数据修正，详见修正记录。
    </div>
"""

        if include_audit_trail:
            html += f"""
    <h2>📋 审计追踪摘要</h2>
    <p>本次会话共记录 {report_data['audit_trail']['summary']['total_entries']} 条审计记录。</p>
    <ul>
        <li>信息: {report_data['audit_trail']['summary']['warning_count'] + report_data['audit_trail']['summary']['error_count'] + report_data['audit_trail']['summary']['correction_count']} 条</li>
        <li>警告: {report_data['audit_trail']['summary']['warning_count']} 条</li>
        <li>错误: {report_data['audit_trail']['summary']['error_count']} 条</li>
        <li>修正: {report_data['audit_trail']['summary']['correction_count']} 条</li>
    </ul>
"""

        html += f"""
    <div class="metadata">
        <p>报告生成时间: {report_data['report_info']['generated_at']}</p>
        <p>数据源: {report_data['report_info']['data_source']} {f'(工作表: {report_data["report_info"]["sheet_name"]})' if report_data['report_info'].get('sheet_name') else ''}</p>
        <p>会话ID: {report_data['report_info']['session_id']}</p>
        <p>工具版本: {report_data['report_info']['version']}</p>
    </div>
</div>
</body>
</html>
"""

        return html

    def _export_json(
        self,
        output_path: str,
        include_audit_trail: bool,
        include_raw_data: bool,
    ) -> str:
        """导出JSON格式报告"""
        if not output_path.endswith(".json"):
            output_path += ".json"

        report_data = self._collect_report_data()

        if not include_audit_trail:
            report_data.pop("audit_trail", None)

        if include_raw_data:
            report_data["raw_data"] = self.data_source.df.to_dict(orient="records")

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False, default=str)

        return output_path

    def _export_markdown(
        self,
        output_path: str,
        include_audit_trail: bool,
        include_sample_details: bool,
    ) -> str:
        """导出Markdown格式报告"""
        if not output_path.endswith(".md"):
            output_path += ".md"

        report_data = self._collect_report_data()
        summary = report_data["summary"]
        interpretation = report_data.get("interpretation", {})
        metrics = report_data.get("metrics", {})

        md = "# KMeans分群审计报告\n\n"

        md += "## 摘要信息\n\n"
        silhouette_display = f"{summary['silhouette_score']:.4f}" if summary["silhouette_score"] is not None else "N/A"
        md += f"- **总样本数**: {summary['total_samples']}\n"
        md += f"- **特征列**: {', '.join(summary['feature_columns'])}\n"
        md += f"- **聚类数**: {summary['n_clusters']}\n"
        md += f"- **标准化方法**: {summary['scaling_method']}\n"
        md += f"- **整体质量**: {summary['overall_quality']}\n"
        md += f"- **轮廓系数**: {silhouette_display}\n"
        md += f"- **错误数**: {summary['total_errors']}\n"
        md += f"- **警告数**: {summary['total_warnings']}\n"
        md += f"- **修正数**: {summary['total_corrections']}\n\n"

        if summary["total_errors"] > 0 or summary["total_warnings"] > 0:
            md += "## 问题汇总\n\n"
            if summary["total_errors"] > 0:
                md += "### 错误\n\n"
                for error in summary["errors"][:10]:
                    loc = f" ({error['location']})" if error.get("location") else ""
                    md += f"- ❌ {error['message']}{loc}\n"
                md += "\n"
            if summary["total_warnings"] > 0:
                md += "### 警告\n\n"
                for warning in summary["warnings"][:10]:
                    loc = f" ({warning['location']})" if warning.get("location") else ""
                    md += f"- ⚠️ {warning['message']}{loc}\n"
                md += "\n"

        if interpretation.get("feature_importance_ranked"):
            md += "## 特征重要性\n\n"
            md += "| 排名 | 特征 | 重要性 |\n"
            md += "|------|------|--------|\n"
            for item in interpretation["feature_importance_ranked"]:
                md += f"| {item['rank']} | {item['feature']} | {item['importance']:.4f} |\n"
            md += "\n"

        if interpretation.get("cluster_profiles"):
            md += "## 簇画像\n\n"
            for cluster_id, profile in sorted(interpretation["cluster_profiles"].items()):
                md += f"### {profile['name']} (簇{cluster_id})\n\n"
                md += f"- **样本数**: {profile['size']} ({profile['percentage']:.2f}%)\n"
                md += f"- **描述**: {profile['description']}\n"
                md += "- **主要特征**:\n"
                for feat in profile["key_features"][:5]:
                    direction = "⬆️ 高" if feat["direction"] == "high" else "⬇️ 低"
                    md += f"  - {direction} **{feat['feature']}**: z={feat['z_score']:.2f}, 簇均值={feat['cluster_mean']:.2f}, 总体均值={feat['overall_mean']:.2f}\n"
                md += "\n"

        if metrics:
            md += "## 质量指标\n\n"
            md += "| 指标 | 数值 | 说明 |\n"
            md += "|------|------|------|\n"
            if metrics.get("overall_silhouette_score") is not None:
                md += f"| 整体轮廓系数 | {metrics['overall_silhouette_score']:.4f} | 越高越好，>0.5较好 |\n"
            if metrics.get("calinski_harabasz_score") is not None:
                md += f"| CH指数 | {metrics['calinski_harabasz_score']:.4f} | 越高越好 |\n"
            if metrics.get("davies_bouldin_score") is not None:
                md += f"| DB指数 | {metrics['davies_bouldin_score']:.4f} | 越低越好，<1较好 |\n"
            md += f"| 整体质量评估 | {metrics.get('quality_assessment', 'unknown')} | excellent/good/fair/poor/bad |\n"
            md += "\n"

        if include_audit_trail:
            md += "## 审计追踪\n\n"
            md += self.audit_trail.export_markdown()

        md += "\n---\n\n"
        md += f"*报告生成时间: {report_data['report_info']['generated_at']}*\n"
        md += f"*数据源: {report_data['report_info']['data_source']}*\n"
        md += f"*会话ID: {report_data['report_info']['session_id']}*\n"

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(md)

        return output_path
