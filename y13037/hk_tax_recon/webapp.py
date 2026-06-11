import os
import sys
import tempfile
import json
import pandas as pd
import streamlit as st

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from hk_tax_recon.models.recon import ReconBatch, ProcessStatus
from hk_tax_recon.loaders.table_loader import load_emails, load_tax_records, load_eml_file
from hk_tax_recon.core.reconcile import run_reconciliation
from hk_tax_recon.reports.markdown_report import generate_markdown_report
from hk_tax_recon.examples.sample_data import generate_sample_data


st.set_page_config(page_title="港股通税费口径对账", page_icon="📊", layout="wide")
st.title("📊 港股通税费口径对账")
st.caption("材料入口：上传审批邮件 + 税费明细 ｜ 异常出口：报告「异常与待处理」表格")

tab_upload, tab_rerun, tab_report, tab_help = st.tabs([
    "📥 新材料对账", "🔄 重跑批次", "📄 查看报告", "❓ 操作说明"
])


ALL_STATUSES = [
    ProcessStatus.MATCHED.value,
    ProcessStatus.MISMATCH.value,
    ProcessStatus.VOUCHER_LATE.value,
    ProcessStatus.NEED_MANUAL.value,
    ProcessStatus.HISTORY_MISMATCH.value,
    ProcessStatus.PENDING.value,
    ProcessStatus.RESOLVED.value,
]


def _save_uploaded(files, save_dir):
    paths = []
    if not files:
        return paths
    for f in files:
        p = os.path.join(save_dir, f.name)
        with open(p, "wb") as out:
            out.write(f.getbuffer())
        paths.append(p)
    return paths


def _df_from_items(items, status_filter=None):
    rows = []
    for it in items:
        if status_filter and it.status.value not in status_filter:
            continue
        reason_col = it.reason or ""
        if it.history_check:
            reason_col = reason_col + (" | " if reason_col else "") + it.history_check
        voucher_col = "-"
        if it.voucher_no or it.voucher_date:
            voucher_col = f"{it.voucher_no or '-'}/{it.voucher_date or '-'}"
            if it.voucher_expected_by:
                voucher_col += f"（应到：{it.voucher_expected_by}）"
        rows.append({
            "状态": it.status.value,
            "交易日": it.trade_date or "-",
            "审批主题": it.approval_subject or "-",
            "税种": it.tax_type or "-",
            "HKD税费": it.tax_amount_hkd,
            "CNY税费": it.tax_amount_cny,
            "邮件汇率": it.exchange_rate_from_email,
            "税费汇率": it.exchange_rate_from_tax,
            "汇率差异": it.exchange_rate_diff,
            "原因/历史": reason_col or "-",
            "下一步": it.next_step or "-",
            "凭证": voucher_col,
            "来源": "、".join(it.sources) if it.sources else "-",
            "轮次": str(it.run_round) + (f"·{it.remark}" if it.remark else ""),
        })
    return pd.DataFrame(rows)


def _render_batch_summary(batch: ReconBatch, key_prefix: str = ""):
    st.markdown("### 状态概览")
    summary = batch.status_summary()
    cols = st.columns(5)
    with cols[0]: st.metric("✅ 已匹配", summary.get(ProcessStatus.MATCHED.value, 0))
    with cols[1]: st.metric("❌ 不匹配", summary.get(ProcessStatus.MISMATCH.value, 0))
    with cols[2]: st.metric("⏰ 凭证晚到", summary.get(ProcessStatus.VOUCHER_LATE.value, 0))
    with cols[3]: st.metric("👤 需人工", summary.get(ProcessStatus.NEED_MANUAL.value, 0))
    with cols[4]: st.metric("⚠️ 历史不一致", summary.get(ProcessStatus.HISTORY_MISMATCH.value, 0))

    st.markdown(f"> 邮件 {len(batch.emails)} 条 · 税费 {len(batch.tax_records)} 条 · 对账条目 {len(batch.items)} 条 · 已运行 {batch.run_count} 轮")
    if batch.filter_criteria:
        st.markdown("**筛选口径：**" + "；".join(f"{k}={v}" for k, v in batch.filter_criteria.items()))

    default_filter = [
        ProcessStatus.MISMATCH.value,
        ProcessStatus.VOUCHER_LATE.value,
        ProcessStatus.NEED_MANUAL.value,
        ProcessStatus.HISTORY_MISMATCH.value,
    ]
    status_choice = st.multiselect(
        "筛选查看（默认只看异常）",
        ALL_STATUSES,
        default=default_filter,
        key=f"{key_prefix}filter"
    )
    df = _df_from_items(batch.items, status_choice)
    if df.empty:
        st.info("当前筛选条件下没有数据，可调整上方筛选项。")
    else:
        st.dataframe(df, use_container_width=True, hide_index=True)

    with tempfile.TemporaryDirectory() as td:
        md_path = generate_markdown_report(batch, os.path.join(td, f"{batch.batch_id}.md"))
        with open(md_path, "r", encoding="utf-8") as f:
            md_content = f.read()
        json_path = os.path.join(td, f"{batch.batch_id}.json")
        batch.save(json_path)
        with open(json_path, "r", encoding="utf-8") as f:
            json_content = f.read()

        with st.expander("📄 预览 Markdown 报告（和页面数据一致）", expanded=False):
            st.markdown(md_content, unsafe_allow_html=False)

        c1, c2 = st.columns(2)
        with c1:
            st.download_button(
                "⬇️ 下载 Markdown 报告",
                md_content,
                file_name=f"{batch.batch_id}.md",
                mime="text/markdown",
                key=f"{key_prefix}md_dl",
            )
        with c2:
            st.download_button(
                "⬇️ 下载批次 JSON（用于 CLI rerun 或 Web 重跑）",
                json_content,
                file_name=f"{batch.batch_id}.json",
                mime="application/json",
                key=f"{key_prefix}json_dl",
            )


