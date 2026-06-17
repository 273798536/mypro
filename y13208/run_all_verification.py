"""
一键验证脚本：
1. 检查依赖是否安装
2. 运行自包含验证（直连 Python API）
3. 启动 FastAPI 服务
4. 运行 API 验证（HTTP 请求）
5. 打印结果

运行方式：
    python3 run_all_verification.py
"""

import sys
import os
import subprocess
import time
import threading
import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

server_process = None


def check_dependencies():
    print("📦 检查依赖...")
    required = {
        "fastapi": "0.110.0",
        "uvicorn": "0.29.0",
        "pydantic": "2.6.4",
        "multipart": "0.0.9",
        "aiofiles": "23.2.1"
    }
    missing = []
    for pkg, ver in required.items():
        try:
            if pkg == "multipart":
                import multipart
                print(f"  ✅ python-multipart")
            else:
                mod = __import__(pkg)
                installed = getattr(mod, "__version__", "installed")
                print(f"  ✅ {pkg} {installed}")
        except ImportError:
            missing.append(pkg if pkg != "multipart" else "python-multipart")
    if missing:
        print(f"\n❌ 缺少依赖: {missing}")
        print(f"   请运行: pip install -r requirements.txt")
        return False
    print("✅ 所有依赖已安装\n")
    return True


def run_self_verify():
    print("🧪 运行自包含验证（直连 Python API）...")
    from self_verify import run_self_verify
    return run_self_verify()


def start_server():
    global server_process
    print("\n🚀 启动 FastAPI 服务（后台）...")
    env = os.environ.copy()
    env["TIMECODE_DB"] = "timecode_verify_api.db"
    env["TIMECODE_UPLOAD_DIR"] = "uploads"
    env["TIMECODE_REPORT_DIR"] = "reports"
    env["TIMECODE_STATIC_DIR"] = "static"

    for d in ["uploads", "reports", "static"]:
        os.makedirs(d, exist_ok=True)

    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env
    )
    # 等待服务启动
    for i in range(30):
        try:
            import urllib.request
            urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=2)
            print("✅ 服务已启动，监听 http://127.0.0.1:8000")
            return True
        except Exception:
            time.sleep(0.5)
    print("❌ 服务启动超时")
    stop_server()
    return False


def stop_server():
    global server_process
    if server_process:
        print("\n🛑 停止服务...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
        server_process = None


def run_api_verify():
    print("\n🌐 运行 API 验证（HTTP 请求）...")
    from api_verify import main as api_main
    return api_main()


def cleanup():
    for f in ["timecode_verify_api.db"]:
        if os.path.exists(f):
            try:
                os.remove(f)
            except:
                pass


def main():
    print("=" * 60)
    print("🎙️  录音棚时码异常提醒 · 一键完整验证")
    print("=" * 60)
    print()

    try:
        # 1. 检查依赖
        if not check_dependencies():
            return 1

        # 2. 自包含验证
        ret1 = run_self_verify()
        if ret1 != 0:
            print("\n❌ 自包含验证失败，跳过 API 验证")
            return ret1

        # 3. 启动服务
        if not start_server():
            return 1

        # 4. API 验证
        ret2 = run_api_verify()

        # 5. 停止服务
        stop_server()

        # 6. 总结
        print("\n" + "=" * 60)
        if ret1 == 0 and ret2 == 0:
            print("🎉 全部验证通过！")
            print("")
            print("📖 启动方式：")
            print("   ./start.sh  (macOS/Linux)")
            print("   start.bat   (Windows)")
            print("")
            print("🌐 访问地址：")
            print("   前端页面:  http://localhost:8000/static/index.html")
            print("   API 文档:  http://localhost:8000/docs")
            print("")
            print("🧪 测试脚本：")
            print("   python3 self_verify.py   (直连Python API验证)")
            print("   python3 api_verify.py    (HTTP API验证)")
            print("   python3 end_to_end_test.py  (端到端场景测试)")
            return 0
        else:
            print("❌ 部分验证失败")
            return ret1 or ret2

    except KeyboardInterrupt:
        print("\n\n⏹️  被用户中断")
        stop_server()
        return 130
    finally:
        cleanup()


if __name__ == "__main__":
    sys.exit(main())
