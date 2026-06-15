import { useEffect, useState, useMemo } from 'react';
import {
  Card, Row, Col, Select, Progress, Tag, List, Button, Space,
  Divider, Empty, Descriptions, App as AntdApp
} from 'antd';
import {
  TrophyOutlined, RiseOutlined, FallOutlined,
  SmileOutlined, ThunderboltOutlined, BulbOutlined, FileTextOutlined
} from '@ant-design/icons';
import type { Student, ProgressRecord, SkillDimension } from '../types';
import { studentStore, progressStore } from '../services/storage';
import { analyzeStudentProgress, getPlainLanguageProgressReport, batchAnalyzeAllStudents } from '../services/progressEngine';

export default function ProgressPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const { message } = AntdApp.useApp();

  useEffect(() => {
    const all = studentStore.getAll();
    setStudents(all);
    if (all.length > 0) setSelectedId(all[0].id);
  }, []);

  const summary = useMemo(() => selectedId ? analyzeStudentProgress(selectedId) : null, [selectedId]);
  const latest = useMemo(() => selectedId ? progressStore.getLatestByStudentId(selectedId) : undefined, [selectedId]);
  const allSummaries = useMemo(() => batchAnalyzeAllStudents(), [students]);

  const copyPlainReport = () => {
    if (!summary) return;
    const text = getPlainLanguageProgressReport(summary);
    navigator.clipboard.writeText(text).then(
      () => message.success('人话版进步报告已复制到剪贴板，直接粘贴给家长或同事就行'),
      () => message.error('复制失败，请手动复制')
    );
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        className="card-shadow"
        size="small"
        title={<span className="section-title">选择要查看进步报告的学生</span>}
        extra={
          <Space>
            <Select
              style={{ width: 240 }}
              value={selectedId}
              onChange={setSelectedId}
              placeholder="选择学生"
              showSearch
              optionFilterProp="children"
              options={students.map(s => ({
                value: s.id,
                label: `${s.name}（${s.grade} · ${s.instrument}）`,
              }))}
            />
            {summary && (
              <Button icon={<FileTextOutlined />} onClick={copyPlainReport}>
                复制人话版报告
              </Button>
            )}
          </Space>
        }
      >
        <Row gutter={[12, 12]}>
          {allSummaries.slice(0, 8).map(s => (
            <Col xs={12} md={6} key={s.studentId}>
              <div
                onClick={() => setSelectedId(s.studentId)}
                style={{
                  padding: 12, borderRadius: 6, cursor: 'pointer',
                  background: selectedId === s.studentId ? '#f9f0ff' : '#fff',
                  border: `2px solid ${selectedId === s.studentId ? '#722ed1' : '#f0f0f0'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <b style={{ fontSize: 15 }}>{s.studentName}</b>
                  <Tag color="purple" style={{ margin: 0 }}>{s.instrument}</Tag>
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>{s.grade}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {s.overallChange >= 0 ? (
                    <RiseOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <FallOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  <span style={{
                    fontSize: 22, fontWeight: 700,
                    color: s.overallChange >= 15 ? '#52c41a' : s.overallChange >= 8 ? '#722ed1' : s.overallChange >= 0 ? '#8c8c8c' : '#ff4d4f'
                  }}>
                    {s.overallChange >= 0 ? '+' : ''}{s.overallChange}
                  </span>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>分</span>
                </div>
                {s.topImprovements.length > 0 && (
                  <div style={{ fontSize: 12, color: '#595959', marginTop: 6, lineHeight: 1.6 }}>
                    🏆 {s.topImprovements[0].dimension} 提升明显
                  </div>
                )}
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {summary ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card className="card-shadow" title={<span className="section-title">📊 综合进步概览</span>}>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 120, height: 120, borderRadius: '50%',
                  background: summary.overallChange >= 15
                    ? 'linear-gradient(135deg, #52c41a, #95de64)'
                    : summary.overallChange >= 8
                      ? 'linear-gradient(135deg, #722ed1, #b37feb)'
                      : 'linear-gradient(135deg, #8c8c8c, #bfbfbf)',
                  color: '#fff', flexDirection: 'column',
                }}>
                  <div style={{ fontSize: 36, fontWeight: 700 }}>
                    {summary.overallChange >= 0 ? '+' : ''}{summary.overallChange}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>综合提升（分）</div>
                </div>
              </div>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="学生">{summary.studentName}</Descriptions.Item>
                <Descriptions.Item label="年级">{summary.grade}</Descriptions.Item>
                <Descriptions.Item label="主修乐器">{summary.instrument}</Descriptions.Item>
                <Descriptions.Item label="测评周期">
                  {latest ? `${latest.periodStart} ~ ${latest.periodEnd}` : '暂无数据'}
                </Descriptions.Item>
              </Descriptions>

              {summary.topImprovements.length > 0 && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#52c41a' }}>
                    <TrophyOutlined /> 进步最明显的维度
                  </div>
                  {summary.topImprovements.map(t => (
                    <div key={t.dimension} className="progress-dimension-bar">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span>{t.dimension}</span>
                        <Tag color="green" style={{ margin: 0 }}>+{t.score} 分</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t.note}</div>
                    </div>
                  ))}
                </>
              )}

              {summary.biggestConcerns.length > 0 && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#faad14' }}>
                    <BulbOutlined /> 还需要加把劲的地方
                  </div>
                  {summary.biggestConcerns.map(c => (
                    <div key={c.dimension} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span>{c.dimension}</span>
                        <Tag color="orange" style={{ margin: 0 }}>当前 {c.score} 分</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>{c.note}</div>
                    </div>
                  ))}
                </>
              )}
            </Card>
          </Col>

          <Col xs={24} md={16}>
            <Card
              className="card-shadow"
              title={<span className="section-title">🎯 分维度详细成绩单（林姐一眼看懂型）</span>}
            >
              {latest ? (
                <Row gutter={[16, 16]}>
                  {latest.dimensions.map((d: SkillDimension) => {
                    const pct = Math.round((d.currentScore / d.maxScore) * 100);
                    const diff = d.currentScore - d.previousScore;
                    const prevPct = Math.round((d.previousScore / d.maxScore) * 100);
                    return (
                      <Col xs={24} md={12} key={d.key}>
                        <div style={{
                          padding: 16, borderRadius: 8,
                          background: diff >= 10 ? '#f6ffed' : diff >= 0 ? '#f9f0ff' : '#fff1f0',
                          border: `1px solid ${diff >= 10 ? '#b7eb8f' : diff >= 0 ? '#d3adf7' : '#ffa39e'}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <b style={{ fontSize: 15 }}>{d.name}</b>
                            <Tag color={diff >= 10 ? 'green' : diff >= 5 ? 'purple' : diff >= 0 ? 'default' : 'red'}>
                              {diff >= 0 ? '+' : ''}{diff} 分
                            </Tag>
                          </div>

                          <div style={{ position: 'relative', marginBottom: 12 }}>
                            <div style={{
                              position: 'relative', height: 12, borderRadius: 6,
                              background: '#f0f0f0', overflow: 'hidden',
                            }}>
                              <div
                                style={{
                                  position: 'absolute', left: 0, top: 0, height: '100%',
                                  width: `${prevPct}%`, background: '#d9d9d9', borderRadius: 6, zIndex: 1,
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute', left: 0, top: 0, height: '100%',
                                  width: `${pct}%`,
                                  background: diff >= 0
                                    ? 'linear-gradient(90deg, #722ed1, #9254de)'
                                    : 'linear-gradient(90deg, #ff7875, #ffa39e)',
                                  borderRadius: 6, zIndex: 2, transition: 'width 0.6s',
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
                            <span>上次：{d.previousScore} 分</span>
                            <span style={{ fontWeight: 600, color: '#262626' }}>现在：{d.currentScore} 分</span>
                            <span>满分：{d.maxScore}</span>
                          </div>

                          <div style={{
                            padding: 8, background: 'rgba(255,255,255,0.6)',
                            borderRadius: 4, fontSize: 12, lineHeight: 1.7, color: '#595959',
                          }}>
                            💡 <b>林姐观察：</b>{d.note}
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              ) : (
                <Empty description="该学生暂无本周期的测评记录" />
              )}
            </Card>

            {latest && (
              <Card
                className="card-shadow"
                style={{ marginTop: 16 }}
                title={
                  <span className="section-title">
                    <ThunderboltOutlined style={{ color: '#faad14' }} /> 老师观察到的亮点 & 下一步建议
                  </span>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div style={{
                      padding: 16, borderRadius: 8,
                      background: 'linear-gradient(135deg, #fff7e6, #ffe7ba)',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: '#d46b08' }}>
                        <SmileOutlined /> 本周期亮点（做得特别好的地方）
                      </div>
                      <List
                        size="small"
                        dataSource={latest.highlights}
                        renderItem={(item, idx) => (
                          <List.Item style={{ background: 'transparent', padding: '6px 0', border: 'none' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.7 }}>
                              <Tag color="gold" style={{ flexShrink: 0, marginTop: 2 }}>亮点 {idx + 1}</Tag>
                              <span>{item}</span>
                            </div>
                          </List.Item>
                        )}
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{
                      padding: 16, borderRadius: 8,
                      background: 'linear-gradient(135deg, #e6fffb, #87e8de40)',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: '#08979c' }}>
                        <BulbOutlined /> 林姐的下一步建议
                      </div>
                      <List
                        size="small"
                        dataSource={latest.suggestions}
                        renderItem={(item, idx) => (
                          <List.Item style={{ background: 'transparent', padding: '6px 0', border: 'none' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.7 }}>
                              <Tag color="cyan" style={{ flexShrink: 0, marginTop: 2 }}>建议 {idx + 1}</Tag>
                              <span>{item}</span>
                            </div>
                          </List.Item>
                        )}
                      />
                    </div>
                  </Col>
                </Row>

                <Divider />
                <div style={{
                  padding: 20, borderRadius: 8,
                  background: 'linear-gradient(135deg, #f9f0ff, #efdbff)',
                  borderLeft: '4px solid #722ed1',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#531dab' }}>
                    💬 林姐给 {summary.studentName} 的一句话评语
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.8, color: '#262626' }}>
                    "{latest.teacherComment}"
                  </div>
                </div>
              </Card>
            )}
          </Col>
        </Row>
      ) : (
        <Card className="card-shadow">
          <Empty description="请选择一位学生查看进步报告" />
        </Card>
      )}
    </Space>
  );
}