with tab_upload:
    st.subheader("📥 新材料对账（入口 1）")
    col1, col2 = st.columns(2)
    with col1:
        batch_id = st.text_input("批次号", value="BATCH-001", key="upload_batch_id")
        run_date = st.date_input("运行日期（判断凭证晚到，默认今天）", value=None, key="upload_run_date")
        filter_text = st.text_input("筛选口径说明", value="", placeholder="如：2024年6月上半月", key="upload_filter")
        remark = st.text_input("本轮备注", value="", placeholder="如：第一轮对账", key="upload_remark")
    with col2:
        email_files = st.file_uploader(
            "审批邮件（.xlsx/.csv/.eml）可多选",
            accept_multiple_files=True, type=["xlsx", "csv", "eml"], key="upload_email"
        )
        tax_files = st.file_uploader(
            "税费明细（.xlsx/.csv）可多选",
            accept_multiple_files=True, type=["xlsx", "csv"], key="upload_tax"
        )

    if st.button("▶️ 运行对账", type="primary", key="upload_run_btn"):
        if not email_files and not tax_files:
            st.error("请至少上传一个邮件或税费文件")
        else:
            with tempfile.TemporaryDirectory() as td:
                email_paths = _save_uploaded(email_files, td)
                tax_paths = _save_uploaded(tax_files, td)

                batch = ReconBatch(batch_id=batch_id)
                if filter_text:
                    batch.filter_criteria["筛选说明"] = filter_text

                for p in email_paths:
                    if p.lower().endswith(".eml"):
                        es, _ = load_eml_file(p, batch_id=batch_id)
                    else:
                        es, _ = load_emails(p, batch_id=batch_id)
                    batch.emails.extend(es)
                for p in tax_paths:
                    ts, _ = load_tax_records(p, batch_id=batch_id)
                    batch.tax_records.extend(ts)

                run_date_str = run_date.strftime("%Y-%m-%d") if run_date else None
                batch = run_reconciliation(batch, run_date=run_date_str, extra_remark=remark or None)

                st.session_state["upload_batch"] = batch
                st.success(f"完成！邮件 {len(batch.emails)} 条 / 税费 {len(batch.tax_records)} 条 / 条目 {len(batch.items)} 条")

    if st.session_state.get("upload_batch") is not None:
        _render_batch_summary(st.session_state["upload_batch"], key_prefix="upload_")


