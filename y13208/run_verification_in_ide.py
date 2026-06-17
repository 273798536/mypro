# 此文件用于在 IDE 中直接运行验证（避免终端问题）
# 在 IDE 中右键运行此文件即可完成全部验证
import sys
import os
import importlib.util

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def run_module(module_path, func_name="main"):
    spec = importlib.util.spec_from_file_location("module", module_path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["module"] = mod
    spec.loader.exec_module(mod)
    return getattr(mod, func_name)()


if __name__ == "__main__":
    print("=" * 60)
    print("🎙️  录音棚时码异常提醒 · 验证入口")
    print("=" * 60)
    print()

    # 1. 先跑自包含验证
    print("👉 第 1 步：运行自包含验证（直连 Python API）")
    print("-" * 60)
    ret1 = run_module("self_verify.py", "run_self_verify")
    print()

    if ret1 == 0:
        print("✅ 自包含验证通过")
    else:
        print("❌ 自包含验证失败")
        sys.exit(ret1)

    # 2. 再跑端到端测试
    print()
    print("👉 第 2 步：运行端到端测试（完整场景）")
    print("-" * 60)
    ret2 = run_module("end_to_end_test.py")
    print()

    if ret2 == 0:
        print("✅ 端到端测试通过")
    else:
        print("❌ 端到端测试失败")
        sys.exit(ret2)

    print()
    print("=" * 60)
    print("🎉 所有验证全部通过！")
    print()
    print("📖 启动 FastAPI 服务：")
    print("   方式 1: chmod +x start.sh && ./start.sh")
    print("   方式 2: uvicorn main:app --reload --port 8000")
    print()
    print("🌐 启动后访问：")
    print("   前端页面: http://localhost:8000/static/index.html")
    print("   API 文档: http://localhost:8000/docs")
    print()
    print("🧪 单独运行测试：")
    print("   python3 self_verify.py    直连 Python API 验证")
    print("   python3 end_to_end_test.py 端到端场景测试")
    print("   python3 api_verify.py     HTTP API 验证（需先启动服务）")
    print("=" * 60)
