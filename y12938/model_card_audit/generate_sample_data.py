import os
import json
import shutil
from pathlib import Path


BASE = Path(__file__).parent
DATA = BASE / "sample_data"


def clean():
    if DATA.exists():
        shutil.rmtree(DATA)
    DATA.mkdir(parents=True)


def make_training():
    d = DATA / "training_v2"
    d.mkdir(parents=True, exist_ok=True)
    (d / "sample_algebra_01.json").write_text(
        json.dumps({
            "id": "alg_01",
            "topic": ["代数", "一元二次方程"],
            "knowledge_point": "求根公式",
            "question": "求解 x^2 - 5x + 6 = 0",
            "answer": "x=2 或 x=3",
            "难度": "中等"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "sample_algebra_02.json").write_text(
        json.dumps({
            "id": "alg_02",
            "topic": ["代数", "一元二次方程"],
            "knowledge_point": "韦达定理",
            "question": "已知 x^2 - 5x + 6 = 0，求两根之和与积",
            "answer": "和=5，积=6",
            "难度": "简单"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "sample_geometry_01.json").write_text(
        json.dumps({
            "id": "geo_01",
            "topic": ["几何", "三角形"],
            "knowledge_point": "勾股定理",
            "question": "直角三角形两直角边 3 和 4，求斜边",
            "answer": "5",
            "难度": "简单"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "sample_calculus_01.json").write_text(
        json.dumps({
            "id": "cal_01",
            "topic": ["微积分", "导数"],
            "knowledge_point": "幂函数求导",
            "question": "求 x^3 在 x=2 处的导数值",
            "answer": "12",
            "难度": "中等"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "sample_stats_01.txt").write_text(
        "知识点: 统计\n"
        "题目: 求 1,2,3,4,5 的均值\n"
        "答案: 3\n",
        encoding="utf-8"
    )


def make_evaluation():
    d = DATA / "evaluation_v2"
    d.mkdir(parents=True, exist_ok=True)
    (d / "quiz_algebra.json").write_text(
        json.dumps({
            "topic": ["代数", "一元二次方程"],
            "questions": [
                {"q": "x^2-5x+6=0 根？", "a": "2,3"},
                {"q": "x^2-3x+2=0 根？", "a": "1,2"},
                {"q": "x^2-7x+12=0 根？", "a": "3,4"},
                {"q": "韦达定理：x^2+px+q=0 两根和？", "a": "-p"},
                {"q": "韦达定理：x^2+px+q=0 两根积？", "a": "q"}
            ]
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "quiz_geometry.json").write_text(
        json.dumps({
            "topic": ["几何", "三角形"],
            "questions": [
                {"q": "3-4-? 直角三角形斜边？", "a": "5"},
                {"q": "5-12-? 直角三角形斜边？", "a": "13"}
            ]
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "quiz_calculus.json").write_text(
        json.dumps({
            "topic": ["微积分", "导数"],
            "questions": [
                {"q": "(x^3)' at x=2?", "a": "12"}
            ]
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "quiz_physics_outlier.json").write_text(
        json.dumps({
            "topic": ["物理", "力学"],
            "questions": [
                {"q": "F=ma 含义？", "a": "力等于质量乘加速度"},
                {"q": "自由落体 1 秒下落距离？", "a": "约4.9m"},
                {"q": "自由落体 2 秒下落距离？", "a": "约19.6m"},
                {"q": "自由落体 3 秒下落距离？", "a": "约44.1m"},
                {"q": "动量公式？", "a": "p=mv"}
            ]
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def make_feedback():
    d = DATA / "feedback_v2"
    d.mkdir(parents=True, exist_ok=True)
    (d / "feedback_sample_algebra_01.json").write_text(
        json.dumps({
            "material_file": "sample_algebra_01.json",
            "feedback_type": "quality_review",
            "verdict": "pass",
            "comment": "解答准确，格式规范",
            "reviewer": "王老师"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "feedback_sample_algebra_02.json").write_text(
        json.dumps({
            "material_file": "sample_algebra_02.json",
            "feedback_type": "human_rating",
            "result": "pass",
            "rating": 5,
            "comment": "示例选得好"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "feedback_sample_geometry_01.json").write_text(
        json.dumps({
            "material_file": "sample_geometry_01.json",
            "feedback_type": "pass_fail",
            "verdict": "fail",
            "comment": "缺少单位和步骤说明，需补充",
            "reviewer": "李老师"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def make_supplementary_training():
    d = DATA / "training_v2_supplement"
    d.mkdir(parents=True, exist_ok=True)
    (d / "sample_physics_01.json").write_text(
        json.dumps({
            "id": "phy_01",
            "topic": ["物理", "力学"],
            "knowledge_point": "牛顿第二定律",
            "question": "质量2kg物体受6N力，求加速度",
            "answer": "3 m/s²",
            "难度": "简单"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (d / "sample_stats_02.json").write_text(
        json.dumps({
            "id": "sta_02",
            "topic": ["统计"],
            "knowledge_point": "方差",
            "question": "求 1,2,3,4,5 的方差",
            "answer": "2",
            "难度": "中等"
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


if __name__ == "__main__":
    clean()
    make_training()
    make_evaluation()
    make_feedback()
    make_supplementary_training()
    print(f"示例数据已生成到: {DATA}")
    for root, dirs, files in os.walk(DATA):
        rel = os.path.relpath(root, DATA)
        depth = rel.count(os.sep)
        indent = "  " * depth
        if rel == ".":
            print(f"📁 {DATA.name}/")
        else:
            print(f"{indent}📁 {os.path.basename(root)}/")
        for f in sorted(files):
            print(f"{indent}  📄 {f}")
