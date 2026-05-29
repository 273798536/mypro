from matrix_grader import MatrixGrader


def example1_basic_correct():
    print("=" * 60)
    print("示例1：正确的消元步骤")
    print("=" * 60)
    
    grader = MatrixGrader()
    
    problem_matrix = [
        "1 2 3",
        "4 5 6",
        "7 8 10"
    ]
    
    student_steps = [
        """R2 = R2 + (-4) × R1
1  2  3
0  -3  -6
7  8  10""",
        """R3 = R3 + (-7) × R1
1  2  3
0  -3  -6
0  -6  -11""",
        """R3 = R3 + (-2) × R2
1  2  3
0  -3  -6
0  0  1"""
    ]
    
    report = grader.grade_student_work(problem_matrix, student_steps)
    print(grader.generate_report_text(report))
    print(grader.print_chart_explanation(report))
    
    return report


def example2_with_errors():
    print("\n" + "=" * 60)
    print("示例2：包含计算错误的消元步骤")
    print("=" * 60)
    
    grader = MatrixGrader()
    
    problem_matrix = [
        "2 1 -1",
        "-3 -1 2",
        "-2 1 2"
    ]
    
    student_steps = [
        """R2 = R2 + (2) × R1
2  1  -1
1  1  0
-2  1  2""",
        """R3 = R3 + (1) × R1
2  1  -1
1  1  0
0  2  1""",
        """R2 = R2 + (-1/2) × R1
2  1  -1
0  1/2  1/2
0  2  1"""
    ]
    
    report = grader.grade_student_work(problem_matrix, student_steps)
    print(grader.generate_report_text(report))
    
    return report


def example3_zero_pivot():
    print("\n" + "=" * 60)
    print("示例3：零主元情况")
    print("=" * 60)
    
    grader = MatrixGrader()
    
    problem_matrix = [
        "0 1 2",  
        "1 2 3",
        "2 3 4"
    ]
    
    student_steps = [
        """# 这里忘记交换行，直接消元
0  1  2
1  2  3
2  3  4""",
        """R3 = R3 + (-2) × R1
0  1  2
1  2  3
2  1  0"""
    ]
    
    report = grader.grade_student_work(problem_matrix, student_steps)
    print(grader.generate_report_text(report))
    
    return report


def example4_dirty_data():
    print("\n" + "=" * 60)
    print("示例4：包含脏数据（空值、备注）")
    print("=" * 60)
    
    grader = MatrixGrader()
    
    problem_matrix = [
        "1, 2, 3  # 这是第一行",
        "4, , 6",  
        "备注：学生漏写了一个数",
        "7, 8, 9"
    ]
    
    student_steps = [
        """步骤1：R2 = R2 + (-4) × R1
1  2  3
0  -3  -6
7  8  9""",
        """步骤2：R3 = R3 + (-7) × R1
1  2  3
0  -3  -6
0  -6  -12"""
    ]
    
    report = grader.grade_student_work(problem_matrix, student_steps)
    print(grader.generate_report_text(report))
    
    return report


def example5_save_report():
    print("\n" + "=" * 60)
    print("示例5：保存批改报告为JSON")
    print("=" * 60)
    
    grader = MatrixGrader()
    
    problem_matrix = [
        "1 2 3",
        "0 1 4",
        "2 3 5"
    ]
    
    student_steps = [
        """R3 = R3 + (-2) × R1
1  2  3
0  1  4
0  -1  -1""",
        """R3 = R3 + (1) × R2
1  2  3
0  1  4
0  0  3"""
    ]
    
    report = grader.grade_student_work(problem_matrix, student_steps)
    print(grader.generate_report_text(report))
    
    grader.save_report_json(report, "grading_report.json")
    print("报告已保存到 grading_report.json")
    
    return report


if __name__ == "__main__":
    print("矩阵消元步骤批改系统 - 示例演示")
    print("=" * 60)
    
    report1 = example1_basic_correct()
    report2 = example2_with_errors()
    report3 = example3_zero_pivot()
    report4 = example4_dirty_data()
    report5 = example5_save_report()
    
    print("\n" + "=" * 60)
    print("所有示例执行完成！")
    print("=" * 60)
