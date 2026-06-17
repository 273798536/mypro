import { Card, Typography, Space } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import type { TrackNote } from '@/types';
import dayjs from 'dayjs';

const { Text } = Typography;

export interface NoteDiffViewProps {
  oldNote?: TrackNote | null;
  newNote?: TrackNote | null;
}

interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

const computeDiff = (oldText: string, newText: string): DiffSegment[] => {
  const oldChars = oldText.split('');
  const newChars = newText.split('');

  const result: DiffSegment[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldChars.length || newIndex < newChars.length) {
    if (oldIndex < oldChars.length && newIndex < newChars.length && oldChars[oldIndex] === newChars[newIndex]) {
      let unchangedText = '';
      while (
        oldIndex < oldChars.length &&
        newIndex < newChars.length &&
        oldChars[oldIndex] === newChars[newIndex]
      ) {
        unchangedText += oldChars[oldIndex];
        oldIndex++;
        newIndex++;
      }
      if (unchangedText) {
        result.push({ type: 'unchanged', text: unchangedText });
      }
    } else {
      let removedText = '';
      let addedText = '';

      const lookAhead = 5;
      let foundMatch = false;

      for (let i = oldIndex; i < Math.min(oldIndex + lookAhead, oldChars.length); i++) {
        for (let j = newIndex; j < Math.min(newIndex + lookAhead, newChars.length); j++) {
          if (oldChars[i] === newChars[j]) {
            while (oldIndex < i) {
              removedText += oldChars[oldIndex];
              oldIndex++;
            }
            while (newIndex < j) {
              addedText += newChars[newIndex];
              newIndex++;
            }
            foundMatch = true;
            break;
          }
        }
        if (foundMatch) break;
      }

      if (!foundMatch) {
        if (oldIndex < oldChars.length) {
          removedText += oldChars[oldIndex];
          oldIndex++;
        }
        if (newIndex < newChars.length) {
          addedText += newChars[newIndex];
          newIndex++;
        }
      }

      if (removedText) {
        result.push({ type: 'removed', text: removedText });
      }
      if (addedText) {
        result.push({ type: 'added', text: addedText });
      }
    }
  }

  return result;
};

const NoteDiffView: React.FC<NoteDiffViewProps> = ({ oldNote, newNote }) => {
  const oldContent = oldNote?.content || '';
  const newContent = newNote?.content || '';

  const diffSegments = computeDiff(oldContent, newContent);

  const renderDiffContent = () => {
    if (!oldNote && newNote) {
      return (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(82, 196, 26, 0.1)',
            borderRadius: 4,
            border: '1px solid rgba(82, 196, 26, 0.3)',
            minHeight: 60,
          }}
        >
          <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{newContent}</Text>
        </div>
      );
    }

    if (oldNote && !newNote) {
      return (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(255, 77, 79, 0.1)',
            borderRadius: 4,
            border: '1px solid rgba(255, 77, 79, 0.3)',
            minHeight: 60,
          }}
        >
          <Text
            delete
            style={{
              color: '#ff4d4f',
              textDecoration: 'line-through',
            }}
          >
            {oldContent}
          </Text>
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 4,
          border: '1px solid #303030',
          minHeight: 60,
          lineHeight: 1.8,
        }}
      >
        {diffSegments.map((segment, index) => {
          if (segment.type === 'added') {
            return (
              <span
                key={index}
                style={{
                  background: 'rgba(82, 196, 26, 0.3)',
                  color: '#52c41a',
                  padding: '1px 4px',
                  borderRadius: 2,
                  margin: '0 1px',
                }}
              >
                {segment.text}
              </span>
            );
          }
          if (segment.type === 'removed') {
            return (
              <span
                key={index}
                style={{
                  background: 'rgba(255, 77, 79, 0.3)',
                  color: '#ff4d4f',
                  textDecoration: 'line-through',
                  padding: '1px 4px',
                  borderRadius: 2,
                  margin: '0 1px',
                }}
              >
                {segment.text}
              </span>
            );
          }
          return (
            <span
              key={index}
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              {segment.text}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <Card
      size="small"
      style={{
        background: '#1f1f1f',
        border: '1px solid #303030',
        borderRadius: 8,
      }}
      styles={{
        header: { background: '#2a2a2a', borderBottom: '1px solid #303030' },
        body: { padding: '16px' },
      }}
      title={
        <Space>
          <FileTextOutlined style={{ color: '#1677ff' }} />
          <span>备注变更对比</span>
        </Space>
      }
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {(oldNote || newNote) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            {oldNote && (
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  旧备注
                </Text>
                <Text style={{ fontSize: 12 }}>
                  {oldNote.createdByName} · {dayjs(oldNote.createdAt).format('YYYY-MM-DD HH:mm')}
                </Text>
              </div>
            )}
            {newNote && (
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  新备注
                </Text>
                <Text style={{ fontSize: 12 }}>
                  {newNote.createdByName} · {dayjs(newNote.createdAt).format('YYYY-MM-DD HH:mm')}
                </Text>
              </div>
            )}
          </div>
        )}
        {renderDiffContent()}
      </Space>
    </Card>
  );
};

export default NoteDiffView;
