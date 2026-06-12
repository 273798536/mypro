import sys
import os
from datetime import datetime

import streamlit as st

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src import (
    DataMerger,
    Visualizer,
    ReportExporter,
    generate_sample_data,
    ShipTrack,
    SeabirdObservation,
    TideRecord,
    InspectionPhoto,
)


st.set_page_config(
    page_title="海鸟迁徙观测归并",
    page_icon="🐦",
    layout="wide",
)


def init_state():
    if "merger" not in st.session_state:
        st.session_state.merger = DataMerger()
    if "visualizer" not in st.session_state:
        st.session_state.visualizer = Visualizer()
    if "exporter" not in st.session_state:
        st.session_state.exporter = ReportExporter()
    if "sample_loaded" not in st.session_state:
        st.session_state.sample_loaded = False
    if "selected_record" not in st.session_state:
        st.session_state.selected_record = None


def load_sample_data():
    data = generate_sample_data()
    merger = st.session_state.merger
    merger.add_observations(data["observations"])
    merger.add_tide_records(data["tide_records"])
    merger.add_ship_tracks(data["ship_tracks"])
    merger.add_photos(data["photos"])
    st.session_state.sample_loaded = True
    st.success(f"样例数据已加载：{len(data['observations'])}条观测 / "
               f"{len(data['tide_records'])}条潮汐 / "
               f"{len(data['ship_tracks'])}条船舶 / "
               f"{len(data['photos'])}张照片")


def render_sidebar():
    with st.sidebar:
        st.title("🐦 海鸟迁徙观测归并")
        st.caption("水产养殖场 · 迁徙观测管理")

        st.divider()

        st.subheader("数据操作")

        if st.button("📦 加载样例数据", type="primary", use_container_width=True):
            load_sample_data()
            st.rerun()

        st.divider()

        with st.expander("📥 导入数据", expanded=False):
            st.caption("支持 Excel / CSV 格式导入")
            obs_file = st.file_uploader("海鸟观测数据", type=["xlsx", "csv"])
            tide_file = st.file_uploader("潮汐数据", type=["xlsx", "csv"])
            ship_file = st.file_uploader("船舶轨迹数据", type=["xlsx", "csv"])
            photo_file = st.file_uploader("巡检照片记录", type=["xlsx", "csv"])

            if st.button("开始导入", use_container_width=True):
                st.info("导入功能开发中，目前请使用样例数据体验")

        st.divider()

        st.subheader("快捷操作")
        if st.button("🔄 重新归并计算", use_container_width=True):
            st.session_state.merger.mark_dirty()
            st.rerun()

        st.divider()

        st.caption("v0.1 · 试用版")


def render_summary():
    merger = st.session_state.merger
    records = merger.merge()
    issues = st.session_state.visualizer.get_issue_summary(records)

    st.subheader("📊 归并概览")

    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("总记录数", issues["total"])
    with col2:
        st.metric("有效记录", issues["valid"], delta=f"{issues['valid']}/{issues['total']}")
    with col3:
        st.metric("无效记录", issues["invalid"], delta_color="inverse")
    with col4:
        st.metric("潮位时区错误", issues["tz_error"], delta_color="inverse")
    with col5:
        st.metric("照片晚到", issues["photo_late"], delta_color="off")

    if issues["tz_error"] > 0:
        st.error(
            f"⚠️ 检测到 {issues['tz_error']} 条记录存在潮位时区错误，"
            f"这些记录已标记为无效，不计入统计。请查看下方「异常记录」详情。"
        )

    if issues["photo_late"] > 0:
        st.warning(
            f"📷 有 {issues['photo_late']} 条记录的照片晚到，"
            f"相关结论可能受影响，需要重新核对。详情见「异常记录」。"
        )


def render_map_and_charts():
    merger = st.session_state.merger
    records = merger.merge()
    viz = st.session_state.visualizer

    st.subheader("🗺️ 观测分布地图")

    map_fig = viz.create_map(records, merger.ship_tracks)
    st.plotly_chart(map_fig, use_container_width=True, config={"displayModeBar": False})

    col1, col2 = st.columns(2)
    with col1:
        species_fig = viz.create_species_chart(records)
        st.plotly_chart(species_fig, use_container_width=True, config={"displayModeBar": False})

    with col2:
        daily_fig = viz.create_daily_summary_chart(records)
        st.plotly_chart(daily_fig, use_container_width=True, config={"displayModeBar": False})


