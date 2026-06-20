import json
import ast
import os

path = os.path.join(os.path.dirname(__file__), "..", "test_data", "test_samples.json")
path = os.path.abspath(path)

with open(path, "r", encoding="utf-8") as f:
    text = f.read()

data = ast.literal_eval(text)

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Fixed JSON with", len(data), "samples")
for s in data:
    print(f"  - {s['sample_id']}: task={s['task_id']}")
