import json
import re
from typing import List, Dict, Tuple, Optional

from database import get_conn, now


def evaluate_expression(expr: str) -> Optional[float]:
    try:
        expr = expr.strip()
        if not expr:
            return None
        safe_chars = set("0123456789+-*/(). ")
        if not all(c in safe_chars for c in expr):
            return None
        if "/" in expr:
            parts = expr.split("/")
            for i in range(1, len(parts)):
                denom = parts[i].strip()
                if denom.startswith("("):
                    depth = 1
                    j = 1
                    while j < len(denom) and depth > 0:
                        if denom[j] == "(":
                            depth += 1
                        elif denom[j] == ")":
                            depth -= 1
                        j += 1
                    inner = denom[1:j - 1]
                    val = evaluate_expression(inner)
                    if val is not None and abs(val) < 1e-10:
                        raise ZeroDivisionError("division by zero")
                else:
                    num_match = re.match(r"^[\d.]+", denom)
                    if num_match:
                        val = float(num_match.group())
                        if abs(val) < 1e-10:
                            raise ZeroDivisionError("division by zero")
        return float(eval(expr))
    except ZeroDivisionError:
        raise
    except Exception:
        return None


def compare_answers(student: str, correct: str) -> Optional[bool]:
    if student is None or correct is None:
        return None
    s_val = evaluate_expression(student)
    c_val = evaluate_expression(correct)
    if s_val is not None and c_val is not None:
        return abs(s_val - c_val) < 1e-6
    s_norm = student.strip().replace(" ", "").lower()
    c_norm = correct.strip().replace(" ", "").lower()
    if s_norm == c_norm:
        return True
    return False


def detect_boundary_cases(question_text: str, student_answer: str, correct_answer: str) -> List[Dict]:
    cases = []
    q_lower = question_text.lower()

    if "除以" in question_text or "/" in question_text or "÷" in question_text or "divide" in q_lower:
        denom_exprs = []
        if correct_answer:
            if "/" in correct_answer:
                parts = correct_answer.split("/")
                for i in range(1, len(parts)):
                    denom = parts[i].strip()
                    if denom:
                        denom_exprs.append(denom)
        if student_answer and "/" in student_answer:
            parts = student_answer.split("/")
            for i in range(1, len(parts)):
                denom = parts[i].strip()
                if denom:
                    denom_exprs.append(denom)

        for denom in denom_exprs:
            try:
                orig_val = evaluate_expression(student_answer or "0")
                orig_is_correct = compare_answers(student_answer, correct_answer)

                boundary_student = student_answer.replace(denom, "0") if student_answer else None
                boundary_val = evaluate_expression(boundary_student or "0")
                boundary_is_correct = compare_answers(boundary_student, correct_answer)

                result_changed = 0
                if orig_is_correct is not None and boundary_is_correct is not None:
                    result_changed = 1 if orig_is_correct != boundary_is_correct else 0

                cases.append({
                    "case_type": "division_by_zero",
                    "description": f"将分母 {denom} 替换为 0，触发除零边界",
                    "original_result": f"学生答案={student_answer}, 判定={'正确' if orig_is_correct else '错误' if orig_is_correct is False else '未知'}",
                    "boundary_result": f"边界答案={boundary_student}, 判定={'正确' if boundary_is_correct else '错误' if boundary_is_correct is False else '异常'}",
                    "result_changed": result_changed
                })
            except Exception:
                cases.append({
                    "case_type": "division_by_zero",
                    "description": f"分母 {denom} → 0，触发除零异常",
                    "original_result": f"学生答案={student_answer}",
                    "boundary_result": "除零异常（原判定为可计算，边界不可计算）",
                    "result_changed": 1
                })

    nums = re.findall(r"-?\d+\.?\d*", question_text)
    if len(nums) >= 2:
        try:
            sorted_nums = sorted([float(n) for n in nums])
            min_val = sorted_nums[0]
            max_val = sorted_nums[-1]

            if student_answer:
                orig_is_correct = compare_answers(student_answer, correct_answer)

                boundary_answer_min = str(int(min_val - 1)) if min_val == int(min_val) else str(min_val - 0.001)
                bnd_min_correct = compare_answers(boundary_answer_min, correct_answer)
                changed_min = 0
                if orig_is_correct is not None and bnd_min_correct is not None:
                    changed_min = 1 if orig_is_correct != bnd_min_correct else 0

                if changed_min:
                    cases.append({
                        "case_type": "below_min_boundary",
                        "description": f"取值范围下界边界：最小值 {min_val} -1",
                        "original_result": f"学生答案={student_answer}, 判定={'正确' if orig_is_correct else '错误'}",
                        "boundary_result": f"边界答案={boundary_answer_min}, 判定={'正确' if bnd_min_correct else '错误'}",
                        "result_changed": 1
                    })

                boundary_answer_max = str(int(max_val + 1)) if max_val == int(max_val) else str(max_val + 0.001)
                bnd_max_correct = compare_answers(boundary_answer_max, correct_answer)
                changed_max = 0
                if orig_is_correct is not None and bnd_max_correct is not None:
                    changed_max = 1 if orig_is_correct != bnd_max_correct else 0

                if changed_max:
                    cases.append({
                        "case_type": "above_max_boundary",
                        "description": f"取值范围上界边界：最大值 {max_val} +1",
                        "original_result": f"学生答案={student_answer}, 判定={'正确' if orig_is_correct else '错误'}",
                        "boundary_result": f"边界答案={boundary_answer_max}, 判定={'正确' if bnd_max_correct else '错误'}",
                        "result_changed": 1
                    })
        except Exception:
            pass

    if "负数" in question_text or "负" in question_text or "negative" in q_lower:
        if student_answer:
            orig_is_correct = compare_answers(student_answer, correct_answer)
            if student_answer.startswith("-"):
                flipped = student_answer[1:]
            else:
                flipped = "-" + student_answer
            flip_correct = compare_answers(flipped, correct_answer)
            changed = 0
            if orig_is_correct is not None and flip_correct is not None:
                changed = 1 if orig_is_correct != flip_correct else 0
            if changed:
                cases.append({
                    "case_type": "negative_sign_boundary",
                    "description": f"正负号边界：翻转学生答案符号",
                    "original_result": f"学生答案={student_answer}, 判定={'正确' if orig_is_correct else '错误'}",
                    "boundary_result": f"边界答案={flipped}, 判定={'正确' if flip_correct else '错误'}",
                    "result_changed": 1
                })

    return cases