def render_tide_detail():
    merger = st.session_state.merger
    records = merger.merge()
    viz = st.session_state.visualizer

    st.subheader("🌊 潮汐与观测对照")

    locations = sorted(set(r.location for r in records))
    selected_loc = st.selectbox("选择观测点", locations, key="tide_loc_select")

    tide_fig = viz.create_tide_chart(selected_loc, records, merger.tide_calculator)
    st.plotly_chart(tide_fig, use_container_width=True, config={"displayModeBar": False})


def render_data_table():
    merger = st.session_state.merger
    records = merger.merge()
    viz = st.session_state.visualizer

    st.subheader("📋 记录明细")

    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        filter_option = st.radio(
            "显示范围",
            ["全部记录", "仅有效记录", "仅无效记录", "有异常的记录"],
            horizontal=True,
        )
    with col2:
        st.write("")

    if filter_option == "全部记录":
        display_records = records
    elif filter_option == "仅有效记录":
        display_records = [r for r in records if r.is_valid]
    elif filter_option == "仅无效记录":
        display_records = [r for r in records if not r.is_valid]
    else:
        display_records = [r for r in records if r.issues or r.affected_conclusions or not r.is_valid]

    df = viz.create_data_table(display_records)

    def highlight_rows(row):
        styles = [""] * len(row)
        if row.get("记录有效") == "否":
            styles = ["background-color: #ffebee; color: #c62828; font-weight: bold"] * len(row)
        elif row.get("照片晚到") == "是":
            styles = ["background-color: #fff3e0; color: #e65100"] * len(row)
        elif row.get("附近有船") == "是":
            styles = ["background-color: #e3f2fd; color: #1565c0"] * len(row)
        return styles

    if not df.empty:
        styled_df = df.style.apply(highlight_rows, axis=1)
        st.dataframe(
            styled_df,
            use_container_width=True,
            hide_index=True,
            height=400,
            column_config={
                "记录编号": st.column_config.TextColumn(width="small"),
                "观测时间": st.column_config.TextColumn(width="medium"),
                "地点": st.column_config.TextColumn(width="small"),
                "鸟类种类": st.column_config.TextColumn(width="small"),
                "数量": st.column_config.NumberColumn(width="small"),
                "记录有效": st.column_config.TextColumn(width="small"),
                "无效原因": st.column_config.TextColumn(width="large"),
                "受影响结论": st.column_config.TextColumn(width="large"),
            },
        )
    else:
        st.info("暂无记录，请先加载数据")


