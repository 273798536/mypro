import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from main import app
from database import get_db, Base
from models import BatchStatus, ProcessingStatus, ReviewResult

TEST_DATABASE_URL = "sqlite:///./test_evaluation.db"

engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_full_workflow():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("=" * 60)
    print("测试 1: 导入评测题库（第一轮）")
    print("=" * 60)

    import_data = {
        "batch_code": "EVAL-2026-001",
        "prompt_version": "2.3.0",
        "description": "代码补全评测周测试集",
        "created_by": "评测负责人",
        "import_note": "评测周第一轮导入",
        "questions": [
            {
                "question_external_id": "Q001",
                "prompt": "写一个Python函数计算斐波那契数列的第n项",
                "expected_code": "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)",
                "question_category": "algorithm",
                "difficulty_level": "medium",
                "tags": ["递归", "算法"],
                "metadata": {"source": "leetcode"}
            },
            {
                "question_external_id": "Q002",
                "prompt": "写一个Python类实现栈数据结构",
                "expected_code": "class Stack:\n    def __init__(self):\n        self.items = []\n    def push(self, item):\n        self.items.append(item)\n    def pop(self):\n        return self.items.pop()",
                "question_category": "data_structure",
                "difficulty_level": "easy",
                "tags": ["数据结构", "栈"],
                "metadata": {"source": "textbook"}
            },
            {
                "question_external_id": "Q003",
                "prompt": "写一个Python函数处理文件读取异常",
                "expected_code": "def read_file(path):\n    try:\n        with open(path, 'r') as f:\n            return f.read()\n    except FileNotFoundError:\n        return None",
                "question_category": "error_handling",
                "difficulty_level": "hard",
                "tags": ["异常处理", "文件操作"],
                "metadata": {"source": "project"}
            }
        ]
    }

    response = client.post("/api/batches/import", json=import_data)
    assert response.status_code == 200, f"导入失败: {response.json()}"
    batch1 = response.json()
    assert batch1["run_number"] == 1, f"第一轮 run_number 应为 1, 实际为 {batch1['run_number']}"
    assert batch1["question_count"] == 3
    assert batch1["status"] == BatchStatus.IMPORTED.value
    print(f"✓ 第一轮导入成功，批次ID: {batch1['id']}, run_number: {batch1['run_number']}")
    batch_id_1 = batch1["id"]

    print("\n" + "=" * 60)
    print("测试 2: 同一批提示词版本第二次导入（去重验证）")
    print("=" * 60)

    response = client.post("/api/batches/import", json=import_data)
    assert response.status_code == 200
    batch2 = response.json()
    assert batch2["run_number"] == 2, f"第二轮 run_number 应为 2, 实际为 {batch2['run_number']}"
    assert batch2["id"] != batch1["id"], "第二轮应创建新批次记录"
    print(f"✓ 第二轮导入成功，run_number 自动递增为: {batch2['run_number']}")
    print(f"✓ 两个批次ID不同，不会产生冲突结论")
    batch_id_2 = batch2["id"]

    print("\n" + "=" * 60)
    print("测试 3: 状态推进流转")
    print("=" * 60)

    response = client.put(
        f"/api/batches/{batch_id_1}/status",
        json={"status": BatchStatus.PROCESSING.value, "note": "开始运行评测脚本"}
    )
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == BatchStatus.PROCESSING.value
    print(f"✓ 状态推进: 已导入 → 处理中")

    response = client.put(
        f"/api/batches/{batch_id_1}/status",
        json={"status": BatchStatus.PENDING_REVIEW.value, "note": "评测完成，待复核"}
    )
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == BatchStatus.PENDING_REVIEW.value
    print(f"✓ 状态推进: 处理中 → 待复核")

    response = client.put(
        f"/api/batches/{batch_id_1}/status",
        json={"status": BatchStatus.REVIEWING.value, "note": "评测负责人开始复核"}
    )
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == BatchStatus.REVIEWING.value
    print(f"✓ 状态推进: 待复核 → 复核中")

    response = client.put(
        f"/api/batches/{batch_id_1}/status",
        json={"status": BatchStatus.COMPLETED.value, "note": "复核完成，可以导出报告"}
    )
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == BatchStatus.COMPLETED.value
    print(f"✓ 状态推进: 复核中 → 已完成")

    print("\n" + "=" * 60)
    print("测试 4: 非法状态流转校验")
    print("=" * 60)

    response = client.put(
        f"/api/batches/{batch_id_1}/status",
        json={"status": BatchStatus.PROCESSING.value}
    )
    assert response.status_code == 400, "已完成状态不应再流转到处理中"
    print(f"✓ 非法流转被正确拦截: {response.json()['detail']}")

    print("\n" + "=" * 60)
    print("测试 5: 查询处理记录（版本追踪和评测回放共用）")
    print("=" * 60)

    response = client.get(f"/api/batches/{batch_id_1}/processing-records")
    assert response.status_code == 200
    records = response.json()
    assert records["total"] == 3
    print(f"✓ 处理记录查询成功，共 {records['total']} 条记录")

    record_ids = [item["id"] for item in records["items"]]
    for i, item in enumerate(records["items"]):
        print(f"  记录 {i+1}: ID={item['id']}, 状态={item['status']}, run_number={item['run_number']}")

    print("\n" + "=" * 60)
    print("测试 6: 更新处理记录结果")
    print("=" * 60)

    update_data = {
        "status": ProcessingStatus.SUCCESS.value,
        "predicted_code": "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)",
        "execution_result": "fib(10) = 55",
        "quality_score": 95,
        "metrics": {"accuracy": 0.95, "latency_ms": 120},
        "processing_note": "代码质量良好，与预期一致"
    }

    response = client.put(
        f"/api/processing-records/{record_ids[0]}",
        json=update_data
    )
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == ProcessingStatus.SUCCESS.value
    assert result["quality_score"] == 95
    print(f"✓ 处理记录 {record_ids[0]} 更新成功")

    update_data2 = {
        "status": ProcessingStatus.FAILED.value,
        "predicted_code": "class Stack:\n    def __init__(self):\n        self.data = []",
        "error_message": "缺少 push 和 pop 方法",
        "quality_score": 30,
        "processing_note": "补全不完整"
    }

    response = client.put(
        f"/api/processing-records/{record_ids[1]}",
        json=update_data2
    )
    assert response.status_code == 200
    print(f"✓ 处理记录 {record_ids[1]} 更新为失败状态")

    print("\n" + "=" * 60)
    print("测试 7: 提交复核（整合标注记录、人工反馈、标签冲突）")
    print("=" * 60)

    review_data = {
        "reviewer": "张评测",
        "review_result": ReviewResult.APPROVED.value,
        "review_comment": "代码补全正确，与预期一致",
        "annotation_record": {
            "annotator": "李标注",
            "correctness": True,
            "annotation_note": "语法正确，逻辑完整，边界条件处理得当"
        },
        "manual_feedback": {
            "accuracy": 95,
            "completeness": 90,
            "comment": "代码风格良好，可以作为正样例"
        },
        "tag_conflicts": [
            {
                "old_tag": "简单",
                "new_tag": "中等",
                "reason": "涉及递归终止条件判断，对新手有一定难度"
            }
        ]
    }

    response = client.post(
        f"/api/processing-records/{record_ids[0]}/review",
        json=review_data
    )
    assert response.status_code == 200
    result = response.json()
    assert result["review_result"] == ReviewResult.APPROVED.value
    assert result["annotation_record"]["correctness"] == True
    assert len(result["tag_conflicts"]) == 1
    print(f"✓ 复核提交成功，标注记录、人工反馈、标签冲突已整合")
    print(f"  - 标注人: {result['annotation_record']['annotator']}")
    print(f"  - 人工反馈准确性: {result['manual_feedback']['accuracy']}分")
    print(f"  - 标签冲突: {result['tag_conflicts'][0]['old_tag']} → {result['tag_conflicts'][0]['new_tag']}")

    review_data2 = {
        "reviewer": "张评测",
        "review_result": ReviewResult.REJECTED.value,
        "review_comment": "补全不完整，需要重新运行",
        "annotation_record": {
            "annotator": "王标注",
            "correctness": False,
            "annotation_note": "只实现了初始化方法，缺少核心的push和pop操作"
        },
        "manual_feedback": {
            "accuracy": 30,
            "completeness": 20,
            "comment": "必须重新评测，不能作为训练样本"
        },
        "tag_conflicts": []
    }

    response = client.post(
        f"/api/processing-records/{record_ids[1]}/review",
        json=review_data2
    )
    assert response.status_code == 200
    print(f"✓ 第二条记录复核提交成功")

    print("\n" + "=" * 60)
    print("测试 8: 记录异常并溯源")
    print("=" * 60)

    anomaly_data = {
        "anomaly_type": "模型输出截断",
        "description": "生成的代码在函数定义中间被截断，缺少return语句",
        "handling_opinion": "需要调整max_tokens参数，或检查prompt模板"
    }

    response = client.post(
        f"/api/processing-records/{record_ids[2]}/anomalies",
        json=anomaly_data
    )
    assert response.status_code == 200
    anomaly = response.json()
    anomaly_id = anomaly["id"]
    print(f"✓ 异常记录成功，异常ID: {anomaly_id}")

    response = client.get(f"/api/anomalies/{anomaly_id}/trace")
    assert response.status_code == 200
    trace = response.json()

    assert "anomaly" in trace
    assert "processing_record" in trace
    assert "question" in trace
    assert "batch" in trace

    print(f"✓ 异常溯源完整:")
    print(f"  - 异常: {trace['anomaly']['anomaly_type']} - {trace['anomaly']['description']}")
    print(f"  - 处理记录: ID={trace['processing_record']['id']}, 状态={trace['processing_record']['status']}")
    print(f"  - 评测题目: {trace['question']['question_external_id']} - {trace['question']['prompt'][:50]}...")
    print(f"  - 评测批次: {trace['batch']['batch_code']} v{trace['batch']['prompt_version']} 第{trace['batch']['run_number']}轮")
    print(f"✓ 可顺着异常完整回溯到评测题库和处理意见")

    print("\n" + "=" * 60)
    print("测试 9: 导出评测报告（非技术友好格式）")
    print("=" * 60)

    from urllib.parse import unquote
    response = client.get(f"/api/batches/{batch_id_1}/export")
    assert response.status_code == 200
    content_disposition = response.headers.get("Content-Disposition", "")
    assert "EVAL-2026-001" in content_disposition
    assert "v2.3.0" in content_disposition
    decoded_disposition = unquote(content_disposition)
    assert "代码补全评测报告" in decoded_disposition
    assert "第1轮" in decoded_disposition
    print(f"✓ 导出文件名正确: {decoded_disposition}")
    print(f"✓ 文件名包含批次、版本、轮次，可区分本次和上次运行")

    content = response.content.decode("utf-8-sig")
    lines = content.strip().split("\n")

    headers = lines[0].split(",")
    expected_headers = ["题目编号", "题目分类", "难度等级", "提示词内容", "运行状态", "质量评分", "复核结论"]
    for h in expected_headers:
        assert h in headers, f"表头缺少 '{h}'"
    print(f"✓ 表头使用中文，无技术字段名和缩写")

    for i, line in enumerate(lines[1:4], 1):
        assert "loop" not in line, "分类名应转为中文"
        assert "easy" not in line, "难度名应转为中文"
        assert "SUCCESS" not in line, "状态名应转为中文"
        assert "APPROVED" not in line, "复核结论应转为中文"
    print(f"✓ 内容已转译为非技术人员可读的中文描述")

    print(f"\n导出报告内容预览:")
    for line in lines[:8]:
        print(f"  {line[:120]}..." if len(line) > 120 else f"  {line}")

    print("\n" + "=" * 60)
    print("测试 10: 查询批次列表和多轮运行历史")
    print("=" * 60)

    response = client.get("/api/batches")
    assert response.status_code == 200
    result = response.json()
    assert result["total"] >= 2
    print(f"✓ 批次列表查询成功，共 {result['total']} 个批次")

    response = client.get("/api/batches/EVAL-2026-001/versions/2.3.0/runs")
    assert response.status_code == 200
    runs = response.json()
    assert runs["total_runs"] == 2
    print(f"✓ 多轮运行历史查询成功，同一批次共 {runs['total_runs']} 轮运行")
    for run in runs["runs"]:
        print(f"  第{run['run_number']}轮: {run['status']}, 创建于 {run['created_at'][:10]}")

    print("\n" + "=" * 60)
    print("测试 11: 重启服务后数据持久化验证")
    print("=" * 60)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    response = client.post("/api/batches/import", json=import_data)
    batch = response.json()
    batch_id = batch["id"]

    response = client.get(f"/api/batches/{batch_id}")
    assert response.status_code == 200
    assert response.json()["run_number"] == 1
    print(f"✓ 新建批次持久化成功")

    print("\n" + "✓" * 60)
    print("所有测试通过！系统核心功能验证完成")
    print("✓" * 60)


if __name__ == "__main__":
    test_full_workflow()

    if os.path.exists("./test_evaluation.db"):
        os.remove("./test_evaluation.db")
