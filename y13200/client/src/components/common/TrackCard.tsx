import { Card, Row, Col, Typography, Button, Space } from 'antd';
import {
  MusicOutlined,
  EyeOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import StatusTag from './StatusTag';
import TimecodeDeviationTag from './TimecodeDeviationTag';
import type { Track, AudioMaterial } from '@/types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export interface TrackCardProps {
  track: Track;
  onView?: (trackId: string) => void;
  onEdit?: (trackId: string) => void;
  onReview?: (trackId: string) => void;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, onView, onEdit, onReview }) => {
  const activeMaterial = track.materials?.find((m: AudioMaterial) => m.isActive);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      hoverable
      style={{
        background: '#1f1f1f',
        border: '1px solid #303030',
        borderRadius: 8,
      }}
      bodyStyle={{ padding: 16 }}
      onClick={() => onView?.(track.id)}
    >
      <div style={{ marginBottom: 12 }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="center">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'rgba(22, 119, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MusicOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, color: 'rgba(255, 255, 255, 0.85)' }}>
                {track.trackNo}. {track.title}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {track.artist}
              </Text>
            </div>
          </Space>
          <StatusTag status={track.status} />
        </Space>
      </div>

      <Row gutter={[16, 8]} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            预期时长
          </Text>
          <div>
            <Text strong style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              {formatDuration(track.expectedDuration)}
            </Text>
          </div>
        </Col>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            材料版本
          </Text>
          <div>
            <Text strong style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              v{track.currentVersion}
            </Text>
            {activeMaterial && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                {activeMaterial.fileName}
              </Text>
            )}
          </div>
        </Col>
        {track.timecodeDeviation !== undefined && track.timecodeDeviation !== null && (
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              时间码偏差
            </Text>
            <div>
              <TimecodeDeviationTag deviation={track.timecodeDeviation} />
            </div>
          </Col>
        )}
        {track.materials && track.materials.length > 0 && (
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              匹配状态
            </Text>
            <div>
              <Text
                style={{
                  color:
                    activeMaterial?.matchStatus === 'matched'
                      ? '#52c41a'
                      : activeMaterial?.matchStatus === 'matching'
                      ? '#1677ff'
                      : '#ff4d4f',
                }}
              >
                {activeMaterial?.matchStatus === 'matched'
                  ? '自动匹配'
                  : activeMaterial?.matchStatus === 'manual'
                  ? '手动匹配'
                  : activeMaterial?.matchStatus === 'suggest'
                  ? '建议匹配'
                  : '未匹配'}
              </Text>
              {activeMaterial && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  置信度 {Math.round(activeMaterial.matchConfidence * 100)}%
                </Text>
              )}
            </div>
          </Col>
        )}
      </Row>

      {track.latestNote && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 4,
            marginBottom: 12,
            borderLeft: '3px solid #1677ff',
          }}
        >
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Space>
              <FileTextOutlined style={{ color: '#1677ff', fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                最新备注
              </Text>
            </Space>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 13,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {track.latestNote}
            </Text>
          </Space>
        </div>
      )}

      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid #303030',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          更新于 {dayjs(track.updatedAt).format('YYYY-MM-DD HH:mm')}
        </Text>
        <Space size={8}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onView?.(track.id);
            }}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(track.id);
            }}
          >
            编辑
          </Button>
          {(track.status === 'matched' || track.status === 'reviewing') && (
            <Button
              type="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onReview?.(track.id);
              }}
            >
              审核
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default TrackCard;
