#!/usr/bin/env python3
"""一键运行完整演示流程"""
import subprocess
import sys
import os


def run_command(cmd, description):
    print(f"\n{'=' * 60}")
    print(f"▶ {description}")
    print("=" * 60)
    print(f"命令: {cmd}")
    print()
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr, file=sys.stderr)
    
    if result.returncode != 0:
        print(f"\n❌ 命令执行失败 (返回码: {result.returncode})")
        return False
    
    print(f"\n✅ {description} 完成")
    return True


def main():
    print("\n" + "=" * 60)
    print("  线下展会物料异常回执状态机服务 - 完整演示")
    print("=" * 60)
    
    steps = [
        ("pip3 install -r requirements.txt -q", "安装Python依赖"),
        ("python3 scripts/init_db.py", "初始化数据库"),
        ("python3 scripts/sample_data.py", "导入样例数据"),
        ("python3 scripts/demo_flow.py", "运行完整业务流程演示"),
        ("python3 scripts/verify_manual_reason.py", "验证项目经理报告人工理由"),
        ("python3 scripts/verify_freeze_status.py", "验证冻结前后状态正确性"),
        ("python3 scripts/test_api.py", "验证所有API接口返回200"),
        ("python3 scripts/generate_reports.py", "生成Excel报告"),
    ]
    
    for cmd, desc in steps:
        if not run_command(cmd, desc):
            print(f"\n❌ 演示在步骤 '{desc}' 中断")
            sys.exit(1)
    
    print("\n" + "=" * 60)
    print("  🎉 所有步骤完成!")
    print("=" * 60)
    print("\n📁 生成的文件:")
    print("  - exhibition_material.db  (SQLite数据库)")
    print("  - reports/ 目录下的Excel报告")
    print("\n🚀 启动API服务:")
    print("  python3 main.py")
    print("  然后访问 http://localhost:8000/docs 查看API文档")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