def render_issues_detail():
    merger = st.session_state.merger
    records = merger.merge()

    st.subheader("⚠️ 异常记录详情")

    invalid_records = [r for r in records if not r.is_valid]
    photo_late_records = [r for r in records if r.photo_late and r.is_valid]
    ship_records = [r for r in records if r.ship_nearby and r.is_valid]

    tab1, tab2, tab3 = st.tabs(["🚫 无效记录", "📷 照片晚到", "🚢 船舶干扰"])

    with tab1:
        if invalid_records:
            st.error(
                f"共 {len(invalid_records)} 条无效记录，这些记录不计入统计汇总。"
            )
            for i, r in enumerate(invalid_records, 1):
                with st.expander(
                    f"{i}. {r.record_id} - {r.species} {r.bird_count}只 "
                    f"（{r.obs_time.strftime('%Y-%m-%d %H:%M')} · {r.location}）",
                    expanded=True if i == 1 else False,
                ):
                    st.markdown(f"**无效原因：**")
                    st.error(r.invalid_reason)

                    if "潮位时区错误" in r.invalid_reason:
                        st.markdown("---")
                        st.markdown("**为什么潮位时区错会导致记录无效？**")
                        st.info(
                            "潮位是分析海鸟栖息和迁徙行为的重要依据。\n\n"
                            "如果潮位数据的时区设置错误（例如用了UTC而非东八区），"
                            "那么记录的潮位高度和潮汐类型（高潮/低潮等）都会与实际情况不符。\n\n"
                            "用错误的潮位数据去分析海鸟活动规律，会得出错误的结论。"
                            "因此存在潮位时区错误的记录会被标记为无效，不参与统计。\n\n"
                            "**处理方式：** 联系数据提供方，将潮位数据的时区修正为 "
                            "Asia/Shanghai（UTC+8）后重新导入。"
                        )

                    st.markdown("**受影响的结论：**")
                    for conclusion in r.affected_conclusions:
                        st.write(f"• {conclusion}")
        else:
            st.success("暂无无效记录 ✓")

    with tab2:
        if photo_late_records:
            st.warning(f"共 {len(photo_late_records)} 条记录照片晚到")
            for i, r in enumerate(photo_late_records, 1):
                with st.expander(
                    f"{i}. {r.record_id} - {r.species} {r.bird_count}只",
                    expanded=True if i == 1 else False,
                ):
                    st.warning(
                        "⚠️ 照片晚到，以下结论可能需要重新核对："
                    )
                    for conclusion in r.affected_conclusions:
                        st.write(f"• {conclusion}")
                    st.caption(
                        "说明：照片晚到不会导致记录无效，但基于旧数据的初步结论可能不准。"
                        "照片到齐后请重新归并计算。"
                    )
        else:
            st.success("所有记录照片均按时到齐 ✓")

    with tab3:
        if ship_records:
            st.info(f"共 {len(ship_records)} 条记录观测时附近有船舶活动")
            for i, r in enumerate(ship_records, 1):
                with st.expander(
                    f"{i}. {r.record_id} - {r.species} {r.bird_count}只",
                    expanded=True if i == 1 else False,
                ):
                    st.info(
                        f"附近船舶：{ '、'.join(r.ship_names) if r.ship_names else '未知' }\n\n"
                        "说明：船舶活动可能惊扰海鸟，影响观测结果的代表性。"
                        "分析时需考虑船舶干扰因素。"
                    )
                    supp = any("补录" in iss for iss in r.issues)
                    if supp:
                        st.caption("提示：包含补录的船舶轨迹数据，地图已联动更新。")
        else:
            st.info("暂无船舶干扰记录")


def render_export():
    merger = st.session_state.merger
    records = merger.merge()
    exporter = st.session_state.exporter

    st.subheader("📤 导出结果")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Excel 完整报告**")
        st.caption("包含汇总、全部记录、有效记录、无效记录、异常明细5个工作表")

        try:
            excel_data = exporter.export_to_excel(records)
            st.download_button(
                label="📥 下载 Excel 报告",
                data=excel_data,
                file_name=f"海鸟迁徙观测归并_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                type="primary",
            )
        except Exception as e:
            st.error(f"生成Excel失败：{e}")

    with col2:
        st.markdown("**不可用记录说明（文字版）**")
        st.caption("适合发给船队，让他们知道哪些记录不能用、为什么")

        invalid_text = exporter.export_invalid_report_text(records)
        st.download_button(
            label="📄 下载不可用记录说明",
            data=invalid_text,
            file_name=f"不可用记录清单_{datetime.now().strftime('%Y%m%d_%H%M')}.txt",
            mime="text/plain",
        )

    with st.expander("📋 预览不可用记录说明", expanded=False):
        st.text(invalid_text)


def render_main():
    records = st.session_state.merger.merge()

    if not records:
        st.info("👋 欢迎使用海鸟迁徙观测归并工具")
        st.write("请点击左侧「加载样例数据」开始体验，或导入您自己的数据。")

        st.divider()

        st.subheader("功能一览")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown("### 🚫 异常显式提示")
            st.write("潮位时区错、照片晚到等问题不再藏在汇总里，一眼就能看到。")
        with col2:
            st.markdown("### 📊 图·表·文对应")
            st.write("地图、图表、表格、文字说明相互对应，结论可追溯。")
        with col3:
            st.markdown("### 🔄 补录联动更新")
            st.write("船舶轨迹、潮汐数据补录后，地图和分析自动重新计算。")

        return

    render_summary()

    st.divider()
    render_map_and_charts()

    st.divider()
    render_tide_detail()

    st.divider()
    render_data_table()

    st.divider()
    render_issues_detail()

    st.divider()
    render_export()


def main():
    init_state()
    render_sidebar()
    render_main()


if __name__ == "__main__":
    main()
