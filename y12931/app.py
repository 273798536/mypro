import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from io import BytesIO
from datetime import datetime
import json
import os

import database as db
import balancer as bl
import sample_data as sd
import report_generator as rg

st.set_page_config(
    page_title="多语言样本平衡器",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    .stApp { background: #f5f7fa; }
    [data-testid="stSidebar"] { background: #1a365d; color: #fff; }
    [data-testid="stSidebar"] label { color: #e2e8f0 !important; }
    h1, h2, h3 { color: #1e3a5f; }
    .big-metric { font-size: 24px; font-weight: 700; color: #2b6cb0; }
    .block-card { background: #fff; border-radius: 10px; padding: 16px;
                  box-shadow: 0 1px 6px rgba(0,0,0,0.06); margin-bottom: 16px; }
    .severity-high { color: #c53030; font-weight: 600; }
    .severity-medium { color: #d69e2e; font-weight: 600; }
    .severity-low { color: #38a169; font-weight: 600; }
    .pass-tag { background: #c6f6d5; color: #22543d; padding: 2px 10px;
                border-radius: 12px; font-size: 12px; font-weight: 600; }
    .fail-tag { background: #fed7d7; color: #63171b; padding: 2px 10px;
                border-radius: 12px; font-size: 12px; font-weight: 600; }
</style>
""", unsafe_allow_html=True)


def _df_for_serialize(df: pd.DataFrame) -> pd.DataFrame:
    keep_cols = [c for c in df.columns if c not in ("balanced_df", "cleaned_df")]
    return df[keep_cols] if keep_cols else df


def _serialize_result_for_db(result: dict) -> dict:
    r = {}
    for k, v in result.items():
        if isinstance(v, pd.DataFrame):
            r[k] = v.to_dict(orient="records")
        elif isinstance(v, dict):
            r[k] = _serialize_result_for_db(v)
        else:
            r[k] = v
    return r


def _deserialize_result_from_db(data: dict) -> dict:
    result = dict(data)
    if "balanced_df" in result and isinstance(result["balanced_df"], list):
        result["balanced_df"] = pd.DataFrame(result["balanced_df"])
    if "cleaned_df" in result and isinstance(result["cleaned_df"], list):
        result["cleaned_df"] = pd.DataFrame(result["cleaned_df"])
    return result


def _severity_badge(s: str) -> str:
    m = {"high": ("严重", "severity-high"),
         "medium": ("中等", "severity-medium"),
         "low": ("轻微", "severity-low")}
    label, cls = m.get(s, (s, ""))
    return f'<span class="{cls}">{label}</span>'


def page_importer():
    st.header("📥 数据导入与查看")
    st.caption("支持上传Excel/CSV，或一键导入内置的日常样例数据（含混入的真实坏数据）。每次导入都会被审计系统记下来。")

    tab1, tab2, tab3 = st.tabs(["📋 一键导入样例数据", "📤 上传自定义文件", "📚 已有数据集"])

    with tab1:
        st.subheader("内置日常场景样例数据")
        st.write("""
        这份样例数据模拟了**真实工作场景**下数据标注团队常见的各种小麻烦：
        - 来源混合：`旧表`、`补录备注`、`漏填单位`三种渠道各提供部分数据
        - 混入坏数据：空标签、短文本、**2对真实标签冲突**、重复数据、空语言、低置信度、来源集中、语言倾斜
        - 每一种坏数据都**真的能改变平衡结果**，不是摆样子的
        """)

        intent = sd.describe_bad_data_intent()
        with st.expander("🔍 看看每种坏数据是怎么编出来的（标注负责人视角）"):
            for k, v in intent.items():
                st.markdown(f"- **{k}**：{v}")

        cols = st.columns(2)
        with cols[0]:
            ds_name = st.text_input("数据集名称", value="护肤产品多语言训练集", key="sample_ds_name")
        with cols[1]:
            ds_version = st.text_input("版本号", value="1.0", key="sample_ds_ver")
        ds_remark = st.text_input("备注（可选）", value="内置样例：旧表+补录备注+漏填单位混合，含真实坏数据",
                                  key="sample_ds_remark")

        if st.button("🚀 立即导入样例数据并创建数据集", type="primary", use_container_width=True):
            samples = sd.generate_daily_samples()
            did = db.create_dataset(ds_name, ds_version, remark=ds_remark)
            count = db.insert_samples(did, samples)
            st.success(f"✅ 成功！已导入数据集 `{ds_name} v{ds_version}`，共 {count} 条样本，数据集ID = {did}")
            st.info("📌 提示：本次导入已写入审计日志。在左侧「审计追踪」页面可以查看记录。")

    with tab2:
        st.subheader("上传Excel/CSV文件")
        st.markdown("文件需要至少包含 **`text_content`**（文本内容）列。推荐列：`language`（语言）、`label`（标签）、`source`（来源）、`confidence`（置信度）。")

        uploaded = st.file_uploader("选择文件", type=["xlsx", "csv"], accept_multiple_files=False)
        if uploaded is not None:
            try:
                if uploaded.name.endswith(".csv"):
                    df_up = pd.read_csv(uploaded)
                else:
                    df_up = pd.read_excel(uploaded)
                st.write(f"文件解析成功，共 {len(df_up)} 行。预览前5条：")
                st.dataframe(df_up.head(), use_container_width=True)

                c1, c2, c3, c4 = st.columns(4)
                with c1:
                    name_up = st.text_input("数据集名称", value=os.path.splitext(uploaded.name)[0])
                with c2:
                    ver_up = st.text_input("版本", value="1.0")
                with c3:
                    by_up = st.text_input("操作人", value="user")
                with c4:
                    rem_up = st.text_input("备注", value="")

                if st.button("确认导入到数据库"):
                    samples_list = df_up.to_dict(orient="records")
                    did = db.create_dataset(name_up, ver_up, imported_by=by_up, remark=rem_up)
                    n = db.insert_samples(did, samples_list)
                    st.success(f"✅ 已导入 {n} 条，数据集ID={did}")
            except Exception as e:
                st.error(f"文件解析失败：{e}")

    with tab3:
        st.subheader("数据库中已有的数据集")
        dss = db.list_datasets()
        if not dss:
            st.info("数据库里还没有数据集，去上面两个Tab导入吧。")
        else:
            for ds in dss:
                with st.expander(f"📦 {ds['name']}  v{ds['version']}  |  ID={ds['id']}  |  导入于 {ds['imported_at']}"):
                    cols = st.columns(3)
                    samples = db.get_dataset_samples(ds["id"])
                    cols[0].metric("样本数", len(samples))
                    cols[1].metric("导入者", ds["imported_by"])
                    cols[2].metric("备注", ds["remark"] or "-")
                    if samples:
                        sdf = pd.DataFrame(samples)
                        show_cols = [c for c in ["id", "text_content", "language", "label", "source", "confidence"]
                                     if c in sdf.columns]
                        st.dataframe(sdf[show_cols], use_container_width=True, height=280)


def page_balancer():
    st.header("⚖️ 样本平衡 & 安全规则检查")
    st.caption("选择一个数据集 → 配置参数 → 运行平衡。跑完后会看到：图（分布对比）、表（前后数据）、文字说明（每条规则的大白话解释），三者对得上。")

    dss = db.list_datasets()
    if not dss:
        st.warning("还没有数据集哦，先去「数据导入」页导入一下。")
        return

    ds_options = {f"{d['name']} v{d['version']} (ID={d['id']})": d["id"] for d in dss}
    sel = st.selectbox("选择数据集", list(ds_options.keys()), index=0)
    dataset_id = ds_options[sel]

    samples = db.get_dataset_samples(dataset_id)
    df = bl.samples_to_df(samples)
    if len(df) == 0:
        st.warning("这个数据集里还没有样本。")
        return

    with st.sidebar:
        st.markdown("### ⚙️ 平衡参数")
        strategy = st.selectbox("平衡策略",
                                ["stratified", "undersample", "random"],
                                format_func=lambda x: {
                                    "stratified": "分层采样（推荐，按语言+标签分组）",
                                    "undersample": "下采样（以最少的标签类为基准）",
                                    "random": "随机采样",
                                }[x],
                                index=0)
        default_target = max(10, int(len(df) * 0.8))
        target_total = st.slider("平衡后期望样本数", 5, len(df), default_target)
        oversample = st.checkbox("对稀有标签做少量过采样", value=False)
        st.markdown("---")
        rules = db.get_active_rules()
        st.markdown("### 🛡️ 已启用的安全规则")
        for r in rules:
            status = "✅" if r["is_active"] else "⏸️"
            st.markdown(f"{status} **{r['rule_name']}**  <small>({r['rule_code']})</small>",
                        unsafe_allow_html=True)

    run_name = st.text_input("本次运行的名称（便于后续灰度对比）",
                             value=f"平衡运行-{datetime.now().strftime('%Y%m%d-%H%M')}")

    if st.button("🚀 运行样本平衡 + 安全检查", type="primary", use_container_width=True):
        with st.spinner("正在检查规则 + 做平衡计算..."):
            result = bl.balance_samples(df, rules, strategy=strategy,
                                         target_total=target_total, oversample_rare=oversample)
            params = {"strategy": strategy, "target_total": target_total, "oversample_rare": oversample}
            save_result = {k: v for k, v in result.items() if k not in ("balanced_df", "cleaned_df")}
            save_result["balanced_df_records"] = result["balanced_df"].to_dict(orient="records")
            save_result["cleaned_df_records"] = result["cleaned_df"].to_dict(orient="records")
            rid = db.save_balance_run(dataset_id, run_name, params,
                                       rules_version="default_v1", result=save_result)
            st.session_state["last_run_id"] = rid
            st.session_state["last_result"] = result
            st.session_state["last_dataset_id"] = dataset_id
            st.session_state["last_dataset_name"] = sel
            st.success(f"✅ 完成！本次运行ID = {rid}。往下看详细结果。")

    if "last_result" in st.session_state and st.session_state.get("last_dataset_id") == dataset_id:
        _render_balance_result(st.session_state["last_result"], sel, df)


def _render_balance_result(result: dict, dataset_name: str, orig_df: pd.DataFrame = None):
    r = result
    before = r["before"]
    after = r["after"]
    imp = r["improvement"]
    df = orig_df if orig_df is not None else pd.DataFrame()

    # ========== 一、总体指标卡片 ==========
    st.markdown("---")
    st.subheader("📊 一、总体指标（图·表·字对得上：下面每个数字后面都能找到对应图表和解释）")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("原始样本数", r["original_count"])
    c2.metric("剔除坏样本后", r["cleaned_count"], delta=r["cleaned_count"] - r["original_count"])
    c3.metric("最终平衡后", r["balanced_count"], delta=r["balanced_count"] - r["original_count"])
    sev_after = after["rule_check"]["summary"]["severity_breakdown"]
    overall = after["rule_check"]["summary"]["overall_pass"]
    c4.metric("综合判断", "✅ 通过" if overall else "⚠️ 需复核",
              delta=f"严重问题{sev_after['high']}个")

    # ========== 二、前后分布对比（图表部分） ==========
    st.markdown("---")
    st.subheader("📈 二、前后分布对比（图表）")
    col_chart1, col_chart2 = st.columns(2)

    with col_chart1:
        st.markdown("**语言分布：平衡前 vs 平衡后**")
        lang_data = []
        for lang, cnt in before["language_distribution"].items():
            lang_data.append({"阶段": "平衡前", "语言": str(lang), "数量": cnt})
        for lang, cnt in after["language_distribution"].items():
            lang_data.append({"阶段": "平衡后", "语言": str(lang), "数量": cnt})
        if lang_data:
            ldf = pd.DataFrame(lang_data)
            fig1 = px.bar(ldf, x="语言", y="数量", color="阶段", barmode="group",
                          color_discrete_sequence=["#90cdf4", "#3182ce"],
                          title="语言分布对比")
            fig1.update_layout(showlegend=True, height=360)
            st.plotly_chart(fig1, use_container_width=True)
        st.caption("👆 这张图对应表一：看看哪种语言多或少了。如果中文明显高于其他语言，就是「语言覆盖度」规则要处理的。")

    with col_chart2:
        st.markdown("**标签分布：平衡前 vs 平衡后**")
        lbl_data = []
        for lbl, cnt in before["label_distribution"].items():
            lbl_data.append({"阶段": "平衡前", "标签": str(lbl), "数量": cnt})
        for lbl, cnt in after["label_distribution"].items():
            lbl_data.append({"阶段": "平衡后", "标签": str(lbl), "数量": cnt})
        if lbl_data:
            ldf2 = pd.DataFrame(lbl_data)
            fig2 = px.bar(ldf2, x="标签", y="数量", color="阶段", barmode="group",
                          color_discrete_sequence=["#fbd38d", "#dd6b20"],
                          title="标签分布对比")
            fig2.update_layout(showlegend=True, height=360)
            st.plotly_chart(fig2, use_container_width=True)
        st.caption("👆 这张图对应「标签分布均衡」规则。柱子越接近等高越好。")

    # ========== 问题严重度饼图 ==========
    col_sev1, col_sev2 = st.columns(2)
    with col_sev1:
        st.markdown("**问题严重度：平衡前**")
        sb = before["rule_check"]["summary"]["severity_breakdown"]
        if any(sb.values()):
            df_sb = pd.DataFrame([{"级别": k, "个数": v} for k, v in sb.items() if v > 0])
            fig_pie1 = px.pie(df_sb, names="级别", values="个数", hole=0.4,
                              color_discrete_map={"high": "#fc8181", "medium": "#f6e05e", "low": "#9ae6b4"},
                              title="平衡前问题严重度分布")
            fig_pie1.update_layout(height=340)
            st.plotly_chart(fig_pie1, use_container_width=True)
    with col_sev2:
        st.markdown("**问题严重度：平衡后**")
        sa = after["rule_check"]["summary"]["severity_breakdown"]
        if any(sa.values()):
            df_sa = pd.DataFrame([{"级别": k, "个数": v} for k, v in sa.items() if v > 0])
            fig_pie2 = px.pie(df_sa, names="级别", values="个数", hole=0.4,
                              color_discrete_map={"high": "#fc8181", "medium": "#f6e05e", "low": "#9ae6b4"},
                              title="平衡后问题严重度分布")
            fig_pie2.update_layout(height=340)
            st.plotly_chart(fig_pie2, use_container_width=True)

    # ========== 三、核心数据对比表 ==========
    st.markdown("---")
    st.subheader("📋 三、核心数据对比表（和上面每张图的数字一一对应）")
    sum_rows = [
        ["样本总数", before["rule_check"]["summary"]["total_samples"],
         after["rule_check"]["summary"]["total_samples"],
         after["rule_check"]["summary"]["total_samples"] - before["rule_check"]["summary"]["total_samples"]],
        ["通过的规则数", before["rule_check"]["summary"]["passed_rules"],
         after["rule_check"]["summary"]["passed_rules"],
         f"+{imp['rules_passed_increase']}" if imp['rules_passed_increase'] >= 0 else str(imp['rules_passed_increase'])],
        ["未通过规则数", before["rule_check"]["summary"]["failed_rules"],
         after["rule_check"]["summary"]["failed_rules"],
         after["rule_check"]["summary"]["failed_rules"] - before["rule_check"]["summary"]["failed_rules"]],
        ["问题总数", before["rule_check"]["summary"]["total_issues"],
         after["rule_check"]["summary"]["total_issues"],
         f"-{imp['issues_resolved']}" if imp['issues_resolved'] >= 0 else str(-imp['issues_resolved'])],
        ["  ★ 严重(high)", before["rule_check"]["summary"]["severity_breakdown"]["high"],
         after["rule_check"]["summary"]["severity_breakdown"]["high"],
         f"-{imp['high_issues_resolved']}" if imp['high_issues_resolved'] >= 0 else str(-imp['high_issues_resolved'])],
        ["  · 中等(medium)", before["rule_check"]["summary"]["severity_breakdown"]["medium"],
         after["rule_check"]["summary"]["severity_breakdown"]["medium"],
         after["rule_check"]["summary"]["severity_breakdown"]["medium"] - before["rule_check"]["summary"]["severity_breakdown"]["medium"]],
        ["  · 轻微(low)", before["rule_check"]["summary"]["severity_breakdown"]["low"],
         after["rule_check"]["summary"]["severity_breakdown"]["low"],
         after["rule_check"]["summary"]["severity_breakdown"]["low"] - before["rule_check"]["summary"]["severity_breakdown"]["low"]],
    ]
    sdf = pd.DataFrame(sum_rows, columns=["指标", "平衡前", "平衡后", "变化"])
    st.table(sdf.style.set_properties(**{"text-align": "center"}))

    # ========== 四、逐条安全规则 + 大白话解释 ==========
    st.markdown("---")
    st.subheader("🔍 四、逐条安全规则检查（每条规则都有自然语言解释，不是只有字段名！）")
    rule_results_before = before["rule_check"]["rule_results"]
    rule_results_after = after["rule_check"]["rule_results"]

    for code in sorted(set(list(rule_results_before.keys()) + list(rule_results_after.keys()))):
        info_a = rule_results_after.get(code, rule_results_before.get(code, {}))
        info_b = rule_results_before.get(code, {})
        name = info_a.get("rule_name", code)
        desc = info_a.get("description", "")
        passed_a = info_a.get("passed", False)
        cnt_a = info_a.get("issue_count", 0)
        cnt_b = info_b.get("issue_count", 0)
        tag = '<span class="pass-tag">✅ 通过</span>' if passed_a else '<span class="fail-tag">❌ 未通过</span>'

        with st.expander(f"🛡️ 规则 {name}（{code}）— 问题数：{cnt_b} → {cnt_a}  {tag}", expanded=(not passed_a)):
            st.markdown(f"**规则说明**：{desc}")
            delta = cnt_a - cnt_b
            if delta < 0:
                st.success(f"⬇️ 相比平衡前少了 {abs(delta)} 个问题 👍")
            elif delta > 0:
                st.warning(f"⬆️ 相比平衡前多了 {delta} 个问题，看看哪里没处理好")

            notes = info_a.get("explanations", [])
            if notes:
                st.markdown("#### 🗣️ 用大白话讲给你听（给不懂代码的人看的）：")
                for n in notes:
                    st.info(f"💡 {n}")

            issues = info_a.get("issues", [])[:5]
            if issues:
                st.markdown("#### 🔎 具体问题（最多显示前5条）：")
                issue_rows = []
                for i, iss in enumerate(issues):
                    sev = _severity_badge(iss.get("severity", "unknown"))
                    sid = iss.get("sample_id", iss.get("sample_ids", "-"))
                    fld = iss.get("field", "-")
                    dsc = iss.get("description", "")
                    issue_rows.append([f"#{i+1}", sev, sid, fld, dsc])
                idf = pd.DataFrame(issue_rows, columns=["序号", "严重度", "样本ID", "涉及字段", "问题描述"])
                st.write(idf.to_html(escape=False, index=False), unsafe_allow_html=True)

    # ========== 五、标签冲突边界案例 ==========
    st.markdown("---")
    st.subheader("⚡ 五、边界案例：标签冲突（2~3个就够，但每个都真的改变结果）")
    conflicts = [i for i in before["rule_check"]["all_issues"] if i["type"] == "LABEL_CONFLICT"]
    if not conflicts:
        st.success("✅ 本次没发现标签冲突。")
    else:
        st.markdown(f"共发现 **{len(conflicts)}** 对标签冲突。**每一对都会真的改变模型判断结果**——不处理的话，相似的输入会得到不同的标签。")
        for idx, c in enumerate(conflicts):
            st.markdown(f"""
            <div style="background:#fff5f5; border-left:4px solid #e53e3e; padding:12px; border-radius:6px; margin:10px 0;">
            <b>冲突 {idx+1}</b>：两条文本相似度 <b>{c['similarity']:.0%}</b>，却标了<b>不同标签</b>：<br>
            &nbsp;&nbsp;→ 文本A：「{c['texts_preview'][0]}…」 标为「<b>{c['labels'][0]}</b>」<br>
            &nbsp;&nbsp;→ 文本B：「{c['texts_preview'][1]}…」 标为「<b>{c['labels'][1]}</b>」<br>
            <small style="color:#742a2a;">为什么影响结果？如果不统一，模型会学到"这类内容既可以是{c['labels'][0]}也可以是{c['labels'][1]}"，分类边界就乱了。</small>
            </div>
            """, unsafe_allow_html=True)

    # ========== 六、剔除的样本 & 保留的样本 ==========
    if r.get("dropped_ids"):
        st.markdown("---")
        st.subheader(f"🗑️ 六、样本结果：自动剔除 vs 最终保留")
        c_drop, c_keep = st.columns(2)
        with c_drop:
            st.markdown(f"**自动剔除的 {len(r['dropped_ids'])} 条（都是严重问题）**")
            if "id" in df.columns:
                drop_df = df[df["id"].isin(r["dropped_ids"])][
                    [c for c in ["id", "text_content", "language", "label", "source", "confidence"]
                     if c in df.columns]
                ]
                st.dataframe(drop_df, use_container_width=True, height=360)
        with c_keep:
            st.markdown(f"**平衡后保留的 {len(r['balanced_df'])} 条**")
            show_cols = [c for c in ["id", "text_content", "language", "label", "source", "confidence"]
                         if c in r["balanced_df"].columns]
            st.dataframe(r["balanced_df"][show_cols], use_container_width=True, height=360)

    # ========== 七、导出按钮 ==========
    st.markdown("---")
    st.subheader("📤 七、导出报告（给不懂代码的人看的，全是自然语言）")
    ec1, ec2, ec3 = st.columns(3)
    with ec1:
        if st.button("📄 导出 Word 报告 (.docx)", use_container_width=True):
            with st.spinner("正在生成Word..."):
                try:
                    filename, buf = rg.generate_word_report_bytes(
                        result, compare_result=None,
                        dataset_name=dataset_name,
                    )
                    st.download_button(
                        "📥 下载 Word 报告",
                        data=buf,
                        file_name=filename,
                        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    )
                    st.success("✅ Word生成好了，点上面按钮下载")
                except Exception as e:
                    st.error(f"Word导出失败：{e}")
    with ec2:
        if st.button("🌐 导出 HTML 报告（浏览器直接打开）", use_container_width=True):
            try:
                html = rg.generate_html_report(result, None, dataset_name)
                st.download_button("📥 下载 HTML", html, file_name="report.html", mime="text/html")
                st.success("✅ HTML生成好了")
            except Exception as e:
                st.error(f"HTML导出失败：{e}")
    with ec3:
        if st.button("📊 导出平衡后样本 (CSV)", use_container_width=True):
            out = r["balanced_df"].to_csv(index=False).encode("utf-8-sig")
            st.download_button("📥 下载 CSV", data=out,
                               file_name=f"balanced_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                               mime="text/csv")


def page_grayscale():
    st.header("🎚️ 灰度对比：基线 vs 候选")
    st.caption("选两次平衡运行做对比，如果候选版本的安全判断变差了会自动拦截，表格里能看到前后差别。")

    runs = db.get_balance_runs()
    if not runs:
        st.warning("还没跑过任何平衡运行，先去「样本平衡」页面跑两次吧。")
        return

    run_labels = {f"#{r['id']} {r.get('run_name') or '-'} ({r['created_at']})": r["id"] for r in runs}
    c_sel1, c_sel2 = st.columns(2)
    with c_sel1:
        base_label = st.selectbox("选择基线版本（旧的）", list(run_labels.keys()), index=0)
    with c_sel2:
        cand_idx = 1 if len(run_labels) > 1 else 0
        cand_label = st.selectbox("选择候选版本（新的）", list(run_labels.keys()), index=cand_idx)

    base_id = run_labels[base_label]
    cand_id = run_labels[cand_label]

    if st.button("🔍 开始灰度对比", type="primary"):
        if base_id == cand_id:
            st.error("基线和候选选了同一次运行，换一个吧")
            return
        with st.spinner("对比中..."):
            base_run = db.get_balance_run(base_id) or {}
            cand_run = db.get_balance_run(cand_id) or {}
            base_result = base_run.get("result", {})
            cand_result = cand_run.get("result", {})

            if not base_result or not cand_result:
                st.error("找不到运行结果数据")
                return

            # 还原 DataFrame
            for key in ("balanced_df", "cleaned_df"):
                recs_key = f"{key}_records"
                if recs_key in base_result and recs_key not in base_result:
                    pass
                if recs_key in base_result:
                    base_result[key] = pd.DataFrame(base_result[recs_key])
                if recs_key in cand_result:
                    cand_result[key] = pd.DataFrame(cand_result[recs_key])

            compare = bl.compare_runs(base_result, cand_result)
            judgment = compare["judgment"]
            db.save_grayscale_compare(base_id, cand_id, compare, judgment)
            st.session_state["last_compare"] = compare
            st.session_state["last_compare_base"] = base_result
            st.session_state["last_compare_cand"] = cand_result

    if "last_compare" in st.session_state:
        compare = st.session_state["last_compare"]
        judgment = compare["judgment"]
        if judgment == "PASS":
            st.success("✅ 灰度判断：PASS —— 候选版本没问题（没变差，或变好了）")
        else:
            st.error("🚫 灰度判断：BLOCK —— 候选版本安全质量下降了，自动拦截")

        reasons = compare.get("judgment_reasons", [])
        if reasons:
            st.markdown("#### 📝 判断依据：")
            for r in reasons:
                st.markdown(f"- {r}")

        st.markdown("---")
        st.subheader("📊 安全拦截前后差别（前后都能看到）")
        sec = compare["security_comparison"]
        cmp_rows = [
            ["整体通过？",
             "✅ 通过" if sec["baseline"]["overall_pass"] else "❌ 未通过",
             "✅ 通过" if sec["candidate"]["overall_pass"] else "❌ 未通过",
             "🔄 改变了" if sec["delta"]["overall_pass_changed"] else "— 没变"],
            ["严重(high)问题数",
             sec["baseline"]["high_issues"], sec["candidate"]["high_issues"],
             f"{sec['delta']['high_issues_delta']:+d}"],
            ["中等(medium)问题数",
             sec["baseline"]["medium_issues"], sec["candidate"]["medium_issues"],
             f"{sec['delta']['medium_issues_delta']:+d}"],
            ["轻微(low)问题数",
             sec["baseline"]["low_issues"], sec["candidate"]["low_issues"],
             "—"],
            ["总问题数",
             sec["baseline"]["total_issues"], sec["candidate"]["total_issues"],
             f"{sec['delta']['total_issues_delta']:+d}"],
        ]
        cmp_df = pd.DataFrame(cmp_rows, columns=["对比项", "基线版本（旧）", "候选版本（新）", "差异"])
        st.table(cmp_df.style.set_properties(**{"text-align": "center"}))

        diff = compare["diff"]
        cc1, cc2, cc3 = st.columns(3)
        cc1.metric("样本数变化", f"{diff['samples_change']:+d}",
                   f"{diff['samples_change_ratio']:.1%}")
        cc2.metric("候选新增样本ID数", len(diff["samples_added"]))
        cc3.metric("候选移除样本ID数", len(diff["samples_removed"]))

        # 导出对比报告
        st.markdown("---")
        if st.button("📤 导出带灰度对比的Word报告"):
            cand_run = db.get_balance_run(cand_id) or {}
            base_result = st.session_state.get("last_compare_base", {})
            cand_result = st.session_state.get("last_compare_cand", {})
            try:
                filename, buf = rg.generate_word_report_bytes(
                    cand_result, compare, f"灰度对比_{base_id}vs{cand_id}"
                )
                st.download_button(
                    "📥 下载报告",
                    data=buf,
                    file_name=filename,
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )
            except Exception as e:
                st.error(f"导出失败：{e}")


def page_audit():
    st.header("📜 审计追踪：导入·修正·确认全记录")
    st.caption("系统记住了每次数据导入、样本修改和运行操作。数据标注负责人可以随时查谁改了什么。")

    tab_a1, tab_a2 = st.tabs(["📋 全部操作日志", "🔧 单条样本修改历史"])
    with tab_a1:
        limit = st.slider("最多显示条数", 20, 500, 100)
        action_filter = st.selectbox("按操作类型过滤",
                                     ["全部", "DATASET_IMPORT", "SAMPLES_INSERT",
                                      "SAMPLE_MODIFY", "BALANCE_RUN", "GRAYSCALE_COMPARE"],
                                     format_func=lambda x: {
                                         "全部": "全部操作",
                                         "DATASET_IMPORT": "📥 数据集导入",
                                         "SAMPLES_INSERT": "➕ 样本插入",
                                         "SAMPLE_MODIFY": "✏️ 样本修改",
                                         "BALANCE_RUN": "⚖️ 平衡运行",
                                         "GRAYSCALE_COMPARE": "🎚️ 灰度对比",
                                     }.get(x, x),
                                     index=0)
        ft = None if action_filter == "全部" else action_filter
        logs = db.get_audit_logs(limit=limit, action_type=ft)
        if not logs:
            st.info("还没有操作记录，先去导入数据或跑平衡吧。")
        else:
            log_rows = []
            for lg in logs:
                before = json.loads(lg["before_json"]) if lg.get("before_json") else {}
                after = json.loads(lg["after_json"]) if lg.get("after_json") else {}
                log_rows.append({
                    "时间": lg["created_at"],
                    "操作": lg["action_type"],
                    "对象": f"{lg.get('target_type') or '-'} #{lg.get('target_id') or '-'}",
                    "操作人": lg.get("operator", "-"),
                    "备注": lg.get("remark", ""),
                    "变更前摘要": str(before)[:60],
                    "变更后摘要": str(after)[:60],
                })
            ldf = pd.DataFrame(log_rows)
            st.dataframe(ldf, use_container_width=True, height=520)

    with tab_a2:
        dss = db.list_datasets()
        if dss:
            ds_opts = {f"{d['name']} v{d['version']}": d["id"] for d in dss}
            sel_ds = st.selectbox("选择数据集", list(ds_opts.keys()), key="audit_sample_ds")
            samples = db.get_dataset_samples(ds_opts[sel_ds])
            if samples:
                s_opts = {f"#{s['id']} | {str(s['text_content'])[:30]}… | {s.get('label')}": s["id"]
                          for s in samples}
                sel_s = st.selectbox("选一条样本看修改历史", list(s_opts.keys()))
                sid = s_opts[sel_s]
                hist = db.get_sample_history(sid)
                if not hist:
                    st.info("这条样本还没被修改过。")
                else:
                    h_rows = []
                    for h in hist:
                        h_rows.append({
                            "修改时间": h["changed_at"],
                            "改了哪个字段": h["field_name"],
                            "旧值": h.get("old_value", ""),
                            "新值": h.get("new_value", ""),
                            "修改人": h["changed_by"],
                            "修改原因": h.get("reason") or "-",
                        })
                    st.table(pd.DataFrame(h_rows))
            else:
                st.info("这个数据集里没样本")
        else:
            st.info("先去导入数据")

    # 手动修正样本入口
    st.markdown("---")
    st.subheader("✏️ 手动修正样本（修改会自动记录到审计追踪）")
    if dss:
        cols_m = st.columns(3)
        with cols_m[0]:
            m_ds = st.selectbox("选数据集", list(ds_opts.keys()), key="modify_ds")
        msamples = db.get_dataset_samples(ds_opts[m_ds])
        if msamples:
            m_opts = {f"#{s['id']} {str(s['text_content'])[:25]}…": s["id"] for s in msamples}
            with cols_m[1]:
                m_sample = st.selectbox("选样本", list(m_opts.keys()), key="modify_sample_sel")
            m_sid = m_opts[m_sample]
            m_cur = next((s for s in msamples if s["id"] == m_sid), None)
            if m_cur:
                field_map = {
                    "text_content": "文本内容",
                    "language": "语言",
                    "label": "标签",
                    "source": "来源",
                    "confidence": "置信度"
                }
                with cols_m[2]:
                    m_field = st.selectbox("改哪个字段", list(field_map.keys()),
                                          format_func=lambda x: field_map[x])
                cur_val = m_cur.get(m_field, "")
                m_new = st.text_input(f"新值（当前值：{cur_val}）", value=str(cur_val if cur_val else ""))
                m_reason = st.text_input("修改原因（会写到审计追踪里）", placeholder="例如：标签标错了，改为中性评价")
                if st.button("💾 确认修改并记录"):
                    db.update_sample(m_sid, m_field, m_new, reason=m_reason)
                    st.success(f"✅ 已修改。样本#{m_sid}的{m_field}：{cur_val} → {m_new}，修改原因已记录")
                    st.rerun()


def main():
    st.title("⚖️ 多语言样本平衡器")
    st.markdown("**临近灰度前的样本质量守门员**：记住每次导入/修正/确认，跑完后图·表·文字三者对得上，灰度对比会自动拦截变差的版本，报告能直接转给不懂代码的人。")

    pg = st.sidebar.radio("📍 功能页",
                          ["📥 数据导入",
                           "⚖️ 样本平衡",
                           "🎚️ 灰度对比",
                           "📜 审计追踪"],
                          index=0)

    st.sidebar.markdown("---")
    st.sidebar.markdown("### 📌 快速说明")
    st.sidebar.markdown("""
    1. **数据导入**：导入样例或自己的文件
    2. **样本平衡**：跑平衡 + 6条安全规则检查
    3. **灰度对比**：两次运行比一比，自动判断PASS/BLOCK
    4. **审计追踪**：谁改了什么一目了然
    """)

    if "数据导入" in pg:
        page_importer()
    elif "样本平衡" in pg:
        page_balancer()
    elif "灰度对比" in pg:
        page_grayscale()
    elif "审计追踪" in pg:
        page_audit()


if __name__ == "__main__":
    main()
