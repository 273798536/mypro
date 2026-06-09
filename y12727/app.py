import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
import numpy as np

from src.data_processor import (
    parse_student_dataframe,
    process_records,
    stable_sort_records,
    records_to_dataframe,
)
from src.exporter import (
    get_examples_dataframe,
    plot_summary_power_curves,
    plot_single_record_power_curve,
    build_narration_text,
    export_to_excel,
    export_zip_bundle,
    make_run_label,
    REPRODUCIBLE_EXAMPLES,
    build_text_narration,
)
from src.history import (
    save_run_history,
    list_run_history_labels,
    load_run_history,
    build_history_trace_dataframe,
    attach_history_refs,
    update_editor_note,
)


st.set_page_config(page_title="样本量功效试算 · 教研版", layout="wide")
st.title("📊 样本量功效试算（教研编辑工作台）")
st.caption("给学生看结果时不炫代码；遇到外推越界自动提示；错题缺失不整批失败；异常可回溯到历史答案。")


def _demo_dataframe():
    rows = []
    for i, ex in enumerate(REPRODUCIBLE_EXAMPLES):
        row = {
            "record_id": ex["example_id"],
            "student_id": f"S{i+1:03d}",
            "question_id": f"Q{1001+i}",
            "sort_key": i,
            **ex["params"],
            "calc_mode": "sample_size",
        }
        rows.append(row)
    rows.append({
        "record_id": "GAP001", "student_id": "S999", "question_id": "Q9999",
        "test_type": "proportion", "p1": None, "p2": 0.6, "alpha": 0.05,
        "power": 0.8, "alternative": "two-sided", "sort_key": 99, "calc_mode": "sample_size",
    })
    rows.append({
        "record_id": "GAP002", "student_id": "S998", "question_id": "Q9998",
        "test_type": "mean", "delta": 0.5, "sd": None, "alpha": 0.05,
        "power": 0.8, "alternative": "two-sided", "sort_key": 100, "calc_mode": "sample_size",
    })
    return pd.DataFrame(rows)


tab_run, tab_review, tab_history, tab_examples = st.tabs([
    "▶ 运行试算", "🔍 复核与编辑", "📜 历史回溯", "🧪 可复现样例"
])


