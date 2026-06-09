import json, urllib.request

def get(url):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())

d = get("http://localhost:8000/records/1/compare")
print("版本数量:", len(d["versions"]))
for v in d["versions"]:
    print(f"  v{v['version_no']}. {v['remark']}  (操作人: {v['created_by']}, a={v.get('computed_results', {}).get('eccentricity')})")
print("变更记录:")
for c in d["changes"]:
    fields = ", ".join([ch["field"] for ch in c["changes"]])
    print(f"  v{c['from_version']} -> v{c['to_version']}: 变更字段=[{fields}]")

records = get("http://localhost:8000/records")
print("\n全部记录:")
for r in records:
    print(f"  {r['record_no']} - {r['student_name']} - 状态: {r['status']}")
