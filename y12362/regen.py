#!/usr/bin/env python3
import sys, os, json, subprocess

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "robot_joint_checker"))
from src import JointCheckWorkflow

base = os.path.dirname(os.path.abspath(__file__))

LOG = []
def log(msg):
    LOG.append(msg)
    print(msg)

def run(label, joint, load, motion, outdir):
    wf = JointCheckWorkflow(output_dir=outdir)
    r = wf.run_full_workflow(
        joint_config_file=joint,
        load_config_file=load,
        motion_sequence_file=motion,
        generate_plots=False,
    )
    cr = r["check_result"]
    vs = r["violation_summary"]
    vel_max = {k: max(abs(v) for v in vs_list) for k, vs_list in cr.velocity_results.items() if vs_list}
    torque_max = {k: max(vs_list) for k, vs_list in cr.torque_results.items() if vs_list}
    reports = {k: v for k, v in r["reports"].items() if not k.endswith("_error")}

    log(f"\n{'='*60}")
    log(f"  {label}")
    log(f"{'='*60}")
    log(f"  最大速度 (°/s):")
    for jid, v in sorted(vel_max.items()):
        cfg = cr.joint_configs.get(jid)
        lim = cfg.max_angular_velocity if cfg else 0
        ok = "✓" if v <= lim else "✗"
        log(f"    关节{jid}: {v:.2f} / {lim} {ok}")
    log(f"  最大力矩 (Nm):")
    for jid, v in sorted(torque_max.items()):
        cfg = cr.joint_configs.get(jid)
        lim = cfg.max_torque if cfg else 0
        ok = "✓" if v <= lim else "✗"
        log(f"    关节{jid}: {v:.2f} / {lim} {ok}")
    log(f"  超限: 总{vs['total_violations']} 严重{vs['critical_count']} 警告{vs['warning_count']}")
    log(f"  载荷越界: {'YES' if vs['has_load_violation'] else 'NO'}")
    log(f"  报告:")
    for k, v in reports.items():
        log(f"    {k}: {os.path.basename(v)} {'✓' if os.path.exists(v) else '✗'}")

    jpath = reports.get("json", "")
    if jpath and os.path.exists(jpath):
        with open(jpath, "r", encoding="utf-8") as f:
            jr = json.load(f)
        jvel = {int(k): max(abs(v) for v in vs_list) for k, vs_list in jr.get("velocity_results", {}).items() if vs_list}
        match = all(abs(jvel.get(k, 0) - vel_max.get(k, 0)) < 0.01 for k in vel_max)
        log(f"  JSON速度与控制台一致: {'YES' if match else 'NO'}")

    hpath = reports.get("html", "")
    if hpath and os.path.exists(hpath):
        with open(hpath, "r", encoding="utf-8") as f:
            hc = f.read()
        valid = "<!DOCTYPE html>" in hc and "</html>" in hc
        log(f"  HTML可打开: {'YES' if valid else 'NO'} ({len(hc)} bytes)")

    sane = all(v < 500 for v in vel_max.values())
    return {"vel_max": vel_max, "sane": sane, "has_load": vs["has_load_violation"]}

print("╔══════════════════════════════════════════════════════════╗")
print("║       机器人关节力矩检查 - 完整验证套件                     ║")
print("╚══════════════════════════════════════════════════════════╝")
print()
print("阶段 1/4: 正常场景测试")
print("-" * 60)
r1 = run(
    "场景1: 载荷越界 (exceeded)",
    os.path.join(base, "robot_joint_checker", "examples", "joint_config.json"),
    os.path.join(base, "robot_joint_checker", "examples", "load_config_exceeded.json"),
    os.path.join(base, "robot_joint_checker", "examples", "motion_sequence.json"),
    os.path.join(base, "robot_joint_checker", "reports"),
)
r2 = run(
    "场景2: 同事测试 (test_colleague)",
    os.path.join(base, "test_colleague", "data", "joint_config.json"),
    os.path.join(base, "test_colleague", "data", "load_config.json"),
    os.path.join(base, "test_colleague", "data", "motion_angles.json"),
    os.path.join(base, "test_colleague", "results"),
)

