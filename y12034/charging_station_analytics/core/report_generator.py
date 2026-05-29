"""
报表生成模块
核心功能：
1. 生成Excel完整报告（多Sheet）
2. 生成各类图表
3. 确保异常说明、图表、导出结果一致
4. 坏行、离线数据单独Sheet
"""
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from io import BytesIO

from ..config.settings import get_config, OUTPUT_DIR
from .pipeline import AnalysisResult
from .data_tracer import DataTracer


class ReportGenerator:
    """报表生成器"""

    def __init__(self):
        self.config = get_config()
        self.tracer = DataTracer()
        self.period_colors = {
            "尖峰": "#FF4D4F",
            "高峰": "#FA8C16",
            "平段": "#52C41A",
            "低谷": "#1890FF",
        }
        self._setup_chinese_font()

    def _set_column_width(self, worksheet, col_spec, width):
        """设置列宽，支持数字索引和字母范围两种格式"""
        if isinstance(col_spec, int):
            from openpyxl.utils import get_column_letter
            col_letter = get_column_letter(col_spec + 1)
            worksheet.column_dimensions[col_letter].width = width
        elif isinstance(col_spec, str) and ":" in col_spec:
            start, end = col_spec.split(":")
            from openpyxl.utils import column_index_from_string, get_column_letter
            start_idx = column_index_from_string(start)
            end_idx = column_index_from_string(end)
            for i in range(start_idx, end_idx + 1):
                col_letter = get_column_letter(i)
                worksheet.column_dimensions[col_letter].width = width
        elif isinstance(col_spec, str):
            worksheet.column_dimensions[col_spec].width = width

    def _setup_chinese_font(self):
        """设置中文字体"""
        font_names = ["PingFang SC", "Heiti SC", "Microsoft YaHei", "SimHei", "Arial Unicode MS"]
        for font_name in font_names:
            try:
                font_path = fm.findfont(fm.FontProperties(family=font_name))
                if font_path:
                    plt.rcParams["font.sans-serif"] = [font_name]
                    plt.rcParams["axes.unicode_minus"] = False
                    break
            except:
                continue
        plt.rcParams["figure.dpi"] = 150

    def _create_revenue_pie_chart(self, result: AnalysisResult) -> BytesIO:
        """创建收益构成饼图"""
        summary = result.summary
        revenue_data = summary["revenue"]
        labels = ["电费", "服务费", "优惠抵扣"]
        values = [
            revenue_data["total_electricity_fee"],
            revenue_data["total_service_fee"],
            revenue_data["total_coupon_discount"],
        ]
        colors = ["#1890FF", "#52C41A", "#FF4D4F"]

        fig, ax = plt.subplots(figsize=(8, 6))
        wedges, texts, autotexts = ax.pie(
            values,
            labels=labels,
            colors=colors,
            autopct="%1.1f%%",
            startangle=90,
        )
        ax.set_title("收益构成分析", fontsize=14, fontweight="bold")
        for text in texts:
            text.set_fontsize(11)
        for autotext in autotexts:
            autotext.set_fontsize(10)
            autotext.set_color("white")
            autotext.set_fontweight("bold")

        buf = BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig)
        buf.seek(0)
        return buf

    def _create_period_energy_chart(self, result: AnalysisResult) -> BytesIO:
        """创建时段电量分布图"""
        period_data = result.summary["period_distribution"]["energy"]
        labels = ["尖峰", "高峰", "平段", "低谷"]
        values = [
            period_data.get("peak", 0),
            period_data.get("high", 0),
            period_data.get("flat", 0),
            period_data.get("valley", 0),
        ]
        colors = [self.period_colors[label] for label in labels]

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        ax1.bar(labels, values, color=colors, alpha=0.8)
        ax1.set_title("各时段充电量分布", fontsize=12, fontweight="bold")
        ax1.set_ylabel("充电量（度）", fontsize=10)
        for i, v in enumerate(values):
            ax1.text(i, v + max(values) * 0.01, f"{v:.2f}", ha="center", fontsize=9)

        ax2.pie(
            values,
            labels=labels,
            colors=colors,
            autopct="%1.1f%%",
            startangle=90,
        )
        ax2.set_title("各时段充电量占比", fontsize=12, fontweight="bold")

        plt.tight_layout()
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig)
        buf.seek(0)
        return buf

    def _create_period_revenue_chart(self, result: AnalysisResult) -> BytesIO:
        """创建时段收益对比图"""
        period_energy = result.summary["period_distribution"]["energy"]
        period_fee = result.summary["period_distribution"]["electricity_fee"]
        period_service = result.summary["period_distribution"]["service_fee"]

        labels = ["尖峰", "高峰", "平段", "低谷"]
        x = np.arange(len(labels))
        width = 0.25

        fig, ax = plt.subplots(figsize=(10, 6))
        rects1 = ax.bar(x - width, [period_energy.get(k, 0) for k in ["peak", "high", "flat", "valley"]],
                        width, label="充电量(度)", color="#1890FF", alpha=0.8)
        rects2 = ax.bar(x, [period_fee.get(k, 0) for k in ["peak", "high", "flat", "valley"]],
                        width, label="电费(元)", color="#52C41A", alpha=0.8)
        rects3 = ax.bar(x + width, [period_service.get(k, 0) for k in ["peak", "high", "flat", "valley"]],
                        width, label="服务费(元)", color="#FA8C16", alpha=0.8)

        ax.set_title("各时段电量与收益对比", fontsize=14, fontweight="bold")
        ax.set_xticks(x)
        ax.set_xticklabels(labels)
        ax.legend()
        ax.grid(axis="y", alpha=0.3)

        for rects in [rects1, rects2, rects3]:
            for rect in rects:
                height = rect.get_height()
                if height > 0:
                    ax.text(rect.get_x() + rect.get_width() / 2., height,
                            f"{height:.1f}", ha="center", va="bottom", fontsize=8)

        plt.tight_layout()
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig)
        buf.seek(0)
        return buf

    def _create_anomaly_chart(self, result: AnalysisResult) -> BytesIO:
        """创建异常分布图"""
        anomaly_data = result.summary["anomalies"]["anomaly_type_distribution"]
        labels = list(anomaly_data.keys())
        values = list(anomaly_data.values())

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        colors = ["#FF4D4F" if "离线" in l or "故障" in l else "#FA8C16" for l in labels]
        bars = ax1.barh(labels, values, color=colors, alpha=0.8)
        ax1.set_title("异常类型分布", fontsize=12, fontweight="bold")
        ax1.set_xlabel("数量")
        for bar, v in zip(bars, values):
            ax1.text(v, bar.get_y() + bar.get_height() / 2, f" {v}", va="center", fontsize=9)

        severity_data = result.summary["anomalies"]["severity_distribution"]
        sev_labels = list(severity_data.keys())
        sev_values = list(severity_data.values())
        sev_colors = {"严重": "#FF4D4F", "警告": "#FA8C16", "提示": "#1890FF"}
        ax2.pie(
            sev_values,
            labels=sev_labels,
            colors=[sev_colors.get(l, "#8C8C8C") for l in sev_labels],
            autopct="%1.1f%%",
            startangle=90,
        )
        ax2.set_title("异常严重程度分布", fontsize=12, fontweight="bold")

        plt.tight_layout()
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig)
        buf.seek(0)
        return buf

    def _create_device_status_chart(self, result: AnalysisResult) -> BytesIO:
        """创建设备状态图"""
        device_data = result.summary["device_status"]
        labels = ["正常订单", "离线订单", "故障订单"]
        normal = device_data["normal_orders"]
        offline = device_data["offline_orders"]
        fault = device_data.get("fault_devices_count", 0)

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        values = [normal, offline, fault]
        colors = ["#52C41A", "#FF4D4F", "#FA8C16"]
        bars = ax1.bar(labels, values, color=colors, alpha=0.8)
        ax1.set_title("设备状态统计", fontsize=12, fontweight="bold")
        for bar, v in zip(bars, values):
            ax1.text(bar.get_x() + bar.get_width() / 2, v, f"{v}", ha="center", va="bottom")

        ax2.pie(
            values,
            labels=labels,
            colors=colors,
            autopct="%1.1f%%",
            startangle=90,
        )
        ax2.set_title("设备状态占比", fontsize=12, fontweight="bold")

        plt.tight_layout()
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig)
        buf.seek(0)
        return buf

    def generate_excel_report(
        self,
        result: AnalysisResult,
        output_path: Optional[str] = None
    ) -> str:
        """生成完整Excel报告"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if output_path is None:
            output_path = OUTPUT_DIR / f"充电站分时电价收益分析_{timestamp}.xlsx"
        else:
            output_path = Path(output_path)

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            self._write_summary_sheet(writer, result)
            self._write_normal_results_sheet(writer, result)
            self._write_offline_results_sheet(writer, result)
            self._write_period_detail_sheet(writer, result)
            self._write_cross_period_sheet(writer, result)
            self._write_stacked_coupon_sheet(writer, result)
            self._write_bad_rows_sheet(writer, result)
            self._write_trace_sheet(writer, result)
            self._write_anomalies_sheet(writer, result)
            self._write_charts_sheet(writer, result)
            self._write_data_quality_sheet(writer, result)

        return str(output_path)

    def _write_summary_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入汇总Sheet"""
        summary = result.summary

        summary_data = []
        summary_data.append(["充电站分时电价收益分析报告", ""])
        summary_data.append(["生成时间", result.analysis_time.strftime("%Y-%m-%d %H:%M:%S")])
        summary_data.append(["数据源文件", result.source_file])
        summary_data.append(["", ""])

        summary_data.append(["一、数据质量概览", ""])
        dq = summary["data_quality"]
        summary_data.append(["总数据行数", dq["total_rows"]])
        summary_data.append(["有效数据行数", dq["valid_rows"]])
        summary_data.append(["坏行数量", dq["bad_rows"]])
        summary_data.append(["空行数量", dq["empty_rows"]])
        summary_data.append(["备注行数量", dq["remark_rows"]])
        summary_data.append(["数据质量评分", f"{dq['data_quality_score']:.2f}分"])
        summary_data.append(["", ""])

        summary_data.append(["二、设备状态统计", ""])
        ds = summary["device_status"]
        summary_data.append(["正常订单数", ds["normal_orders"]])
        summary_data.append(["离线订单数", ds["offline_orders"]])
        summary_data.append(["离线设备数", ds["offline_devices_count"]])
        summary_data.append(["故障设备数", ds["fault_devices_count"]])
        summary_data.append(["人工补录订单数", ds["manual_supplement_orders"]])
        summary_data.append(["离线订单占比", f"{ds['offline_ratio']:.2f}%"])
        summary_data.append(["", ""])

        summary_data.append(["三、收益汇总", ""])
        rev = summary["revenue"]
        summary_data.append(["电费总额", f"{rev['total_electricity_fee']:.2f}元"])
        summary_data.append(["服务费总额", f"{rev['total_service_fee']:.2f}元"])
        summary_data.append(["优惠抵扣总额", f"{rev['total_coupon_discount']:.2f}元"])
        summary_data.append(["净收益", f"{rev['net_revenue']:.2f}元"])
        summary_data.append(["", ""])

        summary_data.append(["四、各时段收益分布", ""])
        pd_energy = summary["period_distribution"]["energy"]
        pd_fee = summary["period_distribution"]["electricity_fee"]
        pd_service = summary["period_distribution"]["service_fee"]
        for period, label in [("peak", "尖峰"), ("high", "高峰"), ("flat", "平段"), ("valley", "低谷")]:
            summary_data.append([
                f"{label}时段",
                f"电量:{pd_energy.get(period, 0):.2f}度 | "
                f"电费:{pd_fee.get(period, 0):.2f}元 | "
                f"服务费:{pd_service.get(period, 0):.2f}元"
            ])
        summary_data.append(["", ""])

        summary_data.append(["五、异常统计", ""])
        anom = summary["anomalies"]
        summary_data.append(["异常订单总数", anom["total_anomalies"]])
        summary_data.append(["严重异常", anom["critical_count"]])
        summary_data.append(["警告异常", anom["warning_count"]])
        for anom_type, count in anom["anomaly_type_distribution"].items():
            summary_data.append([anom_type, count])
        summary_data.append(["", ""])

        summary_data.append(["六、需重点复核", ""])
        cp = summary["cross_period"]
        sc = summary["stacked_coupon"]
        summary_data.append(["跨时段充电订单", f"{cp['count']}笔 ({cp['ratio']:.2f}%)"])
        summary_data.append(["优惠叠加订单", f"{sc['count']}笔"])

        df_summary = pd.DataFrame(summary_data)
        df_summary.to_excel(writer, sheet_name="汇总", index=False, header=False)

        worksheet = writer.sheets["汇总"]
        for i in range(1, len(summary_data) + 1):
            worksheet.row_dimensions[i].height = 20
        worksheet.column_dimensions["A"].width = 25
        worksheet.column_dimensions["B"].width = 60

    def _write_normal_results_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入正常结果Sheet"""
        df = result.final_normal_df.copy()

        export_cols = [
            "trace_id", "order_id", "station_name", "device_id", "device_name",
            "start_time", "end_time", "energy", "duration",
            "calculated_electricity_fee", "calculated_service_fee",
            "original_coupon_amount", "net_revenue",
            "peak_energy", "peak_fee", "peak_service_fee", "peak_coupon",
            "high_energy", "high_fee", "high_service_fee", "high_coupon",
            "flat_energy", "flat_fee", "flat_service_fee", "flat_coupon",
            "valley_energy", "valley_fee", "valley_service_fee", "valley_coupon",
            "is_cross_period", "crossed_periods", "is_coupon_stacked",
            "normalized_device_status", "is_manual_supplement",
            "anomaly_count", "anomaly_types", "max_severity", "needs_review",
            "review_reason", "_original_row_number"
        ]

        available_cols = [c for c in export_cols if c in df.columns]
        df_export = df[available_cols].copy()

        for col in ["start_time", "end_time"]:
            if col in df_export.columns:
                df_export[col] = pd.to_datetime(df_export[col]).dt.strftime("%Y-%m-%d %H:%M:%S")

        df_export.to_excel(writer, sheet_name="正常订单明细", index=False)
        worksheet = writer.sheets["正常订单明细"]
        worksheet.freeze_panes = "A2"
        for idx, col in enumerate(df_export.columns):
            max_len = max(df_export[col].astype(str).map(len).max(), len(str(col))) + 2
            self._set_column_width(worksheet, idx, min(max_len, 30))

    def _write_offline_results_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入离线数据Sheet（单独隔离）"""
        df = result.final_offline_df.copy()

        if not df.empty:
            export_cols = [
                "trace_id", "order_id", "station_name", "device_id", "device_name",
                "start_time", "end_time", "energy", "duration", "total_amount",
                "device_status", "normalized_device_status", "remark",
                "calculated_electricity_fee", "calculated_service_fee",
                "original_coupon_amount",
                "is_manual_supplement", "needs_review", "review_reason",
                "_original_row_number"
            ]

            available_cols = [c for c in export_cols if c in df.columns]
            df_export = df[available_cols].copy()

            for col in ["start_time", "end_time"]:
                if col in df_export.columns:
                    df_export[col] = pd.to_datetime(df_export[col]).dt.strftime("%Y-%m-%d %H:%M:%S")

            df_export.to_excel(writer, sheet_name="⚠️ 设备离线（单独处理）", index=False)
            worksheet = writer.sheets["⚠️ 设备离线（单独处理）"]
            worksheet.freeze_panes = "A2"
            for idx, col in enumerate(df_export.columns):
                max_len = max(df_export[col].astype(str).map(len).max(), len(str(col))) + 2
                self._set_column_width(worksheet, idx, min(max_len, 30))
        else:
            pd.DataFrame({"说明": ["无设备离线数据"]}).to_excel(
                writer, sheet_name="⚠️ 设备离线（单独处理）", index=False
            )

    def _write_period_detail_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入时段明细Sheet"""
        details = []
        for tariff_result in result.tariff_result.results:
            for seg in tariff_result.segments:
                details.append({
                    "order_id": tariff_result.order_id,
                    "时段类型": seg.period_name,
                    "时段开始": seg.start_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "时段结束": seg.end_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "时长(分钟)": seg.duration_minutes,
                    "充电量(度)": seg.energy,
                    "电价(元/度)": seg.price,
                    "电费(元)": seg.electricity_fee,
                    "原始行号": tariff_result.original_row_number,
                })

        if details:
            df = pd.DataFrame(details)
            df.to_excel(writer, sheet_name="分时计费明细", index=False)
            worksheet = writer.sheets["分时计费明细"]
            worksheet.freeze_panes = "A2"
            for idx, col in enumerate(df.columns):
                max_len = max(df[col].astype(str).map(len).max(), len(str(col))) + 2
                self._set_column_width(worksheet, idx, min(max_len, 25))

    def _write_cross_period_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入跨时段充电Sheet"""
        df = result.anomaly_result.cross_period_filter.copy()
        if not df.empty:
            export_cols = [
                "trace_id", "order_id", "station_name", "device_id",
                "start_time", "end_time", "energy", "crossed_periods",
                "peak_energy", "high_energy", "flat_energy", "valley_energy",
                "_original_row_number"
            ]
            available_cols = [c for c in export_cols if c in df.columns]
            df_export = df[available_cols].copy()

            for col in ["start_time", "end_time"]:
                if col in df_export.columns:
                    df_export[col] = pd.to_datetime(df_export[col]).dt.strftime("%Y-%m-%d %H:%M:%S")

            df_export.to_excel(writer, sheet_name="🔍 跨时段充电（需复核）", index=False)
            worksheet = writer.sheets["🔍 跨时段充电（需复核）"]
            worksheet.freeze_panes = "A2"
            for idx, col in enumerate(df_export.columns):
                max_len = max(df_export[col].astype(str).map(len).max(), len(str(col))) + 2
                self._set_column_width(worksheet, idx, min(max_len, 25))
        else:
            pd.DataFrame({"说明": ["无跨时段充电数据"]}).to_excel(
                writer, sheet_name="🔍 跨时段充电（需复核）", index=False
            )

    def _write_stacked_coupon_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入优惠叠加Sheet"""
        df = result.anomaly_result.stacked_coupon_filter.copy()
        if not df.empty:
            export_cols = [
                "trace_id", "order_id", "station_name", "device_id",
                "start_time", "energy", "original_coupon_amount", "coupon_type",
                "coupon_stack_count", "electricity_coupon", "service_coupon",
                "_original_row_number"
            ]
            available_cols = [c for c in export_cols if c in df.columns]
            df_export = df[available_cols].copy()

            if "start_time" in df_export.columns:
                df_export["start_time"] = pd.to_datetime(df_export["start_time"]).dt.strftime("%Y-%m-%d %H:%M:%S")

            df_export.to_excel(writer, sheet_name="🔍 优惠叠加（需复核）", index=False)
            worksheet = writer.sheets["🔍 优惠叠加（需复核）"]
            worksheet.freeze_panes = "A2"
            for idx, col in enumerate(df_export.columns):
                max_len = max(df_export[col].astype(str).map(len).max(), len(str(col))) + 2
                self._set_column_width(worksheet, idx, min(max_len, 25))
        else:
            pd.DataFrame({"说明": ["无优惠叠加数据"]}).to_excel(
                writer, sheet_name="🔍 优惠叠加（需复核）", index=False
            )

    def _write_bad_rows_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入坏行Sheet"""
        if result.raw_data.bad_rows:
            bad_rows_data = []
            for bad_row in result.raw_data.bad_rows:
                row_data = {
                    "原始行号": bad_row["row_number"],
                    "问题原因": bad_row["reason"],
                    "缺失字段": ",".join(bad_row.get("missing_fields", [])),
                }
                row_data.update({f"原始_{k}": v for k, v in bad_row.get("raw_data", {}).items()})
                bad_rows_data.append(row_data)

            df = pd.DataFrame(bad_rows_data)
            df.to_excel(writer, sheet_name="❌ 坏行记录", index=False)
            worksheet = writer.sheets["❌ 坏行记录"]
            worksheet.freeze_panes = "A2"
        else:
            pd.DataFrame({"说明": ["无坏行数据"]}).to_excel(
                writer, sheet_name="❌ 坏行记录", index=False
            )

    def _write_trace_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入追溯Sheet"""
        trace_data = []
        for trace in result.trace_result.records:
            trace_data.append(self.tracer.trace_to_dict(trace))

        if trace_data:
            df = pd.DataFrame(trace_data)
            df.to_excel(writer, sheet_name="数据追溯链路", index=False)
            worksheet = writer.sheets["数据追溯链路"]
            worksheet.freeze_panes = "A2"
            self._set_column_width(worksheet, "A:A", 20)
            self._set_column_width(worksheet, "B:B", 20)
            self._set_column_width(worksheet, "E:F", 60)

    def _write_anomalies_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入异常明细Sheet"""
        if result.anomaly_result.anomalies:
            anomaly_data = []
            for anomaly in result.anomaly_result.anomalies:
                anomaly_data.append({
                    "异常ID": anomaly.anomaly_id,
                    "订单号": anomaly.order_id,
                    "原始行号": anomaly.original_row_number,
                    "异常类型": anomaly.anomaly_type,
                    "严重程度": anomaly.severity,
                    "异常描述": anomaly.description,
                    "详细信息": str(anomaly.details),
                    "检测时间": anomaly.detected_at.strftime("%Y-%m-%d %H:%M:%S"),
                })

            df = pd.DataFrame(anomaly_data)
            df.to_excel(writer, sheet_name="异常明细", index=False)
            worksheet = writer.sheets["异常明细"]
            worksheet.freeze_panes = "A2"
            for idx, col in enumerate(df.columns):
                max_len = max(df[col].astype(str).map(len).max(), len(str(col))) + 2
                self._set_column_width(worksheet, idx, min(max_len, 35))

    def _write_charts_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入图表Sheet"""
        from openpyxl.drawing.image import Image as XLImage
        from openpyxl.utils import get_column_letter
        from openpyxl.styles import Font

        worksheet = writer.book.create_sheet("📊 分析图表")

        charts = [
            ("收益构成分析", self._create_revenue_pie_chart(result)),
            ("时段电量分布", self._create_period_energy_chart(result)),
            ("时段收益对比", self._create_period_revenue_chart(result)),
            ("异常分布统计", self._create_anomaly_chart(result)),
            ("设备状态统计", self._create_device_status_chart(result)),
        ]

        title_font = Font(bold=True, size=14)
        row = 1
        for title, chart_buf in charts:
            cell = worksheet.cell(row=row, column=1, value=title)
            cell.font = title_font
            row += 1

            img = XLImage(chart_buf)
            img.width = 700
            img.height = 400
            worksheet.add_image(img, f"A{row}")
            row += 28

        self._set_column_width(worksheet, "A:A", 100)

    def _write_data_quality_sheet(self, writer: pd.ExcelWriter, result: AnalysisResult):
        """写入数据质量Sheet"""
        issues = []

        for error in result.cleaned_data.validation_errors:
            issues.append({
                "类型": "验证错误",
                "原始行号": error.get("row_number"),
                "字段": error.get("column"),
                "值": error.get("value"),
                "问题描述": error.get("reason"),
            })

        for error in result.cleaned_data.type_conversion_errors:
            issues.append({
                "类型": "类型转换错误",
                "原始行号": error.get("row_number"),
                "字段": error.get("column"),
                "值": error.get("original_value"),
                "问题描述": error.get("reason"),
            })

        for col, count in result.cleaned_data.filled_missing.items():
            issues.append({
                "类型": "缺失值填充",
                "原始行号": "-",
                "字段": col,
                "值": f"填充{count}条",
                "问题描述": f"使用默认值填充了{count}条缺失数据",
            })

        if result.raw_data.empty_rows:
            issues.append({
                "类型": "空行",
                "原始行号": ",".join(map(str, result.raw_data.empty_rows)),
                "字段": "-",
                "值": "-",
                "问题描述": f"共{len(result.raw_data.empty_rows)}行空行已跳过",
            })

        if result.raw_data.remark_rows:
            issues.append({
                "类型": "备注行",
                "原始行号": ",".join(map(str, result.raw_data.remark_rows)),
                "字段": "-",
                "值": "-",
                "问题描述": f"共{len(result.raw_data.remark_rows)}行备注已跳过",
            })

        if result.raw_data.missing_columns:
            issues.append({
                "类型": "缺失列",
                "原始行号": "-",
                "字段": ",".join(result.raw_data.missing_columns),
                "值": "-",
                "问题描述": "以下必填列缺失，可能影响计算结果",
            })

        if issues:
            df = pd.DataFrame(issues)
            df.to_excel(writer, sheet_name="数据质量报告", index=False)
            worksheet = writer.sheets["数据质量报告"]
            worksheet.freeze_panes = "A2"
            for idx, col in enumerate(df.columns):
                max_len = max(df[col].astype(str).map(len).max(), len(str(col))) + 2
                self._set_column_width(worksheet, idx, min(max_len, 40))
        else:
            pd.DataFrame({"说明": ["数据质量良好，无明显问题"]}).to_excel(
                writer, sheet_name="数据质量报告", index=False
            )