def process_single_question(q_data: Dict, batch_id: int) -> Tuple[int, Dict]:
    stats = {"processed": 0, "errors": 0, "missing": []}
    question_id = q_data.get("question_id") or q_data.get("qid") or f"q_{batch_id}_{id(q_data)}"
    student_id = q_data.get("student_id") or q_data.get("sid")
    question_text = q_data.get("question_text") or q_data.get("question") or ""
    student_answer = q_data.get("student_answer") or q_data.get("answer")
    correct_answer = q_data.get("correct_answer") or q_data.get("correct")

    missing_fields = []
    if not question_text:
        missing_fields.append("question_text")
    if correct_answer is None or correct_answer == "":
        missing_fields.append("correct_answer")

    has_error = 0
    error_note = None
    is_correct = None

    if missing_fields:
        stats["missing"].append((question_id, missing_fields))
    else:
        if student_answer is not None and student_answer != "":
            try:
                is_correct = compare_answers(student_answer, correct_answer)
                if is_correct is None:
                    has_error = 1
                    error_note = "答案格式无法比较"
            except ZeroDivisionError:
                has_error = 1
                error_note = "学生答案包含除零"
                is_correct = False
            except Exception as e:
                has_error = 1
                error_note = f"判定异常: {e}"

    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            """INSERT INTO student_questions
               (batch_id, question_id, student_id, question_text, student_answer,
                correct_answer, is_correct, raw_data, has_error, error_note)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (batch_id, question_id, student_id, question_text, student_answer,
             correct_answer, 1 if is_correct else (0 if is_correct is False else None),
             json.dumps(q_data, ensure_ascii=False), has_error, error_note)
        )
        q_db_id = c.lastrowid

        if not missing_fields and student_answer and correct_answer:
            try:
                boundary_cases = detect_boundary_cases(question_text, student_answer, correct_answer)
                for bc in boundary_cases:
                    c.execute(
                        """INSERT INTO boundary_cases
                           (question_id, case_type, description, original_result, boundary_result, result_changed)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (q_db_id, bc["case_type"], bc["description"],
                         bc["original_result"], bc["boundary_result"], bc["result_changed"])
                    )
            except Exception as e:
                pass

        for field in missing_fields:
            c.execute(
                """INSERT INTO missing_answers
                   (question_id, batch_id, missing_field, noted_at, resolved)
                   VALUES (?, ?, ?, ?, 0)""",
                (q_db_id, batch_id, field, now())
            )

    stats["processed"] = 1
    if has_error:
        stats["errors"] = 1
    return q_db_id, stats


def import_questions(data: List[Dict], batch_name: str, source_file: str = None) -> Dict:
    from database import init_db
    init_db()

    total_stats = {
        "total": len(data),
        "processed": 0,
        "errors": 0,
        "missing_count": 0,
        "missing_details": [],
        "batch_id": None
    }

    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            "INSERT INTO import_batches (batch_name, imported_at, source_file, total_records, status) VALUES (?, ?, ?, ?, 'imported')",
            (batch_name, now(), source_file, len(data))
        )
        batch_id = c.lastrowid
        total_stats["batch_id"] = batch_id

    for q in data:
        try:
            _, stats = process_single_question(q, batch_id)
            total_stats["processed"] += stats["processed"]
            total_stats["errors"] += stats["errors"]
            if stats["missing"]:
                total_stats["missing_count"] += len(stats["missing"])
                total_stats["missing_details"].extend(stats["missing"])
        except Exception as e:
            total_stats["errors"] += 1

    return total_stats
