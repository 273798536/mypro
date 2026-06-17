import io
import json
import os
from datetime import datetime
from collections import Counter

import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

from modules import load_dataset, load_dataset_from_file, ensure_sample_data_exists
from modules.analysis import (
    replay_audit, build_correction_flow, build_gray_analysis,
    build_ui_summary, clean_record,
)
from modules.exporter import export_audit_report


st.set_page_config(
    page_title="工具参数 Schema 审计工作台",
    page_icon="📐",
    layout="wide",
)

# ---------------------------------------------------------------------------
# 侧边栏：数据加载 + 导出
# ---------------------------------------------------------------------------
with st.sidebar:
    st.title("📐 Schema 审计")
    st.caption("评测回放 · 人工修正 · 灰度对比 · 导出对账")

    st.subheader("① 数据来源")
    data_source = st.radio(
        "选择数据",
        ["加载内置样例 (32条)", "上传自定义 JSON"],
        horizontal=False,
    )

    dataset = None
    if data_source.startswith("加载内置"):
        ensure_sample_data_exists()
        dataset = load_dataset()
        st.success(f"已加载内置样例：{len(dataset.records)} 条记录 · "
                   f"{len(dataset.materials)} 份来源材料 · "
                   f"{len(dataset.corrections)} 条修正记录")
        with st.expander("样例说明（故意掺脏数据）"):
            st.markdown("""
            - **空值**：`description: null`、`enum: []`
            - **重复**：`REC_0001` 等同一条被多标注员重复标
            - **备注混写**：`required = "必填 注意和XX对齐"`
            - **结论冲突**：状态写「通过」但摘要写「待确认」
            - **来源缺失**：未关联 `source_material_ids`
            """)
    else:
        rec_file = st.file_uploader("上传 schema_records.json", type=["json"])
        mat_file = st.file_uploader("上传 source_materials.json（可选）", type=["json"])
        cor_file = st.file_uploader("上传 corrections.json（可选）", type=["json"])
        if rec_file is not None:
            tmp_dir = "/tmp/_schema_audit_upload"
            os.makedirs(tmp_dir, exist_ok=True)
            rp = os.path.join(tmp_dir, "records.json")
            with open(rp, "wb") as f:
                f.write(rec_file.getbuffer())
            mp = cp = None
            if mat_file is not None:
                mp = os.path.join(tmp_dir, "materials.json")
                with open(mp, "wb") as f:
                    f.write(mat_file.getbuffer())
            if cor_file is not None:
                cp = os.path.join(tmp_dir, "corrections.json")
                with open(cp, "wb") as f:
                    f.write(cor_file.getbuffer())
            dataset = load_dataset_from_file(rp, mp, cp)
            st.success(f"已加载自定义：{len(dataset.records)} 条记录")

    st.divider()
    st.subheader("② 运行审计")
    run_audit = st.button("▶ 跑一遍评测回放 + 修正 + 灰度对比", type="primary",
                          use_container_width=True)

    st.divider()
    st.subheader("③ 导出报告")
    export_clicked = st.button("📥 导出 Excel + JSON 评审摘要", use_container_width=True)
    st.caption("导出内容会与本页摘要做一致性对账")

# ---------------------------------------------------------------------------
# 主流程：计算
# ---------------------------------------------------------------------------
if dataset is None:
    st.info("👈 请在左侧加载样例或上传数据，然后点「跑一遍」开始")
    st.stop()

replay_rows, replay_stats = replay_audit(dataset)
correction_flow, correction_stats = build_correction_flow(dataset)
gray_analysis = build_gray_analysis(dataset, replay_rows)
ui_summary = build_ui_summary(gray_analysis, replay_stats, correction_stats)

if export_clicked:
    exp_res = export_audit_report(
        dataset, replay_rows, replay_stats,
        correction_flow, correction_stats, gray_analysis,
    )
    st.session_state["last_export"] = exp_res
else:
    exp_res = st.session_state.get("last_export")