with tab_rerun:
    st.subheader("🔄 重跑同一批次（入口 2，保留历史对比）")
    st.info("上传上一轮下载的批次 JSON 文件，可补数据/补备注再跑。两轮结果不一致会标记为「⚠️ 历史不一致」。")
    batch_file = st.file_uploader("批次 JSON 文件", type=["json"], key="rerun_batch")
    extra_email = st.file_uploader("追加审批邮件（可选）", accept_multiple_files=True, type=["xlsx", "csv", "eml"], key="rerun_email")
    extra_tax = st.file_uploader("追加税费明细（可选）", accept_multiple_files=True, type=["xlsx", "csv"], key="rerun_tax")
    rerun_remark = st.text_input("本轮备注", value="", placeholder="如：补录凭证号后复核", key="rerun_remark")
    rerun_date = st.date_input("运行日期", value=None, key="rerun_date")

    if batch_file and st.button("🔄 重跑", type="primary", key="rerun_btn"):
        with tempfile.TemporaryDirectory() as td:
            bj = os.path.join(td, batch_file.name)
            with open(bj, "wb") as f:
                f.write(batch_file.getbuffer())
            batch = ReconBatch.load(bj)

            ep = _save_uploaded(extra_email, td)
            tp = _save_uploaded(extra_tax, td)
            for p in ep:
                if p.lower().endswith(".eml"):
                    es, _ = load_eml_file(p, batch_id=batch.batch_id)
                else:
                    es, _ = load_emails(p, batch_id=batch.batch_id)
                batch.emails.extend(es)
            for p in tp:
                ts, _ = load_tax_records(p, batch_id=batch.batch_id)
                batch.tax_records.extend(ts)

            batch = run_reconciliation(
                batch,
                run_date=rerun_date.strftime("%Y-%m-%d") if rerun_date else None,
                extra_remark=rerun_remark or None,
            )
            st.session_state["rerun_batch"] = batch
            st.success(f"重跑完成，累计运行 {batch.run_count} 轮")

    if st.session_state.get("rerun_batch") is not None:
        _render_batch_summary(st.session_state["rerun_batch"], key_prefix="rerun_")


with tab_report:
    st.subheader("📄 查看已有报告（入口 3）")
    view_type = st.radio("选择查看方式", ["上传 Markdown 报告", "上传批次 JSON 重新生成报告"], horizontal=True)
    if view_type == "上传 Markdown 报告":
        md_file = st.file_uploader("上传 .md 报告文件", type=["md"], key="report_md")
        if md_file:
            content = md_file.read().decode("utf-8")
            st.markdown(content, unsafe_allow_html=False)
    else:
        json_file = st.file_uploader("上传批次 .json 文件", type=["json"], key="report_json")
        if json_file:
            with tempfile.TemporaryDirectory() as td:
                bj = os.path.join(td, json_file.name)
                with open(bj, "wb") as f:
                    f.write(json_file.getbuffer())
                batch = ReconBatch.load(bj)
                _render_batch_summary(batch, key_prefix="report_")


with tab_help:
    st.subheader("❓ 给没参与开发的同事：3 件事讲清")

    st.markdown("### 启动方式")
    st.markdown("在项目根目录执行（**两种命令等价，任选其一**）：")
    st.code("streamlit run webapp.py\n# 或\npython3 -m streamlit run hk_tax_recon/webapp.py", language="bash")
    st.markdown("浏览器打开 `http://localhost:8501` 即可使用。")

    st.markdown("### 1. 放样例数据并跑一轮（命令行）")
    st.code(
        "cd /Users/mac/pro/solo/workspaces/y13037\n"
        "python3 -m hk_tax_recon.cli sample --out-dir ./data\n"
        "python3 -m hk_tax_recon.cli run \\\n"
        "  --batch-id BATCH-001 \\\n"
        "  --emails ./data/sample_emails.xlsx \\\n"
        "  --tax    ./data/sample_tax.xlsx \\\n"
        "  --out ./reports",
        language="bash",
    )

    st.markdown("### 2. 重跑同一批次 + 补备注（命令行）")
    st.code(
        "python3 -m hk_tax_recon.cli rerun \\\n"
        "  --batch-json ./reports/BATCH-001.json \\\n"
        "  --remark \"补录凭证号后复核\" \\\n"
        "  --out ./reports",
        language="bash",
    )

    st.markdown("### 3. 查看产物")
    st.code(
        "# Markdown 报告：可直接用浏览器、VS Code、Typora 打开\n"
        "open ./reports/BATCH-001.md\n"
        "# 批次 JSON：用于 rerun 命令或 Web「🔄 重跑批次」Tab 上传\n"
        "ls -la ./reports/BATCH-001.json",
        language="bash",
    )

    st.markdown("### 材料入口 / 异常出口 速查")
    st.markdown("""
- **入口**：Web「📥 新材料对账」Tab，或命令行 `run` / `rerun`。
- **出口**：Markdown 报告第四部分「异常与待处理」，或 Web 状态卡片的异常数量。
  - ✅ 已匹配：不用管。
  - ❌ 不匹配：汇率或金额差异，按「下一步」说明核对托管对账单。
  - ⏰ 凭证晚到：交易日+3 个工作日仍无凭证号，找托管要凭证后重跑。
  - 👤 需人工：缺邮件或缺税费，核对材料是否齐全。
  - ⚠️ 历史不一致：同一批两轮结果不同，确认是数据修正还是口径变更。
""")
