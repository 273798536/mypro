import os
from typing import Optional, Dict, Any, List
from datetime import datetime
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Patch
import seaborn as sns
import folium
from folium import plugins

from ..tide_engine import TideCalculator
from ..risk_layer import RiskAssessor, RiskLevel
from ..traceability import DataTracker, DataStatus


class TideVisualizer:
    """
    可视化模块

    保证图、表、文字说明三者对得上：
    - 图表生成时使用的数据源与输出表格完全一致
    - 每张图都带有 caption 说明，解释关键结论
    - 异常数据点在图上高亮标注，并与追溯记录中的 record_id 对应
    - 地图标注与风险评估结果一一对应
    """

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        sns.set_style("whitegrid")
        plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False

    def _save_fig(self, fig, name: str, caption: Optional[str] = None) -> str:
        path = os.path.join(self.output_dir, name)
        fig.tight_layout()
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        if caption:
            cap_path = os.path.join(self.output_dir, name.replace(".png", ".txt"))
            with open(cap_path, "w", encoding="utf-8") as f:
                f.write(caption)
        return path

    def plot_tide_curve(
        self,
        tide_calc: TideCalculator,
        filename: str = "tide_curve.png",
    ) -> Dict[str, Any]:
        """
        绘制潮位时间曲线

        图中信息与文字、表格一致：
        - 每个点都标注 record_id 的后三位
        - 异常点（潮位时区错等）用红色空心圆高亮
        - 图例中说明颜色含义
        - caption 中列出异常记录的追溯信息
        """
        df = tide_calc.get_dataframe().copy()
        tracker_df = tide_calc.get_tracker().to_dataframe()

        if df.empty:
            return {"path": "", "caption": "无数据"}

        tracker_cols = ["record_id", "data_status", "data_status_color"]
        tracker_suffix = {c: c for c in tracker_cols}
        df = df.merge(tracker_df[tracker_cols], on="record_id", how="left")
        df["obs_time_local_dt"] = pd.to_datetime(df["obs_time_local"].str.replace(" CST", ""))

        stations = df["station_id"].unique()
        n = len(stations)
        fig, axes = plt.subplots(n, 1, figsize=(14, 3 * max(n, 1)), sharex=True)
        if n == 1:
            axes = [axes]

        for ax, sid in zip(axes, stations):
            sub = df[df["station_id"] == sid].sort_values("obs_time_local_dt")
            station_name = sub["station_name"].iloc[0] if len(sub) > 0 else sid

            ok_mask = sub["data_status"] == "可用"
            bad_mask = sub["data_status"] != "可用"

            if ok_mask.any():
                ax.plot(sub.loc[ok_mask, "obs_time_local_dt"],
                        sub.loc[ok_mask, "tide_level_cm"],
                        "o-", color="#2980b9", label="可用记录", linewidth=2, markersize=6)
            if bad_mask.any():
                ax.plot(sub.loc[bad_mask, "obs_time_local_dt"],
                        sub.loc[bad_mask, "tide_level_cm"],
                        "o", color="#e74c3c", markerfacecolor="none",
                        markersize=12, markeredgewidth=2, label="异常/待复核")
                for _, row in sub[bad_mask].iterrows():
                    short_id = row["record_id"].split("-")[-1]
                    ax.annotate(
                        f"#{short_id}\n行{row['source_row']}",
                        (row["obs_time_local_dt"], row["tide_level_cm"]),
                        xytext=(8, 8), textcoords="offset points",
                        fontsize=8, color="#c0392b", fontweight="bold",
                    )

            ax.set_title(f"{station_name} ({sid})", fontsize=11, loc="left")
            ax.set_ylabel("潮位 (cm)")
            ax.legend(loc="upper right", fontsize=9)
            ax.axhline(80, color="#f39c12", linestyle="--", alpha=0.7, label="安全潮位线")

        axes[-1].set_xlabel("北京时间 (CST)")
        axes[-1].xaxis.set_major_formatter(mdates.DateFormatter("%m-%d %H:%M"))
        fig.autofmt_xdate()
        fig.suptitle("各潮位站潮位变化曲线（含异常标注）", fontsize=13, y=1.01)

        bad_records = df[df["data_status"] != "可用"]
        caption_lines = [
            "潮位曲线说明：",
            f"- 共展示 {len(df)} 条记录，涉及 {len(stations)} 个潮位站",
            f"- 正常可用 {ok_mask.sum() if 'ok_mask' in dir() else 0} 条，异常/待复核 {len(bad_records)} 条",
            "- 红色空心圆为异常点，标注中 # 后数字为 record_id 后三位，行号对应原始表",
        ]
        if len(bad_records) > 0:
            caption_lines.append("- 异常记录明细:")
            for _, r in bad_records.iterrows():
                caption_lines.append(
                    f"  * [{r['record_id']}] {r['station_name']} "
                    f"行{r['source_row']} | {r['source_file']} | {r['source_note']}"
                )

        caption = "\n".join(caption_lines)
        path = self._save_fig(fig, filename, caption)
        return {"path": path, "caption": caption, "abnormal_count": len(bad_records)}

    def plot_data_status_pie(
        self,
        tracker: DataTracker,
        filename: str = "data_status_pie.png",
    ) -> Dict[str, Any]:
        """绘制数据状态饼图（可用/暂缓/需重采）"""
        summary = tracker.status_summary()
        labels = []
        sizes = []
        colors = []
        for s in DataStatus:
            info = summary["by_status"][s.value]
            if info["count"] > 0:
                labels.append(f"{s.value}\n({info['count']}条, {info['ratio']}%)")
                sizes.append(info["count"])
                colors.append(info["color"])

        fig, ax = plt.subplots(figsize=(8, 6))
        if sizes:
            wedges, texts, autotexts = ax.pie(
                sizes, labels=labels, colors=colors,
                autopct="", startangle=90,
                wedgeprops=dict(edgecolor="white", linewidth=2),
            )
            for t in texts:
                t.set_fontsize(10)
        ax.set_title("潮汐数据复核状态分布", fontsize=13)

        caption_lines = [
            "数据状态饼图说明：",
            f"- 总记录数：{summary['total']}",
        ]
        for s in DataStatus:
            info = summary["by_status"][s.value]
            caption_lines.append(
                f"- [{s.value}] {info['count']} 条 ({info['ratio']}%) - 船队视角: {s.for_fleet}"
            )
        if summary["issue_types"]:
            caption_lines.append("- 异常类型统计：")
            for itype, cnt in summary["issue_types"].items():
                caption_lines.append(f"  * {itype}: {cnt} 条")

        caption = "\n".join(caption_lines)
        path = self._save_fig(fig, filename, caption)
        return {"path": path, "caption": caption, "summary": summary}

    def plot_risk_distribution(
        self,
        risk_assessor: RiskAssessor,
        filename: str = "risk_distribution.png",
    ) -> Dict[str, Any]:
        """绘制风险分层分布柱状图（按船舶）"""
        df = risk_assessor.get_dataframe()
        summary = risk_assessor.summary()

        if df.empty:
            return {"path": "", "caption": "无数据"}

        ships = list(summary["by_ship"].keys())
        levels = [RiskLevel.SAFE, RiskLevel.CAUTION, RiskLevel.WARNING, RiskLevel.DANGER]
        level_names = [l.value for l in levels]
        level_colors = [l.color for l in levels]

        x = np.arange(len(ships))
        width = 0.6

        fig, ax = plt.subplots(figsize=(12, 6))
        bottoms = np.zeros(len(ships))

        for lvl, lname, color in zip(levels, level_names, level_colors):
            values = [summary["by_ship"][s]["by_level"].get(lname, 0) for s in ships]
            if any(v > 0 for v in values):
                bars = ax.bar(x, values, width, bottom=bottoms, label=lname, color=color, edgecolor="white")
                for bar, v in zip(bars, values):
                    if v > 0:
                        ax.text(
                            bar.get_x() + bar.get_width() / 2,
                            bar.get_y() + bar.get_height() / 2,
                            str(int(v)), ha="center", va="center",
                            fontsize=10, fontweight="bold", color="white",
                        )
                bottoms += np.array(values)

        ship_labels = [f"{summary['by_ship'][s]['ship_name']}\n({s})" for s in ships]
        ax.set_xticks(x)
        ax.set_xticklabels(ship_labels, fontsize=10)
        ax.set_ylabel("轨迹点数")
        ax.set_title("各船舶风险分层分布", fontsize=13)
        ax.legend(title="风险等级", loc="upper right")

        caption_lines = [
            "风险分层柱状图说明：",
            f"- 共评估 {summary['total']} 条轨迹点，涉及 {len(ships)} 艘船舶",
        ]
        for lvl in levels:
            cnt = summary["counts"].get(lvl.value, 0)
            if cnt > 0:
                caption_lines.append(f"- [{lvl.value}] {cnt} 条")
        caption_lines.append("- 各船最高风险等级：")
        for sid in ships:
            info = summary["by_ship"][sid]
            caption_lines.append(f"  * {info['ship_name']} ({sid}): {info['max_level']}")

        caption = "\n".join(caption_lines)
        path = self._save_fig(fig, filename, caption)
        return {"path": path, "caption": caption, "summary": summary}

    def plot_risk_timeline(
        self,
        risk_assessor: RiskAssessor,
        filename: str = "risk_timeline.png",
    ) -> Dict[str, Any]:
        """绘制风险时间线，对应每条轨迹点"""
        df = risk_assessor.get_dataframe()
        if df.empty:
            return {"path": "", "caption": "无数据"}

        df["record_time_dt"] = pd.to_datetime(df["record_time"])

        ships = df["ship_id"].unique()
        fig, ax = plt.subplots(figsize=(14, 5))

        level_colors = {l.value: l.color for l in RiskLevel}
        level_order = {l.value: l.score for l in RiskLevel}

        for i, sid in enumerate(ships):
            sub = df[df["ship_id"] == sid].sort_values("record_time_dt")
            ship_name = sub["ship_name"].iloc[0]

            for _, r in sub.iterrows():
                color = level_colors.get(r["risk_level"], "#999")
                ax.scatter(
                    r["record_time_dt"], i,
                    c=color, s=120, edgecolor="white", linewidth=1.5, zorder=3,
                )
                if r["risk_level"] in ["警告", "危险"]:
                    short_id = r["record_id"].split("-")[-1]
                    ax.annotate(
                        f"#{short_id}",
                        (r["record_time_dt"], i),
                        xytext=(0, -18), textcoords="offset points",
                        fontsize=8, ha="center", color="#c0392b", fontweight="bold",
                    )

        ax.set_yticks(range(len(ships)))
        ax.set_yticklabels([df[df["ship_id"] == s]["ship_name"].iloc[0] for s in ships])
        ax.set_xlabel("时间 (北京时间)")
        ax.set_title("船舶风险时间线（警告/危险点已标注）", fontsize=13)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))

        legend_patches = [
            Patch(facecolor=l.color, label=l.value, edgecolor="white")
            for l in RiskLevel
        ]
        ax.legend(handles=legend_patches, title="风险等级",
                  loc="upper center", bbox_to_anchor=(0.5, -0.12), ncol=4)

        hi_risk = df[df["risk_level"].isin(["警告", "危险"])]
        caption_lines = [
            "风险时间线说明：",
            f"- 覆盖时段 {df['record_time'].min()} ~ {df['record_time'].max()}",
            f"- 警告/危险点共 {len(hi_risk)} 处，标注 # 后数字为 record_id 后三位",
        ]
        if len(hi_risk) > 0:
            caption_lines.append("- 高风险点明细:")
            for _, r in hi_risk.iterrows():
                caption_lines.append(
                    f"  * [{r['record_id']}] {r['ship_name']} {r['record_time']} "
                    f"[{r['risk_level']}] - {r['suggestion']}"
                )

        caption = "\n".join(caption_lines)
        path = self._save_fig(fig, filename, caption)
        return {"path": path, "caption": caption}

    def create_risk_map(
        self,
        risk_assessor: RiskAssessor,
        tide_calc: Optional[TideCalculator] = None,
        filename: str = "risk_map.html",
    ) -> Dict[str, Any]:
        """
        创建交互式风险地图（folium）

        地图联动要求：
        - 每个轨迹点按风险等级着色
        - 点击弹出信息包含：船舶、时间、潮位、水深、风险等级、建议、追溯信息
        - 潮位站以蓝色图标显示，弹出该站的数据状态
        - 结果与表格、图表中的 record_id 完全对应
        """
        results = risk_assessor.get_results()
        if not results:
            return {"path": "", "caption": "无数据"}

        avg_lat = np.mean([r.latitude for r in results if r.latitude])
        avg_lon = np.mean([r.longitude for r in results if r.longitude])
        m = folium.Map(location=[avg_lat, avg_lon], zoom_start=14)

        for r in results:
            if r.longitude is None or r.latitude is None:
                continue
            popup_html = f"""
            <div style="font-size:12px;min-width:180px">
                <b>{r.ship_name}</b> ({r.ship_id})<br>
                <hr style="margin:4px 0">
                <b>记录ID:</b> {r.record_id}<br>
                <b>时间:</b> {r.record_time.strftime('%Y-%m-%d %H:%M')}<br>
                <b>风险等级:</b> <span style="color:{r.risk_level.color};font-weight:bold">{r.risk_level.value}</span><br>
                <b>估算潮位:</b> {r.estimated_tide_cm:.1f} cm<br>
                <b>水深:</b> {r.water_depth_m} m<br>
                <b>航速:</b> {r.speed_kn} kn<br>
                <b>建议:</b> {r.suggestion}<br>
                <hr style="margin:4px 0">
                <b>来源:</b> {r.source_file} 行{r.source_row}<br>
                <b>备注:</b> {r.source_note}
            </div>
            """
            folium.CircleMarker(
                location=[r.latitude, r.longitude],
                radius=7,
                color=r.risk_level.color,
                fill=True,
                fill_color=r.risk_level.color,
                fill_opacity=0.7,
                popup=folium.Popup(popup_html, max_width=260),
                tooltip=f"{r.ship_name} {r.risk_level.value}",
            ).add_to(m)

        if tide_calc:
            station_coords = {
                "T001": ("东港养殖场一号站", 121.955, 29.290),
                "T002": ("东港养殖场二号站", 121.948, 29.285),
                "T003": ("南岛礁观测站", 121.970, 29.270),
                "T004": ("西湾深水站", 121.935, 29.275),
                "T005": ("北堤外海站", 121.960, 29.300),
            }
            tracker_df = tide_calc.get_tracker().to_dataframe()
            tide_df = tide_calc.get_dataframe()

            for sid, (sname, lon, lat) in station_coords.items():
                station_tide = tide_df[tide_df["station_id"] == sid]
                rids = station_tide["record_id"].tolist()
                statuses = tracker_df[tracker_df["record_id"].isin(rids)]["data_status"].tolist()
                bad = sum(1 for s in statuses if s != "可用")
                color = "#e74c3c" if bad > 0 else "#27ae60"
                popup_html = f"""
                <div style="font-size:12px">
                    <b>{sname}</b> ({sid})<br>
                    记录数: {len(statuses)}<br>
                    异常: <span style="color:{color};font-weight:bold">{bad}</span> 条
                </div>
                """
                folium.Marker(
                    location=[lat, lon],
                    popup=folium.Popup(popup_html),
                    tooltip=f"{sname} ({'异常' if bad > 0 else '正常'})",
                    icon=folium.Icon(color="blue", icon="tint", prefix="fa"),
                ).add_to(m)

        plugins.MiniMap().add_to(m)
        plugins.Fullscreen().add_to(m)

        path = os.path.join(self.output_dir, filename)
        m.save(path)

        caption_lines = [
            "风险地图说明：",
            f"- 共标注 {len(results)} 个轨迹点",
            "- 颜色说明：绿=安全，黄=注意，橙=警告，红=危险",
            "- 潮位站：蓝色水滴图标，点击查看该站数据状态",
            "- 点击任意轨迹点可查看完整信息（含追溯来源）",
        ]
        caption = "\n".join(caption_lines)

        cap_path = os.path.join(self.output_dir, filename.replace(".html", ".txt"))
        with open(cap_path, "w", encoding="utf-8") as f:
            f.write(caption)

        return {"path": path, "caption": caption}

    def generate_summary_text(
        self,
        tracker: DataTracker,
        risk_assessor: RiskAssessor,
        filename: str = "summary_report.txt",
    ) -> str:
        """
        生成汇总文字报告

        与图表、表格保持一致：
        - 数据状态统计与饼图一致
        - 风险统计与柱状图、时间线一致
        - 所有引用的记录ID与表格中一一对应
        """
        lines = []
        lines.append("=" * 70)
        lines.append("  潮汐赶海安全助手 - 综合复核报告")
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 70)

        lines.append("")
        lines.append("【一、潮汐数据复核】")
        lines.append(tracker.generate_review_report())

        lines.append("")
        lines.append("【二、船队使用说明】")
        lines.append(tracker.generate_fleet_brief())

        lines.append("")
        lines.append("【三、风险评估汇总】")
        rs = risk_assessor.summary()
        lines.append(f"评估轨迹点总数: {rs['total']}")
        for lvl in RiskLevel:
            cnt = rs["counts"].get(lvl.value, 0)
            lines.append(f"  [{lvl.value}] {cnt} 条")
        lines.append("")
        lines.append("各船最高风险等级:")
        for sid, info in rs["by_ship"].items():
            lines.append(f"  * {info['ship_name']} ({sid}): {info['max_level']}")

        lines.append("")
        lines.append("【四、图表索引】")
        lines.append("  (与本报告数据完全对应，可交叉核对)")
        lines.append("  1. tide_curve.png        - 各潮位站潮位曲线")
        lines.append("  2. data_status_pie.png   - 数据复核状态饼图")
        lines.append("  3. risk_distribution.png - 船舶风险分层柱状图")
        lines.append("  4. risk_timeline.png     - 船舶风险时间线")
        lines.append("  5. risk_map.html         - 交互式风险地图")
        lines.append("  6. tide_processed.csv    - 处理后的潮汐记录表")
        lines.append("  7. risk_results.csv      - 风险评估结果表")
        lines.append("  8. tracking_records.csv  - 数据追溯明细表")

        lines.append("")
        lines.append("=" * 70)
        lines.append("复核要点:")
        lines.append("  1. 核对 [需重新采集] 记录，决定补材料还是改口径")
        lines.append("  2. 确认 [暂缓] 记录后下发船队")
        lines.append("  3. [危险] 等级轨迹点已在 risk_map.html 上红色高亮")
        lines.append("  4. 所有异常均保留原始行号与来源备注，可回查原始文件")
        lines.append("=" * 70)

        content = "\n".join(lines)
        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return path
