import React, { useMemo } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Timeline,
  Progress,
  Tooltip,
  Divider,
  Result,
  Breadcrumb,
  Empty,
  Table,
  Row,
  Col,
  App as AntdApp,
  Popover,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  RobotOutlined,
  UserOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  SwapOutlined,
  AlertOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useStore } from '@/store/useStore';
import { AttributeStatus, ExceptionStatus, ThresholdRule } from '@/types';

const STATUS_MAP: Record<AttributeStatus, { color: string; label: string; icon: any; desc: string }> = {
  pass: { color: 'success', label: '通过', icon: CheckCircleOutlined, desc: '各项属性指标达到阈值标准' },
  warning: { color: 'warning', label: '预警', icon: WarningOutlined, desc: '部分指标触及预警线，建议关注' },
  fail: { color: 'error', label: '异常', icon: CloseCircleOutlined, desc: '存在异常指标，需评测复核' },
  pending: { color: 'default', label: '待处理', icon: ClockCircleOutlined, desc: '等待补充材料或人工审核' },
};

const RecordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();

  const getRecordById = useStore(s => s.getRecordById);
  const thresholdRules = useStore(s => s.thresholdRules);
  const setFilter = useStore(s => s.setFilter);
  const allRecords = useStore(s => s.allRecords);

  const record = useMemo(() => id ? getRecordById(id) : undefined, [id, getRecordById, allRecords]);

  if (!record) {
    return (
      <Card>
        <Empty
          description={
            <div>
              <p>未找到记录：<code>{id}</code></p>
              <Button type="primary" onClick={() => navigate('/detail-table')}>
                返回明细表
              </Button>
            </div>
          }
        />
      </Card>
    );
  }

  const finalStatus = STATUS_MAP[record.finalConclusion.status];
  const StatusIcon = finalStatus.icon;
  const hasDrift = Object.values(record.modelOutput.thresholdsApplied).some(t => t.driftComparedTo);

  const scoreBarOption = useMemo(() => {
    const data = record.attributes.map(a => ({
      name: a.name,
      score: a.score,
      pass: a.thresholdPass,
      warning: a.thresholdWarning,
    }));
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 70, right: 30, top: 20, bottom: 30 },
      xAxis: { type: 'value', max: 100 },
      yAxis: { type: 'category', data: data.map(d => d.name).reverse() },
      series: [
        {
          name: '实际得分',
          type: 'bar',
          data: data.map(d => d.score).reverse(),
          itemStyle: {
            color: (params: any) => {
              const score = params.value;
              return score >= data[data.length - 1 - params.dataIndex].pass ? '#52c41a' :
                     score >= data[data.length - 1 - params.dataIndex].warning ? '#faad14' : '#ff4d4f';
            },
          },
          label: { show: true, position: 'right', formatter: '{c}' },
          barWidth: 16,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', width: 1 },
            data: [
              { xAxis: 80, lineStyle: { color: '#52c41a' }, label: { formatter: '通过线', color: '#52c41a', fontSize: 10 } },
              { xAxis: 60, lineStyle: { color: '#faad14' }, label: { formatter: '预警线', color: '#faad14', fontSize: 10 } },
            ],
          },
        },
      ],
    };
  }, [record.attributes]);

  const exceptionTag = record.exceptionStatus ? (() => {
    const map: Record<ExceptionStatus, { color: string; label: string; icon: any }> = {
      handled: { color: 'success', label: '已处理', icon: CheckCircleOutlined },
      pending_material: { color: 'warning', label: '待补材料', icon: FileTextOutlined },
      manual_overruled: { color: 'purple', label: '人工改判', icon: EyeOutlined },
    };
    const c = map[record.exceptionStatus];
    const Icon = c.icon;
    return <Tag color={c.color} icon={<Icon />} style={{ fontSize: 13, padding: '2px 12px' }}>{c.label}</Tag>;
  })() : null;

  const confidences = Object.values(record.modelOutput.confidence);
  const avgConfidence = confidences.length
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length * 100) / 100
    : 0;

  const gotoDashboardLocate = () => {
    setFilter({ categories: [record.category], brands: [record.brand], keyword: record.id });
    message.success('已在看板同步筛选条件，可查看该记录所在类目整体情况');
    navigate('/dashboard');
  };

  const gotoExceptionQueue = () => {
    if (record.exceptionStatus) {
      navigate(`/exception-queue?tab=${record.exceptionStatus}`);
    } else {
      navigate('/exception-queue');
    }
  };

  return (
    <div>
      <Card className="section-card" size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Breadcrumb
              items={[
                { title: <a onClick={() => navigate('/dashboard')}>概览看板</a> },
                { title: <a onClick={() => navigate('/detail-table')}>明细表</a> },
                { title: record.id },
              ]}
            />
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
              <Button icon={<DashboardOutlined />} onClick={gotoDashboardLocate}>定位到看板</Button>
              <Button icon={<UnorderedListOutlined />} onClick={() => navigate('/detail-table')}>明细表</Button>
              <Button icon={<AlertOutlined />} type="primary" ghost onClick={gotoExceptionQueue}>异常队列</Button>
            </Space>
          </Space>

          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} md={16}>
              <Space size={16} align="start">
                <div style={{
                  width: 56, height: 56, borderRadius: 10,
                  background: '#f0f5ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>
                  📦
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{record.productName}</div>
                  <Space size={8} style={{ marginTop: 6 }}>
                    <Tag style={{ margin: 0 }}>{record.category}</Tag>
                    <Tag style={{ margin: 0 }}>{record.brand}</Tag>
                    <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                      SKU{record.productId} · 批次{record.batchDate} · 评测人：{record.evaluator}
                    </span>
                  </Space>
                  <Space size={8} style={{ marginTop: 8 }}>
                    <Tag color={finalStatus.color} icon={<StatusIcon />} style={{ fontSize: 14, padding: '4px 14px' }}>
                      最终结论：{finalStatus.label} · 综合分 {record.overallScore}
                    </Tag>
                    {exceptionTag}
                    {record.finalConclusion.isManualOverride && (
                      <Tag color="purple" icon={<SwapOutlined />}>经过人工改判</Tag>
                    )}
                    {hasDrift && (
                      <Popover title="阈值漂移说明" content={
                        <div style={{ maxWidth: 320, fontSize: 12 }}>
                          {Object.entries(record.modelOutput.thresholdsApplied)
                            .filter(([_, t]) => t.driftComparedTo)
                            .map(([attr, t]) => (
                              <div key={attr} style={{ marginBottom: 6 }}>
                                <b>{attr}</b>：{t.driftComparedTo}
                              </div>
                            ))}
                        </div>
                      }>
                        <Tag color="magenta" icon={<InfoCircleOutlined />}>检测到阈值漂移</Tag>
                      </Popover>
                    )}
                  </Space>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space size={20} style={{ float: 'right' }}>
                <div style={{ textAlign: 'center' }}>
                  <Progress type="dashboard" percent={record.overallScore} size={80}
                    strokeColor={record.overallScore >= 80 ? '#52c41a' : record.overallScore >= 60 ? '#faad14' : '#ff4d4f'}
                    format={(p) => <span style={{ fontSize: 18, fontWeight: 600 }}>{p}</span>}
                  />
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: -8 }}>综合分</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Progress type="dashboard" percent={Math.round(avgConfidence * 100)} size={80}
                    strokeColor="#722ed1"
                    format={(p) => <span style={{ fontSize: 18, fontWeight: 600 }}>{p}%</span>}
                  />
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: -8 }}>模型置信度</div>
                </div>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      <div className="three-column-layout">
        <div className="detail-panel">
          <div className="detail-panel-title">
            <Space>
              <RobotOutlined style={{ color: '#1677ff' }} />
              ① 模型原始输出
            </Space>
            <Tag style={{ fontSize: 11 }}>{record.modelOutput.modelVersion}</Tag>
          </div>

          <Descriptions size="small" column={1} bordered style={{ marginBottom: 14 }}>
            <Descriptions.Item label="推理时间">{record.modelOutput.inferenceTime}</Descriptions.Item>
            <Descriptions.Item label="平均置信度">
              <span style={{ color: avgConfidence >= 0.85 ? '#52c41a' : avgConfidence >= 0.7 ? '#faad14' : '#ff4d4f', fontWeight: 600 }}>
                {(avgConfidence * 100).toFixed(1)}%
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="样本权重">
              <Tooltip title="该样本在整体统计中的杠杆效应系数">
                {record.influentialWeight.toFixed(2)}x
              </Tooltip>
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left" style={{ margin: '8px 0 12px', fontSize: 12 }} plain>
            各属性分数 & 阈值对照
          </Divider>

          <div style={{ marginBottom: 14 }}>
            <ReactECharts option={scoreBarOption} style={{ height: 240 }} notMerge lazyUpdate />
          </div>

          {hasDrift && (
            <div style={{
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 6,
              padding: 10,
              marginBottom: 14,
              fontSize: 12,
            }}>
              <div style={{ color: '#cf1322', fontWeight: 600, marginBottom: 6 }}>
                ⚠️  阈值漂移（非含糊警告，已追到模型实际使用阈值）
              </div>
              <Table
                size="small"
                pagination={false}
                rowKey="attr"
                dataSource={
                  Object.entries(record.modelOutput.thresholdsApplied)
                    .filter(([_, t]) => t.driftComparedTo)
                    .map(([attr, t]) => ({ attr, ...t, rule: thresholdRules.find(r => r.attributeName === attr) }))
                }
                columns={[
                  { title: '属性', dataIndex: 'attr', width: 90 },
                  { title: '规则通过线', render: (_: any, r: any) => <Tag color="green">≥ {r.rule?.pass}</Tag> },
                  { title: '模型通过线', render: (_: any, r: any) => <Tag color="blue">≥ {r.pass}</Tag> },
                  { title: '实际得分', dataIndex: 'actualValue', render: (v: number) => <b>{v}</b> },
                ]}
              />
            </div>
          )}

          <Divider orientation="left" style={{ margin: '8px 0 12px', fontSize: 12 }} plain>
            模型原始文本（一字未改，可直接对证）
          </Divider>

          <div className="model-raw-text">{record.modelOutput.rawText}</div>
        </div>

        <div className="detail-panel">
          <div className="detail-panel-title">
            <Space>
              <ClockCircleOutlined style={{ color: '#722ed1' }} />
              ② 处理记录（时间线）
            </Space>
            <Tag style={{ fontSize: 11 }}>共 {record.processLogs.length} 条</Tag>
          </div>

          <Timeline
            className="log-timeline"
            items={record.processLogs.map((log, idx) => ({
              color: idx === record.processLogs.length - 1 ? 'blue' :
                     /auto/.test(log.action) ? 'gray' :
                     /manual|overruled/.test(log.action) ? 'purple' : 'green',
              dot: /auto/.test(log.action) ? <RobotOutlined /> : <UserOutlined />,
              children: (
                <div style={{ paddingBottom: idx === record.processLogs.length - 1 ? 0 : 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <b>{log.actionLabel}</b>
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{log.timestamp.slice(5)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', marginBottom: 4 }}>
                    操作人：{log.operator}
                    {log.fromStatus && (
                      <span style={{ marginLeft: 12 }}>
                        {STATUS_MAP[log.fromStatus as AttributeStatus]?.label || '—'}
                        <SwapOutlined style={{ margin: '0 4px' }} />
                        {STATUS_MAP[log.toStatus as AttributeStatus]?.label}
                      </span>
                    )}
                  </div>
                  {log.comment && (
                    <div style={{
                      background: '#fafafa',
                      padding: '6px 10px',
                      borderRadius: 4,
                      borderLeft: '3px solid #1677ff',
                      fontSize: 12,
                      color: 'rgba(0,0,0,0.75)',
                    }}>
                      💬 {log.comment}
                    </div>
                  )}
                </div>
              ),
            }))}
          />

          {record.exceptionNote && (
            <>
              <Divider orientation="left" style={{ margin: '8px 0 12px', fontSize: 12 }} plain>
                异常队列备注
              </Divider>
              <div style={{
                background: record.exceptionStatus === 'pending_material' ? '#fffbe6' :
                            record.exceptionStatus === 'manual_overruled' ? '#f9f0ff' : '#f6ffed',
                padding: '10px 14px',
                borderRadius: 6,
                fontSize: 13,
                border: `1px solid ${record.exceptionStatus === 'pending_material' ? '#ffe58f' :
                          record.exceptionStatus === 'manual_overruled' ? '#d3adf7' : '#b7eb8f'}`,
              }}>
                <FileTextOutlined style={{
                  color: record.exceptionStatus === 'pending_material' ? '#d48806' :
                         record.exceptionStatus === 'manual_overruled' ? '#531dab' : '#389e0d',
                  marginRight: 6,
                }} />
                {record.exceptionNote}
              </div>
            </>
          )}
        </div>

        <div className="detail-panel">
          <div className="detail-panel-title">
            <Space>
              <StatusIcon style={{ color:
                finalStatus.color === 'success' ? '#52c41a' :
                finalStatus.color === 'warning' ? '#faad14' :
                finalStatus.color === 'error' ? '#ff4d4f' : 'rgba(0,0,0,0.55)'
              }} />
              ③ 最终结论
            </Space>
            <Space>
              {record.finalConclusion.isManualOverride ? (
                <Tag color="purple" style={{ fontSize: 11 }}>人工决定</Tag>
              ) : (
                <Tag color="blue" style={{ fontSize: 11 }}>模型自动</Tag>
              )}
            </Space>
          </div>

          <Result
            status={finalStatus.color === 'success' ? 'success' :
                    finalStatus.color === 'warning' ? 'warning' :
                    finalStatus.color === 'error' ? 'error' : 'info'}
            title={`${finalStatus.label}（综合分 ${record.overallScore}）`}
            subTitle={finalStatus.desc}
            style={{ padding: 0 }}
          />

          <Descriptions size="small" column={1} bordered style={{ marginTop: -8 }}>
            <Descriptions.Item label="结论说明">
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>{record.finalConclusion.conclusionText}</div>
            </Descriptions.Item>
            <Descriptions.Item label="裁决时间">{record.finalConclusion.decidedAt}</Descriptions.Item>
            <Descriptions.Item label="裁决人">
              {/模型/.test(record.finalConclusion.decidedBy)
                ? <span><RobotOutlined style={{ marginRight: 4 }} />{record.finalConclusion.decidedBy}</span>
                : <span><UserOutlined style={{ marginRight: 4 }} />{record.finalConclusion.decidedBy}</span>}
            </Descriptions.Item>
            <Descriptions.Item label="人工改判">
              {record.finalConclusion.isManualOverride
                ? <Tag color="purple">是 · 原因为：{record.processLogs.find(l => /overruled/.test(l.action))?.comment}</Tag>
                : <Tag color="default">否，纯模型判定</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="异常队列">
              {record.exceptionStatus
                ? exceptionTag
                : <span style={{ color: 'rgba(0,0,0,0.35)' }}>未入队</span>}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left" style={{ margin: '14px 0 10px', fontSize: 12 }} plain>
            各属性结论明细（可与左栏模型输出逐列对证）
          </Divider>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {record.attributes.map(a => {
              const s = STATUS_MAP[a.status as AttributeStatus];
              const t = record.modelOutput.thresholdsApplied[a.name];
              const AIcon = s.icon;
              return (
                <div
                  key={a.name}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: a.status === 'pass' ? '#f6ffed' :
                               a.status === 'warning' ? '#fffbe6' : '#fff1f0',
                    border: `1px solid ${a.status === 'pass' ? '#b7eb8f' :
                              a.status === 'warning' ? '#ffe58f' : '#ffccc7'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <Space size={6}>
                      <AIcon style={{ color: s.color === 'success' ? '#52c41a' : s.color === 'warning' ? '#faad14' : '#ff4d4f' }} />
                      <span style={{ fontWeight: 500 }}>{a.name}</span>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>权重 {Math.round(a.weight * 100)}%</span>
                    </Space>
                    {t.driftComparedTo && (
                      <div style={{ fontSize: 10, color: '#cf1322', marginTop: 2, marginLeft: 20 }}>
                        ⚠️ {t.driftComparedTo}
                      </div>
                    )}
                  </div>
                  <Space>
                    <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)' }}>
                      通≥{t.pass}/警≥{t.warning}
                    </span>
                    <Tag color={s.color} style={{ fontSize: 14, margin: 0 }}>{a.score} · {s.label}</Tag>
                  </Space>
                </div>
              );
            })}
          </div>

          <Divider orientation="left" style={{ margin: '14px 0 10px', fontSize: 12 }} plain>
            可追溯 · 可对证 · 三栏合一
          </Divider>
          <div style={{
            fontSize: 12,
            color: 'rgba(0,0,0,0.65)',
            padding: 10,
            background: '#fafafa',
            borderRadius: 6,
            lineHeight: 1.8,
          }}>
            ✅ 左栏<mark style={{ background: '#e6f4ff', padding: '0 4px' }}>模型输出</mark>含原始文本+实际阈值，可核对"模型到底说了什么"
            <br />
            ✅ 中栏<mark style={{ background: '#f9f0ff', padding: '0 4px' }}>处理记录</mark>时间线完整，可追溯"谁、何时、做了什么操作"
            <br />
            ✅ 右栏<mark style={{ background: '#f6ffed', padding: '0 4px' }}>最终结论</mark>明确裁决来源与依据，可与异常队列互相对应
          </div>
        </div>
      </div>

      <Card className="section-card" size="small" style={{ marginTop: 16 }} title={
        <Space>
          <InfoCircleOutlined style={{ color: '#1677ff' }} />
          附录：本批次使用的阈值规则（含变更历史，供对证）
        </Space>
      }>
        <Table
          size="small"
          rowKey="attributeName"
          dataSource={thresholdRules as unknown as ThresholdRule[]}
          pagination={false}
          expandable={{
            expandedRowRender: (r) => (
              <Table
                size="small"
                dataSource={r.changeLog}
                rowKey="version"
                pagination={false}
                columns={[
                  { title: '版本', dataIndex: 'version', width: 80 },
                  { title: '生效日期', dataIndex: 'date', width: 100 },
                  { title: '变更人', dataIndex: 'changedBy', width: 100 },
                  { title: '通过线调整', render: (_: any, c: any) => `${c.fromPass} → <b style="color:#1677ff">${c.toPass}</b>` },
                  { title: '预警线调整', render: (_: any, c: any) => `${c.fromWarning} → <b style="color:#1677ff">${c.toWarning}</b>` },
                  { title: '变更原因', dataIndex: 'reason' },
                ]}
              />
            ),
            rowExpandable: () => true,
            defaultExpandAllRows: true,
          }}
          columns={[
            { title: '属性名称', dataIndex: 'attributeName', width: 120 },
            { title: '当前版本', dataIndex: 'version', width: 90 },
            { title: '生效日期', dataIndex: 'effectiveFrom', width: 100 },
            { title: '通过线', render: (_: any, r: any) => <Tag color="green">≥ {r.pass}</Tag> },
            { title: '预警线', render: (_: any, r: any) => <Tag color="orange">≥ {r.warning}</Tag> },
            { title: '权重', render: (_: any, r: any) => <span>{Math.round(r.weight * 100)}%</span> },
            { title: '变更次数', render: (_: any, r: any) => <Tag>{r.changeLog.length} 次</Tag> },
          ]}
        />
      </Card>
    </div>
  );
};

export default RecordDetail;
