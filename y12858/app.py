import streamlit as st
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.models import DataStore
from src.tide_cleaner import clean_tide_data
from src.trajectory_importer import import_vessel_trajectories
from src.scheduler import generate_supply_schedules, get_schedules_with_summary
from src.audit import (
    approve_schedule, reject_schedule, update_schedule_field,
    get_audit_trail, get_change_summary,
)
from src.sample_data import generate_all_samples, SAMPLES_DIR


plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False


st.set_page_config(
    page_title="海岛淡水补给调度",
    page_icon="🌊",
    layout="wide",
)


STATUS_LABEL = {
    "pending": "⏳ 待确认",
    "approved": "✅ 已通过",
    "rejected": "❌ 已驳回",
    "failed": "⚠️ 调度失败",
}

STATUS_COLOR = {
    "pending": "#f59e0b",
    "approved": "#10b981",
    "rejected": "#ef4444",
    "failed": "#6b7280",
}


def init_data_dir():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)


def sidebar_nav():
    st.sidebar.title("🌊 海岛淡水补给调度")
    st.sidebar.caption("水产养殖场长专用")
    page = st.sidebar.radio(
        "功能导航",
        ["🏠 总览看板", "🧹 潮汐计算（日常入口）", "🚢 船舶轨迹导入", "📋 调度结果复核", "📝 复核备注&审计"],
        index=1,
    )
    st.sidebar.markdown("---")

    if st.sidebar.button("🔄 加载样例数据并一键跑通"):
        with st.spinner("正在生成并跑通样例数据..."):
            paths = generate_all_samples()
            tide_df = pd.read_csv(paths["tide_csv"])
            _, _ = clean_tide_data(tide_df, source_batch="样例数据")
            traj_df = pd.read_csv(paths["trajectory_csv"])
            _, _, _ = import_vessel_trajectories(traj_df, source_batch="样例数据")
            _, _, _ = generate_supply_schedules()
        st.sidebar.success("样例数据已加载！请切换页面查看结果。")

    if st.sidebar.button("🗑️ 清空所有数据"):
        for name in ["tide_records", "vessel_trajectories", "supply_schedules", "audit_logs"]:
            path = DataStore._path(name)
            if os.path.exists(path):
                os.remove(path)
        st.sidebar.warning("已清空全部数据")

    return page


def page_overview():
    st.header("🏠 总览看板")

    col1, col2, col3, col4 = st.columns(4)

    tide_df = DataStore.load_df("tide_records")
    traj_df = DataStore.load_df("vessel_trajectories")
    sched_df = get_schedules_with_summary()
    audit_df = DataStore.load_df("audit_logs")

    with col1:
        clean_count = int(tide_df["is_clean"].sum()) if "is_clean" in tide_df.columns else 0
        total_tide = len(tide_df)
        st.metric("潮汐记录（干净/总数）", f"{clean_count}/{total_tide}")
    with col2:
        st.metric("船舶轨迹数", len(traj_df))
    with col3:
        if not sched_df.empty and "status" in sched_df.columns:
            pending = int((sched_df["status"] == "pending").sum())
            approved = int((sched_df["status"] == "approved").sum())
            st.metric("调度结果（待确认/已通过）", f"{pending}/{approved}")
        else:
            st.metric("调度结果", "0")
    with col4:
        st.metric("审计日志数", len(audit_df))

    st.markdown("---")

    col_a, col_b = st.columns(2)
    with col_a:
        st.subheader("📈 近3日补给量趋势")
        fig1 = plot_supply_trend(sched_df)
        if fig1:
            st.pyplot(fig1)
        else:
            st.info("暂无调度数据，请先运行潮汐计算并导入船舶轨迹。")

    with col_b:
        st.subheader("🧊 潮位-补给窗口对照图")
        fig2 = plot_tide_vs_schedule(sched_df, tide_df)
        if fig2:
            st.pyplot(fig2)
        else:
            st.info("暂无潮汐或调度数据。")

    st.markdown("---")
    st.subheader("📋 最近调度一览")
    if sched_df.empty:
        st.info("暂无调度记录。请在「潮汐计算」页面处理潮汐表，再到「船舶轨迹导入」导入船舶，最后系统自动生成调度。")
    else:
        display_cols = ["vessel_name", "vessel_id", "supply_time", "water_amount",
                        "base_tide_height", "confidence", "status", "review_note"]
        show_df = sched_df[[c for c in display_cols if c in sched_df.columns]].copy()
        show_df.columns = ["船名", "船舶编号", "补给时间", "补水量(吨)", "对应潮高(米)", "置信度", "状态", "备注"]
        show_df["状态"] = show_df["状态"].map(STATUS_LABEL).fillna(show_df["状态"])
        show_df["置信度"] = (show_df["置信度"] * 100).round(0).astype(int).astype(str) + "%"
        st.dataframe(show_df, use_container_width=True, hide_index=True)


