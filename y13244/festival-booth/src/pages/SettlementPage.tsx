import { useEffect, useState, useMemo } from 'react';
import {
  Card, Table, Tag, Button, Space, InputNumber, Modal, Form, Input, Select,
  Tooltip, Row, Col, Descriptions, Progress, App as AntdApp
} from 'antd';
import {
  FileExcelOutlined, ReloadOutlined, EditOutlined,
  SearchOutlined, InfoCircleOutlined, CheckCircleOutlined,
  WarningOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { BoothSettlement, BoothType, SettlementStatus } from '../types';
import { settlementStore, exceptionStore, boothStore, trackStore, festivalStore, schedulerStore } from '../services/storage';
import { runFullAlignmentForFestival, confirmManualAdjustment, checkSettlementAlignment } from '../services/settlementEngine';
import { exportFestivalSettlementToExcel } from '../services/exportService';

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '待处理', color: 'default', icon: null },
  aligned: { label: '已对齐', color: 'green', icon: <CheckCircleOutlined /> },
  exception: { label: '有异常', color: 'red', icon: <WarningOutlined /> },
  manual_review: { label: '待人工复核', color: 'orange', icon: <ExclamationCircleOutlined /> },
  confirmed: { label: '已确认', color: 'purple', icon: <CheckCircleOutlined /> },
};

const BOOTH_TYPE_LABEL: Record<BoothType, string> = {
  food: '餐饮小吃', merchandise: '文创周边', experience: '互动体验', sponsor: '赞助冠名',
};

