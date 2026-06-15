import { useEffect, useState, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, List, Tag, Button, Space, Tooltip,
  Progress, Modal, Steps, App as AntdApp, Empty
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
  WarningOutlined, FileExcelOutlined, FolderOpenOutlined,
  QuestionCircleOutlined, FileSearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { SchedulerViewItem, BoothSettlement, ExceptionQueueItem } from '../types';
import { schedulerStore, settlementStore, exceptionStore, festivalStore, boothStore, trackStore } from '../services/storage';
import { runFullAlignmentForFestival } from '../services/settlementEngine';
import { exportSchedulerChecklist } from '../services/exportService';

export default function SchedulerPage({ blockedFeatures }: { blockedFeatures: string[] }) {
  const festival = festivalStore.get();
  const [items, setItems] = useState<SchedulerViewItem[]>([]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<null | { ok: number; issues: number; evidence: number }>(null);
  const { message, modal } = AntdApp.useApp();

  useEffect(() => {
    const all = schedulerStore.getAll();
    if (all.length === 0) {
      const settlements = settlementStore.getAll();
      const exceptions = exceptionStore.getAll();
      schedulerStore.setAll([{
        id: 'sv001', festivalId: festival.id, festivalName: festival.name,
        processedCount: settlements.filter(s => s.status === 'aligned' || s.status === 'confirmed').length,
        totalCount: settlements.length,
        pendingEvidenceCount: exceptions.filter(e => e.status === 'pending_evidence').length,
        exceptionCount: exceptions.filter(e => e.status !== 'resolved').length,
        status: exceptions.some(e => e.status !== 'resolved') ? 'needs_attention' : 'completed',
        lastRunAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      }]);
    }
    setItems(schedulerStore.getAll());
  }, [festival.id, festival.name]);

  const currentItem = items[0];
  const settlements = useMemo(() => settlementStore.getAll(), [items]);
  const exceptions = useMemo(() => exceptionStore.getAll(), [items]);

  const checklist = useMemo(() => {
    return settlements.map(s => {
      const booth = boothStore.getById(s.boothId);
      const track = trackStore.getById(s.trackId);
      const pendingEx = exceptions.filter(e => e.settlementId === s.id && e.status !== 'resolved');
      const evidenceNeeded = pendingEx.some(e => e.status === 'pending_evidence');
      const evidenceList = pendingEx
        .flatMap(e => (e.evidenceRequired || []).filter(r => !(e.evidenceProvided || []).includes(r)));
      const issueReasons = pendingEx.map(e => e.humanReason);
      const isDone = s.status === 'aligned' || s.status === 'confirmed';
      return {
        id: s.id,
        boothName: booth?.name || '',
        operator: s.operatorName,
        trackName: track?.name || '',
        status: s.status,
        isDone,
        evidenceNeeded,
        evidenceList,
        issueReasons,
        exceptionCount: pendingEx.length,
      };
    });
  }, [settlements, exceptions]);

  const handleRunFullCheck = () => {
    modal.confirm({
      title: '彩排进场前，跑一遍分账检查？',
      icon: <PlayCircleOutlined style={{ color: '#722ed1' }} />,
      content: (
        <div style={{ lineHeight: 1.8 }}>
          <p>系统会自动：</p>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            <li>✅ 检查每条分账有没有对齐</li>
            <li>🔍 扫出异常和缺失的证据</li>
            <li>📋 生成"已处理/待处理"清单</li>
          </ol>
          <p style={{ marginTop: 12, color: '#faad14' }}>
            跑一遍大概 5-10 秒，跑完会告诉你哪几条还要补材料。
          </p>
        </div>
      ),
      okText: '开始跑检查',
      onOk: () => {
        setRunning(true);
        setTimeout(() => {
          const { updatedSettlements, newExceptions } = runFullAlignmentForFestival(festival.id, { runBy: 'scheduler' });
          const processed = updatedSettlements.filter(s => s.status === 'aligned' || s.status === 'confirmed').length;
          const pendingEvidence = exceptionStore.getAll().filter(e => e.status === 'pending_evidence').length;
          const exceptionNum = exceptionStore.getAll().filter(e => e.status !== 'resolved').length;
          schedulerStore.update(currentItem.id, {
            processedCount: processed,
            totalCount: updatedSettlements.length,
            pendingEvidenceCount: pendingEvidence,
            exceptionCount: exceptionNum,
            status: exceptionNum > 0 ? 'needs_attention' : 'completed',
            lastRunAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          });
          setItems(schedulerStore.getAll());
          setRunResult({ ok: processed, issues: exceptionNum, evidence: pendingEvidence });
          setRunning(false);
          message.success('检查完成，结果就在下方');
        }, 1800);
      },
    });
  };

  const handleShowMaterialsGuide = () => {
    modal.info({
      title: '📁 证据材料应该放哪儿？',
      width: 600,
      content: (
        <div style={{ lineHeight: 1.9 }}>
          <p><b>方法一（推荐）：直接在系统里上传</b></p>
          <p style={{ marginLeft: 16, color: '#8c8c8c' }}>
            左侧菜单 → 异常队列 → 找到对应那一行 → 点「补材料」按钮 → 选择对应材料上传即可。
            系统会自动记谁、什么时候传的，导出时一起带走。
          </p>
          <p><b>方法二：共享文件夹（临时方案）</b></p>
          <div style={{ marginLeft: 16, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
            <div>📂 路径：<code>共享盘 → 2026夏日星光音乐节 → 04_分账证据材料 → 按摊位名建子文件夹</code></div>
            <div style={{ marginTop: 8 }}>文件夹命名规则：<code>摊位编号_摊位名称</code>，例如 <code>b001_星光文创摊位</code></div>
            <div style={{ marginTop: 8, color: '#faad14' }}>
              ⚠️ 放共享盘的话，请记得在系统里的异常记录「更新状态」里备注一下路径，不然同事找不到哦。
            </div>
          </div>
          <p style={{ marginTop: 16 }}><b>需要补的常见材料清单：</b></p>
          <ul style={{ paddingLeft: 20 }}>
            <li>当日营收小票/扫码流水截图</li>
            <li>现金收款的盘点表签字页</li>
            <li>退款/改判的纸质确认单（需林姐或财务签字）</li>
            <li>和摊主/冠名商的微信沟通记录截图</li>
          </ul>
        </div>
      ),
    });
  };

  const processPct = currentItem ? Math.round((currentItem.processedCount / currentItem.totalCount) * 100) : 0;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        className="card-shadow"
        style={{
          background: processPct === 100 && currentItem?.exceptionCount === 0
            ? 'linear-gradient(135deg, #f6ffed, #d9f7be)'
            : 'linear-gradient(135deg, #fff7e6, #ffe7ba)',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              👋 嗨，排班同事，这里是专门给你看的页面！
            </div>
            <div style={{ color: '#595959', lineHeight: 1.8 }}>
              你不用管分账怎么算的，只需要看下面两件事：
              <ol style={{ margin: '8px 0 0 0', paddingLeft: 24 }}>
                <li>✅ 哪些分账 <b>已经处理完</b>（绿色打勾的）</li>
                <li>📎 哪些还 <b>缺证据/有异常</b>，要找谁补（列在下面了）</li>
              </ol>
            </div>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleRunFullCheck}
                loading={running}
                block
              >
                一键跑一遍分账检查（彩排前必做）
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => {
                  if (blockedFeatures.includes('excel_export')) {
                    message.error('授权已到期，导出被锁定');
                    return;
                  }
                  exportSchedulerChecklist(festival.id);
                  message.success('检查清单已导出，打印出来签字就行');
                }}
                block
              >
                导出打印版检查清单
              </Button>
              <Tooltip title="点我看证据材料放哪里">
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={handleShowMaterialsGuide}
                  block
                >
                  证据材料放哪？点我看
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {currentItem && (
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Card className="stat-card card-shadow">
              <Statistic
                title={festival.name}
                value={processPct}
                suffix="%"
                prefix={<FileSearchOutlined style={{ color: '#722ed1' }} />}
              />
              <Progress percent={processPct} showInfo={false} status={processPct === 100 ? 'success' : 'active'} />
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                上次检查：{currentItem.lastRunAt || '还没跑过'}
              </div>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card card-shadow">
              <Statistic
                title="✅ 已处理完的分账"
                value={currentItem.processedCount}
                suffix={`/ ${currentItem.totalCount}`}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card card-shadow">
              <Statistic
                title="⚠️ 还在异常中的"
                value={currentItem.exceptionCount}
                valueStyle={{ color: currentItem.exceptionCount > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card card-shadow">
              <Statistic
                title="📎 等着补证据的"
                value={currentItem.pendingEvidenceCount}
                valueStyle={{ color: currentItem.pendingEvidenceCount > 0 ? '#faad14' : '#52c41a' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {runResult && (
        <Card
          className="card-shadow"
          style={{ borderLeft: '4px solid #722ed1' }}
          title={<b>🆕 刚刚跑完的检查结果：</b>}
          extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => setRunResult(null)}>收起</Button>}
        >
          <Steps
            direction="vertical"
            size="small"
            current={4}
            status="finish"
            items={[
              { title: `共扫描 ${runResult.ok + runResult.issues} 条分账记录` },
              { title: `其中 ${runResult.ok} 条已对齐，无需处理`, status: 'finish' },
              { title: `${runResult.issues} 条有异常，已在下方清单标红`, status: runResult.issues > 0 ? 'error' : 'finish' },
              { title: `${runResult.evidence} 条还缺证据材料，请对照下方「需要补什么」列催一下对应同事`, status: runResult.evidence > 0 ? 'process' : 'finish' },
            ]}
          />
        </Card>
      )}

      <Card
        className="card-shadow"
        size="small"
        title={
          <span className="section-title">
            分账处理清单（已处理的打勾，没搞定的会告诉你「卡在哪」「要补啥」「找谁」）
          </span>
        }
      >
        {checklist.length === 0 ? (
          <Empty description="还没有分账记录，先去「摊位分账对齐」页面跑一遍吧" />
        ) : (
          <List
            dataSource={checklist}
            renderItem={(item, idx) => (
              <List.Item
                style={{
                  padding: 16,
                  marginBottom: 8,
                  borderRadius: 6,
                  background: item.isDone ? '#f6ffed' : item.evidenceNeeded ? '#fff7e6' : '#fff1f0',
                  border: `1px solid ${item.isDone ? '#b7eb8f' : item.evidenceNeeded ? '#ffd591' : '#ffa39e'}`,
                  alignItems: 'flex-start',
                }}
              >
                <Row style={{ width: '100%' }} gutter={[16, 8]} align="top">
                  <Col xs={24} md={1} style={{ textAlign: 'center', paddingTop: 8 }}>
                    {item.isDone ? (
                      <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                    ) : item.evidenceNeeded ? (
                      <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
                    ) : (
                      <WarningOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                    )}
                    <div style={{ fontSize: 12, marginTop: 4 }}>#{idx + 1}</div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                      {item.boothName}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>
                      运营方：{item.operator}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 13 }}>
                      对应曲目：{item.trackName}
                    </div>
                  </Col>
                  <Col xs={24} md={5} style={{ textAlign: 'center' }}>
                    <Tag
                      color={item.isDone ? 'green' : item.evidenceNeeded ? 'orange' : 'red'}
                      style={{ fontSize: 14, padding: '4px 12px' }}
                    >
                      {item.isDone ? '✅ 已处理' : item.evidenceNeeded ? '⏳ 等补证据' : '⚠️ 待处理'}
                    </Tag>
                    {item.exceptionCount > 0 && (
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                        关联 {item.exceptionCount} 条异常
                      </div>
                    )}
                  </Col>
                  <Col xs={24} md={10}>
                    {!item.isDone && item.issueReasons.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                          <b>卡在哪了：</b>
                        </div>
                        {item.issueReasons.map((r, i) => (
                          <div key={i} className="plain-text-reason" style={{
                            fontSize: 13, background: 'rgba(255,255,255,0.7)',
                            padding: 6, borderRadius: 4, marginBottom: 4,
                          }}>
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.evidenceNeeded && item.evidenceList.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, color: '#d46b08', marginBottom: 4 }}>
                          <b>📎 需要补什么材料：</b>
                        </div>
                        <Space wrap>
                          {item.evidenceList.map(e => (
                            <Tag key={e} color="orange" icon={<QuestionCircleOutlined />}>
                              {e}
                            </Tag>
                          ))}
                        </Space>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                          <FolderOpenOutlined /> 补完后上传到系统（异常队列）或放到共享盘对应文件夹
                        </div>
                      </div>
                    )}
                    {item.isDone && (
                      <div style={{ color: '#389e0d', fontSize: 13 }}>
                        ✨ 这条分账已经搞定，安心过！
                      </div>
                    )}
                  </Col>
                </Row>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card className="card-shadow" size="small" style={{ background: '#fafafa' }}>
        <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 13, lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>
            💡 <b>使用小技巧：</b> 彩排进场前点上方「一键跑一遍分账检查」，
            然后对照清单一条条打勾；有不清楚的就找林姐或者财务刘姐，
            需要打印出来签字就点「导出打印版检查清单」。
          </p>
          <p style={{ margin: 0 }}>
            如果还要问「材料放哪」，点右上角 <b>「证据材料放哪？」</b> 按钮看说明。
          </p>
        </div>
      </Card>
    </Space>
  );
}