def plot_supply_trend(sched_df: pd.DataFrame):
    if sched_df.empty or "supply_time" not in sched_df.columns or "water_amount" not in sched_df.columns:
        return None
    df = sched_df.copy()
    df["supply_time"] = pd.to_datetime(df["supply_time"], errors="coerce")
    df = df.dropna(subset=["supply_time"])
    if df.empty:
        return None
    df["日期"] = df["supply_time"].dt.date
    daily = df.groupby("日期")["water_amount"].sum().reset_index()
    daily = daily.sort_values("日期")

    fig, ax = plt.subplots(figsize=(5, 3))
    ax.bar(daily["日期"].astype(str), daily["water_amount"], color="#0ea5e9", alpha=0.8)
    ax.set_xlabel("日期")
    ax.set_ylabel("补给量(吨)")
    ax.set_title("每日淡水补给量")
    plt.xticks(rotation=30)
    plt.tight_layout()
    return fig


def plot_tide_vs_schedule(sched_df: pd.DataFrame, tide_df: pd.DataFrame):
    if tide_df.empty or "tide_time" not in tide_df.columns:
        return None
    tdf = tide_df.copy()
    tdf["tide_time"] = pd.to_datetime(tdf["tide_time"], errors="coerce")
    tdf = tdf.dropna(subset=["tide_time", "tide_height"])
    if tdf.empty:
        return None
    tdf = tdf.sort_values("tide_time")

    fig, ax = plt.subplots(figsize=(5, 3))
    ax.plot(tdf["tide_time"], tdf["tide_height"], "b-o", label="潮位(米)", markersize=3, linewidth=1)
    ax.axhline(y=2.5, color="r", linestyle="--", alpha=0.6, label="补给最低潮位(2.5m)")

    if not sched_df.empty and "supply_time" in sched_df.columns:
        sdf = sched_df.copy()
        sdf["supply_time"] = pd.to_datetime(sdf["supply_time"], errors="coerce")
        sdf = sdf.dropna(subset=["supply_time", "base_tide_height"])
        if not sdf.empty:
            colors = sdf["status"].map(lambda s: STATUS_COLOR.get(s, "#0ea5e9"))
            ax.scatter(sdf["supply_time"], sdf["base_tide_height"],
                       c=colors, s=120, marker="*", edgecolors="k", linewidths=0.5, label="补给调度点", zorder=5)

    ax.set_xlabel("时间")
    ax.set_ylabel("潮高(米)")
    ax.set_title("潮位曲线与补给调度点")
    ax.legend(fontsize=7)
    plt.xticks(rotation=30)
    plt.tight_layout()
    return fig


