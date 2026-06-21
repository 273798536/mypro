function generateMockSnapshots() {
  const versionId = 'v_shadow_202406_001';
  const versionId2 = 'v_shadow_202406_002';
  
  const snapshots = [
    {
      id: 'snap_001',
      run_id: 'RUN-20240615-001',
      name: '用户登录接口',
      expected_name: '用户登录接口',
      features: {
        qps: 1200,
        avg_latency: 45.2,
        error_rate: 0.002,
        p99_latency: 120.5
      },
      metric_score: 92.5,
      status: 'confirmed',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId,
      created_at: '2024-06-15T10:30:00.000Z',
      updated_at: '2024-06-15T14:20:00.000Z',
      notes: ''
    },
    {
      id: 'snap_002',
      run_id: 'RUN-20240615-002',
      name: '订单创建接口',
      expected_name: '订单创建接口',
      features: {
        qps: 850,
        avg_latency: 120.8,
        error_rate: 0.005,
        p99_latency: 350.2
      },
      metric_score: 87.3,
      status: 'confirmed',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId,
      created_at: '2024-06-15T10:32:00.000Z',
      updated_at: '2024-06-15T14:20:00.000Z',
      notes: ''
    },
    {
      id: 'snap_003',
      run_id: 'RUN-20240615-003',
      name: '商品列表查询_v2',
      expected_name: '商品列表查询',
      features: {
        qps: 2100,
        avg_latency: 78.5,
        error_rate: 0.001,
        p99_latency: 200.3
      },
      metric_score: 94.8,
      status: 'pending',
      anomaly_type: 'name_mismatch',
      anomaly_detail: '快照名称"商品列表查询_v2"与预期名称"商品列表查询"不一致，可能为版本混淆或误命名',
      version_id: versionId,
      created_at: '2024-06-15T10:35:00.000Z',
      updated_at: '2024-06-15T10:35:00.000Z',
      notes: ''
    },
    {
      id: 'snap_004',
      run_id: 'RUN-20240615-002',
      name: '订单创建接口',
      expected_name: '订单创建接口',
      features: {
        qps: 920,
        avg_latency: 115.3,
        error_rate: 0.003,
        p99_latency: 320.8
      },
      metric_score: 89.1,
      status: 'pending',
      anomaly_type: 'duplicate_run_id',
      anomaly_detail: 'run_id RUN-20240615-002 已存在，可能为重跑覆盖或重复采集',
      version_id: versionId,
      created_at: '2024-06-15T11:45:00.000Z',
      updated_at: '2024-06-15T11:45:00.000Z',
      notes: ''
    },
    {
      id: 'snap_005',
      run_id: 'RUN-20240615-004',
      name: '支付回调接口',
      expected_name: '支付回调接口',
      features: {
        qps: 320,
        avg_latency: 250.6,
        error_rate: 0.012,
        p99_latency: 580.4
      },
      metric_score: 68.2,
      status: 'needs_evidence',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId,
      created_at: '2024-06-15T10:40:00.000Z',
      updated_at: '2024-06-15T15:00:00.000Z',
      notes: '错误率偏高，需要补充压测证据确认是否为真实退化'
    },
    {
      id: 'snap_006',
      run_id: 'RUN-20240615-005',
      name: '用户信息查询',
      expected_name: '用户信息查询',
      features: {
        qps: 560,
        avg_latency: 35.8,
        error_rate: 0.001,
        p99_latency: 90.2
      },
      metric_score: 95.6,
      status: 'confirmed',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId,
      created_at: '2024-06-15T10:45:00.000Z',
      updated_at: '2024-06-15T14:20:00.000Z',
      notes: ''
    },
    {
      id: 'snap_007',
      run_id: 'RUN-20240615-006',
      name: '库存扣减接口',
      expected_name: '库存扣减接口',
      features: {
        qps: 150,
        avg_latency: 320.4,
        error_rate: 0.025,
        p99_latency: 890.7
      },
      metric_score: 52.1,
      status: 'confirmed',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId,
      created_at: '2024-06-15T10:50:00.000Z',
      updated_at: '2024-06-15T14:20:00.000Z',
      notes: '已知慢接口，作为基线数据'
    },
    {
      id: 'snap_008',
      run_id: 'RUN-20240615-007',
      name: '消息推送接口',
      expected_name: '消息推送接口',
      features: {
        qps: 780,
        avg_latency: 62.3,
        error_rate: 0.003,
        p99_latency: 180.5
      },
      metric_score: 91.8,
      status: 'confirmed',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId,
      created_at: '2024-06-15T10:55:00.000Z',
      updated_at: '2024-06-15T14:20:00.000Z',
      notes: ''
    },
    {
      id: 'snap_009',
      run_id: 'RUN-20240615-008',
      name: '评价提交接口',
      expected_name: '评价提交接口',
      features: {
        qps: 230,
        avg_latency: 89.7,
        error_rate: 0.004,
        p99_latency: 220.1
      },
      metric_score: 88.5,
      status: 'pending',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId,
      created_at: '2024-06-15T11:00:00.000Z',
      updated_at: '2024-06-15T11:00:00.000Z',
      notes: ''
    },
    {
      id: 'snap_010',
      run_id: 'RUN-20240616-001',
      name: '用户登录接口',
      expected_name: '用户登录接口',
      features: {
        qps: 1350,
        avg_latency: 42.8,
        error_rate: 0.001,
        p99_latency: 105.3
      },
      metric_score: 94.2,
      status: 'confirmed',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId2,
      created_at: '2024-06-16T09:00:00.000Z',
      updated_at: '2024-06-16T12:00:00.000Z',
      notes: ''
    },
    {
      id: 'snap_011',
      run_id: 'RUN-20240616-002',
      name: '订单查询接口',
      expected_name: '订单查询接口',
      features: {
        qps: 620,
        avg_latency: 55.3,
        error_rate: 0.002,
        p99_latency: 150.7
      },
      metric_score: 93.4,
      status: 'confirmed',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId2,
      created_at: '2024-06-16T09:05:00.000Z',
      updated_at: '2024-06-16T12:00:00.000Z',
      notes: ''
    },
    {
      id: 'snap_012',
      run_id: 'RUN-20240616-003',
      name: '优惠券核销接口',
      expected_name: '优惠券核销接口',
      features: {
        qps: 180,
        avg_latency: 145.6,
        error_rate: 0.008,
        p99_latency: 400.2
      },
      metric_score: 82.1,
      status: 'needs_evidence',
      anomaly_type: 'none',
      anomaly_detail: '',
      version_id: versionId2,
      created_at: '2024-06-16T09:10:00.000Z',
      updated_at: '2024-06-16T15:30:00.000Z',
      notes: '新增接口，需要与旧版优惠券接口做对比验证'
    }
  ];
  
  return { snapshots, versionId, versionId2 };
}

function generateMockVersions(snapshots) {
  const versions = [
    {
      id: 'v_shadow_202406_001',
      version_name: '影子流量-2024年6月第1轮',
      status: 'pending_confirmation',
      total_count: 9,
      confirmed_count: 5,
      anomaly_count: 2,
      needs_evidence_count: 1,
      overall_metric: 79.78,
      created_at: '2024-06-15T10:00:00.000Z',
      updated_at: '2024-06-15T15:00:00.000Z',
      notes: '包含名称不一致和run_id重复的待确认项，需评审后处理'
    },
    {
      id: 'v_shadow_202406_002',
      version_name: '影子流量-2024年6月第2轮',
      status: 'needs_evidence',
      total_count: 3,
      confirmed_count: 2,
      anomaly_count: 0,
      needs_evidence_count: 1,
      overall_metric: 93.8,
      created_at: '2024-06-16T09:00:00.000Z',
      updated_at: '2024-06-16T15:30:00.000Z',
      notes: '新增优惠券核销接口待补充证据'
    }
  ];
  
  return versions;
}

module.exports = {
  generateMockSnapshots,
  generateMockVersions
};
