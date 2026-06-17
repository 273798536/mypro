# 语法检查脚本：验证所有 Python 文件语法
import ast
import sys
import os

files_to_check = [
    "models.py",
    "storage.py",
    "anomaly_engine.py",
    "report.py",
    "schemas.py",
    "main.py",
    "sample_data.py",
    "self_verify.py",
    "api_verify.py",
    "run_all_verification.py",
    "end_to_end_test.py"
]

print("=" * 60)
print("🔍 语法检查")
print("=" * 60)
print()

all_ok = True
for f in files_to_check:
    if not os.path.exists(f):
        print(f"❌ {f}: 文件不存在")
        all_ok = False
        continue
    try:
        with open(f, "r", encoding="utf-8") as fh:
            source = fh.read()
        ast.parse(source)
        print(f"✅ {f}: 语法正确")
    except SyntaxError as e:
        print(f"❌ {f}: 语法错误 - 第{e.lineno}行: {e.msg}")
        all_ok = False
    except Exception as e:
        print(f"❌ {f}: {e}")
        all_ok = False

print()
print("=" * 60)
if all_ok:
    print("✅ 所有 Python 文件语法正确")
else:
    print("❌ 存在语法错误")
    sys.exit(1)

# 验证 API 端点定义
print()
print("=" * 60)
print("🔍 API 端点检查")
print("=" * 60)
print()

sys.path.insert(0, ".")
try:
    from main import app
    routes = [(r.methods, r.path) for r in app.routes if hasattr(r, "path")]
    endpoints = []
    for methods, path in routes:
        if methods:
            for m in methods:
                if m in {"GET", "POST", "PUT", "DELETE", "PATCH"}:
                    endpoints.append((m, path))
    endpoints.sort()

    required_endpoints = [
        ("POST", "/api/import/tracklist"),
        ("POST", "/api/import/files"),
        ("POST", "/api/import/tracklist/csv"),
        ("POST", "/api/import/files/csv"),
        ("POST", "/api/detect"),
        ("GET", "/api/anomalies"),
        ("GET", "/api/anomalies/{anomaly_id}"),
        ("POST", "/api/anomalies/{anomaly_id}/confirm"),
        ("POST", "/api/anomalies/{anomaly_id}/resolve"),
        ("POST", "/api/anomalies/{anomaly_id}/dismiss"),
        ("POST", "/api/anomalies/{anomaly_id}/waive"),
        ("POST", "/api/anomalies/{anomaly_id}/remarks"),
        ("POST", "/api/report/generate"),
        ("GET", "/api/report/download/{filename}"),
        ("GET", "/api/reports"),
        ("GET", "/api/alignment"),
        ("GET", "/api/batches"),
        ("POST", "/api/upload/screenshot"),
        ("GET", "/api/health"),
        ("GET", "/api/state")
    ]

    found = set(endpoints)
    missing = []
    for m, p in required_endpoints:
        if (m, p) not in found:
            missing.append((m, p))

    if not missing:
        print(f"✅ 所有 {len(required_endpoints)} 个必需 API 端点已定义")
    else:
        print(f"❌ 缺少 {len(missing)} 个端点:")
        for m, p in missing:
            print(f"   {m} {p}")
        all_ok = False

    print()
    print(f"📋 已定义的 API 端点（共 {len(found)} 个）：")
    for m, p in sorted(found):
        if p.startswith("/api/"):
            print(f"   {m:6s} {p}")

except Exception as e:
    print(f"❌ 导入 main.py 失败: {e}")
    import traceback
    traceback.print_exc()
    all_ok = False

# 验证前端文件
print()
print("=" * 60)
print("🔍 前端文件检查")
print("=" * 60)
print()

frontend_files = [
    "static/index.html",
    "static/demo_tracklist.json",
    "static/demo_files.json"
]
for f in frontend_files:
    if os.path.exists(f):
        size = os.path.getsize(f)
        print(f"✅ {f}: {size} 字节")
    else:
        print(f"❌ {f}: 不存在")
        all_ok = False

# 验证配置文件
print()
print("=" * 60)
print("🔍 配置文件检查")
print("=" * 60)
print()

config_files = [
    "requirements.txt",
    "start.sh",
    "start.bat",
    "package.json"
]
for f in config_files:
    if os.path.exists(f):
        print(f"✅ {f}: 存在")
    else:
        print(f"❌ {f}: 不存在")
        all_ok = False

# 验证已有测试结果
print()
print("=" * 60)
print("🔍 已有测试结果验证")
print("=" * 60)
print()

test_artifacts = [
    "test_e2e_timecode.db",
    "reports/step5_before_restart.md",
    "reports/step7_after_restart.md"
]
for f in test_artifacts:
    if os.path.exists(f):
        size = os.path.getsize(f)
        print(f"✅ {f}: {size} 字节")
    else:
        print(f"ℹ️  {f}: 不存在（运行测试后生成）")

# 验证报告内容
if os.path.exists("reports/step5_before_restart.md"):
    with open("reports/step5_before_restart.md", "r", encoding="utf-8") as f:
        md = f.read()
    required_keywords = [
        "录音棚时码异常提醒",
        "时码偏半拍",
        "文件名不匹配",
        "授权备注",
        "后补备注",
        "文件 × 曲目表 × 最终清单 对齐",
        "变化摘要",
        "历史留存完整性验证",
        "节拍器切换延迟",
        "已授权豁免"
    ]
    missing_in_md = [k for k in required_keywords if k not in md]
    if not missing_in_md:
        print(f"✅ 报告包含所有 {len(required_keywords)} 个关键内容")
    else:
        print(f"❌ 报告缺少: {missing_in_md}")
        all_ok = False

print()
print("=" * 60)
if all_ok:
    print("🎉 所有检查通过！")
    print()
    print("📖 启动方式：")
    print("   1. 安装依赖: pip3 install -r requirements.txt")
    print("   2. 启动服务: ./start.sh （或 uvicorn main:app --reload）")
    print()
    print("🌐 启动后访问：")
    print("   前端页面: http://localhost:8000/static/index.html")
    print("   API 文档: http://localhost:8000/docs")
    print()
    print("🧪 测试验证命令：")
    print("   python3 self_verify.py    # 直连 Python API 验证")
    print("   python3 end_to_end_test.py # 端到端场景测试")
    print("   # 先启动服务，再运行：")
    print("   python3 api_verify.py     # HTTP API 验证")
    sys.exit(0)
else:
    print("❌ 部分检查失败")
    sys.exit(1)
