import numpy as np
import pandas as pd
import os


def generate_examples():
    np.random.seed(42)

    data_rows = []

    for i in range(1, 6):
        A = np.random.randn(3, 3) * (1 + i * 0.5)
        data_rows.append({
            "id": f"M{i:03d}",
            "a11": A[0, 0], "a12": A[0, 1], "a13": A[0, 2],
            "a21": A[1, 0], "a22": A[1, 1], "a23": A[1, 2],
            "a31": A[2, 0], "a32": A[2, 1], "a33": A[2, 2],
        })

    near_singular = np.array([
        [1.0, 2.0, 3.0],
        [2.0, 4.0001, 6.0],
        [3.0, 6.0, 9.0001],
    ])
    data_rows.append({
        "id": "M006",
        "a11": near_singular[0, 0], "a12": near_singular[0, 1], "a13": near_singular[0, 2],
        "a21": near_singular[1, 0], "a22": near_singular[1, 1], "a23": near_singular[1, 2],
        "a31": near_singular[2, 0], "a32": near_singular[2, 1], "a33": near_singular[2, 2],
    })

    singular = np.array([
        [1.0, 2.0, 3.0],
        [2.0, 4.0, 6.0],
        [3.0, 6.0, 9.0],
    ])
    data_rows.append({
        "id": "M007",
        "a11": singular[0, 0], "a12": singular[0, 1], "a13": singular[0, 2],
        "a21": singular[1, 0], "a22": singular[1, 1], "a23": singular[1, 2],
        "a31": singular[2, 0], "a32": singular[2, 1], "a33": singular[2, 2],
    })

    data_rows.append({
        "id": "M008",
        "a11": "", "a12": "", "a13": "",
        "a21": "", "a22": "", "a23": "",
        "a31": "", "a32": "", "a33": "",
    })

    data_rows.append({
        "id": "M009",
        "a11": 1.0, "a12": "N/A", "a13": 3.0,
        "a21": 2.0, "a22": 5.0, "a23": "error",
        "a31": 3.0, "a32": 6.0, "a33": 9.0,
    })

    data_rows.append({
        "id": "M010",
        "a11": 4.0, "a12": None, "a13": 1.0,
        "a21": None, "a22": 3.0, "a23": None,
        "a31": 2.0, "a32": 5.0, "a33": 7.0,
    })

    well_cond = np.array([
        [2.0, 0.5, 0.1],
        [0.5, 3.0, 0.2],
        [0.1, 0.2, 4.0],
    ])
    data_rows.append({
        "id": "M011",
        "a11": well_cond[0, 0], "a12": well_cond[0, 1], "a13": well_cond[0, 2],
        "a21": well_cond[1, 0], "a22": well_cond[1, 1], "a23": well_cond[1, 2],
        "a31": well_cond[2, 0], "a32": well_cond[2, 1], "a33": well_cond[2, 2],
    })

    hilbert = np.array([
        [1.0, 1/2, 1/3],
        [1/2, 1/3, 1/4],
        [1/3, 1/4, 1/5],
    ])
    data_rows.append({
        "id": "M012",
        "a11": hilbert[0, 0], "a12": hilbert[0, 1], "a13": hilbert[0, 2],
        "a21": hilbert[1, 0], "a22": hilbert[1, 1], "a23": hilbert[1, 2],
        "a31": hilbert[2, 0], "a32": hilbert[2, 1], "a33": hilbert[2, 2],
    })

    df_input = pd.DataFrame(data_rows)
    df_input.to_csv("examples/example_input.csv", index=False)
    print(f"已生成样例输入数据: {len(df_input)} 条记录")

    history_rows = []
    for idx, row in df_input.iterrows():
        mid = row["id"]
        elements = []
        valid = True
        for col in ["a11", "a12", "a13", "a21", "a22", "a23", "a31", "a32", "a33"]:
            val = row[col]
            if pd.isna(val) or str(val).strip() == "" or not _is_number(val):
                valid = False
                break
            elements.append(float(val))

        if not valid:
            history_rows.append({
                "id": mid,
                "condition_number": None,
                "source": "2024年12月人工复核",
                "version": "v1.0",
                "notes": "数据不全/脏数据，无历史答案"
            })
        else:
            A = np.array(elements).reshape(3, 3)
            cond = np.linalg.cond(A, 2)

            if mid == "M003":
                cond = cond * 1.5
                notes = "历史计算口径不同，近似值"
            elif mid == "M005":
                cond = cond + 100
                notes = "历史答案有偏差，需复核"
            elif mid == "M011":
                cond = cond * 0.9
                notes = "历史值偏低"
            else:
                notes = ""

            history_rows.append({
                "id": mid,
                "condition_number": cond,
                "source": "2024年12月人工复核",
                "version": "v1.0",
                "notes": notes
            })

    history_rows.append({
        "id": "M013",
        "condition_number": 123.45,
        "source": "2024年12月人工复核",
        "version": "v1.0",
        "notes": "历史有但本次数据缺失"
    })

    df_history = pd.DataFrame(history_rows)
    df_history.to_csv("examples/example_history.csv", index=False)
    print(f"已生成样例历史答案: {len(df_history)} 条记录")


def _is_number(val):
    try:
        float(val)
        return True
    except (ValueError, TypeError):
        return False


if __name__ == "__main__":
    os.makedirs("examples", exist_ok=True)
    generate_examples()
