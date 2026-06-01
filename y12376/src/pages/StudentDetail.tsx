import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Tabs, Timeline, Badge, Alert } from 'antd';
import { ArrowLeft, Edit, Calendar, Clock, AlertTriangle, BookOpen, User, GraduationCap } from 'lucide-react';
import { useAppStore } from '../store';
import RiskTag from '../components/RiskTag';
import { mockPackages, mockLeaves, mockEvaluations } from '../data/mockData';
import type { TimelineEventStatus, LeaveRecord } from '../types';

const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alerts, timelineEvents, loadTimelineEvents } = useAppStore();

  const alert = alerts.find(a => a.studentId === id);
  const student = alert?.student;
  const packages = mockPackages.filter(p => p.studentId === id);
  const leaves = mockLeaves.filter(l => l.studentId === id);
  const evaluations = mockEvaluations.filter(e => e.studentId === id);

  useEffect(() => {
    if (id) {
      loadTimelineEvents(id);
    }
  }, [id, loadTimelineEvents]);

  if (!student || !alert) {
    return <div>学生不存在</div>;
  }

  const getTimelineColor = (status: TimelineEventStatus) => {
    const colors = {
      normal: 'green',
      warning: 'gold',
      danger: 'red',
      info: 'blue',
    };
    return colors[status];
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      evaluation: <GraduationCap size={16} />,
      leave: <Calendar size={16} />,
      makeup: <Clock size={16} />,
      freeze: <AlertTriangle size={16} />,
      package: <BookOpen size={16} />,
      renewal: <User size={16} />,
    };
    return icons[type] || <User size={16} />;
  };

  const packageColumns = [
    { title: '课包名称', dataIndex: 'packageName', key: 'packageName' },
    { title: '总课时', dataIndex: 'totalHours', key: 'totalHours' },
    { title: '剩余课时', dataIndex: 'remainingHours', key: 'remainingHours', render: (h: number) => <span className={h <= 5 ? 'text-red-500 font-semibold' : ''}>{h}</span> },
    { title: '购买日期', dataIndex: 'purchaseDate', key: 'purchaseDate' },
    { title: '到期日期', dataIndex: 'expireDate', key: 'expireDate' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : s === 'frozen' ? 'orange' : 'red'}>{s === 'active' ? '正常' : s === 'frozen' ? '已冻结' : '已过期'}</Tag> },
  ];

  const leaveColumns = [
    { title: '请假日期', dataIndex: 'leaveDate', key: 'leaveDate' },
    { title: '请假原因', dataIndex: 'reason', key: 'reason' },
    { title: '课时', dataIndex: 'hours', key: 'hours', render: (h: number) => `${h}课时` },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'approved' ? 'green' : s === 'pending' ? 'orange' : 'red'}>{s === 'approved' ? '已批准' : s === 'pending' ? '待审批' : '已拒绝'}</Tag> },
    { title: '补课安排', key: 'makeup', render: (_: unknown, record: LeaveRecord) => record.makeUpClass ? <Tag color="blue">{record.makeUpClass.scheduledDate} - {record.makeUpClass.status === 'completed' ? '已完成' : '已预约'}</Tag> : '-' },
  ];

  const evalColumns = [
    { title: '测评类型', dataIndex: 'type', key: 'type', render: (t: string) => t === 'monthly' ? '月度测评' : t === 'quarterly' ? '季度测评' : '期末测评' },
    { title: '测评日期', dataIndex: 'evalDate', key: 'evalDate', render: (d: string | null) => d || '-' },
    { title: '得分', dataIndex: 'score', key: 'score', render: (s?: number) => s ? `${s}分` : '-' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'completed' ? 'green' : s === 'pending' ? 'orange' : 'red'}>{s === 'completed' ? '已完成' : s === 'pending' ? '待测评' : '已缺失'}</Tag> },
    { title: '评语', dataIndex: 'comment', key: 'comment', render: (c?: string) => c || '-' },
  ];

  const tabItems = [
    {
      key: '1',
      label: '时序线',
      children: (
        <div className="py-4">
          <Timeline
            mode="left"
            items={timelineEvents.map(event => ({
              color: getTimelineColor(event.status),
              dot: getTypeIcon(event.type),
              children: (
                <div className="py-2">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-gray-500">{event.description}</div>
                  <div className="text-xs text-gray-400 mt-1">{event.date}</div>
                </div>
              ),
            }))}
          />
        </div>
      ),
    },
    {
      key: '2',
      label: '课包记录',
      children: <Table columns={packageColumns} dataSource={packages} rowKey="id" pagination={false} />,
    },
    {
      key: '3',
      label: '请假补课',
      children: <Table columns={leaveColumns} dataSource={leaves} rowKey="id" pagination={false} />,
    },
    {
      key: '4',
      label: '测评记录',
      children: <Table columns={evalColumns} dataSource={evaluations} rowKey="id" pagination={false} />,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
            返回列表
          </Button>
          <h2 className="text-xl font-bold text-gray-800">学生详情</h2>
        </div>
        <Button type="primary" icon={<Edit size={16} />} onClick={() => navigate(`/student/${id}/edit`)}>
          数据修正
        </Button>
      </div>

      {alert.hasConflict && (
        <Alert
          message="数据冲突提示"
          description={alert.conflictDetails}
          type="warning"
          showIcon
          icon={<AlertTriangle size={16} />}
          action={
            <Button size="small" type="primary" onClick={() => navigate(`/student/${id}/edit`)}>
              去处理
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <Descriptions title="基本信息" bordered column={2}>
            <Descriptions.Item label="学生姓名">{student.name}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{student.phone}</Descriptions.Item>
            <Descriptions.Item label="课程类型">{student.courseType}</Descriptions.Item>
            <Descriptions.Item label="授课老师">{student.teacher}</Descriptions.Item>
            <Descriptions.Item label="入学日期">{student.enrollDate}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Badge status={alert.processStatus === 'completed' ? 'success' : alert.processStatus === 'processing' ? 'processing' : 'warning'} text={alert.processStatus === 'completed' ? '已完成' : alert.processStatus === 'processing' ? '处理中' : '待处理'} />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card>
          <h4 className="font-semibold mb-4">续费预警信息</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">风险等级</span>
              <RiskTag level={alert.riskLevel} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500">续费概率</span>
                <span className="font-semibold">{alert.renewalProbability}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${alert.renewalProbability}%`,
                    backgroundColor: alert.renewalProbability >= 70 ? '#10B981' : alert.renewalProbability >= 50 ? '#F59E0B' : '#EF4444',
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">剩余课时</span>
              <span className={alert.remainingHours <= 5 ? 'text-red-500 font-semibold' : 'font-semibold'}>
                {alert.remainingHours} 课时
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">上次测评</span>
              <span>{alert.lastEvalDate || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">下次测评</span>
              <span>{alert.nextEvalDate || '-'}</span>
            </div>
            {alert.handler && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">处理人</span>
                <span>{alert.handler}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default StudentDetail;
