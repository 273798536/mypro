import React, { useState } from 'react';
import { Card, Form, InputNumber, Select, Button, Space, Alert, Tag } from 'antd';
import { useApp } from '../context/AppContext';
import { runExtrapolation } from '../engine/dpEngine';


const ExtrapolationPanel: React.FC = () => {
  const { state, setExtrapolation } = useApp();
  const [form] = Form.useForm();
  const [result, setResult] = useState<string | null>(null);

  const run = () => {
    const values = form.getFieldsValue();
    if (!state.transitionTable) return;
    const r = runExtrapolation(
      state.transitionTable,
      {
        knowledgePointId: values.knowledgePointId,
        targetSteps: values.targetSteps,
        direction: values.direction,
      },
      state.constraintRules
    );
    setExtrapolation(r);
    if (r.success) {
      setResult(
        `✅ 外推成功：共 ${r.actualSteps} 步，生成 ${r.projectedStates?.length ?? 0} 个预测状态和 ${r.projectedTransitions?.length ?? 0} 个预测转移`
      );
    } else {
      setResult(`❌ 外推被拦截：${r.blockedReason}`);
    }
  };

  const latest = state.latestExtrapolation;

  return (
    <Card size="small" title="外推越界测试">
      <Form form={form} layout="inline" initialValues={{ targetSteps: 3, direction: 'forward' }}>
        <Form.Item name="knowledgePointId" label="知识点" rules={[{ required: true }]}>
          <Select style={{ width: 180 }} placeholder="选择知识点">
            {state.knowledgePoints.map((kp) => (
              <Select.Option key={kp.id} value={kp.id}>{kp.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="targetSteps" label="步数" rules={[{ required: true }]}>
          <InputNumber min={1} max={10} />
        </Form.Item>
        <Form.Item name="direction" label="方向" rules={[{ required: true }]}>
          <Select style={{ width: 120 }}>
            <Select.Option value="forward">向前外推</Select.Option>
            <Select.Option value="backward">向后回溯</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" onClick={run}>执行外推</Button>
            <Button onClick={() => { setExtrapolation(null); setResult(null); }}>清除</Button>
          </Space>
        </Form.Item>
      </Form>

      {result && (
        <Alert
          style={{ marginTop: 8 }}
          type={latest?.success ? 'success' : 'warning'}
          showIcon
          message={result}
          description={
            latest && !latest.success && (
              <div>
                <div style={{ marginTop: 4 }}>
                  <strong>学生端可见解释：</strong>
                  <span style={{ color: '#555' }}>
                    当前只允许向前预测 {latest.maxAllowedSteps} 步。超过这个范围后，掌握度预测的可信度会快速下降，
                    为了不让错误的预测误导你的学习计划，系统自动拦下了这次超过范围的预测。
                    你可以尝试缩小步数，或者补充更多练习数据后再试。
                  </span>
                </div>
              </div>
            )
          }
        />
      )}

      <div style={{ marginTop: 8 }}>
        <Tag color="blue">向前外推上限：{state.constraintRules.find(r => r.type === 'extrapolation')?.params.maxForwardSteps ?? 3} 步</Tag>
        <Tag color="blue">向后回溯上限：{state.constraintRules.find(r => r.type === 'extrapolation')?.params.maxBackwardSteps ?? 5} 步</Tag>
      </div>
    </Card>
  );
};

export default ExtrapolationPanel;
