#!/usr/bin/env python3
import sys, os, json

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "robot_joint_checker"))
from src import JointCheckWorkflow

base = os.path.dirname(os.path.abspath(__file__))

# --- 1. exceeded ---
wf = JointCheckWorkflow(output_dir=os.path.join(base, "robot_joint_checker", "reports"))
r = wf.run_full_workflow(
    joint_config_file=os.path.join(base, "robot_joint_checker", "examples", "joint_config.json"),
    load_config_file=os.path.join(base, "robot_joint_checker", "examples", "load_config_exceeded.json"),
    motion_sequence_file=os.path.join(base, "robot_joint_checker", "examples", "motion_sequence.json"),
    generate_plots=False,
)
cr = r["check_result"]

vel = {}
for jid, vs in cr.velocity_results.items():
    vel[jid] = max(abs(v) for v in vs) if vs else 0

out = {
    "exceeded_velocity": vel,
    "exceeded_violations": r["violation_summary"],
    "exceeded_reports": {k: v for k, v in r["reports"].items() if not k.endswith("_error")},
}

# --- 2. colleague ---
wf2 = JointCheckWorkflow(output_dir=os.path.join(base, "test_colleague", "results"))
r2 = wf2.run_full_workflow(
    joint_config_file=os.path.join(base, "test_colleague", "data", "joint_config.json"),
    load_config_file=os.path.join(base, "test_colleague", "data", "load_config.json"),
    motion_sequence_file=os.path.join(base, "test_colleague", "data", "motion_angles.json"),
    generate_plots=False,
)
cr2 = r2["check_result"]
vel2 = {}
for jid, vs in cr2.velocity_results.items():
    vel2[jid] = max(abs(v) for v in vs) if vs else 0

out["colleague_velocity"] = vel2
out["colleague_violations"] = r2["violation_summary"]
out["colleague_reports"] = {k: v for k, v in r2["reports"].items() if not k.endswith("_error")}

# --- 3. verify JSON content ---
jpath = out["exceeded_reports"].get("json", "")
if jpath and os.path.exists(jpath):
    with open(jpath, "r", encoding="utf-8") as f:
        jr = json.load(f)
    jvel = {}
    for jid_str, vs in jr.get("velocity_results", {}).items():
        jvel[jid_str] = max(abs(v) for v in vs) if vs else 0
    out["json_velocity"] = jvel
    out["json_matches_console"] = all(
        abs(jvel.get(str(k), 0) - v) < 0.01 for k, v in vel.items()
    )

# --- 4. HTML check ---
hpath = out["exceeded_reports"].get("html", "")
if hpath and os.path.exists(hpath):
    with open(hpath, "r", encoding="utf-8") as f:
        hc = f.read()
    out["html_valid"] = "<!DOCTYPE html>" in hc and "</html>" in hc
    out["html_size"] = len(hc)

out["velocity_sane"] = all(v < 500 for v in vel.values()) and all(v < 500 for v in vel2.values())
out["load_violation_visible"] = r["violation_summary"]["has_load_violation"] and r2["violation_summary"]["has_load_violation"]

rp = os.path.join(base, "verification_result.json")
with open(rp, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

print(json.dumps(out, indent=2, ensure_ascii=False))
