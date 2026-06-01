import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Slider,
  Space,
  Alert,
  Divider,
  Radio,
  message,
  Row,
  Col,
  Statistic,
} from 'antd';
import { ArrowLeft, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store';
import RiskTag from '../components/RiskTag';


const { Option } = Select;
const { TextArea } = Input;

const AlertEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { alerts, updateAlert, addLog } = useAppStore();
  const [conflictResolved, setConflictResolved] = useState(false);

  const alert = alerts.find(a => a.studentId === id);
  const student = alert?.student;

  if (!student || !alert) {
    return <div>学生不存在</div>;
  }

  const onFinish = (values: any) => {
    const beforeData = {
      renewalProbability: alert.renewalProbability,
      riskLevel: alert.riskLevel,
      processStatus: alert.processStatus,
      handler: alert.handler,
    };

    updateAlert(alert.id, {
      renewalProbability: values.renewalProbability,
      riskLevel: values.riskLevel,
      processStatus: values.processStatus,
      handler: values.handler,
      hasConflict: conflictResolved ? false : alert.hasConflict,
      updateTime: new Date().toLocaleString('zh-CN'),
    });

    addLog({
      operator: '教务管理员',
      action: '更新续费预测',
      targetId: alert.id,
      targetType: 'alert',
      beforeData,
      afterData: values,
    });

    message.success('数据修正成功');
    navigate(`/student/${id}`);
  };

  const handleConflictResolve = () => {
    setConflictResolved(true);
    message.success('冲突已标记为解决');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(`/student/${id}`)}>
          返回详情
        </Button>
        <h2 className="text-xl font-bold text-gray-800">数据修正</h2>
      </div>

      {alert.hasConflict && !conflictResolved && (
        <Alert
          message="数据冲突处理"
          description={
            <div className="space-y-2">
              <p className="font-medium">冲突详情：{alert.conflictDetails}</p>
              <p className="text-sm text-gray-600">处理规则：</p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                <li>优先保留最新录入的数据</li>
                <li>测评记录优先级 &gt; 课包记录 &gt; 请假单</li>
                <li>所有冲突必须留痕，记录处理人、时间、决策理由</li>
              </ul>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircle size={14} />}
                onClick={handleConflictResolve}
                className="mt-2"
              >
                确认已人工核实，标记冲突解决
              </Button>
            </div>
          }
          type="warning"
          showIcon
          icon={<AlertTriangle size={16} />}
        />
      )}

      <Row gutter={24}>
        <Col span={12}>
          <Card title="学生信息">
            <Statistic title="学生姓名" value={student.name} />
            <Divider className="my-3" />
            <Statistic title="课程类型" value={student.courseType} />
            <Divider className="my-3" />
            <Statistic title="授课老师" value={student.teacher} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="当前状态">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">当前风险等级</span>
                <RiskTag level={alert.riskLevel} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">当前续费概率</span>
                <span className="font-semibold">{alert.renewalProbability}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">剩余课时</span>
                <span className={alert.remainingHours <= 5 ? 'text-red-500 font-semibold' : ''}>
                  {alert.remainingHours} 课时
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="修正表单">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            renewalProbability: alert.renewalProbability,
            riskLevel: alert.riskLevel,
            processStatus: alert.processStatus,
            handler: alert.handler || '',
          }}
          onFinish={onFinish}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="续费概率"
                name="renewalProbability"
                rules={[{ required: true, message: '请设置续费概率' }]}
              >
                <Slider
                  min={0}
                  max={100}
                  marks={{
                    0: '0%',
                    25: '25%',
                    50: '50%',
                    75: '75%',
                    100: '100%',
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="风险等级"
                name="riskLevel"
                rules={[{ required: true, message: '请选择风险等级' }]}
              >
                <Select>
                  <Option value="low">低风险</Option>
                  <Option value="medium">中风险</Option>
                  <Option value="high">高风险</Option>
                  <Option value="critical">极高风险</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="处理状态"
                name="processStatus"
                rules={[{ required: true, message: '请选择处理状态' }]}
              >
                <Radio.Group>
                  <Radio value="pending">待处理</Radio>
                  <Radio value="processing">处理中</Radio>
                  <Radio value="completed">已完成</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="处理人" name="handler">
                <Input placeholder="请输入处理人姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="修正说明" name="remark">
            <TextArea rows={4} placeholder="请输入数据修正的原因和依据..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<Save size={16} />}>
                保存修正
              </Button>
              <Button onClick={() => navigate(`/student/${id}`)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AlertEdit;