# ---------------------------------------------------------------------------
# 顶栏：审计结论卡 + 核心指标卡
# ---------------------------------------------------------------------------
st.title("📐 工具参数 Schema 审计工作台")
st.caption("图 · 表 · 文字说明 三者对得上 · 核心跑稳评测回放与人工修正 · 灰度对比拉回来源材料")

verdict_color = (
    "#16a34a" if ui_summary["audit_verdict"] == "通过" else "#d97706"
)
c1, c2, c3, c4, c5, c6 = st.columns(6)
with c1:
    st.metric("总记录数", ui_summary["metrics"]["总记录数"])
with c2:
    st.metric("重放通过率", ui_summary["metrics"]["重放通过率"])
with c3:
    st.metric("结论变化条数", ui_summary["metrics"]["结论变化条数"])
with c4:
    st.metric("灰度记录数", ui_summary["metrics"]["灰度记录数"])
with c5:
    st.metric("未溯源记录", ui_summary["metrics"]["未溯源记录数"])
with c6:
    st.metric("脏数据修复率", ui_summary["metrics"]["脏数据修复率"])

st.markdown(
    f"""
    <div style="padding: 14px 18px; border-left: 5px solid {verdict_color};
                background: #fafafa; border-radius: 6px; margin: 10px 0 20px 0;">
      <div style="font-weight: 700; color: {verdict_color}; font-size: 15px; margin-bottom: 6px;">
        本轮审计判定：{ui_summary["audit_verdict"]}
      </div>
      <div style="color: #374151; line-height: 1.7;">{ui_summary["summary_text"]}</div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Tab 切换
# ---------------------------------------------------------------------------
tabs = st.tabs([
    "📊 总览仪表盘",
    "🔁 评测回放",
    "🛠 人工修正",
    "⚖️ 灰度对比",
    "🧾 导出对账",
    "✅ 评审分类（直接用 / 需复核）",
])

# ===========================================================================
# Tab1: 总览仪表盘
# ===========================================================================
with tabs[0]:
    st.markdown("### 📈 通过率 & 问题分布（图）")
    colA, colB = st.columns(2)
    with colA:
        status_df = pd.DataFrame([
            {"重放状态": k, "条数": v}
            for k, v in replay_stats["by_replay_status"].items()
        ])
        fig1 = px.pie(status_df, names="重放状态", values="条数", hole=0.5,
                      title="重放状态占比", color_discrete_sequence=px.colors.qualitative.Set2)
        fig1.update_traces(textposition="outside", textinfo="label+percent+value")
        st.plotly_chart(fig1, use_container_width=True)

    with colB:
        issues = replay_stats["top_issue_types"]
        if issues:
            issue_df = pd.DataFrame([{"问题类型": k, "条数": v} for k, v in issues])
            fig2 = px.bar(issue_df, x="问题类型", y="条数", text="条数",
                          title="问题类型分布 Top", color="条数",
                          color_continuous_scale="Reds")
            fig2.update_layout(showlegend=False)
            st.plotly_chart(fig2, use_container_width=True)
        else:
            st.info("暂无问题")

    st.markdown("---")
    st.markdown("### 🧾 失败 Top 记录（表）")
    fail_df = pd.DataFrame([
        {
            "记录ID": r["record_id"], "工具名": r["tool_name"],
            "标注员": r["annotator"], "原状态": r["original_status"],
            "重放状态": r["replay_status"], "问题数": r["issue_count"],
            "问题类型": "、".join(r["issue_types"]),
        }
        for r in sorted(replay_rows, key=lambda x: -x["issue_count"])
        if r["replay_status"] != "通过"
    ][:10])
    if fail_df.empty:
        st.success("全部通过！没有失败/待确认的记录。")
    else:
        st.dataframe(fail_df, use_container_width=True, hide_index=True, height=360)

    st.markdown("---")
    st.markdown("### ✍️ 文字说明（与上方图/表对得上）")
    top_n = 5
    top_issue_descs = []
    for k, v in replay_stats["top_issue_types"][:top_n]:
        top_issue_descs.append(f"「{k}」{v} 条")
    issue_joined = "、".join(top_issue_descs) if top_issue_descs else "无"
    transitions = replay_stats["status_transitions"]
    transition_desc = "；".join(f"{k}共{v}条" for k, v in transitions.items() if v) or "无变化"

    st.markdown(f"""
    1. **整体通过情况**：共 **{replay_stats['total']}** 条，通过 **{replay_stats['by_replay_status']['通过']}** 条（通过率 {replay_stats['pass_rate']}%），
       未通过 {replay_stats['by_replay_status']['未通过']} 条、待确认 {replay_stats['by_replay_status']['待确认']} 条、
       灰度观察 {replay_stats['by_replay_status']['灰度观察']} 条。
    2. **主要问题**：{issue_joined}。
    3. **结论变化**：重放后与原标注结论不一致共 **{replay_stats['changed_count']}** 条，
       具体迁移：{transition_desc}。
    4. **灰度对比**：非灰度通过率 {gray_analysis['non_gray_pass_rate']}%，
       灰度通过率 {gray_analysis['gray_pass_rate']}%，
       {'灰度优于非灰度' if gray_analysis['pass_rate_delta'] > 0
         else '灰度低于非灰度'} {abs(gray_analysis['pass_rate_delta'])} 个百分点。
    5. **溯源情况**：{gray_analysis['untraced_count']} 条未关联来源材料，需补录后才能入库训练。
    6. **脏数据清洗**：自动清洗 {sum(correction_stats['auto_clean_actions'].values())} 处，
       另有 {correction_stats['manual_correction_count']} 条人工修正记录；
       去重可合并 {correction_stats['dedup_would_remove']} 条重复标注。
    7. **判定结论**：**{ui_summary['audit_verdict']}**
       （依据：通过率≥80？ {'是' if replay_stats['pass_rate'] >= 80 else '否'}；
       全部有溯源？ {'是' if gray_analysis['untraced_count'] == 0 else '否'}；
       结论变化率≤10%？ {'是' if replay_stats['changed_count'] <= replay_stats['total'] * 0.1 else '否'}）。
    """)

# ===========================================================================
# Tab2: 评测回放
# ===========================================================================
with tabs[1]:
    st.markdown("### 🔁 评测回放：原结论 vs 重放结论（最该跑稳的模块之一）")
    st.caption("结论变化的行会被高亮；点开每行左侧可以看参数级问题明细")

    replay_display_df = pd.DataFrame([
        {
            "记录ID": r["record_id"], "工具名": r["tool_name"],
            "工具分类": r["tool_category"], "标注员": r["annotator"],
            "原状态": r["original_status"], "重放状态": r["replay_status"],
            "结论变化": "⚠️ 变了" if r["status_changed"] else "—",
            "问题数": r["issue_count"],
            "问题类型": "、".join(r["issue_types"]),
            "原摘要": r["original_summary"],
            "重放摘要": r["replay_summary"],
        } for r in replay_rows
    ])

    def _highlight_row(s):
        changed = s.get("结论变化") == "⚠️ 变了"
        return [
            "background-color: #fff3cd; color: #856404;" if changed else ""
            for _ in s
        ]

    styled = replay_display_df.style.apply(_highlight_row, axis=1)
    st.dataframe(styled, use_container_width=True, hide_index=True, height=420)

    st.divider()
    cola, colb = st.columns(2)
    with cola:
        st.markdown("#### 状态迁移桑基图")
        src, tgt, val = [], [], []
        orig_order = {"通过": 0, "待确认": 1, "未通过": 2, "灰度观察": 3}
        replay_order = {"通过": 4, "待确认": 5, "未通过": 6, "灰度观察": 7}
        agg = Counter(
            (r["original_status"], r["replay_status"]) for r in replay_rows
        )
        for (o, r_v), v in agg.items():
            src.append(orig_order.get(o, 99))
            tgt.append(replay_order.get(r_v, 99))
            val.append(v)
        labels = (
            ["原:通过", "原:待确认", "原:未通过", "原:灰度观察"]
            + ["重放:通过", "重放:待确认", "重放:未通过", "重放:灰度观察"]
        )
        fig_sankey = go.Figure(go.Sankey(
            node=dict(pad=18, thickness=20,
                      line=dict(color="black", width=0.5),
                      label=labels,
                      color=px.colors.qualitative.Pastel[:len(labels)]),
            link=dict(source=src, target=tgt, value=val),
        ))
        fig_sankey.update_layout(title_text="原结论 → 重放结论 流向", height=360)
        st.plotly_chart(fig_sankey, use_container_width=True)

    with colb:
        st.markdown("#### 按标注员通过率")
        per_annotator = []
        by_ann = {}
        for r in replay_rows:
            by_ann.setdefault(r["annotator"], []).append(r)
        for ann, rows in by_ann.items():
            total = len(rows)
            passed = sum(1 for x in rows if x["replay_status"] == "通过")
            per_annotator.append({
                "标注员": ann, "总数": total, "通过": passed,
                "通过率": round(passed / total * 100, 1) if total else 0,
            })
        ann_df = pd.DataFrame(per_annotator).sort_values("通过率", ascending=False)
        fig_ann = px.bar(ann_df, x="标注员", y="通过率", text="通过率",
                         color="通过率", color_continuous_scale="Blues",
                         range_y=[0, 100])
        fig_ann.update_traces(texttemplate="%{text}%")
        st.plotly_chart(fig_ann, use_container_width=True)

    with st.expander("🔍 查看单条参数级问题明细"):
        rid = st.selectbox("选择记录ID", [r["record_id"] for r in replay_rows])
        detail = next((r for r in replay_rows if r["record_id"] == rid), None)
        if detail:
            st.markdown(f"**{detail['tool_name']}** / 标注员 {detail['annotator']}")
            st.markdown(f"原摘要：{detail['original_summary']}")
            st.markdown(f"重放摘要：{detail['replay_summary']}")
            if detail["issue_details"]:
                prob_df = pd.DataFrame([
                    {"参数": d["param"], "问题类型": d["type"], "详情": d["detail"]}
                    for d in detail["issue_details"]
                ])
                st.dataframe(prob_df, use_container_width=True, hide_index=True)
            else:
                st.success("无问题")

# ===========================================================================
# Tab3: 人工修正
# ===========================================================================
with tabs[2]:
    st.markdown("### 🛠 人工修正：脏数据清洗 + 修正流水（最该跑稳的模块之二）")
    st.caption("不默认材料干净：专门处理空值、重复、备注混写")

    colA, colB = st.columns(2)
    with colA:
        dirty_before = correction_stats["dirty_before"]
        dirty_after = correction_stats["dirty_after"]
        fixed_rate = correction_stats["dirty_fixed_rate"]
        dirty_compare_df = pd.DataFrame([
            {
                "脏数据类型": k,
                "清洗前": dirty_before.get(k, 0),
                "清洗后": dirty_after.get(k, 0),
                "修复率(%)": fixed_rate.get(k, 0),
            } for k in dirty_before.keys()
        ])
        fig_dirty = go.Figure()
        fig_dirty.add_trace(go.Bar(
            x=dirty_compare_df["脏数据类型"], y=dirty_compare_df["清洗前"],
            name="清洗前", marker_color="#ef4444",
        ))
        fig_dirty.add_trace(go.Bar(
            x=dirty_compare_df["脏数据类型"], y=dirty_compare_df["清洗后"],
            name="清洗后", marker_color="#22c55e",
        ))
        fig_dirty.update_layout(barmode="group", title="脏数据 清洗前 vs 清洗后",
                                height=360)
        st.plotly_chart(fig_dirty, use_container_width=True)
        st.dataframe(dirty_compare_df, use_container_width=True, hide_index=True,
                     column_config={"修复率(%)": st.column_config.ProgressColumn(
                         format="%d", min_value=0, max_value=100)})

    with colB:
        st.markdown("#### 🚩 重复标注组")
        dup_groups = correction_stats["duplicate_groups"]
        if dup_groups:
            for i, g in enumerate(dup_groups):
                st.info(f"**第 {i+1} 组**：{' / '.join(g)} （建议保留 1 条，合并 {len(g)-1} 条）")
                with st.expander(f"展开组内记录明细"):
                    sub = []
                    for rid in g:
                        rec = dataset.record_by_id(rid)
                        if rec:
                            sub.append({
                                "记录ID": rid,
                                "标注员": rec.get("annotator"),
                                "标注时间": rec.get("annotated_at"),
                                "风险标签": "、".join(rec.get("risk_tags", [])),
                                "原状态": rec.get("original_audit_status"),
                            })
                    st.dataframe(pd.DataFrame(sub), use_container_width=True,
                                 hide_index=True)
            st.markdown(f"**共 {len(dup_groups)} 组重复，可合并 {correction_stats['dedup_would_remove']} 条**")
        else:
            st.success("没有检测到重复标注")

    st.divider()
    st.markdown("#### 📜 完整修正流水（自动清洗 + 人工修正）")
    flow_df = pd.DataFrame([
        {
            "时间": f["time"],
            "操作人": f["corrector"],
            "记录ID": f["record_id"],
            "工具名": f["tool_name"],
            "字段": f["field"],
            "动作": f["action"],
            "详情": f["detail"],
        } for f in correction_flow
    ])
    st.dataframe(flow_df, use_container_width=True, hide_index=True, height=420)

# ===========================================================================
# Tab4: 灰度对比
# ===========================================================================
with tabs[3]:
    st.markdown("### ⚖️ 灰度对比：结论要能拉回来源材料")
    st.caption("把每一条结论追溯到来源 PRD/规范，避免拍脑袋")

    colA, colB = st.columns(2)
    with colA:
        st.markdown("#### 各灰度批次通过率对比")
        batch_df = pd.DataFrame([
            {
                "组别": (b["gray_batch"] if b["gray_batch"] != "非灰度总体"
                         else b["gray_batch"]),
                "类型": "灰度" if b["gray_batch"].startswith("gray_") else "非灰度基准",
                "记录数": b["total"],
                "通过数": b["pass"],
                "通过率(%)": b["pass_rate"],
                "对比非灰度差值(%)": b["delta_vs_non_gray"],
            } for b in gray_analysis["by_batch"]
        ] + [{
            "组别": "非灰度总体", "类型": "非灰度基准",
            "记录数": replay_stats["total"] - gray_analysis["gray_record_count"],
            "通过数": replay_stats["by_replay_status"]["通过"] - sum(
                b["pass"] for b in gray_analysis["by_batch"]),
            "通过率(%)": gray_analysis["non_gray_pass_rate"],
            "对比非灰度差值(%)": 0,
        }])
        fig_batch = px.bar(
            batch_df, x="组别", y="通过率(%)", color="类型", text="通过率(%)",
            barmode="group", range_y=[0, 100],
            title="非灰度基准 vs 各灰度批次通过率",
            color_discrete_map={"非灰度基准": "#3b82f6", "灰度": "#f59e0b"},
        )
        fig_batch.update_traces(texttemplate="%{text}%")
        st.plotly_chart(fig_batch, use_container_width=True)

    with colB:
        st.markdown("#### 来源材料覆盖统计")
        sc = gray_analysis["source_chains"]
        counts_df = pd.DataFrame([
            {"类别": "可溯源", "条数": sum(1 for s in sc if s["can_trace"])},
            {"类别": "不可溯源", "条数": sum(1 for s in sc if not s["can_trace"])},
        ])
        fig_src = px.pie(counts_df, names="类别", values="条数",
                         title="来源材料可追溯率", hole=0.5,
                         color_discrete_sequence=["#22c55e", "#ef4444"])
        fig_src.update_traces(textinfo="label+percent+value")
        st.plotly_chart(fig_src, use_container_width=True)

    st.divider()
    st.markdown("#### 🔗 逐条引用链（点记录展开来源材料）")
    chain_df_rows = []
    for s in sc:
        chain_df_rows.append({
            "记录ID": s["record_id"],
            "工具名": s["tool_name"],
            "原结论": s["conclusion"],
            "来源数": s["source_count"],
            "可溯源": "✅ 是" if s["can_trace"] else "❌ 否",
            "来源材料标题": (
                "、".join(m["title"] for m in s["source_chain"])
                if s["source_chain"] else "—"
            ),
        })
    chain_df = pd.DataFrame(chain_df_rows)

    selected = st.dataframe(
        chain_df, use_container_width=True, hide_index=True, height=300,
        on_select="rerun", selection_mode="single-row",
    )
    if selected["selection"]["rows"]:
        idx = selected["selection"]["rows"][0]
        s = sc[idx]
        st.markdown(f"##### 引用链详情：{s['record_id']} · {s['tool_name']}")
        if not s["can_trace"]:
            st.error("⚠️ 该记录未关联任何来源材料，请联系标注员补录后再入库")
        for i, mat in enumerate(s["source_chain"]):
            with st.container(border=True):
                c1, c2 = st.columns([8, 2])
                c1.markdown(f"**来源材料 {i+1}：{mat['material_id']} — {mat['title']}**")
                c2.markdown(f"[打开文档 ↗]({mat['url']})")
                st.markdown(f"> {mat['snippet']}")

# ===========================================================================
# Tab5: 导出对账
# ===========================================================================
with tabs[4]:
    st.markdown("### 🧾 导出对账：界面摘要 ≡ 导出文件摘要")
    st.caption("避免「页面说通过，文件里又写待确认」")

    colA, colB = st.columns([3, 2])
    with colA:
        st.markdown("#### 本页界面摘要（唯一真相来源）")
        st.json({
            "summary_text": ui_summary["summary_text"],
            "audit_verdict": ui_summary["audit_verdict"],
            "metrics": ui_summary["metrics"],
        }, expanded=False)

    with colB:
        if exp_res:
            st.markdown("#### 最近一次导出对账结果")
            if exp_res["consistency"]["matched"]:
                st.success("✅ 一致！界面摘要与导出文件内容完全对上")
            else:
                st.error("❌ 不一致！以下字段有差异：")
                st.dataframe(pd.DataFrame(exp_res["consistency"]["diffs"]),
                             use_container_width=True, hide_index=True)

            st.download_button(
                label="📥 下载审计报告 Excel",
                data=open(exp_res["xlsx_path"], "rb").read(),
                file_name=os.path.basename(exp_res["xlsx_path"]),
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True,
            )
            st.download_button(
                label="📥 下载评审摘要 JSON",
                data=open(exp_res["json_path"], "rb").read(),
                file_name=os.path.basename(exp_res["json_path"]),
                mime="application/json",
                use_container_width=True,
            )

            with st.expander("导出生成的 JSON（与界面摘要对比）"):
                exported = json.load(open(exp_res["json_path"], encoding="utf-8"))
                st.json({
                    "summary_text": exported["summary_text"],
                    "audit_verdict": exported["audit_verdict"],
                    "metrics": exported["metrics"],
                }, expanded=True)
        else:
            st.warning("👈 请先在左侧点「导出 Excel + JSON 评审摘要」")

    with st.expander("📋 对账逻辑说明"):
        st.markdown("""
        对账检查三项：
        1. **`summary_text`** — 顶部那段文字说明，页面和导出 JSON 必须逐字一致
        2. **`audit_verdict`** — 本轮审计判定（通过 / 有条件通过），一致
        3. **`metrics.*`** — 6 个核心指标值（总记录、通过率、结论变化、灰度数、未溯源、修复率）一一对应

        生成导出文件时会跑一次对账，结果保存在 `consistency` 字段里。
        有差异就说明模块间不同步，要找平台工程师修。
        """)

# ===========================================================================
# Tab6: 评审分类
# ===========================================================================
with tabs[5]:
    st.markdown("### ✅ 模型评审结果分类（一眼分清哪些直接用）")
    st.caption("绿栏直接送模型训练；红栏请截图丢给平台工程师复核")

    direct_records = [r for r in dataset.records
                      if r.get("review_category") == "直接可用"]
    review_records = [r for r in dataset.records
                      if r.get("review_category") != "直接可用"]

    colG, colR = st.columns(2)
    with colG:
        st.markdown(
            """
            <div style="padding: 10px; background: #dcfce7; border-radius: 8px;
                        text-align: center; font-weight: 700; color: #166534;
                        font-size: 16px; margin-bottom: 14px;">
                ✅ 直接可用（{n} 条）
            </div>
            """.format(n=len(direct_records)),
            unsafe_allow_html=True,
        )
        if direct_records:
            d_df = pd.DataFrame([
                {
                    "记录ID": r["record_id"], "工具名": r["tool_name"],
                    "工具分类": r.get("tool_category"), "标注员": r.get("annotator"),
                    "参数数量": len(r.get("params", [])),
                    "原状态": r.get("original_audit_status"),
                    "来源关联": "✅" if r.get("source_material_ids") else "❌",
                } for r in direct_records
            ])
            st.dataframe(d_df, use_container_width=True, hide_index=True, height=400)
            st.caption("以上记录：无关键风险 + 非灰度 + 无脏数据残留，可直接用于训练。")
        else:
            st.info("当前没有可直接用的记录")

    with colR:
        st.markdown(
            """
            <div style="padding: 10px; background: #fee2e2; border-radius: 8px;
                        text-align: center; font-weight: 700; color: #991b1b;
                        font-size: 16px; margin-bottom: 14px;">
                🔴 需平台工程师复核（{n} 条）
            </div>
            """.format(n=len(review_records)),
            unsafe_allow_html=True,
        )
        if review_records:
            r_df = pd.DataFrame([
                {
                    "记录ID": r["record_id"], "工具名": r["tool_name"],
                    "需复核原因": "、".join(r.get("risk_tags", [])) or (
                        "灰度批次观察中" if r.get("gray_flag") else "—"
                    ),
                    "灰度批次": r.get("gray_batch") or "—",
                    "标注员": r.get("annotator"),
                    "原状态": r.get("original_audit_status"),
                } for r in review_records
            ])
            st.dataframe(r_df, use_container_width=True, hide_index=True, height=400)

            reason_counter = Counter()
            for r in review_records:
                if r.get("risk_tags"):
                    for t in r["risk_tags"]:
                        reason_counter[t] += 1
                if r.get("gray_flag"):
                    reason_counter["灰度观察未转正"] += 1
            with st.expander("📊 复核原因分布（可导出截图发给平台工程师）"):
                rc_df = pd.DataFrame([
                    {"原因": k, "条数": v} for k, v in reason_counter.most_common()
                ])
                fig_reason = px.bar(rc_df, x="原因", y="条数", text="条数",
                                    color="条数", color_continuous_scale="Reds")
                st.plotly_chart(fig_reason, use_container_width=True)
        else:
            st.success("太棒了！没有需要复核的记录")

# ---------------------------------------------------------------------------
# 页脚
# ---------------------------------------------------------------------------
st.divider()
st.caption(
    "工具参数 Schema 审计工作台 · 图/表/文字一致 · 评测回放与人工修正跑稳 · "
    "灰度对比溯源 · 导出对账无误 · 评审结果双栏分明"
)
