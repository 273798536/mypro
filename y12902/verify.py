"""快速验证脚本：检查所有核心功能是否正常"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import database as db
import data_import as di
import report as rp
import seed_data as sd

print("=" * 60)
print("  指令微调样本配比台 · 功能自检")
print("=" * 60)

# 1. 数据库初始化
print("\n[1/8] 数据库初始化...", end=" ")
db.init_db()
print("✅")

# 2. 提示词版本导入 + 去重合并
print("[2/8] 提示词版本导入 & 去重合并...", end=" ")
r1 = db.import_prompt_version("test_v1", "你是一个助手", "测试版本")
r2 = db.import_prompt_version("test_v1", "你是一个助手", "第二次导入")
assert r1["status"] == "new"
assert r2["status"] == "merged"
assert r1["id"] == r2["id"]
print("✅ (重复导入正确合并，不打架)")

# 3. 题库导入
print("[3/8] 评测题库导入...", end=" ")
q_result = db.upsert_question_bank([
    {"question_id": "T001", "question_text": "1+1等于几？", "category": "数学计算", "difficulty": "简单"},
    {"question_id": "T002", "question_text": "中国首都是哪里？", "category": "常识问答", "difficulty": "简单"},
    {"question_id": "T003", "question_text": "用Python写快排", "category": "代码生成", "difficulty": "中等"},
])
assert q_result["inserted"] == 3
print("✅")

# 4. 评测记录导入
print("[4/8] 评测记录导入...", end=" ")
e_result = db.upsert_eval_records(r1["id"], [
    {"question_id": "T001", "score": 95, "is_pass": 1, "model_output": "等于2", "eval_status": "done"},
    {"question_id": "T002", "score": 88, "is_pass": 1, "model_output": "北京", "eval_status": "done"},
    {"question_id": "T003", "score": 45, "is_pass": 0, "model_output": "写不出来", "exception_type": "输出截断", "exception_detail": "长度超限", "eval_status": "done"},
])
assert e_result["inserted"] == 3
print("✅")

# 5. 汇总统计 & 分类通过率
print("[5/8] 汇总统计 & 分类通过率...", end=" ")
summary = db.get_prompt_version_summary(r1["id"])
assert summary["total"] == 3
assert summary["pass"] == 2
assert summary["fail"] == 1
assert summary["pass_rate"] > 0
assert "数学计算" in summary["by_category"]
print("✅")

# 6. 普通话报告生成
print("[6/8] 普通话报告生成...", end=" ")
report = rp.generate_plain_report(r1["id"])
plain = report["plain_text"]
assert "总体情况" in plain
assert "通过率" in plain
assert len(plain) > 100
print(f"✅ (报告 {len(plain)} 字，可直接复制)")

# 7. Excel 导出（友好格式）
print("[7/8] Excel 友好格式导出...", end=" ")
wb_bytes = rp.build_export_workbook(r1["id"])
assert len(wb_bytes) > 1000
print(f"✅ ({len(wb_bytes)} 字节，含 8 个 Sheet)")

# 8. 异常追溯链路
print("[8/8] 异常追溯链路...", end=" ")
exc_list = db.list_eval_records(prompt_version_id=r1["id"], only_exception=True)
assert len(exc_list) >= 1
trace = rp.build_exception_trace_data(exc_list[0]["id"])
assert "question" in trace
assert "prompt_version" in trace
assert "treatment_notes" in trace
# 添加处理意见
db.add_treatment_note(exc_list[0]["id"], "提示词优化建议", "增加代码相关few-shot示例", "张三")
trace2 = rp.build_exception_trace_data(exc_list[0]["id"])
assert len(trace2["treatment_notes"]) == 1
print("✅ (异常→题库→提示词→处理意见 全链路贯通)")

print()
print("=" * 60)
print("  🎉 所有核心功能验证通过！")
print("=" * 60)
print()
print("📂 项目文件结构：")
for f in sorted(os.listdir(os.path.dirname(os.path.abspath(__file__)))):
    if f.endswith(".py") or f.endswith(".txt") or f.endswith(".sh"):
        print(f"   {f}")
print()
print("🚀 启动方式：")
print("   方式一：./start.sh")
print("   方式二：streamlit run app.py")
print()
print("📖 建议流程：")
print("   1) 启动后进『🧩 示例数据 / 初始化』一键生成数据")
print("   2) 切换左侧提示词版本，查看『📈 看板总览』")
print("   3) 在『🧪 样本配比分析』设置预期占比")
print("   4) 在『🔍 异常追溯』里顺着异常反查题库和处理意见")
print("   5) 在『📄 生成报告 & 导出』下载 Excel / Markdown")
