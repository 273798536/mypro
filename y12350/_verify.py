import sys
sys.path.insert(0, "/Users/mac/pro/solo/workspaces/y12350")

from solar_shadow.importer import import_file
from solar_shadow.validator import validate_all
from solar_shadow.calculator import calculate_all
from solar_shadow.reporter import generate_report, export_json, export_text, print_summary

observations = import_file("/Users/mac/pro/solo/workspaces/y12350/examples/sample.csv", version="课堂实验v1")
validations = validate_all(observations)
calculations = calculate_all(observations, validations)
report = generate_report(observations, validations, calculations, source=observations[0].source)

export_json(report, "/Users/mac/pro/solo/workspaces/y12350/output/solar_shadow_report.json")
export_text(report, "/Users/mac/pro/solo/workspaces/y12350/output/solar_shadow_report.txt")
print_summary(report)

print("\n===== 语义一致性校验 =====")
shadow_ok = sum(1 for c in calculations if not c.skip_reason and not c.fallback_reason)
fallback = sum(1 for c in calculations if c.fallback_reason)
skipped = sum(1 for c in calculations if c.skip_reason)
print(f"影长法={shadow_ok}, 天文法回退={fallback}, 跳过={skipped}, 总计={len(calculations)}")

for i, (obs, val, calc) in enumerate(zip(observations, validations, calculations)):
    has_error = any(iss.severity.value == "error" for iss in val.issues)
    has_warning = any(iss.severity.value == "warning" for iss in val.issues)
    if has_error:
        vstatus = "未通过"
    elif has_warning:
        vstatus = "有警告"
    else:
        vstatus = "通过"
    if calc.skip_reason:
        cstatus = "跳过"
    elif calc.fallback_reason:
        cstatus = "天文法回退"
    else:
        cstatus = "影长法"
    print(f"  #{i} {obs.site_name:12s} | 验证:{vstatus} | 计算:{cstatus} | 角度={calc.solar_elevation_angle_deg}°")

tz_err_obs = [i for i, (obs, val) in enumerate(zip(observations, validations))
              if any(iss.code == "TIMEZONE_MISMATCH" and iss.severity.value == "error" for iss in val.issues)]
pole_err_obs = [i for i, val in enumerate(validations)
                if any(iss.code == "POLE_HEIGHT_MISSING" for iss in val.issues)]
print(f"\n时区ERROR测点: {tz_err_obs}")
print(f"杆高缺失测点: {pole_err_obs}")

for idx in pole_err_obs:
    c = calculations[idx]
    if c.fallback_reason:
        print(f"  ✓ #{idx} 杆高缺失 -> fallback_reason='{c.fallback_reason}' (语义一致)")
    else:
        print(f"  ✗ #{idx} 杆高缺失 -> fallback_reason为空 (语义矛盾!)")

for idx in tz_err_obs:
    v = validations[idx]
    if not v.passed:
        print(f"  ✓ #{idx} 时区ERROR -> passed=False (语义一致)")
    else:
        print(f"  ✗ #{idx} 时区ERROR -> passed=True (语义矛盾!)")

print("\n===== 校验完成 =====")