def page_tide_calc():
    st.header("🧹 潮汐计算（日常入口）")
    st.markdown("> 此为日常操作入口：导入潮汐表，自动清洗并识别问题数据。")

    col_up, col_sm = st.columns([3, 1])
    with col_up:
        uploaded = st.file_uploader("导入潮汐表 CSV", type=["csv"], key="tide_upload")
    with col_sm:
        st.markdown("#### ")
        sample_path = os.path.join(SAMPLES_DIR, "tide_data_dirty.csv")
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                st.download_button("📄 下载样例潮汐表", f, "tide_sample.csv", "text/csv")
        if st.button("✨ 使用内置样例"):
            paths = generate_all_samples()
            st.session_state["_sample_tide_loaded"] = paths["tide_csv"]

    if uploaded is not None:
        try:
            raw_df = pd.read_csv(uploaded)
        except Exception as e:
            st.error(f"读取CSV失败: {e}")
            raw_df = None
    elif "_sample_tide_loaded" in st.session_state:
        raw_df = pd.read_csv(st.session_state["_sample_tide_loaded"])
    else:
        raw_df = None

    if raw_df is not None:
        st.subheader("📄 原始数据预览")
        st.dataframe(raw_df.head(10), use_container_width=True, hide_index=True)
        st.caption(f"共 {len(raw_df)} 行")

        batch_name = st.text_input("批次名称（可选）", value=f"潮汐导入-{datetime.now().strftime('%Y%m%d-%H%M')}")

        if st.button("🔄 开始清洗", type="primary"):
            with st.spinner("正在清洗潮汐数据..."):
                records, report_df = clean_tide_data(raw_df, source_batch=batch_name)
            st.session_state["_tide_clean_report"] = report_df
            st.session_state["_tide_clean_records"] = records

    if "_tide_clean_report" in st.session_state:
        report_df = st.session_state["_tide_clean_report"]
        records = st.session_state["_tide_clean_records"]

        st.markdown("---")
        st.subheader("📊 清洗结果报告")

        total = len(report_df)
        clean_count = int((report_df["是否干净"] == "是").sum())
        issue_count = total - clean_count

        c1, c2, c3 = st.columns(3)
        c1.metric("总记录", total)
        c2.metric("干净记录", clean_count, delta=f"{clean_count}/{total}")
        c3.metric("存在问题", issue_count)

        st.dataframe(report_df, use_container_width=True, hide_index=True)

        st.markdown("---")
        st.subheader("📈 潮位曲线图（清洗后）")
        fig = plot_cleaned_tides(records)
        if fig:
            st.pyplot(fig)
            explanation = f"""
            📝 **图文说明：**
            - 上图展示了清洗后所有站点的潮位变化，其中蓝色实线为潮位曲线，红色虚线为淡水补给最低潮位阈值（2.5米）。
            - 本次共处理 **{total}** 条记录，其中 **{clean_count}** 条通过校验（干净），**{issue_count}** 条存在异常（已标记问题）。
            - 常见问题包括：空值、重复记录、时区错误（UTC/东京时间已自动校正为北京时间）、备注中混写的潮型信息已提取。
            - 后续船舶调度将仅使用「干净」且「高潮」的潮位数据，确保补给作业安全。
            """
            st.markdown(explanation)


def plot_cleaned_tides(records):
    if not records:
        return None
    rows = []
    for r in records:
        if r.tide_time and r.tide_height is not None:
            rows.append({"time": r.tide_time, "height": r.tide_height, "type": r.tide_type, "station": r.station})
    if not rows:
        return None
    df = pd.DataFrame(rows).sort_values("time")

    fig, ax = plt.subplots(figsize=(8, 3.5))
    for station, g in df.groupby("station"):
        ax.plot(g["time"], g["height"], marker="o", label=station, linewidth=1.2, markersize=3)
    ax.axhline(y=2.5, color="r", linestyle="--", alpha=0.6, label="补给最低阈值(2.5m)")
    ax.set_xlabel("时间")
    ax.set_ylabel("潮高(米)")
    ax.set_title("清洗后各站点潮位曲线")
    ax.legend(fontsize=8)
    plt.xticks(rotation=30)
    plt.tight_layout()
    return fig