export default function SettlementPage({ blockedFeatures, authRefresh }: { blockedFeatures: string[]; authRefresh: () => void }) {
  const festival = festivalStore.get();
  const [settlements, setSettlements] = useState<BoothSettlement[]>([]);
  const [running, setRunning] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SettlementStatus[] | undefined>();
  const [filterBoothType, setFilterBoothType] = useState<BoothType | undefined>();
  const [minRevenue, setMinRevenue] = useState<number | undefined>();
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; record: BoothSettlement | null }>({ open: false, record: null });
  const [form] = Form.useForm();
  const { message, modal } = AntdApp.useApp();

  const refresh = () => {
    setSettlements(settlementStore.getAll());
  };
  useEffect(refresh, []);

  const filterSnapshot = useMemo(() => {
    const snap: Record<string, any> = {};
    if (filterStatus && filterStatus.length) snap.status = filterStatus.join(',');
    if (filterBoothType) snap.boothType = filterBoothType;
    if (minRevenue !== undefined) snap.minRevenue = minRevenue;
    return snap;
  }, [filterStatus, filterBoothType, minRevenue]);

  const visibleSettlements = useMemo(() => {
    return settlements.filter(s => {
      if (filterStatus && filterStatus.length && !filterStatus.includes(s.status)) return false;
      if (filterBoothType) {
        const b = boothStore.getById(s.boothId);
        if (b?.type !== filterBoothType) return false;
      }
      if (minRevenue !== undefined && s.actualRevenue < minRevenue) return false;
      return true;
    });
  }, [settlements, filterStatus, filterBoothType, minRevenue]);

  const totalStats = useMemo(() => {
    const total = settlements.length;
    const aligned = settlements.filter(s => s.status === 'aligned' || s.status === 'confirmed').length;
    const exception = settlements.filter(s => s.status === 'exception' || s.status === 'manual_review').length;
    const pct = total === 0 ? 0 : Math.round((aligned / total) * 100);
    return { total, aligned, exception, pct };
  }, [settlements]);

  const handleRunAlignment = () => {
    if (blockedFeatures.includes('rerun_alignment')) {
      message.error('授权已到期，重新计算功能被锁定');
      return;
    }
    modal.confirm({
      title: '重新跑一遍分账对齐？',
      icon: <ReloadOutlined />,
      content: (
        <div>
          <p>会基于当前摊位营收数据，重新计算每一条分账，并自动检测异常。</p>
          <p style={{ color: '#faad14' }}>⚠️ 已有的人工改判记录会保留，不会被覆盖。</p>
        </div>
      ),
      okText: '开始重新计算',
      onOk: () => {
        setRunning(true);
        setTimeout(() => {
          const { updatedSettlements, newExceptions } = runFullAlignmentForFestival(festival.id, filterSnapshot);
          setSettlements(settlementStore.getAll());
          schedulerStore.update('sv001', {
            processedCount: updatedSettlements.filter(s => s.status === 'aligned' || s.status === 'confirmed').length,
            totalCount: updatedSettlements.length,
            pendingEvidenceCount: exceptionStore.getAll().filter(e => e.status === 'pending_evidence').length,
            exceptionCount: exceptionStore.getAll().filter(e => e.status !== 'resolved').length,
            status: newExceptions.length > 0 ? 'needs_attention' : 'completed',
            lastRunAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          });
          setRunning(false);
          message.success(`分账对齐完成：更新 ${updatedSettlements.length} 条，新增 ${newExceptions.length} 条异常`);
        }, 1000);
      },
    });
  };

  const handleExport = () => {
    if (blockedFeatures.includes('excel_export')) {
      message.error('授权已到期，导出功能被锁定，请先续费');
      return;
    }
    exportFestivalSettlementToExcel(
      festival.id,
      visibleSettlements.map(s => s.id),
      filterSnapshot,
      { includeProgress: true }
    );
    message.success(`已导出 ${visibleSettlements.length} 条分账记录（含当前筛选口径）`);
  };

  const openManualConfirm = (record: BoothSettlement) => {
    if (blockedFeatures.includes('manual_confirm')) {
      message.error('授权已到期，人工确认功能被锁定');
      return;
    }
    form.setFieldsValue({
      actualShare: record.actualShare,
      reason: '',
      confirmer: '林姐',
    });
    setConfirmModal({ open: true, record });
  };

  const handleConfirmSubmit = async () => {
    const values = await form.validateFields();
    if (!confirmModal.record) return;

    const sys = checkSettlementAlignment(confirmModal.record);
    const diff = values.actualShare - confirmModal.record.systemCalculatedShare;

    modal.confirm({
      title: '确认人工改判这笔分账？',
      icon: <ExclamationCircleOutlined />,
      okType: 'danger',
      okText: '确认人工改判',
      content: (
        <div style={{ lineHeight: 1.8 }}>
          <p>
            系统计算分账：<b>¥{confirmModal.record.systemCalculatedShare.toFixed(2)}</b><br />
            人工确认分账：<b style={{ color: '#ff4d4f' }}>¥{Number(values.actualShare).toFixed(2)}</b><br />
            差额：<b style={{ color: diff >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(2)} 元
            </b>
          </p>
          <p style={{ color: '#faad14' }}>
            ⚠️ 确认后会在异常队列中留下"人工改判"永久痕迹，导出时也会标红，无法撤销。
          </p>
          <p><b>改判原因：</b>{values.reason || '（未填）'}</p>
          <p><b>确认人：</b>{values.confirmer}</p>
        </div>
      ),
      onOk: () => {
        confirmManualAdjustment(confirmModal.record!.id, values.actualShare, values.reason, values.confirmer);
        setConfirmModal({ open: false, record: null });
        refresh();
        authRefresh();
        message.success('人工改判已生效，异常队列已同步更新痕迹');
      },
    });
  };

  const columns: ColumnsType<BoothSettlement> = [
    {
      title: '摊位/曲目', key: 'info', width: 260,
      render: (_, r) => {
        const booth = boothStore.getById(r.boothId);
        const track = trackStore.getById(r.trackId);
        return (
          <div>
            <div><b>{booth?.name}</b> <Tag>{BOOTH_TYPE_LABEL[booth?.type || 'merchandise']}</Tag></div>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 2 }}>{track?.name}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.operatorName}</div>
          </div>
        );
      },
    },
    {
      title: '实际营收', dataIndex: 'actualRevenue', key: 'revenue', width: 110, align: 'right',
      render: v => <b>¥{v.toFixed(2)}</b>,
      sorter: (a, b) => a.actualRevenue - b.actualRevenue,
    },
    {
      title: '系统计算分账', dataIndex: 'systemCalculatedShare', key: 'sys', width: 120, align: 'right',
      render: v => <span style={{ color: '#595959' }}>¥{v.toFixed(2)}</span>,
    },
    {
      title: '实际分账', dataIndex: 'actualShare', key: 'actual', width: 120, align: 'right',
      render: (v, r) => {
        const diff = v - r.systemCalculatedShare;
        return (
          <div>
            <b>¥{v.toFixed(2)}</b>
            {Math.abs(diff) > 1 && (
              <div style={{ fontSize: 11, color: diff >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '分成明细（学生/老师/摊位/平台）', key: 'breakdown', width: 260,
      render: (_, r) => (
        <div style={{ fontSize: 12, lineHeight: 1.8 }}>
          <div><Tag color="purple">学生</Tag>¥{r.studentShare.toFixed(2)}</div>
          <div><Tag color="blue">老师</Tag>¥{r.teacherShare.toFixed(2)}</div>
          <div><Tag color="cyan">摊位</Tag>¥{r.boothShare.toFixed(2)}</div>
          <div><Tag color="default">平台</Tag>¥{r.platformShare.toFixed(2)}</div>
        </div>
      ),
    },
    {
      title: '对齐状态', dataIndex: 'status', key: 'status', width: 120,
      render: s => {
        const cfg = STATUS_CFG[s] || STATUS_CFG.pending;
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        );
      },
      filters: [
        { text: '已对齐', value: 'aligned' },
        { text: '有异常', value: 'exception' },
        { text: '待人工复核', value: 'manual_review' },
        { text: '已确认', value: 'confirmed' },
      ],
      onFilter: (v, r) => r.status === v,
    },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openManualConfirm(r)}
            type={r.status === 'manual_review' ? 'primary' : 'default'}
            danger={r.status === 'manual_review'}
          >
            {r.status === 'manual_review' ? '人工确认' : '改判'}
          </Button>
          <Tooltip title="查看对齐情况">
            <Button size="small" icon={<InfoCircleOutlined />} onClick={() => {
              const info = checkSettlementAlignment(r);
              const booth = boothStore.getById(r.boothId);
              const track = trackStore.getById(r.trackId);
              modal.info({
                title: '分账对齐详情',
                width: 520,
                content: (
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="摊位/曲目">{booth?.name} / {track?.name}</Descriptions.Item>
                    <Descriptions.Item label="营收">{r.actualRevenue.toFixed(2)} 元</Descriptions.Item>
                    <Descriptions.Item label="系统计算">{r.systemCalculatedShare.toFixed(2)} 元</Descriptions.Item>
                    <Descriptions.Item label="实际分账">{r.actualShare.toFixed(2)} 元</Descriptions.Item>
                    <Descriptions.Item label="差额">
                      <span style={{ color: info.isAligned ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                        {info.diffAmount >= 0 ? '+' : ''}{info.diffAmount.toFixed(2)} 元 ({info.diffPercentage.toFixed(2)}%)
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="对齐结果">
                      <Tag color={info.isAligned ? 'green' : 'red'}>
                        {info.isAligned ? '✅ 已对齐（在容差范围内）' : '❌ 未对齐'}
                      </Tag>
                      {info.reason && <div style={{ marginTop: 4, color: '#8c8c8c' }}>{info.reason}</div>}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              });
            }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="card-shadow" size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Progress
              type="dashboard"
              percent={totalStats.pct}
              size={90}
              strokeColor={{ '0%': '#722ed1', '100%': '#9254de' }}
            />
            <div style={{ textAlign: 'center', marginTop: -8 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{totalStats.pct}%</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>对齐完成率</div>
            </div>
          </Col>
          <Col xs={24} md={10}>
            <div style={{ marginBottom: 8 }}>
              <b>共 {totalStats.total} 条分账：</b>
              <Tag color="green" style={{ marginLeft: 8 }}>✅ 已对齐 {totalStats.aligned}</Tag>
              <Tag color="red" style={{ marginLeft: 8 }}>⚠️ 异常/待处理 {totalStats.exception}</Tag>
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              导出的 Excel 会和下方屏幕上的数字完全一致，当前筛选口径也会写进导出文件的说明页。
            </div>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={running}
                onClick={handleRunAlignment}
                disabled={blockedFeatures.includes('rerun_alignment')}
              >
                重新跑一遍分账对齐
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExport}
                disabled={blockedFeatures.includes('excel_export')}
              >
                导出 Excel（含当前筛选）
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        className="card-shadow"
        size="small"
        title={<span className="section-title">摊位分账明细（{visibleSettlements.length} 条，当前筛选：{Object.keys(filterSnapshot).length === 0 ? '无' : '已启用'}）</span>}
        extra={
          <Space wrap>
            <Select
              mode="multiple"
              placeholder="按对齐状态筛选"
              style={{ minWidth: 200 }}
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
              options={Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k as SettlementStatus, label: v.label }))}
            />
            <Select
              placeholder="按摊位类型筛选"
              style={{ width: 160 }}
              allowClear
              value={filterBoothType}
              onChange={setFilterBoothType}
              options={Object.entries(BOOTH_TYPE_LABEL).map(([k, v]) => ({ value: k as BoothType, label: v }))}
            />
            <InputNumber
              placeholder="最低营收(元)"
              style={{ width: 140 }}
              value={minRevenue}
              onChange={(v) => setMinRevenue(v ?? undefined)}
              prefix={<SearchOutlined />}
            />
            <Button onClick={() => { setFilterStatus(undefined); setFilterBoothType(undefined); setMinRevenue(undefined); }}>
              清空筛选
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={visibleSettlements}
          scroll={{ x: 1200 }}
          pagination={false}
          rowClassName={r => r.status === 'manual_review' ? 'manual-override-row' : ''}
          expandable={{
            expandedRowRender: r => {
              const track = trackStore.getById(r.trackId);
              const exceptions = exceptionStore.getAll().filter(e => e.settlementId === r.id);
              return (
                <div style={{ padding: '0 24px 16px 24px' }}>
                  {exceptions.length > 0 ? (
                    exceptions.map(e => (
                      <div key={e.id} style={{
                        padding: 12, marginBottom: 8, borderRadius: 6,
                        background: e.isManualOverride ? '#fff1f0' : '#f9f0ff',
                        border: `1px solid ${e.isManualOverride ? '#ffa39e' : '#d3adf7'}`,
                      }}>
                        <Space style={{ marginBottom: 6 }}>
                          <Tag color={e.severity === 'high' ? 'red' : e.severity === 'medium' ? 'orange' : 'blue'}>
                            {e.severity === 'high' ? '严重' : e.severity === 'medium' ? '中度异常' : '轻度'}
                          </Tag>
                          {e.isManualOverride && <Tag color="red">人工改判痕迹</Tag>}
                          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                            {e.reportedBy} · {e.reportedAt}
                          </span>
                        </Space>
                        <div className="plain-text-reason" style={{ marginBottom: 4 }}>
                          <b>原因：</b>{e.humanReason}
                        </div>
                        <div className="plain-text-reason" style={{ color: '#722ed1' }}>
                          <b>下一步：</b>{e.nextStep}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#8c8c8c' }}>✅ 该条分账没有异常记录</div>
                  )}
                  {track && track.notes && (
                    <div style={{ padding: 8, background: '#fffbe6', borderRadius: 4, marginTop: 8, fontSize: 13 }}>
                      📝 曲目备注：{track.notes}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
      </Card>

      <Modal
        open={confirmModal.open}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>人工确认 / 改判分账金额</span>
          </Space>
        }
        onCancel={() => setConfirmModal({ open: false, record: null })}
        footer={[
          <Button key="cancel" onClick={() => setConfirmModal({ open: false, record: null })}>取消</Button>,
          <Button key="ok" type="primary" danger onClick={handleConfirmSubmit}>提交确认</Button>,
        ]}
        width={560}
      >
        {confirmModal.record && (
          <div style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="摊位">
                {boothStore.getById(confirmModal.record.boothId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="曲目">
                {trackStore.getById(confirmModal.record.trackId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="实际营收">¥{confirmModal.record.actualRevenue.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="系统计算分账">
                <b>¥{confirmModal.record.systemCalculatedShare.toFixed(2)}</b>
              </Descriptions.Item>
            </Descriptions>
            <Form form={form} layout="vertical">
              <Form.Item
                label="人工确认后的实际分账金额（元）"
                name="actualShare"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} precision={2} step={100} />
              </Form.Item>
              <Form.Item
                label="改判原因（写清楚，会附在导出清单里给演出/发行同事看）"
                name="reason"
                rules={[{ required: true, message: '请填写改判原因，方便后续交接' }]}
                tooltip="请用人话描述，比如'老板是学生家长，现场口头答应加800鼓励奖，已签字'"
              >
                <Input.TextArea rows={3} placeholder="比如：冠名商老板是学生家长，现场口头答应给压轴节目额外加800块鼓励奖，林姐已签字确认" />
              </Form.Item>
              <Form.Item label="确认人" name="confirmer" rules={[{ required: true }]}>
                <Select options={[
                  { value: '林姐（音乐老师）', label: '林姐（音乐老师）' },
                  { value: '财务-刘姐', label: '财务-刘姐' },
                  { value: '排班-小赵', label: '排班-小赵' },
                ]} />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </Space>
  );
}