with tab_run:
    st.subheader("① 上传或加载学生数据")
    use_demo = st.checkbox("使用内置演示数据（含外推越界、正常对照、缺失数据）", value=True)
    uploaded = st.file_uploader("上传 CSV/Excel（列：record_id, student_id, question_id, test_type, p1/p2 或 delta/sd, ...）",
                                type=["csv", "xlsx"])
    if use_demo and not uploaded:
        df = _demo_dataframe()
    elif uploaded is not None:
        if uploaded.name.endswith(".csv"):
            df = pd.read_csv(uploaded)
        else:
            df = pd.read_excel(uploaded)
    else:
        df = _demo_dataframe()

    with st.expander("查看当前输入数据", expanded=False):
        st.dataframe(df, use_container_width=True)

    if st.button("🚀 开始试算", type="primary"):
        with st.spinner("正在解析、计算、生成图表…"):
            records, gap_list = parse_student_dataframe(df)
            records = attach_history_refs(records)
            records = process_records(records)
            records = stable_sort_records(records)
            run_label = make_run_label()
            save_run_history(run_label, records)

            st.session_state["records"] = records
            st.session_state["gap_list"] = gap_list
            st.session_state["run_label"] = run_label
            st.success(f"试算完成 · 批次号 {run_label}")

    if "records" in st.session_state:
        records = st.session_state["records"]
        gap_list = st.session_state["gap_list"]
        run_label = st.session_state["run_label"]

        st.subheader("② 结果总览")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("总记录", len(records))
        col2.metric("成功/警告", sum(1 for r in records if r.status in ("success", "warning")))
        col3.metric("外推越界", sum(1 for r in records if r.extrapolation_warning))
        col4.metric("数据缺失", len(gap_list))

        if gap_list:
            st.warning(f"⚠️ 有 {len(gap_list)} 条记录数据缺失（不影响其他记录计算），请教研编辑补全：")
            st.dataframe(pd.DataFrame(gap_list), use_container_width=True)

        st.subheader("③ 结果表格（按稳定排序）")
        res_df = records_to_dataframe(records)
        st.dataframe(res_df, use_container_width=True)

        st.subheader("④ 功效曲线（外推样例 + 对照）")
        figs = plot_summary_power_curves(records)
        if figs:
            n_cols = min(2, len(figs))
            for i in range(0, len(figs), n_cols):
                cols = st.columns(n_cols)
                for j, (name, fig) in enumerate(figs[i:i + n_cols]):
                    cols[j].markdown(f"**{name}**")
                    cols[j].pyplot(fig)

        st.subheader("⑤ 文字说明（图、表、文一致）")
        narration = build_narration_text(records, gap_list)
        st.text_area("完整文字说明", narration, height=320)

        st.subheader("⑥ 导出")
        excel_bytes = export_to_excel(records, gap_list, narration, figs)
        st.download_button("📥 下载 Excel 报告（含计算结果、缺口、样例、文字说明）",
                           data=excel_bytes,
                           file_name=f"样本量功效试算_{run_label}.xlsx",
                           mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        zip_bytes = export_zip_bundle(records, gap_list, run_label)
        st.download_button("📦 下载完整包（Excel + 图片 PNG + 文字 TXT + 样例 CSV）",
                           data=zip_bytes,
                           file_name=f"样本量功效试算完整包_{run_label}.zip",
                           mime="application/zip")
        st.caption(f"文件名均带批次号 `{run_label}`，可区分本次与上次运行。")


with tab_review:
    st.subheader("🔍 复核入口：从本次运行或历史运行中挑记录复核")
    all_labels = list_run_history_labels()
    if not all_labels:
        st.info("暂无历史运行，请先在『运行试算』页执行一次。")
    else:
        chosen = st.selectbox("选择运行批次", all_labels,
                              index=0 if "run_label" not in st.session_state else
                              all_labels.index(st.session_state["run_label"])
                              if st.session_state.get("run_label") in all_labels else 0)
        entries = load_run_history(chosen)
        if entries:
            options = [f"{e.question_id} | {e.student_id} | {e.resolution}" for e in entries]
            pick = st.selectbox("选择具体记录", options)
            idx = options.index(pick)
            e = entries[idx]

            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown("**参数与结果**")
                st.write({"params": e.params, "result": e.result_summary,
                          "warnings": e.warnings, "外推": e.extrapolation_warning,
                          "错误": e.error_msg})
            with col_b:
                st.markdown("**复核与处理意见**")
                new_note = st.text_area("教研编辑处理意见", value=e.editor_note, height=120)
                new_resolution = st.selectbox("处理结论",
                                              ["", "success", "warning", "missing_data", "error", "approved", "rejected"],
                                              index=0)
                if st.button("💾 保存处理意见（无需重新导入）"):
                    updated = update_editor_note(chosen, f"{e.question_id}_{e.student_id}", new_note, new_resolution)
                    if updated:
                        st.success("已保存，历史记录已更新。")
                    else:
                        st.error("保存失败。")

            st.markdown("**该记录功效曲线**")
            from src.data_processor import StudentRecord
            pseudo = StudentRecord(
                record_id=f"{e.question_id}_{e.student_id}",
                student_id=e.student_id,
                question_id=e.question_id,
                test_type=str(e.params.get("test_type", "proportion")),
                params=e.params,
            )
            st.pyplot(plot_single_record_power_curve(pseudo))
            st.markdown("```\n" + build_text_narration(pseudo) + "\n```")


with tab_history:
    st.subheader("📜 顺着异常往回查：按题目/学生追踪历史答案")
    qid = st.text_input("题目 ID（question_id）", value="")
    sid = st.text_input("学生 ID（可选）", value="")
    if st.button("🔍 查询历史") or qid:
        hist_df = build_history_trace_dataframe(qid, sid.strip() or None)
        if hist_df.empty:
            st.info("未找到历史记录。")
        else:
            st.dataframe(hist_df, use_container_width=True)
            st.success(f"共查到 {len(hist_df)} 条历史答案，可据此核对处理意见。")

    st.subheader("所有运行批次")
    st.write(list_run_history_labels())


with tab_examples:
    st.subheader("🧪 可复现样例：外推越界的典型案例")
    st.markdown("""
    教研编辑在和学生沟通时，可以直接引用下面的编号样例。每条样例都保证：
    - 参数 → 表格结果 → 功效曲线 → 文字说明 **四者一致**；
    - 明确哪些参数触发了外推越界警告；
    - 与 Excel 导出中的「可复现样例」sheet 完全一致。
    """)
    ex_df = get_examples_dataframe()
    st.dataframe(ex_df, use_container_width=True)

    st.markdown("### 逐条样例展开（图 + 文）")
    for ex in REPRODUCIBLE_EXAMPLES:
        with st.expander(f"{ex['example_id']} · {ex['title']}"):
            st.write(ex["description"])
            from src.data_processor import StudentRecord
            pseudo = StudentRecord(
                record_id=ex["example_id"],
                student_id="样例学生",
                question_id=ex["example_id"],
                test_type=ex["params"]["test_type"],
                params={k: v for k, v in ex["params"].items() if k != "test_type"},
            )
            from src.data_processor import process_records as _pr
            pseudo = _pr([pseudo])[0]
            st.pyplot(plot_single_record_power_curve(pseudo))
            st.markdown("```\n" + build_text_narration(pseudo) + "\n```")
            if ex["expected_warning"]:
                st.warning(f"预期外推字段：{ex['expected_warning']}；实际警告：{pseudo.extrapolation_warning or '无'}")
            else:
                st.success("无外推越界，正常范围。")
