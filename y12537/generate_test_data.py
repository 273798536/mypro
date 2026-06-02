import json

data = []

loss_history = []
for i in range(1, 101):
    loss_history.append({"iteration": i, "loss": round(10.0 * (0.95 ** i) + 0.01, 4)})
data.append({
    "class_name": "完整测试-正常收敛",
    "loss_function": "MSELoss() # 标准回归任务",
    "learning_rate": 0.01,
    "iterations": 100,
    "loss_history": loss_history
})

data.append({
    "class_name": "完整测试-学习率爆炸",
    "loss_function": "CrossEntropyLoss()",
    "learning_rate": 0.5,
    "iterations": 50,
    "loss_history": [
        {"iteration": 1, "loss": 2.5},
        {"iteration": 2, "loss": 2.3},
        {"iteration": 3, "loss": 2.1},
        {"iteration": 4, "loss": 3.5},
        {"iteration": 5, "loss": 6.8},
        {"iteration": 6, "loss": 12.4},
        {"iteration": 7, "loss": 25.6},
        {"iteration": 8, "loss": 52.1},
        {"iteration": 9, "loss": 105.3},
        {"iteration": 10, "loss": 210.8}
    ]
})

loss_history = []
for i in range(1, 21):
    loss_history.append({"iteration": i, "loss": round(5.0 * (0.9 ** i), 4)})
for i in range(21, 91):
    loss_history.append({"iteration": i, "loss": round(0.85 + 0.02 * (i % 5 - 2) * 0.1, 4)})
for i in range(91, 121):
    loss_history.append({"iteration": i, "loss": round(0.85 + 0.001 * (i - 90), 4)})
data.append({
    "class_name": "完整测试-局部极小",
    "loss_function": "BCEWithLogitsLoss() # 二分类任务",
    "learning_rate": 0.001,
    "iterations": 120,
    "loss_history": loss_history
})

loss_history = []
for i in range(1, 21):
    loss_history.append({"iteration": i, "loss": round(8.5 * (0.92 ** i), 4)})
data.append({
    "class_name": "完整测试-迭代严重不足",
    "loss_function": "SmoothL1Loss() # 对异常值稳健",
    "learning_rate": 0.01,
    "iterations": 200,
    "loss_history": loss_history
})

loss_history = []
for i in range(1, 31):
    loss_history.append({"iteration": i, "loss": round(5.0 * (0.94 ** i), 4)})
data.append({
    "class_name": "完整测试-缺少学习率",
    "loss_function": "L1Loss()",
    "iterations": 100,
    "loss_history": loss_history
})

data.append({
    "class_name": "完整测试-多问题叠加",
    "loss_function": "PoissonNLLLoss() # 计数预测任务",
    "learning_rate": 0.3,
    "iterations": 200,
    "loss_history": [
        {"iteration": 1, "loss": 4.5},
        {"iteration": 2, "loss": 4.2},
        {"iteration": 3, "loss": 8.8},
        {"iteration": 4, "loss": 18.9},
        {"iteration": 5, "loss": 40.2},
        {"iteration": 6, "loss": 85.7}
    ]
})

with open("test_full_v2.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("Test data generated successfully")