def page_trajectory():
    st.header("🚢 船舶轨迹导入")
    st.markdown("> 导入船舶到港/离港计划及淡水需求量，系统自动去重（同一批轨迹二次导入不会产生冲突）。")

    col_up, col_sm = st.columns([3, 1])
    with col_up:
        uploaded = st.file_uploader("导入船舶轨迹 CSV", type=["csv"], key="traj_upload")
    with col_sm:
        st.markdown("#### ")
        sample_path = os.path.join(SAMPLES_DIR, "vessel_trajectories.csv")
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                st.download_button("📄 下载样例轨迹", f, "trajectory_sample.csv", "text/csv")
        if st.button("✨ 使用内置样例"):
            paths = generate_all_samples()
            st.session_state["_sample_traj_loaded"] = paths["trajectory_csv"]

    if uploaded is not None:
        raw_df = pd.read_csv(uploaded)
    elif "_sample_traj_loaded" in st.session_state:
        raw_df = pd.read_csv(st.session_state["_sample_traj_loaded"])
    else:
        raw_df = None

    if raw_df is not None:
        st.subheader("📄 原始轨迹预览")
        st.dataframe(raw_df, use_container_width=True, hide_index=True)

        batch_name = st.text_input("批次名称", value=f"轨迹导入-{datetime.now().strftime('%Y%m%d-%H%M')}", key="traj_batch")

        if st.button("📥 导入并去重", type="primary"):
            with st.spinner("正在导入并比对指纹..."):
                trajs, report_df, msgs = import_vessel_trajectories(raw_df, source_batch=batch_name)
            for m in msgs:
                st.success(m)
            st.session_state["_traj_report"] = report_df
            st.info("💡 导入完成后，请到「调度结果复核」页面查看自动生成的补给调度，或点击下方按钮立即生成调度。")

            if st.button("⚙️ 立即生成淡水补给调度"):
                with st.spinner("正在匹配潮位并生成调度..."):
                    scheds, sched_report, sched_msgs = generate_supply_schedules()
                for m in sched_msgs:
                    st.success(m)
                st.session_state["_sched_report"] = sched_report
                st.rerun()

    if "_traj_report" in st.session_state:
        st.markdown("---")
        st.subheader("✅ 导入结果")
        st.dataframe(st.session_state["_traj_report"], use_container_width=True, hide_index=True)

    st.markdown("---")
    st.subheader("📚 已导入轨迹清单")
    existing = DataStore.load_df("vessel_trajectories")
    if existing.empty:
        st.info("暂无已导入轨迹。")
    else:
        display = existing[["vessel_name", "vessel_id", "arrival_time", "departure_time", "water_demand", "route", "source_batch"]].copy()
        display.columns = ["船名", "船舶编号", "到港时间", "离港时间", "淡水需求(吨)", "航线", "来源批次"]
        st.dataframe(display, use_container_width=True, hide_index=True)


