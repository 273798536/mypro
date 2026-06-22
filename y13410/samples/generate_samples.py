"""生成贴近课堂现场的样例数据

故意做"乱"一点：有撤回、有旧版、有临时备注、有草稿。
这样工具一上来就要处理真实情况，不是完美数据。
"""
import json
import os
import sys
import math

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ode_checker.data_store import DataStore, RecordStatus
from ode_checker.solver import ODESolver


def f_exp(t, y):
    """y' = y，精确解 y = e^t"""
    return y


def f_logistic(t, y):
    """逻辑方程 y' = y(1 - y)，精确解 y = 1/(1+e^(-t))"""
    return y * (1 - y)


def f_linear(t, y):
    """y' = -y + t + 1，精确解 y = t + e^(-t)"""
    return -y + t + 1


def generate_sample_data(output_path="samples/classroom_records.json"):
    dirname = os.path.dirname(output_path)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    store = DataStore(output_path)

    # --- 第 1 题：指数增长方程（有撤回记录）---
    # 先加一版用欧拉法、步长很大的（后来撤回了）
    solver1_bad = ODESolver(f_exp, y0=1.0, t_span=(0, 2), dt=0.5, method="euler")
    t1, y1 = solver1_bad.solve()
    exact1 = [math.exp(ti) for ti in t1]

    rec1_bad = store.add_record({
        "title": "第1题：y' = y，y(0) = 1",
        "equation": "y' = y",
        "initial_condition": {"t0": 0, "y0": 1.0},
        "t_span": [0, 2],
        "method": "euler",
        "dt": 0.5,
        "exact_solution": "y = e^t",
        "result": {
            "t_values": [float(x) for x in t1],
            "y_values": [float(x) for x in y1],
            "exact_values": [float(x) for x in exact1],
        },
        "notes": "上课随手算的，步长取大了点，回头再细算。",
        "tags": ["指数增长", "一阶线性"],
    })
    # 撤回这一版——误差太大
    store.withdraw_record(rec1_bad["id"], reason="步长 0.5 太大，欧拉法误差超标，重新算一版")

    # 再加一版用 RK4、步长小的（正式版）
    solver1_good = ODESolver(f_exp, y0=1.0, t_span=(0, 2), dt=0.01, method="rk4")
    t1g, y1g = solver1_good.solve()
    exact1g = [math.exp(ti) for ti in t1g]

    rec1_good = store.add_record({
        "title": "第1题：y' = y，y(0) = 1",
        "equation": "y' = y",
        "initial_condition": {"t0": 0, "y0": 1.0},
        "t_span": [0, 2],
        "method": "rk4",
        "dt": 0.01,
        "exact_solution": "y = e^t",
        "result": {
            "t_values": [float(x) for x in t1g],
            "y_values": [float(x) for x in y1g],
            "exact_values": [float(x) for x in exact1g],
        },
        "notes": "替换之前欧拉法那版，精度够了。\n[2024-03-15] 小岑复核通过。",
        "tags": ["指数增长", "一阶线性", "已复核"],
        "replaces": rec1_bad["id"],
    })

    # --- 第 2 题：逻辑方程（有旧版 + 草稿备注）---
    solver2_old = ODESolver(f_logistic, y0=0.5, t_span=(0, 3), dt=0.1, method="improved_euler")
    t2o, y2o = solver2_old.solve()
    exact2o = [1.0 / (1.0 + math.exp(-ti)) for ti in t2o]

    rec2_old = store.add_record({
        "title": "第2题：逻辑方程 y' = y(1-y)",
        "equation": "y' = y(1 - y)",
        "initial_condition": {"t0": 0, "y0": 0.5},
        "t_span": [0, 3],
        "method": "improved_euler",
        "dt": 0.1,
        "exact_solution": "y = 1/(1+e^(-t))",
        "result": {
            "t_values": [float(x) for x in t2o],
            "y_values": [float(x) for x in y2o],
            "exact_values": [float(x) for x in exact2o],
        },
        "notes": "去年的老算法，先留着对照。",
        "tags": ["逻辑方程", "旧版"],
        "status": RecordStatus.LEGACY,
    })
    # 手动改状态为旧版
    rec2_old["status"] = RecordStatus.LEGACY

    # 新版——RK4
    solver2_new = ODESolver(f_logistic, y0=0.5, t_span=(0, 3), dt=0.01, method="rk4")
    t2n, y2n = solver2_new.solve()
    exact2n = [1.0 / (1.0 + math.exp(-ti)) for ti in t2n]

    rec2_new = store.add_record({
        "title": "第2题：逻辑方程 y' = y(1-y)",
        "equation": "y' = y(1 - y)",
        "initial_condition": {"t0": 0, "y0": 0.5},
        "t_span": [0, 3],
        "method": "rk4",
        "dt": 0.01,
        "exact_solution": "y = 1/(1+e^(-t))",
        "result": {
            "t_values": [float(x) for x in t2n],
            "y_values": [float(x) for x in y2n],
            "exact_values": [float(x) for x in exact2n],
        },
        "notes": "新版，精度比改进欧拉高一个量级。",
        "tags": ["逻辑方程", "当前版本"],
        "supersedes": rec2_old["id"],
    })

    # --- 第 3 题：线性方程（草稿状态，有临时备注）---
    solver3_draft = ODESolver(f_linear, y0=1.0, t_span=(0, 2), dt=0.05, method="euler")
    t3d, y3d = solver3_draft.solve()
    exact3d = [ti + math.exp(-ti) for ti in t3d]

    rec3_draft = store.add_record({
        "title": "第3题：y' = -y + t + 1（草稿）",
        "equation": "y' = -y + t + 1",
        "initial_condition": {"t0": 0, "y0": 1.0},
        "t_span": [0, 2],
        "method": "euler",
        "dt": 0.05,
        "exact_solution": "y = t + e^(-t)",
        "result": {
            "t_values": [float(x) for x in t3d],
            "y_values": [float(x) for x in y3d],
            "exact_values": [float(x) for x in exact3d],
        },
        "notes": "草稿！上课抄的板书，还没核对。\n[待办] 下节课用 RK4 重算一遍。",
        "tags": ["线性方程", "草稿", "待复核"],
        "status": RecordStatus.DRAFT,
    })
    rec3_draft["status"] = RecordStatus.DRAFT

    # --- 第 4 题：外推越界的题（故意算到 t=10，但题目只问到 t=5）---
    # 这道题后面会被"放行"，测试报告里的放行条件说明
    solver4_extra = ODESolver(f_exp, y0=1.0, t_span=(0, 10), dt=0.01, method="rk4")
    t4, y4 = solver4_extra.solve()
    exact4 = [math.exp(ti) for ti in t4]

    rec4 = store.add_record({
        "title": "第4题：y' = y（外推到 t=10，题目只问到 t=5）",
        "equation": "y' = y",
        "initial_condition": {"t0": 0, "y0": 1.0},
        "t_span": [0, 10],
        "method": "rk4",
        "dt": 0.01,
        "exact_solution": "y = e^t",
        "result": {
            "t_values": [float(x) for x in t4],
            "y_values": [float(x) for x in y4],
            "exact_values": [float(x) for x in exact4],
        },
        "extrapolation_info": {
            "limit": 5.0,
            "released": True,
            "release_conditions": [
                "助教小岑复核确认外推区间在题目合理延伸范围内",
                "该方程为指数增长，不存在奇点，外推有物理意义",
                "仅用于课堂演示，不作为正式答案",
            ],
        },
        "notes": "故意多算了一段，给学生看外推效果。",
        "tags": ["指数增长", "外推演示", "已放行"],
    })

    # 给第 1 题的正式版追加一条临时备注（模拟翻照片时随手记）
    store.add_note(rec1_good["id"], "板书照片第3张，左下角符号写反了，注意区分 y' 和 y。")

    store.save()
    print(f"样例数据已生成到 {output_path}")
    print(f"共 {len(store.records)} 条记录")
    print(f"  - 正常: {len(store.list_records())}")
    print(f"  - 撤回: {len(store.list_records(include_withdrawn=True)) - len(store.list_records())}")
    print(f"  - 旧版: {len([r for r in store.records if r['status'] == 'legacy'])}")
    print(f"  - 草稿: {len([r for r in store.records if r['status'] == 'draft'])}")

    return store


if __name__ == "__main__":
    generate_sample_data()
