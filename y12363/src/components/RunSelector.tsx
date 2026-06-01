import React, { useState } from 'react';
import { Select, Button, Space, Card, Modal, Form, Input, message } from 'antd';
import { Play, Plus, RefreshCw, GitCompare, Clock, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore } from '../store';

const { Option } = Select;
const { TextArea } = Input;

const RunSelector: React.FC = () => {
  const {
    runs,
    currentRunId,
    baseRunId,
    setCurrentRun,
    setBaseRun,
    runEstimation,
    loading,
  } = useAppStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const currentRun = runs.find((r) => r.id === currentRunId);
  const baseRun = runs.find((r) => r.id === baseRunId);

  const handleCreateRun = async (values: { runName: string; remark: string }) => {
    const result = await runEstimation(values.runName, baseRunId, values.remark);
    if (result) {
      message.success('估算运行创建成功');
      setModalVisible(false);
      form.resetFields();
    } else {
      message.error('估算运行创建失败');
    }
  };

  const handleRerun = async () => {
    if (!currentRun) return;
    const newName = `${currentRun.runName} (重跑 ${dayjs().format('MM-DD HH:mm')})`;
    const result = await runEstimation(newName, currentRun.baseRunId, `基于 ${currentRun.runName} 重跑`);
    if (result) {
      message.success('重跑成功');
    } else {
      message.error('重跑失败');
    }
  };

  return (
    <Card
      className="bg-slate-800 border-slate-700"
      title={
        <span className="flex items-center gap-2 text-slate-100">
          <GitCompare size={16} className="text-blue-500" />
          运行选择
        </span>
      }
      size="small"
    >
      <Space direction="vertical" className="w-full">
        <div>
          <label className="text-slate-300 text-sm mb-1 block">当前运行</label>
          <Select
            value={currentRunId}
            onChange={setCurrentRun}
            placeholder="选择运行"
            style={{ width: '100%' }}
            className="bg-slate-700"
          >
            {runs.map((run) => (
              <Option key={run.id} value={run.id}>
                <div className="flex items-center justify-between">
                  <span>{run.runName}</span>
                  <span className="text-slate-400 text-xs">
                    {dayjs(run.startTime).format('MM-DD HH:mm')}
                  </span>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {currentRun && (
          <div className="bg-slate-700/50 rounded p-2 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <Clock size={12} />
              <span>{dayjs(currentRun.startTime).format('YYYY-MM-DD HH:mm:ss')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Play size={12} />
              <span>记录: {currentRun.recordCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} />
              <span>异常: {currentRun.anomalyCount}</span>
            </div>
          </div>
        )}

        <div>
          <label className="text-slate-300 text-sm mb-1 block">基准运行 (对比)</label>
          <Select
            value={baseRunId}
            onChange={setBaseRun}
            placeholder="选择基准运行"
            allowClear
            style={{ width: '100%' }}
            className="bg-slate-700"
          >
            {runs
              .filter((r) => r.id !== currentRunId)
              .map((run) => (
                <Option key={run.id} value={run.id}>
                  <div className="flex items-center justify-between">
                    <span>{run.runName}</span>
                    <span className="text-slate-400 text-xs">
                      {dayjs(run.startTime).format('MM-DD HH:mm')}
                    </span>
                  </div>
                </Option>
              ))}
          </Select>
        </div>

        {baseRun && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs text-blue-400">
            正在与 <span className="font-medium">{baseRun.runName}</span> 对比
          </div>
        )}

        <Space className="w-full pt-2">
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => setModalVisible(true)}
            className="flex-1"
            style={{ backgroundColor: '#165DFF' }}
            loading={loading}
          >
            新建运行
          </Button>
          <Button
            icon={<RefreshCw size={14} />}
            onClick={handleRerun}
            disabled={!currentRun || loading}
            className="flex-1"
          >
            重跑
          </Button>
        </Space>
      </Space>

      <Modal
        title="新建估算运行"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRun}
          className="pt-4"
        >
          <Form.Item
            name="runName"
            label="运行名称"
            rules={[{ required: true, message: '请输入运行名称' }]}
          >
            <Input
              placeholder="输入运行名称"
              prefix={<Play size={14} className="text-slate-400" />}
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea
              rows={3}
              placeholder="输入备注信息（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建并运行
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default RunSelector;