def page_schedule_review():
    st.header("📋 调度结果复核")

    if st.button("🔄 重新生成调度（自动匹配未调度船舶）"):
        with st.spinner("正在生成调度..."):
            scheds, report_df, msgs = generate_supply_schedules()
        for m in msgs:
            st.success(m)
        st.rerun()

    sched_df = get_schedules_with_summary()
    if sched_df.empty:
        st.info("暂无调度记录。请先导入潮汐表和船舶轨迹。")
        return

    st.markdown("---")
    st.subheader("📊 调度总览图表")

    col_a, col_b = st.columns(2)
    with col_a:
        fig_gantt = plot_schedule_gantt(sched_df)
        if fig_gantt:
            st.pyplot(fig_gantt)

    with col_b:
        status_counts = sched_df["status"].value_counts().rename(lambda x: STATUS_LABEL.get(x, x))
        if not status_counts.empty:
            fig_pie, ax = plt.subplots(figsize=(4, 3))
            colors = [STATUS_COLOR.get(s, "#94a3b8") for s in sched_df["status"].value_counts().index]
            ax.pie(status_counts.values, labels=status_counts.index, autopct="%1.0f%%", colors=colors, startangle=90)
            ax.set_title("调度状态分布")
            st.pyplot(fig_pie)

    total_water = sched_df["water_amount"].sum() if "water_amount" in sched_df.columns else 0
    pending_cnt = int((sched_df["status"] == "pending").sum())
    st.markdown(f"""
    📝 **文字说明：**
    - 共生成 **{len(sched_df)}** 条淡水补给调度，合计补水量 **{total_water:.0f} 吨**。
    - 其中 **{pending_cnt}** 条为「待确认」状态，请水产养殖场长逐一复核后通过或驳回。
    - 左图甘特图展示每条船舶的到港-补给-离港时间线；右图为各状态占比。
    """)

    st.markdown("---")
    st.subheader("📋 逐条复核")

    for idx, row in sched_df.iterrows():
        sid = row["schedule_id"]
        status = row.get("status", "pending")
        with st.expander(f"{STATUS_LABEL.get(status, status)}  {row.get('vessel_name', '')}  -  {row.get('vessel_id', '')}  (调度编号: {sid[:8]}...)"):
            col_d1, col_d2, col_d3 = st.columns(3)
            col_d1.metric("补给时间", str(row.get("supply_time", ""))[:16] if row.get("supply_time") else "无")
            col_d2.metric("补水量(吨)", f"{row.get('water_amount', 0):.0f}")
            col_d3.metric("对应潮高(米)", f"{row.get('base_tide_height', 0):.1f}" if row.get("base_tide_height") else "无")

            st.markdown(f"**状态:** `{STATUS_LABEL.get(status, status)}`  ")
            st.markdown(f"**系统备注:** {row.get('review_note', '') or '无'}")
            if row.get("reviewer"):
                st.markdown(f"**复核人:** {row.get('reviewer')}  |  **复核时间:** {str(row.get('reviewed_at', ''))[:19]}")

            st.markdown("---")
            edit_col1, edit_col2 = st.columns(2)
            with edit_col1:
                new_time = st.text_input("修正补给时间 (YYYY-MM-DD HH:MM)",
                                         value=str(row.get("supply_time", ""))[:16] if row.get("supply_time") else "",
                                         key=f"time_{sid}")
                new_amount = st.number_input("修正补水量(吨)",
                                             min_value=0.0, value=float(row.get("water_amount", 0)),
                                             key=f"amt_{sid}")
            with edit_col2:
                reviewer_name = st.text_input("复核人", value="场长", key=f"rev_{sid}")
                review_note = st.text_area("复核备注", value="", key=f"note_{sid}", height=80)

            act_col1, act_col2, act_col3, act_col4 = st.columns(4)
            with act_col1:
                if st.button("💾 保存字段修正", key=f"save_{sid}"):
                    if new_time and new_time != str(row.get("supply_time", ""))[:16]:
                        try:
                            nt = datetime.strptime(new_time, "%Y-%m-%d %H:%M")
                            update_schedule_field(sid, "supply_time", nt.isoformat(), reviewer_name, review_note or "修正补给时间")
                        except ValueError:
                            st.error("时间格式错误")
                    if abs(new_amount - float(row.get("water_amount", 0))) > 0.01:
                        update_schedule_field(sid, "water_amount", new_amount, reviewer_name, review_note or "修正补水量")
                    st.success("已保存修改，留痕完成")
                    st.rerun()
            with act_col2:
                if st.button("✅ 通过", key=f"apv_{sid}", type="primary"):
                    approve_schedule(sid, reviewer_name, review_note)
                    st.success("已通过")
                    st.rerun()
            with act_col3:
                if st.button("❌ 驳回", key=f"rej_{sid}"):
                    reject_schedule(sid, reviewer_name, review_note)
                    st.warning("已驳回")
                    st.rerun()
            with act_col4:
                trail = get_audit_trail(sid)
                if not trail.empty:
                    with st.popover(f"📜 变更留痕({len(trail)}条)"):
                        st.dataframe(trail[["timestamp", "operator", "operation", "field_name", "old_value", "new_value", "remark"]],
                                     use_container_width=True, hide_index=True)


