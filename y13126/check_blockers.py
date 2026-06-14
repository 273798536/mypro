"""阻断点自检脚本：干净环境中一键验证安装、导入、入口是否通"""
import sys
import os

PASS = 0
FAIL = 0

def check(name, fn):
    global PASS, FAIL
    try:
        fn()
        print(f"  ✅ {name}")
        PASS += 1
    except Exception as e:
        print(f"  ❌ {name}: {e}")
        FAIL += 1

def main():
    print("=" * 60)
    print("  贝叶斯先验边界校验 - 阻断点自检")
    print("=" * 60)
    print()

    print("[一] 依赖包导入（对应 requirements.txt / pyproject.toml）")
    check("click",          lambda: __import__("click"))
    check("pandas",         lambda: __import__("pandas"))
    check("openpyxl",       lambda: __import__("openpyxl"))
    check("pydantic",       lambda: __import__("pydantic"))
    check("yaml (pyyaml)",  lambda: __import__("yaml"))
    check("rich",           lambda: __import__("rich"))
    check("fastapi",        lambda: __import__("fastapi"))
    check("uvicorn",        lambda: __import__("uvicorn"))
    check("python-multipart (关键!)",
          lambda: __import__("multipart"))
    print()

    print("[二] 项目模块导入（代码层面无 ImportError）")
    check("bayesian_prior_check.models",    lambda: __import__("bayesian_prior_check.models"))
    check("bayesian_prior_check.config",    lambda: __import__("bayesian_prior_check.config"))
    check("bayesian_prior_check.parser",    lambda: __import__("bayesian_prior_check.parser"))
    check("bayesian_prior_check.validator", lambda: __import__("bayesian_prior_check.validator"))
    check("bayesian_prior_check.storage",   lambda: __import__("bayesian_prior_check.storage"))
    check("bayesian_prior_check.reporter",  lambda: __import__("bayesian_prior_check.reporter"))
    check("bayesian_prior_check.cli",       lambda: __import__("bayesian_prior_check.cli"))
    check("bayesian_prior_check.api (关键!)", lambda: __import__("bayesian_prior_check.api"))
    check("顶层包 bayesian_prior_check",    lambda: __import__("bayesian_prior_check"))
    print()

    print("[三] 关键实例化（非语法/导入层面的运行时阻断）")
    def _cfg():
        from bayesian_prior_check.config import load_boundaries
        load_boundaries()
    check("load_boundaries() 读取配置", _cfg)

    def _app():
        from bayesian_prior_check.api import app
        assert app.title and len(app.routes) > 0
    check("FastAPI app 构造 + 路由注册", _app)

    def _cli_help():
        from click.testing import CliRunner
        from bayesian_prior_check.cli import main
        r = CliRunner().invoke(main, ["--help"])
        assert r.exit_code == 0, f"exit={r.exit_code}"
    check("CLI --help 可执行 (click)", _cli_help)
    print()

    print("[四] API 路由完整性（对应 Swagger 文档）")
    from bayesian_prior_check.api import app
    expected = {
        ("POST", "/api/v1/check"),
        ("GET", "/api/v1/runs"),
        ("GET", "/api/v1/runs/{run_id}"),
        ("GET", "/api/v1/runs/{run_id}/summary"),
        ("PATCH", "/api/v1/runs/{run_id}/note"),
        ("GET", "/api/v1/runs/{run_id}/report"),
        ("GET", "/api/v1/boundaries"),
        ("GET", "/health"),
    }
    found = set()
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            for m in route.methods - {"HEAD", "OPTIONS"}:
                found.add((m, route.path))
    missing = expected - found
    if not missing:
        print("  ✅ 所有预期路由已注册:")
        for m, p in sorted(expected):
            print(f"     {m:5s} {p}")
    else:
        print(f"  ❌ 缺少路由: {missing}")
    print()

    total_checks = PASS + FAIL + (0 if missing else 1)
    if not missing:
        PASS_ROUTES = 1
    else:
        PASS_ROUTES = 0

    print("=" * 60)
    print(f"  通过: {PASS + PASS_ROUTES}    失败: {FAIL + (0 if not missing else 1)}")
    if FAIL == 0 and not missing:
        print("  ✅✅✅  全部阻断点自检通过，可以进入下一步启动/联调")
    else:
        print("  ❌ 存在阻断问题，请先处理上方标 ❌ 的项")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    main()
