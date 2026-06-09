import React from 'react';
import { List, Tag, Alert, Typography, Space, Card } from 'antd';
import { useApp } from '../context/AppContext';
import type { Conclusion } from '../types';

const { Text } = Typography;

const statusTag = (s: Conclusion['status']) => {
  if (s === 'valid') return <Tag color="green">有效</Tag>;
  if (s === 'invalid') return <Tag color="red">已失效</Tag>;
  if (s === 'suspicious') return <Tag color="orange">存疑（晚到评分影响）</Tag>;
  return <Tag>过时</Tag>;
};

const ConclusionPanel: React.FC = () => {
  const { state } = useApp();
  const { conclusions, lateImpacts, latestExtrapolation, validationResult } = state;

  return (
    <div>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>约束校验结果：</strong>
            {validationResult ? (
              <Tag color={validationResult.isValid ? 'green' : 'red'}>
                {validationResult.passedRules}/{validationResult.totalRules} 条规则通过
              </Tag>
            ) : (
              <Tag>未执行</Tag>
            )}
          </div>
          {validationResult?.violations.slice(0, 3).map((v) => (
            <Alert
              key={v.ruleId + v.message}
              type={v.severity === 'error' ? 'error' : v.severity === 'warning' ? 'warning' : 'info'}
              showIcon
              message={v.message}
              description={v.suggestedAction}
            />
          ))}
        </Space>
      </Card>

      {latestExtrapolation && !latestExtrapolation.success && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message="外推越界已拦截"
          description={
            <div>
              <div><strong>拦截原因：</strong>{latestExtrapolation.blockedReason}</div>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">
                  请求步数 {latestExtrapolation.actualSteps}，规则允许上限 {latestExtrapolation.maxAllowedSteps}
                </Text>
              </div>
            </div>
          }
        />
      )}

      {lateImpacts.length > 0 && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message={`检测到 ${lateImpacts.length} 条晚到评分记录，以下结论可能受影响，请不要直接使用`}
          description={
            <ul style={{ margin: '4px 0 0 16px' }}>
              {lateImpacts.map((im) => (
                <li key={im.scoringRecordId}>
                  <strong>{im.questionTitle}</strong>（晚到{im.lateDays}天）：
                  <Text type="warning">{im.impactDescription}</Text>
                </li>
              ))}
            </ul>
          }
        />
      )}

      <Card size="small" title="结论说明（与图、表一致）">
        <List
          size="small"
          dataSource={conclusions}
          renderItem={(c) => (
            <List.Item style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ marginBottom: 4 }}>
                {statusTag(c.status)}
                <Text strong>{c.title}</Text>
              </div>
              <div style={{ color: '#555', fontSize: 13, paddingLeft: 4 }}>{c.content}</div>
              {c.status === 'suspicious' && c.invalidReason && (
                <div style={{ marginTop: 4, color: '#fa8c16', fontSize: 12 }}>
                  ⚠ {c.invalidReason}
                </div>
              )}
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default ConclusionPanel;
