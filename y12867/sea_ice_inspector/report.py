import os
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path
import logging

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.font_manager import FontProperties

from .models import ProcessingBatch, DataStatus, ExceptionType
from config import REPORT_DIR, ICE_THICKNESS_THRESHOLD

logger = logging.getLogger(__name__)


class ReportGenerator:
    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or REPORT_DIR
        self.output_dir.mkdir(exist_ok=True)
        self._setup_chinese_font()

    def _setup_chinese_font(self):
        font_paths = [
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        ]
        self.chinese_font = None
        for fp in font_paths:
            if os.path.exists(fp):
                try:
                    self.chinese_font = FontProperties(fname=fp)
                    plt.rcParams["font.family"] = self.chinese_font.get_name()
                    break
                except Exception:
                    continue
        if self.chinese_font is None:
            plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False

    def generate_plain_text_summary(self, batch: ProcessingBatch) -> str:
        avg_thickness = self._calc_average_thickness(batch)
        max_thickness = self._calc_max_thickness(batch)
        min_thickness = self._calc_min_thickness(batch)
        above_threshold = self._count_above_threshold(batch)
        violation_count = sum(1 for r in batch.records if r.is_no_sail_violation)

        lines = []
        lines.append("=" * 60)
        lines.append("           海冰厚度巡检报告")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"报告编号: {batch.batch_id}")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"巡检批次: {batch.batch_id}")
        lines.append("")

        lines.append("一、整体概览")
        lines.append("-" * 40)
        lines.append(f"  浮标总数: {batch.total_count} 个")
        lines.append(f"  处理完成: {batch.processed_count} 个")
        lines.append(f"  部分完成: {batch.partial_count} 个")
        lines.append(f"  处理失败: {batch.failed_count} 个")
        lines.append(f"  数据缺口: {batch.gaps_count} 处")
        lines.append("")

        lines.append("二、冰厚统计")
        lines.append("-" * 40)
        lines.append(f"  平均厚度: {avg_thickness:.2f} cm")
        lines.append(f"  最大厚度: {max_thickness:.2f} cm")
        lines.append(f"  最小厚度: {min_thickness:.2f} cm")
        lines.append(f"  超过 {ICE_THICKNESS_THRESHOLD}cm 阈值: {above_threshold} 个")
        lines.append("")

        lines.append("三、异常情况")
        lines.append("-" * 40)
        lines.append(f"  禁航区越界: {violation_count} 处")
        lines.append(f"  数据缺失项: {batch.gaps_count} 项")
        lines.append("")

        for ex_type in ExceptionType:
            count = sum(
                1 for r in batch.records
                for t in r.exception_traces
                if t.exception_type == ex_type
            )
            if count > 0:
                label = self._get_exception_label(ex_type)
                lines.append(f"  {label}: {count} 处")
        lines.append("")

        lines.append("四、普通话解释（可直接转发同事）")
        lines.append("-" * 40)
        lines.append("")
        lines.append(self._generate_plain_explanation(batch))
        lines.append("")

        lines.append("五、数据明细（前10条）")
        lines.append("-" * 40)
        lines.append(
            f"  {'浮标ID':<12} {'厚度(cm)':<10} {'状态':<10} {'有照片':<6} {'异常':<6}"
        )
        for record in batch.records[:10]:
            has_photo = "是" if record.inspection_photo else "否"
            has_exception = "是" if record.exception_traces else "否"
            thickness = f"{record.final_ice_thickness:.1f}" if record.final_ice_thickness else "N/A"
            lines.append(
                f"  {record.buoy_id:<12} {thickness:<10} {record.status.value:<10} {has_photo:<6} {has_exception:<6}"
            )
        if len(batch.records) > 10:
            lines.append(f"  ... 还有 {len(batch.records) - 10} 条记录")
        lines.append("")

        lines.append("六、复核入口")
        lines.append("-" * 40)
        pending_items = self._count_pending_review(batch)
        lines.append(f"  待复核项: {pending_items} 项")
        lines.append("  使用 'review' 命令可进入复核模式")
        lines.append("  使用 'trace <异常ID>' 可追溯单条异常")
        lines.append("")

        lines.append("=" * 60)
        return "\n".join(lines)

    def _generate_plain_explanation(self, batch: ProcessingBatch) -> str:
        avg_thickness = self._calc_average_thickness(batch)
        above_threshold = self._count_above_threshold(batch)
        violation_count = sum(1 for r in batch.records if r.is_no_sail_violation)
        missing_photos = sum(
            1 for r in batch.records
            if not r.inspection_photo
        )

        explanation = []
        explanation.append(
            f"各位好，这一批海冰巡检一共看了 {batch.total_count} 个浮测点。"
        )
        explanation.append(
            f"平均冰厚大概 {avg_thickness:.1f} 厘米，其中有 {above_threshold} 个点"
            f"超过了 {ICE_THICKNESS_THRESHOLD} 厘米的警戒值，需要重点关注。"
        )

        if missing_photos > 0:
            explanation.append(
                f"有 {missing_photos} 个浮标的现场照片还没传上来，"
                f"我们先把能算的都算了，照片缺口已经列给科研助理去补，"
                f"补完之后数据会自动更新，不用重新导一遍。"
            )

        if violation_count > 0:
            explanation.append(
                f"另外有 {violation_count} 个点落在禁航区里面，"
                f"这部分数据已经单独标记出来，海事处的同事可以重点核对，"
                f"有问题直接在系统里留复核意见就行。"
            )

        if batch.failed_count > 0:
            explanation.append(
                f"还有 {batch.failed_count} 个浮标数据读取出了点问题，"
                f"已经记在异常清单里，等排查清楚再补上。"
            )

        explanation.append(
            "所有的图、明细表和下载文件用的都是同一批算出来的数据，"
            "潮汐校正和复核备注也都挂在同一条记录上，不会出现表里不一的情况。"
        )
        explanation.append(
            "如果哪条数据看着不对，顺着异常号往回查，"
            "能看到原始浮标数据和当时的处理意见，溯源是通的。"
        )

        return "".join(explanation)

    def generate_thickness_chart(self, batch: ProcessingBatch, filename: str = "thickness_chart.png") -> str:
        records = [r for r in batch.records if r.final_ice_thickness is not None]
        if not records:
            logger.warning("没有可用于绘图的数据")
            return ""

        records_sorted = sorted(records, key=lambda r: r.buoy_data.timestamp)

        fig, ax = plt.subplots(figsize=(12, 6))

        timestamps = [r.buoy_data.timestamp for r in records_sorted]
        thicknesses = [r.final_ice_thickness for r in records_sorted]

        colors = []
        for r in records_sorted:
            if r.is_no_sail_violation:
                colors.append("#e74c3c")
            elif r.exception_traces:
                colors.append("#f39c12")
            else:
                colors.append("#3498db")

        ax.scatter(timestamps, thicknesses, c=colors, s=60, alpha=0.8, zorder=5)

        ax.axhline(
            y=ICE_THICKNESS_THRESHOLD,
            color="#e74c3c",
            linestyle="--",
            linewidth=1.5,
            label=f"阈值 ({ICE_THICKNESS_THRESHOLD}cm)",
        )

        ax.set_xlabel("时间", fontproperties=self.chinese_font, fontsize=12)
        ax.set_ylabel("海冰厚度 (cm)", fontproperties=self.chinese_font, fontsize=12)
        ax.set_title("海冰厚度巡检图", fontproperties=self.chinese_font, fontsize=14, fontweight="bold")
        ax.legend(prop=self.chinese_font)

        ax.xaxis.set_major_formatter(mdates.DateFormatter("%m-%d %H:%M"))
        fig.autofmt_xdate()

        legend_elements = [
            plt.scatter([], [], c="#3498db", s=60, label="正常"),
            plt.scatter([], [], c="#f39c12", s=60, label="有异常"),
            plt.scatter([], [], c="#e74c3c", s=60, label="禁航区越界"),
        ]
        ax.legend(
            handles=legend_elements,
            prop=self.chinese_font,
            loc="upper right",
        )

        ax.grid(True, alpha=0.3)
        plt.tight_layout()

        output_path = self.output_dir / filename
        fig.savefig(output_path, dpi=150, bbox_inches="tight")
        plt.close(fig)

        logger.info(f"厚度图已生成: {output_path}")
        return str(output_path)

    def generate_spatial_chart(self, batch: ProcessingBatch, filename: str = "spatial_chart.png") -> str:
        records = [r for r in batch.records if r.final_ice_thickness is not None]
        if not records:
            logger.warning("没有可用于绘图的数据")
            return ""

        fig, ax = plt.subplots(figsize=(10, 8))

        lons = [r.buoy_data.longitude for r in records]
        lats = [r.buoy_data.latitude for r in records]
        sizes = [max(20, r.final_ice_thickness * 2) for r in records]

        colors = []
        for r in records:
            if r.is_no_sail_violation:
                colors.append("#e74c3c")
            elif r.final_ice_thickness > ICE_THICKNESS_THRESHOLD:
                colors.append("#e67e22")
            else:
                colors.append("#27ae60")

        scatter = ax.scatter(lons, lats, s=sizes, c=colors, alpha=0.7, edgecolors="white", linewidths=0.5)

        ax.set_xlabel("经度", fontproperties=self.chinese_font, fontsize=12)
        ax.set_ylabel("纬度", fontproperties=self.chinese_font, fontsize=12)
        ax.set_title("海冰厚度空间分布图", fontproperties=self.chinese_font, fontsize=14, fontweight="bold")
        ax.grid(True, alpha=0.3)

        legend_elements = [
            plt.scatter([], [], c="#27ae60", s=60, label="正常厚度"),
            plt.scatter([], [], c="#e67e22", s=60, label="超过阈值"),
            plt.scatter([], [], c="#e74c3c", s=60, label="禁航区越界"),
        ]
        ax.legend(handles=legend_elements, prop=self.chinese_font, loc="lower right")

        for r in records:
            ax.annotate(
                r.buoy_id,
                (r.buoy_data.longitude, r.buoy_data.latitude),
                fontsize=8,
                alpha=0.7,
            )

        plt.tight_layout()
        output_path = self.output_dir / filename
        fig.savefig(output_path, dpi=150, bbox_inches="tight")
        plt.close(fig)

        logger.info(f"空间分布图已生成: {output_path}")
        return str(output_path)

    def generate_excel_report(self, batch: ProcessingBatch, filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"海冰巡检报告_{batch.batch_id}.xlsx"

        output_path = self.output_dir / filename

        summary_data = {
            "指标": [
                "报告编号",
                "生成时间",
                "浮标总数",
                "处理完成",
                "部分完成",
                "处理失败",
                "数据缺口",
                "平均厚度(cm)",
                "最大厚度(cm)",
                "最小厚度(cm)",
                "超过阈值数量",
                "禁航区越界数",
            ],
            "数值": [
                batch.batch_id,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                batch.total_count,
                batch.processed_count,
                batch.partial_count,
                batch.failed_count,
                batch.gaps_count,
                round(self._calc_average_thickness(batch), 2),
                round(self._calc_max_thickness(batch), 2),
                round(self._calc_min_thickness(batch), 2),
                self._count_above_threshold(batch),
                sum(1 for r in batch.records if r.is_no_sail_violation),
            ],
        }

        detail_data = []
        for record in batch.records:
            detail_data.append({
                "记录ID": record.record_id,
                "浮标ID": record.buoy_id,
                "时间": record.buoy_data.timestamp.isoformat(),
                "纬度": record.buoy_data.latitude,
                "经度": record.buoy_data.longitude,
                "原始厚度(cm)": record.buoy_data.ice_thickness,
                "潮汐校正厚度(cm)": (
                    record.tide_calculation.tide_corrected_thickness
                    if record.tide_calculation
                    else None
                ),
                "最终厚度(cm)": record.final_ice_thickness,
                "当前潮位(m)": (
                    record.tide_calculation.current_tide
                    if record.tide_calculation
                    else None
                ),
                "状态": record.status.value,
                "有巡检照片": "是" if record.inspection_photo else "否",
                "是否异常": "是" if record.exception_traces else "否",
                "禁航区越界": "是" if record.is_no_sail_violation else "否",
                "禁航区名称": record.no_sail_zone or "",
                "异常数量": len(record.exception_traces),
                "数据缺口数": len(record.data_gaps),
                "复核备注数": len(record.review_notes),
                "原始数据来源": record.buoy_data.raw_source,
            })

        exception_data = []
        for record in batch.records:
            for trace in record.exception_traces:
                exception_data.append({
                    "异常ID": trace.trace_id,
                    "记录ID": record.record_id,
                    "浮标ID": record.buoy_id,
                    "异常类型": self._get_exception_label(trace.exception_type),
                    "描述": trace.description,
                    "处理意见": trace.processing_opinion,
                    "检测时间": trace.detected_time.isoformat(),
                    "是否已复核": "是" if trace.reviewed else "否",
                    "复核意见": trace.reviewer_note or "",
                    "原始数据引用": trace.original_buoy_data_ref,
                })

        gap_data = []
        for record in batch.records:
            for gap in record.data_gaps:
                gap_data.append({
                    "缺口ID": gap.gap_id,
                    "记录ID": record.record_id,
                    "浮标ID": gap.buoy_id,
                    "缺口类型": self._get_exception_label(gap.gap_type),
                    "描述": gap.description,
                    "负责人": gap.reported_to,
                    "上报时间": gap.reported_time.isoformat(),
                    "是否解决": "是" if gap.resolved else "否",
                    "解决时间": gap.resolved_time.isoformat() if gap.resolved_time else "",
                })

        review_data = []
        for record in batch.records:
            for note in record.review_notes:
                review_data.append({
                    "备注ID": note.note_id,
                    "记录ID": record.record_id,
                    "浮标ID": record.buoy_id,
                    "复核人": note.reviewer,
                    "复核时间": note.review_time.isoformat(),
                    "内容": note.content,
                    "是否异常备注": "是" if note.is_exception else "否",
                    "异常类型": note.exception_type.value if note.exception_type else "",
                    "解决方案": note.resolution or "",
                })

        explanation_df = pd.DataFrame({
            "内容": [self._generate_plain_explanation(batch)]
        })

        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            pd.DataFrame(summary_data).to_excel(writer, sheet_name="概览", index=False)
            pd.DataFrame(detail_data).to_excel(writer, sheet_name="数据明细", index=False)
            pd.DataFrame(exception_data).to_excel(writer, sheet_name="异常清单", index=False)
            pd.DataFrame(gap_data).to_excel(writer, sheet_name="数据缺口", index=False)
            pd.DataFrame(review_data).to_excel(writer, sheet_name="复核记录", index=False)
            explanation_df.to_excel(writer, sheet_name="普通话说明", index=False)

        logger.info(f"Excel报告已生成: {output_path}")
        return str(output_path)

    def generate_full_report(
        self,
        batch: ProcessingBatch,
        include_charts: bool = True,
        include_excel: bool = True,
    ) -> Dict[str, str]:
        results = {}

        text_report = self.generate_plain_text_summary(batch)
        text_path = self.output_dir / f"巡检报告_{batch.batch_id}.txt"
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(text_report)
        results["text"] = str(text_path)

        if include_charts:
            results["thickness_chart"] = self.generate_thickness_chart(batch)
            results["spatial_chart"] = self.generate_spatial_chart(batch)

        if include_excel:
            results["excel"] = self.generate_excel_report(batch)

        logger.info(f"完整报告已生成: {len(results)} 个文件")
        return results

    def _calc_average_thickness(self, batch: ProcessingBatch) -> float:
        values = [r.final_ice_thickness for r in batch.records if r.final_ice_thickness is not None]
        return sum(values) / len(values) if values else 0.0

    def _calc_max_thickness(self, batch: ProcessingBatch) -> float:
        values = [r.final_ice_thickness for r in batch.records if r.final_ice_thickness is not None]
        return max(values) if values else 0.0

    def _calc_min_thickness(self, batch: ProcessingBatch) -> float:
        values = [r.final_ice_thickness for r in batch.records if r.final_ice_thickness is not None]
        return min(values) if values else 0.0

    def _count_above_threshold(self, batch: ProcessingBatch) -> int:
        return sum(
            1 for r in batch.records
            if r.final_ice_thickness and r.final_ice_thickness > ICE_THICKNESS_THRESHOLD
        )

    def _count_pending_review(self, batch: ProcessingBatch) -> int:
        count = 0
        for record in batch.records:
            count += sum(1 for t in record.exception_traces if not t.reviewed)
            count += sum(1 for g in record.data_gaps if not g.resolved)
        return count

    def _get_exception_label(self, ex_type: ExceptionType) -> str:
        labels = {
            ExceptionType.MISSING_PHOTO: "巡检照片缺失",
            ExceptionType.NO_SAIL_ZONE_VIOLATION: "禁航区越界",
            ExceptionType.ABNORMAL_THICKNESS: "冰厚异常",
            ExceptionType.TIDE_ANOMALY: "潮汐异常",
            ExceptionType.DATA_GAP: "数据缺口",
        }
        return labels.get(ex_type, ex_type.value)
