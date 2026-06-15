import { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Button, Modal, Descriptions, App as AntdApp } from 'antd';
import { PlayCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Track, Student } from '../types';
import { trackStore, studentStore } from '../services/storage';

const DIFFICULTY_LABEL: Record<string, { label: string; color: string }> = {
  beginner: { label: '入门', color: 'green' },
  intermediate: { label: '进阶', color: 'blue' },
  advanced: { label: '高级', color: 'red' },
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  scheduled: { label: '已排期', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
};

export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [detail, setDetail] = useState<Track | null>(null);
  const { message } = AntdApp.useApp();

  useEffect(() => {
    setTracks(trackStore.getAll());
    setStudents(studentStore.getAll());
  }, []);

  const getStudentNames = (ids: string[]) =>
    ids.map(id => students.find(s => s.id === id)?.name).filter(Boolean).join('、');

  const columns: ColumnsType<Track> = [
    {
      title: '曲目名称',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (t, r) => (
        <Space>
          <PlayCircleOutlined style={{ color: '#722ed1' }} />
          <b>{t}</b>
          {r.notes && <Tag color="orange">有备注</Tag>}
        </Space>
      ),
    },
    { title: '类型', dataIndex: 'genre', key: 'genre', width: 100 },
    {
      title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 80,
      render: d => {
        const cfg = DIFFICULTY_LABEL[d];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '参演学生', dataIndex: 'studentIds', key: 'students', width: 220,
      render: ids => <span>{getStudentNames(ids)}（{ids.length}人）</span>,
    },
    { title: '时长(分)', dataIndex: 'durationMinutes', key: 'duration', width: 80, align: 'center' },
    { title: '舞台', dataIndex: 'stage', key: 'stage', width: 140 },
    { title: '演出时间', dataIndex: 'scheduledTime', key: 'time', width: 160 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: s => {
        const cfg = STATUS_LABEL[s];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 100, fixed: 'right',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setDetail(r)}>详情</Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        className="card-shadow"
        size="small"
        title={<span className="section-title">贴近现场的曲目表演单（共 {tracks.length} 条）</span>}
        extra={
          <Space>
            <Tag color="purple">含 {tracks.filter(t => t.notes).length} 条现场注意事项</Tag>
            <Button onClick={() => message.info('已按演出时间排序')}>按演出时间排</Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={tracks.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))}
          scroll={{ x: 1200 }}
          pagination={false}
        />
      </Card>

      <Modal
        open={!!detail}
        onCancel={() => setDetail(null)}
        title={detail?.name}
        footer={[
          <Button key="close" onClick={() => setDetail(null)}>关闭</Button>,
        ]}
        width={640}
      >
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="曲目名称">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="类型/难度">
              <Space>
                <Tag>{detail.genre}</Tag>
                <Tag color={DIFFICULTY_LABEL[detail.difficulty].color}>
                  {DIFFICULTY_LABEL[detail.difficulty].label}
                </Tag>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="演出时间/舞台">
              {detail.scheduledTime} · {detail.stage} · 时长 {detail.durationMinutes} 分钟
            </Descriptions.Item>
            <Descriptions.Item label="参演学生">
              <Space wrap>
                {detail.studentIds.map(id => {
                  const s = students.find(x => x.id === id);
                  return s ? (
                    <Tag key={id} color="purple">
                      {s.name}（{s.grade}·{s.instrument}）
                    </Tag>
                  ) : null;
                })}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="负责老师">林姐</Descriptions.Item>
            <Descriptions.Item label="现场注意事项">
              {detail.notes || <span style={{ color: '#8c8c8c' }}>无特殊要求</span>}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Space>
  );
}
