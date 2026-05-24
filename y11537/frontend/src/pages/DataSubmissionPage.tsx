import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  message,
  InputNumber,
  Switch,
  Space
} from 'antd';
import dayjs from 'dayjs';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { TextArea } = Input;
const { TabPane } = Tabs;

function DataSubmissionPage() {
  const [registrationForm] = Form.useForm();
  const [signinForm] = Form.useForm();
  const [homeworkForm] = Form.useForm();
  const [priceForm] = Form.useForm();
  const [historyForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const canSubmit = user?.role !== 'read_only';

  const handleSubmitRegistration = async (values: any) => {
    if (!canSubmit) {
      message.error('您没有提交权限');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        ...values,
        trainingDate: values.trainingDate.format('YYYY-MM-DD')
      };
      await api.post('/data/registration', data);
      message.success('报名表提交成功');
      registrationForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSignin = async (values: any) => {
    if (!canSubmit) {
      message.error('您没有提交权限');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        ...values,
        trainingDate: values.trainingDate.format('YYYY-MM-DD'),
        signinTime: values.signinTime ? values.signinTime.toISOString() : new Date().toISOString()
      };
      const response = await api.post('/data/signin', data);
      if (response.data.warning) {
        message.warning(`${response.data.warning} (队列编号: ${response.data.queueNo})`);
      } else {
        message.success('签到记录提交成功');
      }
      signinForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitHomework = async (values: any) => {
    if (!canSubmit) {
      message.error('您没有提交权限');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        ...values,
        trainingDate: values.trainingDate.format('YYYY-MM-DD'),
        submitTime: values.submitTime ? values.submitTime.toISOString() : new Date().toISOString()
      };
      await api.post('/data/homework', data);
      message.success('作业提交成功');
      homeworkForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPrice = async (values: any) => {
    if (!canSubmit) {
      message.error('您没有提交权限');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        ...values,
        trainingDate: values.trainingDate.format('YYYY-MM-DD'),
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD')
      };
      await api.post('/data/price-adjustment', data);
      message.success('改价申请提交成功');
      priceForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitHistory = async (values: any) => {
    if (!canSubmit) {
      message.error('您没有提交权限');
      return;
    }
    setSubmitting(true);
    try {
      const data = JSON.parse(values.jsonData);
      await api.post('/data/history-archive', data);
      message.success('历史数据导入成功');
      historyForm.resetFields();
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        message.error('JSON格式错误');
      } else {
        message.error(error.response?.data?.error || '提交失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">数据录入</h1>
      </div>

      <Card>
        <Tabs defaultActiveKey="registration">
          <TabPane tab="报名表" key="registration">
            <Form
              form={registrationForm}
              onFinish={handleSubmitRegistration}
              layout="vertical"
              style={{ maxWidth: 600 }}
            >
              <Form.Item
                name="employeeId"
                label="员工ID"
                rules={[{ required: true, message: '请输入员工ID' }]}
              >
                <Input placeholder="请输入员工ID" />
              </Form.Item>
              <Form.Item
                name="employeeName"
                label="员工姓名"
                rules={[{ required: true, message: '请输入员工姓名' }]}
              >
                <Input placeholder="请输入员工姓名" />
              </Form.Item>
              <Form.Item
                name="department"
                label="部门"
                rules={[{ required: true, message: '请输入部门' }]}
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
              <Form.Item
                name="trainingId"
                label="培训ID"
                rules={[{ required: true, message: '请输入培训ID' }]}
              >
                <Input placeholder="请输入培训ID" />
              </Form.Item>
              <Form.Item
                name="trainingName"
                label="培训名称"
                rules={[{ required: true, message: '请输入培训名称' }]}
              >
                <Input placeholder="请输入培训名称" />
              </Form.Item>
              <Form.Item
                name="trainingDate"
                label="培训日期"
                rules={[{ required: true, message: '请选择培训日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="trainingLocation"
                label="培训地点"
                rules={[{ required: true, message: '请输入培训地点' }]}
              >
                <Input placeholder="请输入培训地点" />
              </Form.Item>
              <Form.Item
                name="trainer"
                label="讲师"
                rules={[{ required: true, message: '请输入讲师' }]}
              >
                <Input placeholder="请输入讲师姓名" />
              </Form.Item>
              <Form.Item name="remark" label="备注">
                <TextArea rows={3} placeholder="请输入备注" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  提交报名表
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="签到记录" key="signin">
            <Form
              form={signinForm}
              onFinish={handleSubmitSignin}
              layout="vertical"
              style={{ maxWidth: 600 }}
            >
              <Form.Item
                name="employeeId"
                label="员工ID"
                rules={[{ required: true, message: '请输入员工ID' }]}
              >
                <Input placeholder="请输入员工ID" />
              </Form.Item>
              <Form.Item
                name="employeeName"
                label="员工姓名"
                rules={[{ required: true, message: '请输入员工姓名' }]}
              >
                <Input placeholder="请输入员工姓名" />
              </Form.Item>
              <Form.Item
                name="department"
                label="部门"
                rules={[{ required: true, message: '请输入部门' }]}
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
              <Form.Item
                name="trainingId"
                label="培训ID"
                rules={[{ required: true, message: '请输入培训ID' }]}
              >
                <Input placeholder="请输入培训ID" />
              </Form.Item>
              <Form.Item
                name="trainingName"
                label="培训名称"
                rules={[{ required: true, message: '请输入培训名称' }]}
              >
                <Input placeholder="请输入培训名称" />
              </Form.Item>
              <Form.Item
                name="trainingDate"
                label="培训日期"
                rules={[{ required: true, message: '请选择培训日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="signinTime"
                label="签到时间"
                rules={[{ required: true, message: '请选择签到时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="qrcodeId" label="二维码ID">
                <Input placeholder="请输入二维码ID" />
              </Form.Item>
              <Form.Item name="location" label="签到位置">
                <Input placeholder="请输入签到位置" />
              </Form.Item>
              <Form.Item name="isProxy" label="是否代签" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isProxy !== curr.isProxy}>
                {({ getFieldValue }) =>
                  getFieldValue('isProxy') ? (
                    <>
                      <Form.Item
                        name="proxyEmployeeId"
                        label="代签人ID"
                        rules={[{ required: true, message: '请输入代签人ID' }]}
                      >
                        <Input placeholder="请输入代签人ID" />
                      </Form.Item>
                      <Form.Item
                        name="proxyEmployeeName"
                        label="代签人姓名"
                        rules={[{ required: true, message: '请输入代签人姓名' }]}
                      >
                        <Input placeholder="请输入代签人姓名" />
                      </Form.Item>
                    </>
                  ) : null
                }
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  提交签到
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="课后作业" key="homework">
            <Form
              form={homeworkForm}
              onFinish={handleSubmitHomework}
              layout="vertical"
              style={{ maxWidth: 600 }}
            >
              <Form.Item
                name="employeeId"
                label="员工ID"
                rules={[{ required: true, message: '请输入员工ID' }]}
              >
                <Input placeholder="请输入员工ID" />
              </Form.Item>
              <Form.Item
                name="employeeName"
                label="员工姓名"
                rules={[{ required: true, message: '请输入员工姓名' }]}
              >
                <Input placeholder="请输入员工姓名" />
              </Form.Item>
              <Form.Item
                name="department"
                label="部门"
                rules={[{ required: true, message: '请输入部门' }]}
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
              <Form.Item
                name="trainingId"
                label="培训ID"
                rules={[{ required: true, message: '请输入培训ID' }]}
              >
                <Input placeholder="请输入培训ID" />
              </Form.Item>
              <Form.Item
                name="trainingName"
                label="培训名称"
                rules={[{ required: true, message: '请输入培训名称' }]}
              >
                <Input placeholder="请输入培训名称" />
              </Form.Item>
              <Form.Item
                name="trainingDate"
                label="培训日期"
                rules={[{ required: true, message: '请选择培训日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="homeworkTitle"
                label="作业标题"
                rules={[{ required: true, message: '请输入作业标题' }]}
              >
                <Input placeholder="请输入作业标题" />
              </Form.Item>
              <Form.Item name="homeworkContent" label="作业内容">
                <TextArea rows={4} placeholder="请输入作业内容" />
              </Form.Item>
              <Form.Item name="score" label="分数">
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="请输入分数" />
              </Form.Item>
              <Form.Item name="grade" label="等级">
                <Select placeholder="请选择等级">
                  <Select.Option value="A">A</Select.Option>
                  <Select.Option value="B">B</Select.Option>
                  <Select.Option value="C">C</Select.Option>
                  <Select.Option value="D">D</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="submitTime"
                label="提交时间"
                rules={[{ required: true, message: '请选择提交时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  提交作业
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="手工改价" key="price">
            <Form
              form={priceForm}
              onFinish={handleSubmitPrice}
              layout="vertical"
              style={{ maxWidth: 600 }}
            >
              <Form.Item
                name="employeeId"
                label="员工ID"
                rules={[{ required: true, message: '请输入员工ID' }]}
              >
                <Input placeholder="请输入员工ID" />
              </Form.Item>
              <Form.Item
                name="employeeName"
                label="员工姓名"
                rules={[{ required: true, message: '请输入员工姓名' }]}
              >
                <Input placeholder="请输入员工姓名" />
              </Form.Item>
              <Form.Item
                name="department"
                label="部门"
                rules={[{ required: true, message: '请输入部门' }]}
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
              <Form.Item
                name="trainingId"
                label="培训ID"
                rules={[{ required: true, message: '请输入培训ID' }]}
              >
                <Input placeholder="请输入培训ID" />
              </Form.Item>
              <Form.Item
                name="trainingName"
                label="培训名称"
                rules={[{ required: true, message: '请输入培训名称' }]}
              >
                <Input placeholder="请输入培训名称" />
              </Form.Item>
              <Form.Item
                name="trainingDate"
                label="培训日期"
                rules={[{ required: true, message: '请选择培训日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="originalPrice"
                label="原价"
                rules={[{ required: true, message: '请输入原价' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入原价" />
              </Form.Item>
              <Form.Item
                name="adjustedPrice"
                label="调整后价格"
                rules={[{ required: true, message: '请输入调整后价格' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入调整后价格" />
              </Form.Item>
              <Form.Item
                name="adjustmentReason"
                label="调整原因"
                rules={[{ required: true, message: '请输入调整原因' }]}
              >
                <TextArea rows={3} placeholder="请输入调整原因" />
              </Form.Item>
              <Form.Item
                name="effectiveDate"
                label="生效日期"
                rules={[{ required: true, message: '请选择生效日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  提交改价申请
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="历史压缩包" key="history">
            <Form
              form={historyForm}
              onFinish={handleSubmitHistory}
              layout="vertical"
              style={{ maxWidth: 800 }}
            >
              <Form.Item
                name="jsonData"
                label="历史数据 (JSON格式)"
                rules={[{ required: true, message: '请输入JSON数据' }]}
                extra='格式示例: {"registrations": [{...}], "signins": [{...}]}'
              >
                <TextArea
                  rows={15}
                  placeholder='请输入JSON格式的历史数据，包含registrations和signins数组'
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={submitting}>
                    导入历史数据
                  </Button>
                  <Button
                    onClick={() => historyForm.setFieldsValue({
                      jsonData: JSON.stringify({
                        registrations: [
                          {
                            employeeId: "E001",
                            employeeName: "张三",
                            department: "技术部",
                            trainingId: "T001",
                            trainingName: "React高级开发",
                            trainingDate: "2024-01-15",
                            trainingLocation: "会议室A",
                            trainer: "李老师"
                          }
                        ],
                        signins: [
                          {
                            employeeId: "E001",
                            employeeName: "张三",
                            department: "技术部",
                            trainingId: "T001",
                            trainingName: "React高级开发",
                            trainingDate: "2024-01-15",
                            signinTime: "2024-01-15T09:00:00.000Z"
                          }
                        ]
                      }, null, 2)
                    })}
                  >
                    填充示例数据
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}

export default DataSubmissionPage;