def plot_schedule_gantt(sched_df: pd.DataFrame):
    if sched_df.empty:
        return None
    traj_df = DataStore.load_df("vessel_trajectories")
    if traj_df.empty:
        return None

    merged = sched_df.merge(traj_df[["trajectory_id", "arrival_time", "departure_time"]],
                            on="trajectory_id", how="left", suffixes=("", "_traj"))
    merged = merged.dropna(subset=["arrival_time"])

    if merged.empty:
        return None

    for col in ["arrival_time", "departure_time", "supply_time"]:
        merged[col] = pd.to_datetime(merged[col], errors="coerce")

    fig, ax = plt.subplots(figsize=(6, 3.5))
    y_positions = list(range(len(merged)))

    for i, (_, row) in enumerate(merged.iterrows()):
        a = row["arrival_time"]
        d = row["departure_time"] if pd.notna(row["departure_time"]) else a + timedelta(hours=12)
        ax.barh(i, (d - a).total_seconds() / 3600, left=(a - merged["arrival_time"].min()).total_seconds() / 3600,
                height=0.4, color="#93c5fd", alpha=0.6, label="停靠窗口" if i == 0 else "")
        if pd.notna(row["supply_time"]):
            sx = (row["supply_time"] - merged["arrival_time"].min()).total_seconds() / 3600
            color = STATUS_COLOR.get(row.get("status", "pending"), "#f59e0b")
            ax.scatter(sx, i, marker="|", s=300, color=color, linewidths=3, label="补给时间" if i == 0 else "")

    ax.set_yticks(y_positions)
    ax.set_yticklabels(merged["vessel_name"].tolist())
    ax.set_xlabel("时间轴（小时，从最早到港起计）")
    ax.set_title("船舶停靠窗口与补给时间甘特图")
    ax.legend(fontsize=8)
    plt.tight_layout()
    return fig


def page_audit():
    st.header("📝 复核备注 & 审计追踪")
    st.markdown("> 月底或课前集中复核：查看每条调度的来龙去脉，以及所有人工修正的留痕记录。")

    audit_df = DataStore.load_df("audit_logs")
    if audit_df.empty:
        st.info("暂无审计记录。只有在人工修正、通过或驳回调度时才会产生留痕。")
    else:
        if "timestamp" in audit_df.columns:
            audit_df["timestamp"] = pd.to_datetime(audit_df["timestamp"], errors="coerce")
            audit_df = audit_df.sort_values("timestamp", ascending=False)

        st.subheader("📜 全部审计留痕")
        display = audit_df[["timestamp", "schedule_id", "operator", "operation", "field_name", "old_value", "new_value", "remark"]].copy()
        display.columns = ["时间", "调度编号", "操作人", "操作类型", "修改字段", "原值", "新值", "备注说明"]
        st.dataframe(display, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.subheader("🔍 按调度查看变更对比")
    sched_df = get_schedules_with_summary()
    if sched_df.empty:
        st.info("暂无调度。")
    else:
        options = sched_df.apply(lambda r: f"{r.get('vessel_name', '')} ({r.get('schedule_id', '')[:8]})", axis=1).tolist()
        values = sched_df["schedule_id"].tolist()
        selected = st.selectbox("选择调度", options=options, format_func=lambda x: x)
        if selected:
            sel_idx = options.index(selected)
            sid = values[sel_idx]
            row = sched_df.iloc[sel_idx]

            c1, c2, c3 = st.columns(3)
            c1.markdown(f"**船名:** {row.get('vessel_name', '')}")
            c2.markdown(f"**当前状态:** {STATUS_LABEL.get(row.get('status', ''), row.get('status', ''))}")
            c3.markdown(f"**备注:** {row.get('review_note', '') or '无'}")

            changes = get_change_summary(sid)
            if not changes:
                st.info("该调度暂无人工修改记录（系统自动生成，未经过人工干预）。")
            else:
                st.markdown("#### 📋 前后变化明细")
                for c in changes:
                    with st.container(border=True):
                        mcol1, mcol2 = st.columns([1, 3])
                        with mcol1:
                            st.markdown(f"**🕐 {str(c['时间'])[:19]}**")
                            st.markdown(f"👤 {c['操作人']}")
                            st.markdown(f"🔧 {c['操作']}")
                        with mcol2:
                            if c.get("字段"):
                                st.markdown(f"**字段:** `{c['字段']}`")
                                st.markdown(f"- 原值: `{c['原值']}`")
                                st.markdown(f"- 新值: `{c['新值']}`")
                            if c.get("备注"):
                                st.markdown(f"**说明:** {c['备注']}")


def main():
    init_data_dir()
    page = sidebar_nav()

    if "总览" in page:
        page_overview()
    elif "潮汐计算" in page:
        page_tide_calc()
    elif "船舶轨迹" in page:
        page_trajectory()
    elif "调度结果复核" in page:
        page_schedule_review()
    elif "复核备注" in page:
        page_audit()


if __name__ == "__main__":
    main()
