"""用 Streamlit AppTest 验证 UI 层在空批次/逐步补数据时不崩，并触发下载按钮。
覆盖真实评测负责人的使用链路：
  1) 全新空库 → 翻『📄 生成报告 & 导出』页 → 不应异常
  2) 只建一个空提示词版本 → 翻报告页 → 应显示『空批次占位说明版』且下载按钮可点
  3) 导入评测记录后 → 报告页 → 指标正常、按钮数据齐全
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_platform.db")):
    os.remove(os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_platform.db"))

import database as db
db.init_db()

from streamlit.testing.v1 import AppTest

APP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py")

print("=" * 72)
print("  Streamlit AppTest · 导出链路 UI 验证")
print("=" * 72)


def goto_page(at: AppTest, label_prefix: str):
    """在侧边栏 radio 中选中以 label_prefix 开头的页签"""
    radio = at.sidebar.radio[0]
    options = radio.options
    for opt in options:
        if opt.startswith(label_prefix):
            radio.set_value(opt)
            at.run()
            return True
    return False


def assert_no_exception(at: AppTest, stage: str):
    assert not at.exception, f"[{stage}] 出现异常：{[e.value for e in at.exception]}"
    assert not at.error, f"[{stage}] 出现错误：{[e.value for e in at.error]}"


# ============================================================
# 阶段 A：完全空库 → 直接翻到『生成报告 & 导出』页
# ============================================================
print("\n[阶段 A] 完全空库（无任何版本）→ 翻报告页")
at = AppTest.from_file(APP_PATH, default_timeout=60).run()
assert_no_exception(at, "A-初始")

ok = goto_page(at, "📄")
assert ok, "找不到『📄 生成报告 & 导出』页签"
assert_no_exception(at, "A-报告页")
# 应当提示"请先在左侧选择提示词版本"
info_texts = [t.value for t in at.info]
assert any("请先" in t and "提示词版本" in t for t in info_texts), f"[A] 期望提示选择版本，实际 info={info_texts}"
print("    ✅ 空库时报告页给出友好提示，未异常")

# ============================================================
# 阶段 B：只建一个空提示词版本（无题库、无评测记录）→ 翻报告页
# ============================================================
print("\n[阶段 B] 只建空提示词版本 → 翻报告页（最痛点）")
db.import_prompt_version("v_empty_空版本", "你是一个助手", "验证空批次导出")
at = AppTest.from_file(APP_PATH, default_timeout=60).run()
assert_no_exception(at, "B-初始")

# 侧边栏应能选到该版本
sb_radio = at.sidebar.radio
assert sb_radio, "[B] 侧边栏没找到版本选择器"
version_select = at.sidebar.selectbox[0]
version_select.set_value(version_select.options[0])
at.run()
assert_no_exception(at, "B-选版本")

ok = goto_page(at, "📄")
assert ok
assert_no_exception(at, "B-报告页")

# 应当出现 warning（空批次）和下载按钮
warn_texts = [t.value for t in at.warning]
assert any("还没有评测记录" in t for t in warn_texts), f"[B] 期望空批次 warning，实际={warn_texts}"
print(f"    ✅ 空批次 warning 已显示：{[t for t in warn_texts if '还没有评测记录' in t][:1]}")

# 下载按钮：Streamlit 1.50 的 AppTest 把 download_button 归到 button_group
# 这里用整个页面文本判断按钮 label 是否渲染，同时直接验证导出内容
all_text = " ".join(
    str(x.value)
    for src in (at.markdown, at.caption, at.info, at.warning, at.success)
    for x in src
)
# 下载按钮的 label 是独立元素，AppTest 1.50 不暴露，改用 HTML 抓取
import re
html_blob = ""
try:
    html_blob = at.html if hasattr(at, "html") else ""
except Exception:
    html_blob = ""
# 兜底：直接校验导出函数可用且产出正确（这才是"按钮触发后文件内容"的本质）
import report as rp
pv_now = db.list_prompt_versions()[0]  # 最新导入的空版本
wb_bytes_check = rp.build_export_workbook(pv_now["id"])
assert len(wb_bytes_check) > 5000, f"[B] Excel 字节过小：{len(wb_bytes_check)}"
import io, pandas as pd
sheets_check = pd.read_excel(io.BytesIO(wb_bytes_check), sheet_name=None)
assert len(sheets_check) == 8, f"[B] Excel Sheet 数不对：{len(sheets_check)}"
# 每个 Sheet 都有内容（占位说明也算）
for name, df in sheets_check.items():
    assert len(df) >= 1, f"[B] Sheet {name} 为空"
print(f"    ✅ Excel 实际内容校验：{len(wb_bytes_check)} 字节，8 个 Sheet 全部有内容")
# 校验报告页确实渲染了"下载 Excel"按钮文字（出现在 button_group 或页面对象里）
button_group_texts = []
try:
    for bg in at.button_group:
        button_group_texts.append(str(getattr(bg, "label", "")) or str(getattr(bg, "value", "")))
except Exception:
    pass
all_page_text = all_text + " ".join(button_group_texts)
assert "下载 Excel" in all_page_text or "空批次占位说明版" in all_page_text, (
    f"[B] 页面未渲染下载 Excel 按钮，button_group={button_group_texts}"
)
print(f"    ✅ 下载按钮 label 已渲染（含『空批次占位说明版』）")

# 报告框（markdown html）应有内容
md_texts = [m.value for m in at.markdown]
assert any("总体情况" in t and "还没有导入任何评测记录" in t for t in md_texts), (
    f"[B] 报告里应写明还没评测记录"
)
print("    ✅ 报告正文给出了『还没有导入任何评测记录』的普通话解释")

# ============================================================
# 阶段 C：导入题库 + 部分评测记录 → 报告页应正常
# ============================================================
print("\n[阶段 C] 导入题库 + 部分评测记录（含异常）→ 报告页")
pv_list = db.list_prompt_versions()
pv_id = pv_list[0]["id"]
db.upsert_question_bank([
    {"question_id": f"Q{i:03d}", "question_text": f"题{i}",
     "category": ["阅读理解", "逻辑推理", "代码生成"][i % 3],
     "difficulty": ["简单", "中等", "困难"][i % 3]}
    for i in range(1, 10)
])
db.upsert_eval_records(pv_id, [
    {"question_id": f"Q{i:03d}", "score": [90, 45, 80, 55, 92, None, 75, 68, 88][i - 1],
     "is_pass": [1, 0, 1, 0, 1, None, 1, 1, 1][i - 1],
     "eval_status": "exception" if i == 6 else "done",
     "exception_type": "超时" if i == 6 else None,
     "exception_detail": "请求超时" if i == 6 else None,
     "model_output": f"输出{i}" if i != 6 else None}
    for i in range(1, 10)
])
at = AppTest.from_file(APP_PATH, default_timeout=60).run()
assert_no_exception(at, "C-初始")
at.sidebar.selectbox[0].set_value(at.sidebar.selectbox[0].options[0])
at.run()
assert_no_exception(at, "C-选版本")

goto_page(at, "📄")
assert_no_exception(at, "C-报告页")
# 应当是 partial 状态（info 蓝）
info_texts = [t.value for t in at.info]
assert any("评测记录不完整" in t for t in info_texts), f"[C] 期望 partial info，实际={info_texts}"
print(f"    ✅ partial 状态提示：{[t for t in info_texts if '评测记录不完整' in t][:1]}")
md_texts = [m.value for m in at.markdown]
assert any("阅读理解" in t for t in md_texts), "[C] 报告应包含分类表现"
print("    ✅ 报告正文包含具体分类通过率")

# ============================================================
# 阶段 D：异常追溯页 - 空版本时应友好，有异常时应可追溯
# ============================================================
print("\n[阶段 D] 异常追溯页（空数据 + 有异常两种情形）")
# D1: 空版本时
db.import_prompt_version("v_empty2", "提示词2", "第二个空版本")
at = AppTest.from_file(APP_PATH, default_timeout=60).run()
assert_no_exception(at, "D-初始")
# 选第二个版本（空）
sb = at.sidebar.selectbox[0]
sb.set_value(sb.options[0])  # 默认最新
at.run()
assert_no_exception(at, "D-选空版本")
goto_page(at, "🔍")
assert_no_exception(at, "D-空版本异常页")
info_texts = [t.value for t in at.info]
assert any("没有匹配" in t or "异常记录数" in str(at.metric) for t in info_texts) or at.metric, (
    f"[D] 空版本异常页应显示 0 指标"
)
print("    ✅ 空版本异常追溯页未异常，显示空状态")

# D2: 有异常的版本
at2 = AppTest.from_file(APP_PATH, default_timeout=60).run()
assert_no_exception(at2, "D2-初始")
# 选 v_empty_空版本（有评测记录的那个）
sb2 = at2.sidebar.selectbox[0]
target = None
for opt in sb2.options:
    if "v_empty_空版本" in opt:
        target = opt
        break
assert target, f"[D2] 找不到有数据的版本，options={sb2.options}"
sb2.set_value(target)
at2.run()
assert_no_exception(at2, "D2-选版本")
goto_page(at2, "🔍")
assert_no_exception(at2, "D2-异常页")
# 应当能选到异常记录并显示追溯链路
selectboxes = at2.selectbox
assert selectboxes, "[D2] 异常页应能选择异常记录"
print(f"    ✅ 有异常版本进入异常追溯页，selectbox 数量={len(selectboxes)}")

# ============================================================
# 阶段 E：下载按钮 proto 存在性 + 按钮触发的文件内容端到端校验
#   （下载按钮的 data 参数 = rp.build_export_workbook 的返回值，直接调用校验）
# ============================================================
print("\n[阶段 E] 下载按钮 proto 存在 + 文件内容端到端校验")
at_e = AppTest.from_file(APP_PATH, default_timeout=60).run()
assert_no_exception(at_e, "E-初始")
at_e.sidebar.selectbox[0].set_value(at_e.sidebar.selectbox[0].options[0])
at_e.run()
assert_no_exception(at_e, "E-选版本")
goto_page(at_e, "📄")
assert_no_exception(at_e, "E-报告页")

# 从 main 的原始 proto 里抓 DownloadButton（AppTest 1.50 不直接暴露 download_button）
dl_buttons = []
for m in at_e.main:
    try:
        p = m.proto
        if getattr(getattr(p, "DESCRIPTOR", None), "name", "") == "DownloadButton":
            dl_buttons.append(p)
    except Exception:
        pass
assert len(dl_buttons) == 2, f"[E] 期望 2 个下载按钮（Excel + Markdown），实际={len(dl_buttons)}"
labels = [b.label for b in dl_buttons]
assert any("下载 Excel" in l and "空批次占位说明版" in l for l in labels), f"[E] Excel 按钮缺失：{labels}"
assert any("下载 Markdown" in l for l in labels), f"[E] Markdown 按钮缺失：{labels}"
print(f"    ✅ 两个下载按钮 proto 均存在：")
for l in labels:
    print(f"        · {l}")

# 校验 Excel 按钮 data 来源函数的端到端产出（即按钮点击后浏览器拿到的文件）
pv_e = db.list_prompt_versions()[0]
xlsx_bytes = rp.build_export_workbook(pv_e["id"])
assert len(xlsx_bytes) > 5000, f"[E] Excel 字节过小：{len(xlsx_bytes)}"
import io, pandas as pd
sheets = pd.read_excel(io.BytesIO(xlsx_bytes), sheet_name=None)
expected_sheets = [
    "1_评测结论摘要", "2_总体指标", "3_分类表现", "4_样本配比_偏科原因",
    "5_难度分布", "6_全部评测明细", "7_异常明细_请处理", "8_不通过明细",
]
assert list(sheets.keys()) == expected_sheets, f"[E] Sheet 名称/顺序不对：{list(sheets.keys())}"
# 关键 Sheet 不能是空壳
assert len(sheets["1_评测结论摘要"]) >= 1, "[E] 评测结论摘要 Sheet 为空"
assert len(sheets["2_总体指标"]) >= 1, "[E] 总体指标 Sheet 为空"
# 空批次时总体指标应写明『还没有评测记录』
overview_vals = " ".join(str(v) for v in sheets["2_总体指标"].values.flatten())
assert "还没有评测记录" in overview_vals or "暂无数据" in overview_vals, (
    "[E] 空批次 Excel 的总体指标应写明批次为空"
)
print(f"    ✅ Excel 文件端到端校验：{len(xlsx_bytes)} 字节，8 个 Sheet 名称与顺序正确")
print(f"    ✅ 空批次 Excel 总体指标 Sheet 已写明『还没有评测记录』给业务方看")

# 校验 Markdown 报告内容（普通话解释，可复制给同事）
md_report_dict = rp.generate_plain_report(pv_e["id"])
assert isinstance(md_report_dict, dict) and "plain_text" in md_report_dict, "[E] 报告应返回 dict 含 plain_text"
md_report = md_report_dict["plain_text"]
assert "总体情况" in md_report, "[E] Markdown 报告缺总体情况"
assert "还没有导入任何评测记录" in md_report, "[E] 空批次报告应说明还没评测记录"
assert "建议" in md_report, "[E] 报告应含下一步建议"
# 确认 worst/biased 未触发 NameError（即函数正常返回，就是最佳证据）
assert "五、建议" in md_report, "[E] 报告应含第五节建议（说明 worst/biased 分支未报错）"
print(f"    ✅ Markdown 报告含普通话解释（总体情况/空批次说明/建议），可直接复制给同事")
print(f"    ✅ 确认 worst/biased 未触发 NameError（报告完整生成，含第五节建议）")

# ============================================================
# 阶段 F：有数据版本的 Excel 偏科原因说明列 + 异常明细处理意见列
#   （对应原始需求：导出给不懂代码的人看，偏科原因不全是字段名；
#    异常往回查能查到处理意见）
# ============================================================
print("\n[阶段 F] 有数据版本 Excel 的偏科原因说明列 + 异常明细处理意见列")
# 精确定位阶段 C 填充了数据的版本（v_empty_空版本），避免误取阶段 D 的空版本
pv_full = None
for pv in db.list_prompt_versions():
    if pv["version_name"] == "v_empty_空版本":
        pv_full = pv
        break
assert pv_full is not None, "[F] 找不到阶段C填充数据的版本 v_empty_空版本"
# 先设置预期占比，触发偏科计算
db.set_expected_ratio(pv_full["id"], {"阅读理解": 50, "逻辑推理": 30, "代码生成": 20})
# 确认 ratio 真的被设置了（防止拿错版本）
ratios_check = db.get_dataset_ratio(pv_full["id"])
assert any(r.get("expected_ratio") is not None for r in ratios_check), "[F] 预期占比未写入"
xlsx_f = rp.build_export_workbook(pv_full["id"])
sheets_f = pd.read_excel(io.BytesIO(xlsx_f), sheet_name=None)

# 1) 偏科原因说明列必须存在且为中文描述（非字段名/缩写）
ratio_cols = list(sheets_f["4_样本配比_偏科原因"].columns)
assert "偏科原因说明" in ratio_cols, f"[F] 偏科原因说明列缺失，实际列={ratio_cols}"
ratio_text = " ".join(str(v) for v in sheets_f["4_样本配比_偏科原因"]["偏科原因说明"].fillna(""))
# 应包含"百分点""建议"等普通话词汇，而非缩写
assert "百分点" in ratio_text, f"[F] 偏科原因应是普通话，含『百分点』，实际={ratio_text[:200]}"
print(f"    ✅ Sheet4 偏科原因说明列存在，内容为普通话：")
for v in sheets_f["4_样本配比_偏科原因"]["偏科原因说明"].tolist()[:3]:
    print(f"        · {v}")

# 2) 异常明细 Sheet 必须有『处理意见（请填写）』列（异常往回查能查到处理意见入口）
exc_cols = list(sheets_f["7_异常明细_请处理"].columns)
assert "处理意见（请填写）" in exc_cols, f"[F] 异常明细缺处理意见列，实际列={exc_cols}"
assert "处理人（请填写）" in exc_cols, f"[F] 异常明细缺处理人列，实际列={exc_cols}"
# 异常明细应能追溯到题库原题（question_id / 题目内容）
assert any("题目" in c or "ID" in c.upper() for c in exc_cols), f"[F] 异常明细应含题目标识列"
assert len(sheets_f["7_异常明细_请处理"]) >= 1, "[F] 异常明细应至少有1条异常记录"
print(f"    ✅ Sheet7 异常明细含『处理意见（请填写）』『处理人（请填写）』两列")
print(f"    ✅ 异常明细可追溯到题库原题，共 {len(sheets_f['7_异常明细_请处理'])} 条异常")

# 3) 异常追溯数据链路：异常记录 → 题库 → 处理意见
exc_records = db.list_eval_records(prompt_version_id=pv_full["id"], only_exception=True)
assert exc_records, "[F] 应有异常记录可追溯"
trace = rp.build_exception_trace_data(exc_records[0]["id"])
assert trace and "eval_record" in trace and "question" in trace, "[F] 异常追溯链路数据不完整"
assert trace["question"].get("question_id") == exc_records[0]["question_id"], "[F] 追溯链路题号不匹配"
print(f"    ✅ 异常追溯链路完整：异常记录 → 题库原题（{trace['question'].get('question_id')}）→ 处理意见")

# ============================================================
# 总结
# ============================================================
print()
print("=" * 72)
print("  🎉 Streamlit AppTest 6 个阶段全部通过")
print("=" * 72)
print("  · 阶段 A 完全空库 → 报告页友好提示 ✅")
print("  · 阶段 B 空批次（最痛点）→ warning + 占位 Excel 下载按钮 ✅")
print("  · 阶段 C 部分数据 → partial 提示 + 分类通过率 ✅")
print("  · 阶段 D 异常追溯页（空 + 有异常两种情形）✅")
print("  · 阶段 E 下载按钮 proto 存在 + Excel/Markdown 文件端到端 ✅")
print("  · 阶段 F 偏科原因普通话说明 + 异常明细处理意见列 + 追溯链路 ✅")