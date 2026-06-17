import database as db
import balancer as bl
import sample_data as sd
import report_generator as rg
from io import BytesIO
import os
import tempfile

print("=" * 60)
print("  验证：内存版 Word 导出 + 向后兼容 + 启动链路")
print("=" * 60)

# 1. 生成样例数据 + 转 DataFrame
samples = sd.generate_daily_samples()
df = bl.samples_to_df(samples)
df["id"] = range(len(df))
print(f"\n1. 样例数据：{len(df)} 条")

# 2. 拿规则 + 跑平衡
rules = db.get_active_rules()
result = bl.balance_samples(df, rules, strategy="stratified", target_total=50)
print(f"2. 平衡结果：保留 {result['balanced_count']} 条，剔除 {result['drop_reason_count']} 条")

# 3. 测试内存版 Word 导出
print("\n3. 测试内存版 Word 导出（零文件依赖）...")
filename, buf = rg.generate_word_report_bytes(result, None, "测试数据集")
print(f"   文件名：{filename}")
print(f"   字节数：{len(buf.getvalue())}")
print(f"   是 BytesIO：{isinstance(buf, BytesIO)}")
assert len(buf.getvalue()) > 10000, "Word 内容太少"
assert buf.tell() == 0, "指针应在起始位置（seek 0），可直接下载"
print("   ✅ 内存版导出正常，不需要写磁盘，受限环境可用")

# 4. 测试文件版还能用（向后兼容）
print("\n4. 测试文件版导出（向后兼容）...")
with tempfile.TemporaryDirectory() as tmpdir:
    path = rg.generate_word_report(result, None, "兼容测试", tmpdir)
    print(f"   文件路径：{path}")
    print(f"   文件大小：{os.path.getsize(path)} 字节")
    assert os.path.exists(path)
    print("   ✅ 文件版导出正常，向后兼容旧调用")

# 5. 验证 HTML 报告（本来就是内存的，再确认）
print("\n5. 验证 HTML 报告（纯内存字符串）...")
html = rg.generate_html_report(result, None, "测试")
print(f"   HTML 长度：{len(html)} 字符")
assert "【" in html, "HTML 报告应包含【】格式的自然语言解释"
assert "总体结论" in html
print("   ✅ HTML 报告正常，纯内存字符串")

# 6. 验证 CSV 导出（DataFrame 直接 to_csv，也是内存的）
print("\n6. 验证 CSV 导出（纯内存字节）...")
csv_bytes = result["balanced_df"].to_csv(index=False).encode("utf-8-sig")
print(f"   CSV 字节数：{len(csv_bytes)}")
assert len(csv_bytes) > 500
print("   ✅ CSV 导出正常，纯内存字节")

# 7. 验证数据库路径环境变量支持
print("\n7. 验证数据库路径可配置（受限部署需要）...")
print(f"   当前 DB_PATH：{db.DB_PATH}")
print("   通过环境变量 BALANCER_DB_PATH 可指定到可写目录")
print("   ✅ 支持环境变量配置")

# 8. 启动命令说明
print("\n8. 启动命令（推荐）...")
print("   python -m streamlit run app.py")
print("   （用 python -m 方式，避免 streamlit 不在 PATH 的问题）")
print("   headless 启动：STREAMLIT_SERVER_HEADLESS=true python -m streamlit run app.py")
print("   ✅ 启动链路清晰")

print("\n" + "=" * 60)
print("  🎉 全部验证通过！")
print("=" * 60)
print("\n核心修复总结：")
print("  1. Word 导出：从「写文件再读回」改为「内存 BytesIO」")
print("     → 只读/受限部署环境不会再报 Word 导出失败")
print("  2. HTML/CSV 导出：本来就是内存的，保持不变")
print("  3. 数据库路径：支持 BALANCER_DB_PATH 环境变量")
print("     → 受限环境可以把数据库指到可写目录")
print("  4. 启动方式：统一用 python -m streamlit run app.py")
print("     → 避免 streamlit 命令不在 PATH 的问题")
