#!/usr/bin/env python3
import sys, os, json

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "robot_joint_checker"))
from src import JointCheckWorkflow

base = os.path.dirname(os.path.abspath(__file__))

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

    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(f"  最大速度 (°/s):")
    for jid, v in sorted(vel_max.items()):
        cfg = cr.joint_configs.get(jid)
        lim = cfg.max_angular_velocity if cfg else 0
        ok = "✓" if v <= lim else "✗"
        print(f"    关节{jid}: {v:.2f} / {lim} {ok}")
    print(f"  最大力矩 (Nm):")
    for jid, v in sorted(torque_max.items()):
        cfg = cr.joint_configs.get(jid)
        lim = cfg.max_torque if cfg else 0
        ok = "✓" if v <= lim else "✗"
        print(f"    关节{jid}: {v:.2f} / {lim} {ok}")
    print(f"  超限: 总{vs['total_violations']} 严重{vs['critical_count']} 警告{vs['warning_count']}")
    print(f"  载荷越界: {'YES' if vs['has_load_violation'] else 'NO'}")
    print(f"  报告:")
    for k, v in reports.items():
        print(f"    {k}: {os.path.basename(v)} {'✓' if os.path.exists(v) else '✗'}")

    jpath = reports.get("json", "")
    if jpath and os.path.exists(jpath):
        with open(jpath, "r", encoding="utf-8") as f:
            jr = json.load(f)
        jvel = {int(k): max(abs(v) for v in vs_list) for k, vs_list in jr.get("velocity_results", {}).items() if vs_list}
        match = all(abs(jvel.get(k, 0) - vel_max.get(k, 0)) < 0.01 for k in vel_max)
        print(f"  JSON速度与控制台一致: {'YES' if match else 'NO'}")

    hpath = reports.get("html", "")
    if hpath and os.path.exists(hpath):
        with open(hpath, "r", encoding="utf-8") as f:
            hc = f.read()
        valid = "<!DOCTYPE html>" in hc and "</html>" in hc
        print(f"  HTML可打开: {'YES' if valid else 'NO'} ({len(hc)} bytes)")

    sane = all(v < 500 for v in vel_max.values())
    return {"vel_max": vel_max, "sane": sane, "has_load": vs["has_load_violation"]}

print("╔══════════════════════════════════════════════════════════╗")
print("║       机器人关节力矩检查 - 修复后报告重新生成             ║")
print("╚══════════════════════════════════════════════════════════╝")

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

print(f"\n{'='*60}")
print(f"  修复前后对比 (exceeded)")
print(f"{'='*60}")
print(f"  修复前 → 修复后:")
print(f"    关节1: 2864.79 → {r1['vel_max'].get(1,0):.2f} °/s")
print(f"    关节2: 5729.58 → {r1['vel_max'].get(2,0):.2f} °/s")
print(f"    关节3: 11459.16 → {r1['vel_max'].get(3,0):.2f} °/s")
all_ok = r1['sane'] and r2['sane'] and r1['has_load'] and r2['has_load']
print(f"\n  速度量级合理: {'YES' if r1['sane'] and r2['sane'] else 'NO'}")
print(f"  载荷越界可见: {'YES' if r1['has_load'] and r2['has_load'] else 'NO'}")
print(f"  全部通过: {'YES' if all_ok else 'NO'}")
