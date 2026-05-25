#!/usr/bin/env python3
"""内联运行所有测试"""
import sys
import os
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db

def run_test(module_name, test_func_name):
    print(f"\n{'='*60}")
    print(f"运行测试: {module_name}.{test_func_name}")
    print("=" * 60)
    
    try:
        # Clean database
        if os.path.exists("city_lighting.db"):
            os.remove("city_lighting.db")
        
        init_db()
        
        module = __import__(module_name, fromlist=[''])
        test_func = getattr(module, test_func_name)
        result = test_func()
        
        if result:
            print(f"\n结果: ✓ 通过")
        else:
            print(f"\n结果: ✗ 失败")
        
        return result
        
    except Exception as e:
        print(f"\n错误: {e}")
        traceback.print_exc()
        return False


def test_demo_workflow():
    """测试完整流程演示"""
    from examples.demo_workflow import main
    try:
        main()
        return True
    except SystemExit as e:
        return e.code == 0
    except Exception:
        traceback.print_exc()
        return False


def test_edge_cases():
    """测试边界情况"""
    from examples.test_edge_cases import main
    try:
        main()
        return True
    except SystemExit as e:
        return e.code == 0
    except Exception:
        traceback.print_exc()
        return False


def test_role_view():
    """测试角色视图"""
    from examples.role_view_demo import main
    try:
        main()
        return True
    except SystemExit as e:
        return e.code == 0
    except Exception:
        traceback.print_exc()
        return False


def test_queue_and_replay():
    """测试队列和历史回放"""
    from examples.test_queue_and_replay import main
    try:
        main()
        return True
    except SystemExit as e:
        return e.code == 0
    except Exception:
        traceback.print_exc()
        return False


def test_api_imports():
    """测试API模块导入"""
    print("  测试API模块导入...")
    try:
        from app.main import app
        print("  FastAPI 应用加载成功")
        return True
    except Exception as e:
        print(f"  错误: {e}")
        traceback.print_exc()
        return False


def test_cli_imports():
    """测试CLI模块导入"""
    print("  测试CLI模块导入...")
    try:
        import cli
        print("  CLI 应用加载成功")
        return True
    except Exception as e:
        print(f"  错误: {e}")
        traceback.print_exc()
        return False


tests = [
    ("API模块导入", test_api_imports),
    ("CLI模块导入", test_cli_imports),
    ("完整流程演示", test_demo_workflow),
    ("边界情况测试", test_edge_cases),
    ("角色视图演示", test_role_view),
    ("队列和回放测试", test_queue_and_replay),
]

if __name__ == "__main__":
    init_db()
    
    results = []
    for name, test_func in tests:
        passed = test_func()
        results.append((name, passed))
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"  {name}: {status}")
    
    passed_count = sum(1 for _, p in results if p)
    print(f"\n总计: {passed_count}/{len(results)} 测试通过")
    
    sys.exit(0 if passed_count == len(results) else 1)
