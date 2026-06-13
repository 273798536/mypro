from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from laser_speckle_warning.core import run_chain, InterfaceResponse


BASE_DATA = ROOT / "laser_speckle_warning" / "data"
WORK_DIR = ROOT / "laser_speckle_warning" / "data" / "_work"
OUTPUT_DIR = ROOT / "laser_speckle_warning" / "data" / "output"


def reset_workspace() -> None:
    if WORK_DIR.exists():
        shutil.rmtree(WORK_DIR)
    (WORK_DIR / "materials").mkdir(parents=True)
    (WORK_DIR / "photos").mkdir(parents=True)
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)


def copy_phase(phase_files: list[str], target: Path) -> None:
    for f in phase_files:
        src = BASE_DATA / "input" / f
        dst = target / f.split("/")[-1]
        shutil.copy(src, dst)


def dump_response_diff(resp1: InterfaceResponse, resp2: InterfaceResponse, title: str) -> None:
    print("=" * 70)
    print(title)
    print("=" * 70)
    print(f"  阶段1 状态={resp1.overall_status.value}  预警级别={resp1.warning_result.warning_level.value if resp1.warning_result else 'N/A'}")
    print(f"  阶段2 状态={resp2.overall_status.value}  预警级别={resp2.warning_result.warning_level.value if resp2.warning_result else 'N/A'}")
    print("")

    p1 = {(i.kind, i.identifier): i for i in resp1.processed}
    p2 = {(i.kind, i.identifier): i for i in resp2.processed}
    added = set(p2) - set(p1)
    if added:
        print(f"  [新增已处理项] {len(added)} 项")
        for k in sorted(added):
            item = p2[k]
            print(f"    - {item.kind} {item.identifier}: {item.display_name} ({item.status})")
            if item.detail:
                for dk, dv in item.detail.items():
                    print(f"        {dk}: {dv}")

    pend1 = {(i.kind, i.identifier): i for i in resp1.pending_materials}
    pend2 = {(i.kind, i.identifier): i for i in resp2.pending_materials}
    added_pend = set(pend2) - set(pend1)
    if added_pend:
        print(f"  [新增待补材料] {len(added_pend)} 项")
        for k in sorted(added_pend):
            item = pend2[k]
            print(f"    - {item.kind} {item.identifier}")
            print(f"        原因: {item.reason}")
            print(f"        操作: {item.required_action}")
            print(f"        影响: {item.affected_scope}")

    if resp2.warning_result and resp1.warning_result:
        w1 = resp1.warning_result
        w2 = resp2.warning_result
        if w1.warning_level != w2.warning_level or w1.threshold_value != w2.threshold_value:
            print(f"  [预警结果变化]")
            print(f"    级别: {w1.warning_level.value} -> {w2.warning_level.value}")
            print(f"    阈值: {w1.threshold_value} -> {w2.threshold_value} {w2.intensity_unit}")
            print(f"    最大强度: {w1.max_intensity} -> {w2.max_intensity}")
            contrib = {m.get("material_id"): m for m in w2.contributing_materials if m.get("影响分类") in ("影响结论", "待确认")}
            if contrib:
                print(f"  [影响结论的材料]")
                for mid, m in contrib.items():
                    print(f"    - {m['name']} ({m['source']}, {m['status']}): {m.get('issue', m.get('影响分类', ''))}")

    print("")


def main() -> None:
    reset_workspace()

    # 阶段一：导入旧版材料 + 正常参数表 + 基础照片（不带口头备注和名称不一致材料）
    print("\n>>> 阶段一：先导入旧材料（含一份旧版参数表、正常参数表和基础照片）")
    phase1_materials = [
        "materials/01_params_normal.json",
        "materials/02_old_version_params.json",
    ]
    phase1_photos = [
        "photos/01_A_zone.json",
        "photos/02_B_zone.json",
        "photos/03_C_zone.json",
        "photos/04_D_zone.json",
    ]
    copy_phase(phase1_materials, WORK_DIR / "materials")
    copy_phase(phase1_photos, WORK_DIR / "photos")
    summary1, response1, _ = run_chain(
        input_dir=WORK_DIR,
        output_dir=OUTPUT_DIR,
        param_tag="v1.1-normal",
        allow_gap_calculation=True,
    )
    print(summary1.render())

    # 阶段二：补充名称不一致的材料 + 口头备注 + 带缺口的照片
    print("\n>>> 阶段二：补充一条名称不一致材料、口头备注和带采样缺口的照片")
    phase2_materials = [
        "materials/03_name_mismatch.json",
        "materials/04_verbal_note.json",
    ]
    phase2_photos = [
        "photos/05_A_zone_gap.json",
    ]
    copy_phase(phase2_materials, WORK_DIR / "materials")
    copy_phase(phase2_photos, WORK_DIR / "photos")
    summary2, response2, _ = run_chain(
        input_dir=WORK_DIR,
        output_dir=OUTPUT_DIR,
        param_tag="v1.1-normal",
        allow_gap_calculation=True,
    )
    print(summary2.render())

    # 阶段三：对比接口返回变化
    dump_response_diff(response1, response2, "阶段对比：接口返回变化说明")

    # 阶段四：调档复算（收紧一档）
    print(">>> 阶段三：调档收紧一档（v1.1-normal -> v1.0-strict）后复算")
    from laser_speckle_warning.core import shift_param_tier, get_param_version
    from laser_speckle_warning.core.warning_calculator import compare_results
    from laser_speckle_warning.core.param_versioning import ResultHistory

    last_result, last_params = ResultHistory(OUTPUT_DIR).latest() or (None, None)
    summary3, response3, _ = run_chain(
        input_dir=WORK_DIR,
        output_dir=OUTPUT_DIR,
        param_tag="v1.0-strict",
        allow_gap_calculation=True,
    )
    print(summary3.render())

    if last_result and response3.warning_result:
        new_params = get_param_version("v1.0-strict")
        diff = compare_results(last_result, response3.warning_result, last_params, new_params)
        print("[调档复算变化原因]")
        for k, v in diff.items():
            print(f"  {k}:")
            if isinstance(v, list):
                for item in v:
                    print(f"    - {item}")
            elif isinstance(v, dict):
                for dk, dv in v.items():
                    if isinstance(dv, tuple) and len(dv) == 2:
                        print(f"    - {dk}: {dv[0]} -> {dv[1]}")
                    else:
                        print(f"    - {dk}: {dv}")
            else:
                print(f"    {v}")

    # 输出最终接口返回文件的位置
    print("\n>>> 最终产物")
    print(f"  终端摘要: {OUTPUT_DIR / 'terminal_summary.txt'}")
    print(f"  接口返回: {OUTPUT_DIR / 'interface_response.json'}")
    print(f"  历史记录: {OUTPUT_DIR / 'history'}")

    # 展示最终接口返回中的三类分类
    print("\n>>> 接口返回分类展示（给接手同事）")
    resp = InterfaceResponse.load_json(OUTPUT_DIR / "interface_response.json")
    print(f"  [已处理] {len(resp.processed)} 项")
    for item in resp.processed:
        print(f"    - {item.kind} {item.identifier} {item.display_name} -> {item.status}")
    print(f"  [待补材料] {len(resp.pending_materials)} 项")
    for item in resp.pending_materials:
        print(f"    - {item.kind} {item.identifier}: {item.reason[:60]}")
    print(f"  [人工改判] {len(resp.manual_judgments)} 项")


if __name__ == "__main__":
    main()
