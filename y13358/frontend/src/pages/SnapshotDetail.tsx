import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Space, Typography, Tag, Descriptions, Timeline, Button, Alert, List, Divider, Row, Col, Statistic
} from 'antd';
import {
  ArrowLeftOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  LinkOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { snapshotApi, runApi, FeatureSnapshot, SnapshotNote, Run } from '../api';

const { Title, Text, Paragraph } = Typography;

export default function SnapshotDetail() {
  const { snapshotId } = useParams<{ snapshotId: string }>();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<FeatureSnapshot | null>(null);
  const [original, setOriginal] = useState<FeatureSnapshot | null>(null);
  const [notes, setNotes] = useState<SnapshotNote[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [relatedRuns, setRelatedRuns] = useState<Run[]>([]);

  const load = async () => {
    if (!snapshotId) return;
    setLoading(true);
    try {
      const [s, n, rs] = await Promise.all([
        snapshotApi.get(snapshotId),
        snapshotApi.notes(snapshotId),
        runApi.list()
      ]);
      setSnapshot(s || null);
      setNotes(n);
      setRuns(rs);

      const related: Run[] = [];
      for (const r of rs) {
        try {
          const snaps = await runApi.featureSnapshots(r.run_id);
          if (snaps.some(sp => sp.snapshot_id === snapshotId)) {
            related.push(r);
          }
        } catch (_) {
        }
      }
      setRelatedRuns(related);

      if (s?.original_snapshot_id) {
        try {
          const o = await snapshotApi.get(s.original_snapshot_id);
          setOriginal(o || null);
        } catch (_) {
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [snapshotId]);

  if (!snapshot) return <Card loading={loading} />;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
            <Title level={3} style={{ margin: 0 }}>{snapshot.name}</Title>
            <Tag color={snapshot.is_temporary ? 'orange' : 'blue'}>{snapshot.snapshot_id}</Tag>
            <Tag>v{snapshot.version}</Tag>
            {snapshot.is_temporary === 1 && <Tag color="red" icon={<WarningOutlined />}>临时快照</Tag>}
            {snapshot.metric_mismatch_reason && <Tag color="orange" icon={<WarningOutlined />}>离线/线上口径不一致</Tag>}
          </Space>

          {snapshot.is_temporary === 1 && notes.length === 0 && (
            <Alert
              type="warning"
              showIcon
              message="这是临时特征快照，但还没有任何备注！"
              description="彩排进场前临时补充的特征快照必须添加备注，说明它改变了哪些判断。请回到运行详情页进行补充。"
            />
          )}

          <Row gutter={16}>
            <Col span={6}><Card size="small"><Statistic title="关联运行数" value={relatedRuns.length} prefix={<LinkOutlined />} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="备注数" value={notes.length} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="创建人" value={snapshot.created_by} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="是否临时" value={snapshot.is_temporary ? '是' : '否'} valueStyle={{ color: snapshot.is_temporary ? '#faad14' : '#52c41a' }} /></Card></Col>
          </Row>
        </Space>
      </Card>

      <Card title={<Space><InfoCircleOutlined /><Text strong>基本信息</Text></Space>}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="特征定义">
            <Text code style={{ fontSize: 13 }}>{snapshot.feature_definition}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="创建人">{snapshot.created_by}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(snapshot.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          {snapshot.offline_metric_json && (
            <Descriptions.Item label="离线指标"><Text code>{snapshot.offline_metric_json}</Text></Descriptions.Item>
          )}
          {snapshot.online_metric_json && (
            <Descriptions.Item label="线上指标"><Text code>{snapshot.online_metric_json}</Text></Descriptions.Item>
          )}
          {snapshot.metric_mismatch_reason && (
            <Descriptions.Item label="离线/线上口径差异原因">
              <Text type="warning">{snapshot.metric_mismatch_reason}</Text>
            </Descriptions.Item>
          )}
          {original && (
            <Descriptions.Item label="原始特征快照">
              <Space>
                <Tag>{original.snapshot_id}</Tag>
                <a onClick={() => navigate(`/snapshot/${original.snapshot_id}`)}>{original.name} (v{original.version})</a>
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {original && (
        <Card title={<Space><ThunderboltOutlined /><Text strong>与原始快照对比</Text></Space>}>
          <Row gutter={16}>
            <Col span={12}>
              <Divider orientation="left">原始快照 {original.snapshot_id}</Divider>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="名称">{original.name}</Descriptions.Item>
                <Descriptions.Item label="版本">v{original.version}</Descriptions.Item>
                <Descriptions.Item label="特征定义"><Text code>{original.feature_definition}</Text></Descriptions.Item>
                {original.offline_metric_json && <Descriptions.Item label="离线指标"><Text code>{original.offline_metric_json}</Text></Descriptions.Item>}
              </Descriptions>
            </Col>
            <Col span={12}>
              <Divider orientation="left">当前快照 {snapshot.snapshot_id}</Divider>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="名称">{snapshot.name}</Descriptions.Item>
                <Descriptions.Item label="版本">v{snapshot.version}</Descriptions.Item>
                <Descriptions.Item label="特征定义"><Text code>{snapshot.feature_definition}</Text></Descriptions.Item>
                {snapshot.offline_metric_json && <Descriptions.Item label="离线指标"><Text code>{snapshot.offline_metric_json}</Text></Descriptions.Item>}
              </Descriptions>
            </Col>
          </Row>
        </Card>
      )}

      <Card title={<Space><InfoCircleOutlined /><Text strong>备注历史（{notes.length}）</Text></Space>}>
        {notes.length === 0 ? (
          <Alert type="info" message="暂无备注" description="回到运行详情页可给该快照添加备注，临时快照必须加备注说明它改变了哪些判断。" />
        ) : (
          <Timeline
            items={notes.map(note => ({
              color: note.changed_judgments_json ? 'orange' : 'blue',
              children: (
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      <Tag color="blue">{note.created_by}</Tag>
                      <Text type="secondary">{dayjs(note.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
                      {note.changed_judgments_json && (
                        <Tag color="purple">影响样本: {JSON.parse(note.changed_judgments_json).join(', ')}</Tag>
                      )}
                    </Space>
                    <Paragraph style={{ margin: 0 }}>{note.note_content}</Paragraph>
                  </Space>
                </Card>
              )
            }))}
          />
        )}
      </Card>

      <Card title={<Space><LinkOutlined /><Text strong>使用该特征快照的运行</Text></Space>}>
        {relatedRuns.length === 0 ? (
          <Alert type="info" message="暂未被任何运行引用" />
        ) : (
          <List
            dataSource={relatedRuns}
            renderItem={(r: Run) => (
              <List.Item>
                <Space>
                  <Tag color="blue">{r.run_id}</Tag>
                  <a onClick={() => navigate(`/run/${r.run_id}`)}><Text strong>{r.name}</Text></a>
                  <Tag>{r.engineer}</Tag>
                  <Text type="secondary">{dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                  {r.description && <Text type="secondary">{r.description}</Text>}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
