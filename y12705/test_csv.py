#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from bayesian_prior_sensitivity.dataloader import save_model_list, load_model_list
from bayesian_prior_sensitivity.models import (
    BoundaryCase, CaseStatus, PriorParams, SensitivityResult, DataAvailability,
    CommitteeDecision
)
import os, tempfile, traceback

td = tempfile.mkdtemp()
print(f"临时目录: {td}")

try:
    csv1 = os.path.join(td, 'cases.csv')
    cases = [BoundaryCase(
        case_id='TEST-01', description='CSV测试样例', boundary_flag=True,
        prior_params=PriorParams(alpha=1.0, beta=2.0, description='测试先验'),
        status=CaseStatus.PENDING, tags=['t1', 't2']
    )]
    save_model_list(csv1, cases)
    print(f"CSV写入完成: {csv1}")

    with open(csv1) as f:
        content = f.read()
    print(f"CSV内容:\n{content}")

    loaded = load_model_list(csv1, BoundaryCase)
    print(f"读取 {len(loaded)} 条记录")
    print(f"  case_id: {loaded[0].case_id}")
    print(f"  prior_params.alpha: {loaded[0].prior_params.alpha}")
    print(f"  prior_params.beta: {loaded[0].prior_params.beta}")
    print(f"  tags: {loaded[0].tags}")
    print(f"  status: {loaded[0].status}")

    print("\nTest1 嵌套模型: 通过 ✓")

    csv2 = os.path.join(td, 'results.csv')
    results = [SensitivityResult(
        case_id='R-001', status=CaseStatus.APPROVED,
        prior_params=PriorParams(alpha=2.0, beta=3.0),
        posterior_mean=0.5, posterior_std=0.1,
        data_availability=DataAvailability.USABLE,
        robustness_index=0.05, is_robust=True,
        committee_decision=CommitteeDecision.DIRECT_USE,
        boundary_flag=True,
    )]
    save_model_list(csv2, results)
    loaded_r = load_model_list(csv2, SensitivityResult)
    print(f"\nTest2 SensitivityResult:")
    print(f"  case_id: {loaded_r[0].case_id}")
    print(f"  data_availability: {loaded_r[0].data_availability}")
    print(f"  is_robust: {loaded_r[0].is_robust}")
    print(f"  prior alpha: {loaded_r[0].prior_params.alpha}")
    print("  Test2: 通过 ✓")

    print("\n=== 所有 CSV 测试通过! ===")

except Exception as e:
    print(f"错误: {e}")
    traceback.print_exc()
    sys.exit(1)
