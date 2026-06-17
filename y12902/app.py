import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

import database as db
import data_import as di
import report as rp
import seed_data as sd

st.set_page_config(
    page_title="指令微调样本配比台",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------- Style ----------
st.markdown("""
<style>
.big-metric { font-size: 1.4rem; font-weight: 600; }
.report-box {
    background: #f7f9fc; border: 1px solid #dde4ef; border-radius: 8px;
    padding: 16px 20px; white-space: pre-wrap; line-height: 1.7;
    font-size: 14px; color: #2c3e50;
}
.tag-good { color: #0a7f3d; font-weight: 600; }
.tag-warn { color: #c47b00; font-weight: 600; }
.tag-bad  { color: #c0392b; font-weight: 600; }
.trace-step {
    border-left: 4px solid #4a90e2; padding: 8px 14px; margin: 10px 0;
    background: #f4f8ff; border-radius: 4px;
}
</style>
""", unsafe_allow_html=True)

st.title("📊 指令微调样本配比台")
st.caption("评测题库 → 提示词版本 → 评测记录 → 处理意见，共用同一批数据，图表/明细/报告不再各算各的")

# ---------- Sidebar ----------
with st.sidebar:
    st.header("🧭 导航")
    page = st.radio(
        "选择功能页签",
        [
            "📈 看板总览",
            "📚 评测题库管理",
            "🔖 提示词版本",
            "📥 导入评测结果",
            "🧪 样本配比分析",
            "🔍 异常追溯 & 处理意见",
            "📄 生成报告 & 导出",
            "🧩 示例数据 / 初始化",
        ],
        label_visibility="collapsed",
    )
    st.divider()
    versions = db.list_prompt_versions()
    if versions:
        st.subheader("切换提示词版本")
        version_options = {f"#{v['id']} · {v['version_name']}（导入于 {v['imported_at']}）": v["id"] for v in versions}
        selected_vid = st.selectbox(
            "当前分析版本",
            options=list(version_options.keys()),
            index=0,
            key="global_version_select",
        )
        st.session_state["current_pv_id"] = version_options[selected_vid]
    else:
        st.info("还没有任何提示词版本，请到『示例数据 / 初始化』一键生成，或在『提示词版本』页签导入。")
        st.session_state["current_pv_id"] = None

CUR_PV_ID = st.session_state.get("current_pv_id")

# ==============================================================
# 页面 1: 看板总览
# ==============================================================
if page.startswith("📈"):
    st.header("📈 看板总览 · 图表 + 明细 共用同一份数据")
    if CUR_PV_ID is None:
        st.info("请先在左侧选择提示词版本，或使用『🧩 示例数据 / 初始化』一键生成数据。")
        st.stop()

    pv = db.get_prompt_version(CUR_PV_ID)
    summary = db.get_prompt_version_summary(CUR_PV_ID)
    ratio = db.get_dataset_ratio(CUR_PV_ID)

    st.subheader(f"当前版本：{pv['version_name']}")
    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("题目总数", summary["total"])
    col2.metric("通过", summary["pass"], delta=f"{summary['pass_rate']}% 通过率")
    col3.metric("不通过", summary["fail"])
    col4.metric("异常", summary["exception"], delta="见异常追溯页签")
    col5.metric("平均得分", summary["avg_score"])

    tab1, tab2, tab3, tab4 = st.tabs(["分类通过率 · 柱状图", "样本配比 · 饼图", "难度分布 · 堆叠图", "明细预览"])

    with tab1:
        by_cat = summary["by_category"]
        if by_cat:
            df_cat = pd.DataFrame([
                {
                    "分类": k,
                    "通过率(%)": v["pass_rate"],
                    "平均得分": v["avg_score"],
                    "题目数": v["total"],
                    "通过数": v["pass"],
                    "不通过数": v["fail"],
                    "异常数": v["exception"],
                }
                for k, v in by_cat.items()
            ]).sort_values("通过率(%)", ascending=False)
            fig = px.bar(
                df_cat, x="分类", y="通过率(%)",
                text="通过率(%)", color="通过率(%)",
                color_continuous_scale="RdYlGn",
                range_color=[0, 100],
                title="各分类通过率（来源：同一批评测记录）",
                hover_data={"平均得分": True, "题目数": True, "通过数": True, "不通过数": True, "异常数": True},
            )
            fig.update_layout(height=420)
            st.plotly_chart(fig, use_container_width=True)
            st.dataframe(df_cat, use_container_width=True, hide_index=True)
        else:
            st.warning("当前版本还没有评测记录数据。")

    with tab2:
        if ratio:
            df_ratio = pd.DataFrame([
                {
                    "分类": r["category"],
                    "实际题目数": r["actual_count"] or 0,
                    "实际占比(%)": r["actual_ratio"] or 0,
                    "预期占比(%)": r["expected_ratio"] if r["expected_ratio"] is not None else "未设置",
                }
                for r in ratio
            ])
            fig = px.pie(
                df_ratio, values="实际题目数", names="分类",
                title="样本分类占比（实际）",
                hole=0.4,
            )
            fig.update_traces(textposition="inside", textinfo="percent+label")
            st.plotly_chart(fig, use_container_width=True)

            if any(r["expected_ratio"] is not None for r in ratio):
                st.markdown("##### 预期 vs 实际 配比对比")
                fig2 = go.Figure()
                cats = [r["category"] for r in ratio]
                actual_vals = [r["actual_ratio"] or 0 for r in ratio]
                expect_vals = [r["expected_ratio"] if r["expected_ratio"] is not None else 0 for r in ratio]
                fig2.add_trace(go.Bar(x=cats, y=expect_vals, name="预期占比(%)", marker_color="#a0c4e8"))
                fig2.add_trace(go.Bar(x=cats, y=actual_vals, name="实际占比(%)", marker_color="#4a90e2"))
                fig2.update_layout(barmode="group", title="预期配比 vs 实际配比", height=360)
                st.plotly_chart(fig2, use_container_width=True)
            st.dataframe(df_ratio, use_container_width=True, hide_index=True)
        else:
            st.warning("暂无配比数据。")

    with tab3:
        by_diff = summary["by_difficulty"]
        if by_diff:
            df_diff = pd.DataFrame([
                {"难度": k, "通过": v["pass"], "不通过": v["fail"], "总数": v["total"]}
                for k, v in by_diff.items()
            ])
            fig = px.bar(
                df_diff, x="难度", y=["通过", "不通过"],
                title="按难度分布的通过情况",
                barmode="stack",
                color_discrete_map={"通过": "#2ecc71", "不通过": "#e74c3c"},
            )
            st.plotly_chart(fig, use_container_width=True)
            st.dataframe(df_diff, use_container_width=True, hide_index=True)
        else:
            st.warning("暂无难度分布数据。")

    with tab4:
        st.subheader("全部评测明细（支持按分类 / 异常 / 不通过过滤）")
        fcol1, fcol2, fcol3, fcol4 = st.columns(4)
        f_cat = fcol1.selectbox("分类筛选", ["全部"] + db.get_question_categories())
        f_exc = fcol2.checkbox("只看异常", False)
        f_fail = fcol3.checkbox("只看不通过", False)
        f_kw = fcol4.text_input("关键词搜索（题目/异常详情）")
        records = db.list_eval_records(
            prompt_version_id=CUR_PV_ID,
            only_exception=f_exc,
            only_fail=f_fail,
            category=None if f_cat == "全部" else f_cat,
            keyword=f_kw or None,
        )
        if records:
            show_cols = [
                "question_id", "question_text", "category", "difficulty",
                "score", "is_pass", "exception_type", "exception_detail", "latency_ms", "created_at"
            ]
            df_records = pd.DataFrame(records)
            df_records = df_records[[c for c in show_cols if c in df_records.columns]]
            df_records = df_records.rename(columns={
                "question_id": "题目ID", "question_text": "题目内容",
                "category": "分类", "difficulty": "难度",
                "score": "得分", "is_pass": "是否通过",
                "exception_type": "异常类型", "exception_detail": "异常详情",
                "latency_ms": "耗时(ms)", "created_at": "创建时间",
            })
            df_records["是否通过"] = df_records["是否通过"].map(
                lambda x: "通过" if x == 1 else ("不通过" if x == 0 else "（异常/未评测）")
            )
            st.dataframe(df_records, use_container_width=True, hide_index=True)
        else:
            st.info("没有匹配的评测记录。")

# ==============================================================
# 页面 2: 评测题库管理
# ==============================================================
elif page.startswith("📚"):
    st.header("📚 评测题库管理")
    action = st.radio("操作", ["查看 / 筛选题库", "导入题库文件"], horizontal=True)

    if action.startswith("查看"):
        c1, c2, c3 = st.columns(3)
        cat = c1.selectbox("分类", ["全部"] + db.get_question_categories())
        kw = c2.text_input("关键词（题目/知识点/ID）")
        cnt_by_cat = db.get_question_count_by_category()
        if cnt_by_cat:
            with c3:
                st.metric("题库总题数", sum(cnt_by_cat.values()))
        rows = db.list_questions(category=None if cat == "全部" else cat, keyword=kw or None)
        if rows:
            df = pd.DataFrame(rows)
            cols = ["question_id", "question_text", "category", "difficulty",
                    "knowledge_point", "source", "created_at"]
            df = df[[c for c in cols if c in df.columns]]
            df = df.rename(columns={
                "question_id": "题目ID", "question_text": "题目内容", "category": "分类",
                "difficulty": "难度", "knowledge_point": "知识点",
                "source": "来源", "created_at": "入库时间",
            })
            st.dataframe(df, use_container_width=True, hide_index=True)
            st.caption(f"共 {len(rows)} 条结果 · 分类分布：{cnt_by_cat}")
        else:
            st.info("题库为空，请先导入。")

    else:
        st.markdown("##### 支持列名（中文/英文均可自动识别）：")
        st.json({
            "必填": ["题目ID / question_id", "题目内容 / question_text"],
            "可选": ["分类", "难度", "知识点", "来源", "参考答案", "标签"],
        })
        uploaded = st.file_uploader("上传题库文件（.csv / .xlsx）", type=["csv", "xlsx"])
        if uploaded is not None:
            try:
                rows, cols = di.parse_question_bank(uploaded.read(), uploaded.name)
                st.success(f"解析成功，共 {len(rows)} 行，识别列：{cols}")
                with st.expander("预览前 5 行", expanded=True):
                    st.dataframe(pd.DataFrame(rows).head(), use_container_width=True)
                if st.button("确认写入题库", type="primary"):
                    result = db.upsert_question_bank(rows)
                    st.success(
                        f"✅ 写入完成：新增 {result['inserted']} 题，"
                        f"更新 {result['updated']} 题，跳过 {result['skipped']} 题。"
                    )
            except Exception as e:
                st.error(f"解析失败：{e}")

# ==============================================================
# 页面 3: 提示词版本
# ==============================================================
elif page.startswith("🔖"):
    st.header("🔖 提示词版本管理")
    st.caption("同一批提示词版本再次导入会自动合并，不会出现两份互相打架的结论。")

    with st.form("import_prompt_form"):
        st.markdown("##### 导入 / 新建 提示词版本")
        c1, c2 = st.columns([1, 2])
        vname = c1.text_input("版本名称（例：prompt_v1.3_fewshot）", "")
        author = c2.text_input("导入人", "")
        pcontent = st.text_area("提示词内容", height=160)
        desc = st.text_input("版本说明 / 备注", "")
        note = st.text_input("本次导入说明（例：2026Q2 评测周第二次回归）", "")
        submit = st.form_submit_button("导入 / 匹配版本", type="primary")
        if submit:
            if not vname.strip() or not pcontent.strip():
                st.error("请填写『版本名称』和『提示词内容』。")
            else:
                result = db.import_prompt_version(vname, pcontent, desc, note, author)
                if result["status"] == "merged":
                    st.warning(f"🔗 {result['message']}")
                else:
                    st.success(f"🆕 {result['message']}")
                st.session_state["current_pv_id"] = result["id"]

    st.divider()
    st.subheader("已有提示词版本")
    versions = db.list_prompt_versions()
    if versions:
        for v in versions:
            with st.expander(f"#{v['id']} · {v['version_name']} （导入于 {v['imported_at']}）", expanded=False):
                c_meta1, c_meta2, c_meta3 = st.columns(3)
                c_meta1.caption(f"版本 Hash：`{v['version_hash']}`")
                c_meta2.caption(f"导入人：{v['author'] or '(未填)'}")
                c_meta3.caption(f"说明：{v['description'] or '(无)'}")
                st.markdown("**提示词内容：**")
                st.code(v["prompt_content"], language="text")
                if v["import_note"]:
                    st.caption(f"导入备注：{v['import_note']}")
                s = db.get_prompt_version_summary(v["id"])
                st.markdown(
                    f"📊 **评测概况：** 总题 {s['total']} · 通过 {s['pass']} · "
                    f"不通过 {s['fail']} · 异常 {s['exception']} · 通过率 {s['pass_rate']}%"
                )
    else:
        st.info("暂无版本。可在下方『🧩 示例数据 / 初始化』一键生成。")

# ==============================================================
# 页面 4: 导入评测结果
# ==============================================================
elif page.startswith("📥"):
    st.header("📥 导入评测结果")
    st.caption("导入后会更新评测记录，刷新页面内所有图表/明细/报告，全部共用同一份处理记录。")

    if CUR_PV_ID is None:
        st.warning("请先在左侧或『🔖 提示词版本』页签中选择一个提示词版本。")
        st.stop()
    pv = db.get_prompt_version(CUR_PV_ID)
    st.info(f"当前将写入到版本：#{pv['id']} · {pv['version_name']}")

    st.markdown("##### 支持列名（中文/英文均可自动识别）：")
    st.json({
        "必填": ["题目ID / question_id"],
        "可选": ["模型输出", "得分", "是否通过", "评测状态", "异常类型", "异常详情", "耗时毫秒"],
    })
    uploaded = st.file_uploader("上传评测结果（.csv / .xlsx）", type=["csv", "xlsx"])
    if uploaded is not None:
        try:
            rows, cols = di.parse_eval_records(uploaded.read(), uploaded.name)
            st.success(f"解析成功，共 {len(rows)} 行，识别列：{cols}")
            with st.expander("预览前 5 行", expanded=True):
                st.dataframe(pd.DataFrame(rows).head(), use_container_width=True)
            if st.button("确认写入该版本的评测记录", type="primary"):
                result = db.upsert_eval_records(CUR_PV_ID, rows)
                st.success(
                    f"✅ 写入完成：新增 {result['inserted']} 条，"
                    f"更新 {result['updated']} 条，跳过 {result['skipped']} 条。"
                )
        except Exception as e:
            st.error(f"解析失败：{e}")

# ==============================================================
# 页面 5: 样本配比分析
# ==============================================================
elif page.startswith("🧪"):
    st.header("🧪 样本配比分析 · 偏科原因一眼看懂")
    if CUR_PV_ID is None:
        st.info("请先在左侧选择提示词版本。")
        st.stop()

    pv = db.get_prompt_version(CUR_PV_ID)
    ratio = db.get_dataset_ratio(CUR_PV_ID)
    summary = db.get_prompt_version_summary(CUR_PV_ID)
    total = summary["total"]

    st.caption(f"当前版本：{pv['version_name']} · 已评测 {total} 题")
    if total == 0:
        st.info(
            "ℹ️  当前版本还没有评测记录，实际占比暂时为 0。"
            "你仍然可以先在这里配置每个分类的预期占比，等评测结果导入后系统会自动计算偏离程度。"
        )

    ratio_map = {r["category"]: r for r in ratio}
    cats_from_db = db.get_question_categories()
    all_cats = list(dict.fromkeys(list(ratio_map.keys()) + cats_from_db))

    with st.form("expected_ratio_form"):
        st.markdown("##### 设置每个分类的『预期占比』")
        if not all_cats:
            st.info(
                "还没有任何分类可用。请先在『📚 评测题库管理』导入带『分类』字段的题目，"
                "或者先导入评测记录，系统会自动识别分类。"
            )
            submitted = st.form_submit_button("保存预期占比并重新计算偏离程度", type="primary", disabled=True)
        else:
            cols = st.columns(3)
            new_ratios = {}
            for i, cat in enumerate(all_cats):
                col = cols[i % len(cols)]
                cur = ratio_map.get(cat, {})
                default = cur.get("expected_ratio")
                if default is None:
                    default = round(cur.get("actual_ratio", 0) or 0, 2)
                new_ratios[cat] = col.number_input(
                    f"{cat} 预期占比(%) · 实际 {cur.get('actual_ratio', 0) or 0}%",
                    min_value=0.0, max_value=100.0, value=float(default), step=0.5,
                    key=f"ratio_{cat}",
                )
            submitted = st.form_submit_button("保存预期占比并重新计算偏离程度", type="primary")
            if submitted:
                total_r = sum(new_ratios.values())
                db.set_expected_ratio(CUR_PV_ID, new_ratios)
                st.success(f"✅ 已保存。当前预期占比合计：{total_r}%（建议合计约 100%）")
                ratio = db.get_dataset_ratio(CUR_PV_ID)

    if ratio:
        st.divider()
        st.subheader("配比结果")
        rows_view = []
        biased = []
        for r in ratio:
            dev = r["deviation"]
            tag = ""
            if dev is not None:
                if abs(dev) > 15:
                    tag = "严重偏离"
                elif abs(dev) > 10:
                    tag = "明显偏离"
                elif abs(dev) > 5:
                    tag = "轻微偏离"
                else:
                    tag = "符合预期"
                if abs(dev) > 10:
                    reason = f"该分类{'样本偏多' if dev > 0 else '样本不足'}，建议补充或减少约 {abs(dev)} 个百分点的样本。"
                    biased.append(f"【{r['category']}】{reason}")
            rows_view.append({
                "分类": r["category"],
                "实际题目数": r["actual_count"] or 0,
                "实际占比(%)": r["actual_ratio"] or 0,
                "预期占比(%)": r["expected_ratio"] if r["expected_ratio"] is not None else "(未设置)",
                "偏离(百分点)": dev if dev is not None else "-",
                "评估": tag or "(未设置预期占比)",
            })
        df = pd.DataFrame(rows_view)
        st.dataframe(df, use_container_width=True, hide_index=True)

        if biased:
            st.markdown("##### 🎯 偏科原因（普通话解释，可复制）")
            plain = "本评测集在分类样本分布上存在以下偏科：\n" + "；\n".join(biased) + "。"
            st.markdown(f'<div class="report-box">{plain}</div>', unsafe_allow_html=True)
        elif any(r["expected_ratio"] is not None for r in ratio):
            st.success("✅ 所有已设置预期占比的分类都在预期范围内，无明显偏科。")
        else:
            st.info("还没有为任何分类设置预期占比，请在上方填写后点击『保存预期占比』。")
    elif total > 0:
        st.info("暂未计算出配比结果，请确认是否已导入评测记录。")

# ==============================================================
# 页面 6: 异常追溯 & 处理意见
# ==============================================================
elif page.startswith("🔍"):
    st.header("🔍 异常追溯 · 从异常反查评测题库和处理意见")
    st.caption("顺着一条异常往回查：评测记录 → 题库原题 → 提示词版本 → 处理意见，整条链路齐全。")
    if CUR_PV_ID is None:
        st.info("请先选择提示词版本。")
        st.stop()

    exceptions = db.list_eval_records(prompt_version_id=CUR_PV_ID, only_exception=True)
    fails = db.list_eval_records(prompt_version_id=CUR_PV_ID, only_fail=True)

    c1, c2 = st.columns(2)
    c1.metric("异常记录数", len(exceptions))
    c2.metric("不通过记录数", len(fails))

    view_mode = st.radio("查看范围", ["异常记录", "不通过记录", "全部评测记录"], horizontal=True)
    if view_mode == "异常记录":
        pool = exceptions
    elif view_mode == "不通过记录":
        pool = fails
    else:
        pool = db.list_eval_records(prompt_version_id=CUR_PV_ID)

    if not pool:
        st.info("当前范围没有记录。")
        st.stop()

    options = {
        f"#{r['id']} · {r['question_id']} · {r.get('category', '未分类')} · "
        f"{r.get('exception_type') or ('不通过' if r.get('is_pass') == 0 else '')} · "
        f"{(r.get('question_text') or '')[:28]}...": r["id"]
        for r in pool
    }
    sel = st.selectbox("选择要追溯的记录", list(options.keys()))
    sel_id = options[sel]

    st.divider()
    trace = rp.build_exception_trace_data(sel_id)
    if not trace:
        st.error("找不到该记录。")
        st.stop()

    st.markdown("#### 📍 追溯链路")

    st.markdown('<div class="trace-step"><b>第 1 步：异常 / 评测记录</b></div>', unsafe_allow_html=True)
    er = trace["eval_record"]
    col_a, col_b, col_c = st.columns(3)
    col_a.metric("评测记录ID", f"#{er['id']}")
    col_b.metric("状态", er.get("exception_type") or ("通过" if er.get("is_pass") == 1 else "不通过"))
    col_c.metric("得分", er.get("score", "无"))

    rec_df = pd.DataFrame([{
        "题目ID": er.get("question_id"),
        "得分": er.get("score"),
        "是否通过": "通过" if er.get("is_pass") == 1 else ("不通过" if er.get("is_pass") == 0 else "异常/未评"),
        "异常类型": er.get("exception_type"),
        "异常详情": er.get("exception_detail"),
        "耗时(ms)": er.get("latency_ms"),
        "创建时间": er.get("created_at"),
        "更新时间": er.get("updated_at"),
    }])
    st.dataframe(rec_df, use_container_width=True, hide_index=True)
    with st.expander("查看模型输出内容"):
        st.write(er.get("model_output") or "（无）")

    st.markdown('<div class="trace-step"><b>第 2 步：回到评测题库原题</b></div>', unsafe_allow_html=True)
    q = trace["question"]
    q_df = pd.DataFrame([{
        "题目ID": q.get("question_id"),
        "题目分类": q.get("category"),
        "题目难度": q.get("difficulty"),
        "知识点": q.get("knowledge_point"),
        "来源": q.get("source"),
    }])
    st.dataframe(q_df, use_container_width=True, hide_index=True)
    with st.expander("📝 题目原文", expanded=True):
        st.markdown(f"**题目内容：**\n> {q.get('question_text') or '（无）'}")
    with st.expander("✅ 参考答案"):
        st.write(q.get("reference_answer") or "（无）")

    st.markdown('<div class="trace-step"><b>第 3 步：对应的提示词版本</b></div>', unsafe_allow_html=True)
    pv = trace["prompt_version"]
    st.info(f"版本名称：{pv.get('version_name')}  |  描述：{pv.get('description') or '（无）'}")
    with st.expander("提示词原文"):
        st.code(pv.get("prompt_content") or "（无）", language="text")

    st.markdown('<div class="trace-step"><b>第 4 步：处理意见（可新增 / 查看历史）</b></div>', unsafe_allow_html=True)
    notes = trace["treatment_notes"]
    if notes:
        for n in notes:
            with st.chat_message("pencil"):
                st.markdown(
                    f"**{n['note_type']}** · 处理人：{n['handler'] or '（未填）'} · {n['created_at']}\n\n{n['note_content']}"
                )
    else:
        st.info("暂无处理意见，可在下方新增一条。")

    with st.form("add_note_form"):
        c_n1, c_n2 = st.columns([1, 2])
        nt = c_n1.selectbox("意见类型", ["已修复", "标记样本问题", "提示词优化建议", "模型能力限制", "需补充训练数据", "其他"])
        handler = c_n2.text_input("处理人", "")
        nc = st.text_area("处理意见详情", height=100, placeholder="例如：该异常是由于上游服务超时导致，已增加重试机制；建议补充该分类样本...")
        add = st.form_submit_button("💾 新增处理意见", type="primary")
        if add:
            if not nc.strip():
                st.error("请填写处理意见详情。")
            else:
                nid = db.add_treatment_note(sel_id, nt, nc, handler)
                st.success(f"✅ 已保存处理意见（ID={nid}）。")
                st.rerun()

# ==============================================================
# 页面 7: 生成报告 & 导出
# ==============================================================
elif page.startswith("📄"):
    st.header("📄 生成报告 & 导出 · 可直接转给不懂代码的同事")
    if CUR_PV_ID is None:
        st.info("请先在左侧选择提示词版本。还没有版本的话，去『🔖 提示词版本』页签导入一个，或点『🧩 示例数据 / 初始化』一键生成。")
        st.stop()

    pv = db.get_prompt_version(CUR_PV_ID)
    if not pv:
        st.error("当前提示词版本不存在，可能已被删除。请在左侧重新选择。")
        st.stop()

    try:
        report = rp.generate_plain_report(CUR_PV_ID)
    except Exception as e:
        st.error(f"生成报告时出错：{e}")
        st.stop()
    if not report:
        st.error("无法生成报告，请稍后重试。")
        st.stop()

    summary = report["summary"]
    total = summary["total"]
    data_status = report.get("data_status", "unknown")

    # 顶部状态横幅
    status_info = {
        "empty": ("⚠️", "该版本还没有评测记录", "橙"),
        "partial": ("ℹ️", "评测记录不完整（还有异常或待评测）", "蓝"),
        "ready": ("✅", "评测记录完整，可以交付", "绿"),
    }.get(data_status, ("ℹ️", "数据状态未知", "灰"))
    icon, msg, color = status_info
    if color == "绿":
        st.success(f"{icon} {msg}")
    elif color == "橙":
        st.warning(f"{icon} {msg}。下面依然可以预览报告模板和下载 Excel（里面会写清楚下一步怎么补数据）。")
    else:
        st.info(f"{icon} {msg}")

    st.subheader(f"报告摘要（版本：{pv['version_name']}）")
    st.markdown("##### 💬 普通话解释版 · 可直接复制给同事")
    with st.container():
        st.markdown(f'<div class="report-box">{report["plain_text"]}</div>', unsafe_allow_html=True)
    cc1, cc2 = st.columns([1, 5])
    cc1.button("📋 一键复制（手动选中复制即可）", disabled=True, help="浏览器安全限制：请直接选中上方文字复制")
    cc2.caption("提示：选中上方灰色框里的文字直接 Ctrl+C / Cmd+C 即可；也可以下载下方的 Markdown / Excel。")

    st.divider()
    st.subheader("📊 结构化指标详情")
    mc1, mc2, mc3, mc4, mc5, mc6 = st.columns(6)
    mc1.metric("题目总数", summary["total"])
    mc2.metric("通过", summary["pass"])
    mc3.metric("不通过", summary["fail"])
    mc4.metric("异常", summary["exception"])
    mc5.metric("通过率", f"{summary['pass_rate']}%" if total > 0 else "—")
    mc6.metric("平均得分", summary["avg_score"] if total > 0 else "—")

    st.markdown("##### 各分类表现")
    if summary["by_category"]:
        cat_rows = []
        for cat, info in summary["by_category"].items():
            cat_rows.append({
                "分类": cat,
                "题目总数": info["total"],
                "通过数": info["pass"],
                "不通过数": info["fail"],
                "异常数": info["exception"],
                "通过率(%)": info["pass_rate"],
                "平均得分": info["avg_score"],
            })
        st.dataframe(pd.DataFrame(cat_rows), use_container_width=True, hide_index=True)
    else:
        if total == 0:
            st.info("还没有评测记录，等导入评测结果后会自动按分类统计。")
        else:
            st.info("当前题目未标注『分类』字段，请到『📚 评测题库管理』补充。")

    st.markdown("##### 样本配比 / 偏科原因")
    if report["ratio"]:
        ratio_rows = []
        for r in report["ratio"]:
            dev = r["deviation"]
            reason = ""
            if dev is not None:
                if dev > 10:
                    reason = f"⚠️ 该类别样本偏多（实际比预期多 {dev} 个百分点）"
                elif dev < -10:
                    reason = f"⚠️ 该类别样本不足（实际比预期少 {abs(dev)} 个百分点）"
                else:
                    reason = "✅ 占比符合预期"
            ratio_rows.append({
                "分类": r["category"],
                "实际题目数": r["actual_count"] or 0,
                "实际占比(%)": r["actual_ratio"] or 0,
                "预期占比(%)": r["expected_ratio"] if r["expected_ratio"] is not None else "（未设置）",
                "偏离(百分点)": dev if dev is not None else "-",
                "偏科原因": reason or "（未设置预期占比，无法判断）",
            })
        st.dataframe(pd.DataFrame(ratio_rows), use_container_width=True, hide_index=True)
    else:
        if total == 0:
            st.info("还没有评测记录，暂无样本占比。可以先去『🧪 样本配比分析』设置预期占比。")
        else:
            st.info("暂时没有配比数据，系统会在导入评测记录后自动计算。")

    st.divider()
    st.subheader("📥 导出文件 · 给业务方 / 不懂代码的同事看")
    try:
        wb_bytes = rp.build_export_workbook(CUR_PV_ID)
        safe_name = pv["version_name"].replace("/", "_").replace("\\", "_")
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"评测报告_{safe_name}_{ts}.xlsx"
        label_prefix = "（数据齐全）" if data_status == "ready" else ("（空批次占位说明版）" if data_status == "empty" else "（部分数据）")
        st.download_button(
            f"⬇️ 下载 Excel 报告 {label_prefix} · 8 个 Sheet / 中文列名 / 偏科原因说明",
            data=wb_bytes,
            file_name=filename,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type="primary",
            use_container_width=True,
        )
        md_text = (
            f"# 评测报告 · {pv['version_name']}\n\n"
            f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            f"数据状态：{msg}\n\n"
            f"---\n\n{report['plain_text']}\n"
        )
        st.download_button(
            "⬇️ 下载 Markdown 报告（适合复制粘贴到文档 / IM）",
            data=md_text.encode("utf-8"),
            file_name=f"评测报告_{safe_name}_{ts}.md",
            mime="text/markdown",
            use_container_width=True,
        )
        st.caption(
            "Excel 固定 8 个 Sheet：①评测结论摘要 ②总体指标 ③分类表现 ④样本配比_偏科原因 "
            "⑤难度分布 ⑥全部评测明细 ⑦异常明细_请处理 ⑧不通过明细。即使暂时没有数据，每个 Sheet 也会给出说明和下一步操作。"
        )
    except Exception as e:
        st.error(f"生成导出文件失败：{e}")
        st.caption("可以刷新页面后重试，或先检查提示词版本是否存在。")

# ==============================================================
# 页面 8: 示例数据 / 初始化
# ==============================================================
else:
    st.header("🧩 示例数据 / 一键初始化")
    st.markdown("""
点一下按钮即可生成一套示例数据，立刻体验完整流程：
1. **评测题库**：覆盖阅读理解、逻辑推理、代码生成、数学计算、翻译任务、常识问答 6 个分类
2. **两个提示词版本**：`prompt_v1.0_基线版` 和 `prompt_v2.0_带few-shot版`
3. **重复导入演示**：第二次导入 v1.0 会自动合并（而不是重复生成）
4. **评测记录**：含通过 / 不通过 / 异常 三种状态
5. **预期配比 & 处理意见**：预置预期占比和若干异常的处理意见，方便直接看报告和追溯
""")
    c1, c2 = st.columns(2)
    qcnt = c1.number_input("题库题目数", min_value=10, max_value=500, value=50, step=10)
    c2.caption("提示：建议 30-80 题便于快速浏览。")
    if st.button("🚀 一键生成示例数据", type="primary", use_container_width=True):
        with st.spinner("正在生成示例数据..."):
            ids = sd.seed_all(int(qcnt))
        st.success(f"✅ 生成完成！v1.0 ID={ids['v1']}, v2.0 ID={ids['v2']}")
        st.session_state["current_pv_id"] = ids["v1"]
        st.balloons()

    st.divider()
    st.subheader("📋 使用速查")
    with st.expander("快速上手的 5 步流程", expanded=True):
        st.markdown("""
1. **导入评测题库**（📚 评测题库管理）——建议先准备好含 题目ID、题目内容、分类、难度、知识点、参考答案 等列的 Excel
2. **导入提示词版本**（🔖 提示词版本）——填 版本名称 + 提示词内容；同一批内容重复导入会自动合并
3. **导入评测结果**（📥 导入评测结果）——上传含 题目ID + 得分/是否通过/异常信息 的文件
4. **配比与分析**（🧪 样本配比分析）——设置预期占比，自动识别偏科原因
5. **异常回溯 & 输出报告**（🔍 异常追溯 + 📄 报告导出）——从异常一路追到原题和提示词，导出带中文解释的 Excel 给同事
""")

    st.divider()
    st.subheader("🛠️ 数据库信息")
    import os
    db.DB_PATH
    size_kb = round(os.path.getsize(db.DB_PATH) / 1024, 1) if os.path.exists(db.DB_PATH) else 0
    st.caption(f"数据库位置：{db.DB_PATH}  |  当前大小：{size_kb} KB")
    if st.button("⚠️ 清空所有数据（重置数据库）"):
        if os.path.exists(db.DB_PATH):
            os.remove(db.DB_PATH)
        db.init_db()
        st.success("✅ 已清空并重置。")
        if "current_pv_id" in st.session_state:
            del st.session_state["current_pv_id"]
        st.rerun()
