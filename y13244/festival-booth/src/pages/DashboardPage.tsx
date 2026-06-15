import { useEffect, useState, useMemo } from 'react';
import { Row, Col, Card, Statistic, Progress, List, Tag, Button, Space, App as AntdApp } from 'antd';
import {
  CheckCircleOutlined, WarningOutlined, ClockCircleOutlined,
  FileExcelOutlined, TeamOutlined, TrophyOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { festivalStore, settlementStore, exceptionStore, trackStore, progressStore, studentStore } from '../services/storage';
import { exportFestivalSettlementToExcel, exportSchedulerChecklist } from '../services/exportService';
import type { BoothSettlement, ExceptionQueueItem } from '../types';

const STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  aligned: 'success',
  exception: 'error',
  manual_review: 'orange',
  confirmed: 'green',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理', aligned: '已对齐', exception: '有异常',
  manual_review: '待人工复核', confirmed: '已确认',
};

export default function DashboardPage({ blockedFeatures, authRefresh }: { blockedFeatures: string[]; authRefresh: () => void }) {
  const festival = festivalStore.get();
  const [settlements, setSettlements] = useState<BoothSettlement[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionQueueItem[]>([]);
  const { message } = AntdApp.useApp();

  useEffect(() => {
    setSettlements(settlementStore.getAll());
    setExceptions(exceptionStore.getAll());
  }, []);

  const stats = useMemo(() => {
    const alignedCount = settlements.filter(s => s.status === 'aligned' || s.status === 'confirmed').length;
    const exceptionCount = settlements.filter(s => s.status === 'exception' || s.status === 'manual_review').length;
    const pendingEvidence = exceptions.filter(e => e.status === 'pending_evidence').length;
    const manualOverride = exceptions.filter(e => e.isManualOverride).length;
    const totalRevenue = settlements.reduce((s, x) => s + x.actualRevenue, 0);
    const totalShare = settlements.reduce((s, x) => s + x.actualShare, 0);
    const processRate = settlements.length === 0 ? 0 : Math.round((alignedCount / settlements.length) * 100);
    return { alignedCount, exceptionCount, pendingEvidence, manualOverride, totalRevenue, totalShare, processRate };
  }, [settlements, exceptions]);

  const topStudents = useMemo(() => {
    return studentStore.getAll()
      .map(s => {
        const p = progressStore.getLatestByStudentId(s.id);
        return { student: s, progress: p };
      })
      .filter(x => x.progress)
      .sort((a, b) => b.progress!.overallChange - a.progress!.overallChange)
      .slice(0, 4);
  }, []);

  const handleExportFull = () => {
    if (blockedFeatures.includes('excel_export')) {
      message.error('授权已到期，导出功能被锁定，请先续费');
      return;
    }
    exportFestivalSettlementToExcel(festival.id, settlements.map(s => s.id), {}, { includeProgress: true });
    message.success('分账对齐完整清单已导出（含学生进步报告）');
  };

  const handleExportScheduler = () => {
    if (blockedFeatures.includes('excel_export')) {
      message.error('授权已到期，导出功能被锁定，请先续费');
      return;
    }
    exportSchedulerChecklist(festival.id);
    message.success('排班同事专用检查清单已导出');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="card-shadow" size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>🎪 {festival.name}</div>
            <div style={{ color: '#8c8c8c', fontSize: 13 }}>
              {festival.date} · {festival.venue} · 主办：{festival.organizer}
            </div>
          </div>
          <Space>
            <Button icon={<FileExcelOutlined />} onClick={handleExportFull} type="primary">
              导出完整分账对齐清单
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={handleExportScheduler}>
              导出排班检查清单
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card className="stat-card card-shadow">
            <Statistic
              title="分账处理进度"
              value={stats.processRate}
              suffix="%"
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
            />
            <Progress percent={stats.processRate} showInfo={false} status={stats.processRate >= 80 ? 'success' : 'active'} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card card-shadow">
            <Statistic
              title="已对齐/已确认"
              value={stats.alignedCount}
              suffix={`/ ${settlements.length}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              总营收 ¥{stats.totalRevenue.toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card card-shadow">
            <Statistic
              title="异常待处理"
              value={stats.exceptionCount}
              valueStyle={{ color: stats.exceptionCount > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={<WarningOutlined />}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              其中 {stats.manualOverride} 条是人工改判
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card card-shadow">
            <Statistic
              title="待补证据材料"
              value={stats.pendingEvidence}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              已确认分账 ¥{stats.totalShare.toLocaleString()}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}>
          <Card className="card-shadow" title={<span className="section-title">曲目表执行情况（{trackStore.getAll().length} 条）</span>}>
            <List
              size="small"
              dataSource={trackStore.getAll()}
              renderItem={t => (
                <List.Item
                  actions={[
                    <Tag color={STATUS_COLOR[t.status]} key="s">{STATUS_LABEL[t.status]}</Tag>,
                    <span key="time" style={{ color: '#8c8c8c', fontSize: 12 }}>{t.scheduledTime}</span>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<div style={{ fontSize: 20 }}>🎼</div>}
                    title={<b>{t.name}</b>}
                    description={
                      <span>
                        {t.stage} · {t.durationMinutes}分钟 · 难度：{t.difficulty} ·
                        参演学生 {t.studentIds.length} 人
                        {t.notes && <span style={{ color: '#faad14' }}> · ⚠️ {t.notes}</span>}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card className="card-shadow" title={<span className="section-title">本周期进步最快的学生</span>}>
            <List
              size="small"
              dataSource={topStudents}
              renderItem={(item, idx) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: idx === 0 ? '#faad14' : idx === 1 ? '#bfbfbf' : idx === 2 ? '#d48806' : '#d9d9d9',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14
                    }}>{idx + 1}</div>}
                    title={
                      <Space>
                        <span><b>{item.student.name}</b></span>
                        <Tag color="purple">{item.student.instrument}</Tag>
                        <Tag color="blue">{item.student.grade}</Tag>
                      </Space>
                    }
                    description={
                      <span style={{ color: '#52c41a', fontWeight: 500 }}>
                        +{item.progress!.overallChange} 分 · {item.progress!.highlights[0]}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
            {topStudents.length === 0 && (
              <div className="empty-center" style={{ color: '#8c8c8c' }}>暂无学生进步数据</div>
            )}
          </Card>
        </Col>
      </Row>

      <Card className="card-shadow" title={<span className="section-title">最近需要关注的异常（人话版，直接给同事看也行）</span>}>
        {exceptions.slice(0, 3).map(e => (
          <div key={e.id} style={{
            padding: 16, marginBottom: 12, borderRadius: 6,
            background: e.isManualOverride ? '#fff1f0' : e.status === 'pending_evidence' ? '#fff7e6' : '#f9f0ff',
            border: `1px solid ${e.isManualOverride ? '#ffa39e' : e.status === 'pending_evidence' ? '#ffd591' : '#d3adf7'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Space>
                <Tag color={e.severity === 'high' ? 'red' : e.severity === 'medium' ? 'orange' : 'blue'}>
                  {e.severity === 'high' ? '严重' : e.severity === 'medium' ? '中度' : '轻度'}
                </Tag>
                {e.isManualOverride && <Tag color="red" icon={<ExclamationCircleOutlined />}>人工改判</Tag>}
                <b>{e.reportedBy}</b> · {e.reportedAt}
              </Space>
              <Space>
                <Tag color={e.status === 'resolved' ? 'green' : e.status === 'pending_evidence' ? 'orange' : 'processing'}>
                  {e.status === 'open' ? '待处理' : e.status === 'investigating' ? '处理中' : e.status === 'pending_evidence' ? '等补证据' : '已解决'}
                </Tag>
              </Space>
            </div>
            <div className="plain-text-reason" style={{ marginBottom: 8 }}>
              <b>什么情况：</b>{e.humanReason}
            </div>
            <div className="plain-text-reason" style={{ color: '#722ed1' }}>
              <b>下一步：</b>{e.nextStep}
            </div>
            {e.evidenceRequired && e.evidenceRequired.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#595959' }}>
                <b>需要补齐的材料：</b>
                {e.evidenceRequired.map(r => {
                  const done = (e.evidenceProvided || []).includes(r);
                  return (
                    <Tag key={r} color={done ? 'success' : 'warning'} style={{ marginTop: 4 }}>
                      {done ? '✅ ' : '⏳ '}{r}
                    </Tag>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </Card>
    </Space>
  );
}