print()
print("阶段 2/4: 错误处理测试 - 文件缺失")
print("-" * 60)
script_path = os.path.join(base, "robot_joint_checker", "run_check.py")
cmd = [sys.executable, script_path, "--joint", "nonexistent.json", "--load", "nonexistent.json", "--motion", "nonexistent.json", "--no-plots"]
result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.join(base, "robot_joint_checker"))
log(f"  命令: {' '.join(cmd)}")
log(f"  退出码: {result.returncode}")
log(f"  包含友好提示: {'YES' if '文件不存在' in result.stdout or '文件不存在' in result.stderr else 'NO'}")
log(f"  无traceback: {'YES' if 'Traceback' not in result.stdout and 'Traceback' not in result.stderr else 'NO'}")
error_test_1_pass = result.returncode != 0 and '文件不存在' in (result.stdout + result.stderr) and 'Traceback' not in (result.stdout + result.stderr)

print()
print("阶段 3/4: 修复前后对比")
print("-" * 60)
log(f"  修复前 → 修复后 (exceeded):")
log(f"    关节1: 2864.79 → {r1['vel_max'].get(1,0):.2f} °/s")
log(f"    关节2: 5729.58 → {r1['vel_max'].get(2,0):.2f} °/s")
log(f"    关节3: 11459.16 → {r1['vel_max'].get(3,0):.2f} °/s")

print()
print("阶段 4/4: HTML 浏览器可打开性验证")
print("-" * 60)
import http.server
import socketserver
import threading
PORT = 8766
handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), handler)
os.chdir(os.path.join(base, "robot_joint_checker", "reports"))
server_thread = threading.Thread(target=httpd.serve_forever)
server_thread.daemon = True
server_thread.start()
import time
time.sleep(0.5)
log(f"  HTTP服务器已启动: http://localhost:{PORT}/")
import urllib.request
try:
    html_file = [f for f in os.listdir('.') if f.endswith('.html')][0]
    url = f"http://localhost:{PORT}/{html_file}"
    resp = urllib.request.urlopen(url)
    content = resp.read().decode('utf-8')
    valid_http = "<!DOCTYPE html>" in content and "</html>" in content
    log(f"  访问URL: {url}")
    log(f"  HTTP状态码: {resp.status}")
    log(f"  HTML有效: {'YES' if valid_http else 'NO'}")
    http_test_pass = resp.status == 200 and valid_http
except Exception as e:
    log(f"  HTTP访问失败: {e}")
    http_test_pass = False
finally:
    httpd.shutdown()

print()
print("=" * 60)
print("  验证总结")
print("=" * 60)
all_ok = r1['sane'] and r2['sane'] and r1['has_load'] and r2['has_load'] and error_test_1_pass and http_test_pass
print(f"  速度量级合理 (<500 °/s): {'YES' if r1['sane'] and r2['sane'] else 'NO'}")
print(f"  载荷越界可见:        {'YES' if r1['has_load'] and r2['has_load'] else 'NO'}")
print(f"  错误处理友好:      {'YES' if error_test_1_pass else 'NO'}")
print(f"  HTML可打开:        {'YES' if http_test_pass else 'NO'}")
print(f"  全部通过:          {'YES' if all_ok else 'NO'}")

log_path = os.path.join(base, "verification_full_log.txt")
with open(log_path, "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))

# 保存汇总结果
summary = {
    "velocity_sane": r1['sane'] and r2['sane'],
    "load_violation_visible": r1['has_load'] and r2['has_load'],
    "error_handling_works": error_test_1_pass,
    "html_opening_works": http_test_pass,
    "all_passed": all_ok,
    "velocities_exceeded": r1['vel_max'],
    "velocities_colleague": r2['vel_max'],
    "fix_comparison": {
        "before": {"1": 2864.79, "2": 5729.58, "3": 11459.16},
        "after": r1['vel_max']
    }
}
with open(os.path.join(base, "verification_summary.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2, ensure_ascii=False)

print()
print(f"详细日志: {log_path}")
print(f"汇总结果: {os.path.join(base, 'verification_summary.json')}")
print()
if all_ok:
    print("✅ 所有验证通过！系统已就绪。")
    sys.exit(0)
else:
    print("❌ 部分验证未通过！")
    sys.exit(1)
