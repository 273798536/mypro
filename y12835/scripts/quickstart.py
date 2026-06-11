#!/usr/bin/env python3
"""
细胞冻存复苏台账 - 快速启动脚本

用法：
    python scripts/quickstart.py

功能：
    1. 检查依赖是否安装
    2. 如有旧数据库，自动备份后重建
    3. 启动服务
    4. 用 requests 跑一遍完整流程的冒烟测试（无需 curl）
"""
import subprocess
import os
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "cryo_ledger.db"
BASE_URL = "http://localhost:3001"
API = f"{BASE_URL}/api"


def check_dependencies():
    print("[1/6] 检查依赖...")
    node_modules = ROOT / "node_modules"
    if not node_modules.exists():
        print("  node_modules 不存在，执行 npm install ...")
        subprocess.run(["npm", "install"], cwd=ROOT, check=True)
    else:
        print("  ✓ 依赖已安装")


def backup_database():
    print("[2/6] 数据库初始化...")
    DB_PATH.parent.mkdir(exist_ok=True)
    if DB_PATH.exists():
        backup = DB_PATH.with_suffix(f".db.bak.{int(time.time())}")
        DB_PATH.rename(backup)
        print(f"  ✓ 旧数据库已备份至 {backup.name}")
    else:
        print("  ✓ 无旧数据库，首次启动")


def wait_for_service(timeout=60):
    """等待服务启动成功"""
    import urllib.request
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(f"{API}/health", timeout=2).read()
            return True
        except Exception:
            time.sleep(1)
    return False


def start_service():
    print("[3/6] 启动服务...")
    env = os.environ.copy()
    env["PORT"] = env.get("PORT", "3001")
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"  PID={proc.pid} 等待服务就绪...")
    if not wait_for_service():
        proc.kill()
        print("  ✗ 服务启动超时！请手动运行 npm run dev 排查")
        sys.exit(1)
    print("  ✓ 服务已就绪")
    return proc


def smoke_test():
    """用内置 urllib 跑一遍冒烟测试"""
    print("[4/6] 冒烟测试...")
    import urllib.request

    def req(method, path, data=None):
        url = f"{API}{path}"
        headers = {"Content-Type": "application/json"}
        body = json.dumps(data).encode() if data is not None else None
        r = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            resp = urllib.request.urlopen(r, timeout=10)
            return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode())
            except Exception:
                return {"success": False, "error": str(e)}

    # 4a. 统计
    d = req("GET", "/statistics")
    assert d["success"], f"统计失败: {d}"
    print(f"  ✓ 总记录数={d['data']['total_records']} 复苏成功率={d['data']['success_rate']}")

    # 4b. 列表
    d = req("GET", "/records?limit=3")
    assert d["success"]
    print(f"  ✓ 记录列表返回 {len(d['data'])} 条")

    # 4c. 试剂追溯
    d = req("GET", "/reagents/DMSO-2024-001/trace")
    assert d["success"], f"试剂追溯失败: {d}"
    s = d["data"]["conclusion_summary"]
    print(f"  ✓ DMSO-2024-001 批号汇总：成功={s['success']} 失败={s['failed']} 待定={s['pending']}")

    # 4d. 建冻存记录
    batch_id = d["data"]["batch"]["id"]
    d = req("POST", "/records", {
        "type": "freeze",
        "cell_line": "冒烟测试系",
        "passage_number": 7,
        "operator": "自动脚本",
        "date": "2026-06-11",
        "freezing_medium": "90%FBS+10%DMSO",
        "reagent_batch_id": batch_id,
        "storage_location": "测试区",
    })
    assert d["success"], f"创建记录失败: {d}"
    rid = d["data"]["record"]["id"]
    warnings = d["data"].get("warnings", [])
    print(f"  ✓ 创建记录={rid[:8]}...  自动生成警告={warnings} 异常数={len(d['data'].get('anomaly_ids', []))}")

    # 4e. 谱系
    d = req("GET", f"/lineage/{rid}")
    assert d["success"]
    print(f"  ✓ 谱系追踪：根节点={d['data']['root']['cell_line']} 子代数={len(d['data']['children'])}")

    # 4f. 异常列表
    d = req("GET", "/anomalies?review_status=pending")
    assert d["success"]
    print(f"  ✓ 待复核异常={len(d['data'])} 条")
    if d["data"]:
        a = d["data"][0]
        print(f"     示例异常: [{a['anomaly_type']}] 建议: {a['actionable_hint']}")

    # 4g. 重复导入检测
    rec = req("GET", "/records?limit=1")["data"][0]
    dup = {
        "type": rec["type"],
        "cell_line": rec["cell_line"],
        "passage_number": rec["passage_number"],
        "date": rec["date"],
        "operator": "重复导入测试",
        "freezing_medium": rec["freezing_medium"],
        "reagent_batch_id": rec["reagent_batch_id"],
        "storage_location": "重复位置",
    }
    d = req("POST", "/import/check", [dup])
    assert d["success"]
    print(f"  ✓ 重复检测：新增={d['data']['new_count']} 重复={d['data']['duplicate_count']} 冲突={d['data']['conflict_count']}")

    return rid


def run_demo_scripts():
    print("[5/6] 可执行演示脚本已准备：")
    print("  ./scripts/demo-flow.sh              完整流程（含异常检测、试剂追溯、谱系、复核）")
    print("  ./scripts/demo-duplicate-import.sh  重复导入场景演示")
    print("  ./scripts/curl-reference.txt        所有 API 的 curl 速查表")
    print("  执行:  chmod +x scripts/*.sh && ./scripts/demo-flow.sh")


def print_summary():
    print("[6/6] 启动完成 🎉")
    print(f"""
  ┌───────────────────────────────────────────────┐
  │ 前端: http://localhost:5173/                  │
  │ API : http://localhost:3001/api               │
  │ 文档: ./scripts/curl-reference.txt            │
  │ 脚本: ./scripts/demo-flow.sh                  │
  │       ./scripts/demo-duplicate-import.sh      │
  │ 数据: ./data/cryo_ledger.db (SQLite)          │
  │ 角色: 侧栏底部切换 技师 / 学生                │
  └───────────────────────────────────────────────┘
""")


if __name__ == "__main__":
    os.chdir(ROOT)
    check_dependencies()
    backup_database()
    proc = start_service()
    try:
        smoke_test()
        run_demo_scripts()
        print_summary()
        print("服务持续运行中，按 Ctrl+C 退出。")
        proc.wait()
    except KeyboardInterrupt:
        print("\n正在停止服务...")
    finally:
        proc.terminate()
        proc.wait(timeout=5)
