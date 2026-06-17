import { Modal, Row, Col, Typography, Space, Divider } from 'antd';
import { DiffOutlined } from '@ant-design/icons';
import type { AudioMaterial, VersionDiff } from '@/types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export interface VersionDiffModalProps {
  open: boolean;
  onCancel: () => void;
  oldMaterial: AudioMaterial | null;
  newMaterial: AudioMaterial | null;
  diffs: VersionDiff[];
}

const FIELD_LABELS: Record<string, string> = {
  trackNo: '曲目编号',
  title: '曲目标题',
  duration: '时长',
  timecode: '时间码',
  timecodeDeviation: '时间码偏差',
  fileName: '文件名',
  matchStatus: '匹配状态',
  matchConfidence: '匹配置信度',
  submittedBy: '提交人',
  submittedAt: '提交时间',
  sourceBatch: '来源批次',
};

const formatValue = (value: string | number | boolean | null): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') {
    if (value.toString().includes('.')) {
      return (value * 100).toFixed(1) + '%';
    }
    return value.toString();
  }
  return value;
};

const VersionDiffModal: React.FC<VersionDiffModalProps> = ({
  open,
  onCancel,
  oldMaterial,
  newMaterial,
  diffs,
}) => {
  const renderDiffItem = (diff: VersionDiff) => {
    const label = FIELD_LABELS[diff.fieldName] || diff.fieldName;
    const oldValue = formatValue(diff.oldValue);
    const newValue = formatValue(diff.newValue);

    const isChanged = diff.oldValue !== diff.newValue;

    return (
      <div key={diff.fieldName} style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          {label}
        </Text>
        <Row gutter={16}>
          <Col span={12}>
            <div
              style={{
                padding: '8px 12px',
                background: isChanged ? 'rgba(255, 77, 79, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                borderRadius: 4,
                border: `1px solid ${isChanged ? '#ff4d4f' : '#303030'}`,
                minHeight: 36,
              }}
            >
              <Text
                delete={isChanged}
                style={{
                  color: isChanged ? '#ff4d4f' : 'rgba(255, 255, 255, 0.65)',
                  textDecoration: isChanged ? 'line-through' : 'none',
                }}
              >
                {oldValue}
              </Text>
            </div>
          </Col>
          <Col span={12}>
            <div
              style={{
                padding: '8px 12px',
                background: isChanged ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                borderRadius: 4,
                border: `1px solid ${isChanged ? '#52c41a' : '#303030'}`,
                minHeight: 36,
              }}
            >
              <Text
                style={{
                  color: isChanged ? '#52c41a' : 'rgba(255, 255, 255, 0.65)',
                  fontWeight: isChanged ? 500 : 400,
                }}
              >
                {newValue}
              </Text>
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  const changedDiffs = diffs.filter((d) => d.oldValue !== d.newValue);
  const unchangedDiffs = diffs.filter((d) => d.oldValue === d.newValue);

  return (
    <Modal
      title={
        <Space>
          <DiffOutlined style={{ color: '#1677ff' }} />
          <span>版本差异对比</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      footer={null}
      styles={{
        header: { background: '#2a2a2a', borderBottom: '1px solid #303030' },
        content: { background: '#1f1f1f' },
        body: { padding: '24px' },
      }}
    >
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 77, 79, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(255, 77, 79, 0.3)',
            }}
          >
            <Title level={5} style={{ margin: 0, color: '#ff4d4f' }}>
              旧版本
            </Title>
            {oldMaterial && (
              <Space direction="vertical" size={4} style={{ marginTop: 8, width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  v{oldMaterial.version} · {oldMaterial.fileName}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {oldMaterial.submittedBy} · {dayjs(oldMaterial.submittedAt).format('YYYY-MM-DD HH:mm')}
                </Text>
              </Space>
            )}
          </div>
        </Col>
        <Col span={12}>
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(82, 196, 26, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(82, 196, 26, 0.3)',
            }}
          >
            <Title level={5} style={{ margin: 0, color: '#52c41a' }}>
              新版本
            </Title>
            {newMaterial && (
              <Space direction="vertical" size={4} style={{ marginTop: 8, width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  v{newMaterial.version} · {newMaterial.fileName}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {newMaterial.submittedBy} · {dayjs(newMaterial.submittedAt).format('YYYY-MM-DD HH:mm')}
                </Text>
              </Space>
            )}
          </div>
        </Col>
      </Row>

      {changedDiffs.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <Space>
              <Text strong style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                变更字段 ({changedDiffs.length})
              </Text>
            </Space>
          </div>
          {changedDiffs.map(renderDiffItem)}
        </>
      )}

      {unchangedDiffs.length > 0 && (
        <>
          <Divider style={{ borderColor: '#303030', margin: '16px 0' }} />
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">未变更字段 ({unchangedDiffs.length})</Text>
          </div>
          {unchangedDiffs.map(renderDiffItem)}
        </>
      )}
    </Modal>
  );
};

export default VersionDiffModal;
