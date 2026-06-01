import { useState } from 'react';
import { Button, Card, List, Tag, Modal, Form, Input, Upload, Space, Divider } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Link2, FileText, Image, Thermometer } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { generateId } from '../utils/diagnosis';
import type { DiagnosisEvent, Clue } from '../types';

const { TextArea } = Input;

const clueTypeIcons: Record<string, React.ReactNode> = {
  curve: <FileText size={16} />,
  temperature: <Thermometer size={16} />,
  photo: <Image size={16} />,
  note: <FileText size={16} />,
};

const clueTypeNames: Record<string, string> = {
  curve: 'IV曲线',
  temperature: '温度记录',
  photo: '遮挡照片',
  note: '备注',
};

const statusColors: Record<string, string> = {
  open: 'blue',
  in_progress: 'orange',
  resolved: 'green',
};

const statusNames: Record<string, string> = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
};

export default function CluesPage() {
  const { events, addEvent, updateEvent, selectedEvent, setSelectedEvent } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [clueModalOpen, setClueModalOpen] = useState(false);

  const handleCreateEvent = () => {
    form.validateFields().then((values) => {
      const event: DiagnosisEvent = {
        id: generateId(),
        title: values.title,
        description: values.description,
        curves: [],
        clues: [],
        status: 'open',
        createdAt: Date.now(),
      };
      addEvent(event);
      setSelectedEvent(event);
      setModalOpen(false);
      form.resetFields();
    });
  };

  const handleAddClue = (type: Clue['type']) => {
    if (!selectedEvent) return;
    
    const clue: Clue = {
      id: generateId(),
      type,
      name: `${clueTypeNames[type]} - ${Date.now().toString().slice(-6)}`,
      timestamp: Date.now(),
    };
    
    const updatedClues = [...selectedEvent.clues, clue];
    updateEvent(selectedEvent.id, { clues: updatedClues });
    setClueModalOpen(false);
  };

  const handleStatusChange = (status: DiagnosisEvent['status']) => {
    if (!selectedEvent) return;
    updateEvent(selectedEvent.id, { status });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">线索归集中心</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          创建诊断事件
        </Button>
      </div>

      <div className="flex gap-6">
        <div className="w-1/3">
          <Card title="诊断事件列表" size="small">
            {events.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                暂无事件，点击右上角创建
              </div>
            ) : (
              <List
                dataSource={events}
                renderItem={(event) => (
                  <List.Item
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`cursor-pointer rounded-lg px-3 mb-2 ${
                      selectedEvent?.id === event.id ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    style={{ padding: '12px' }}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{event.title}</span>
                        <Tag color={statusColors[event.status]}>
                          {statusNames[event.status]}
                        </Tag>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <Link2 size={14} className="inline mr-1" />
                        {event.clues.length} 条线索
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>

        <div className="flex-1">
          <Card
            title="事件详情"
            size="small"
            extra={
              selectedEvent && (
                <Space>
                  <Button size="small" onClick={() => setClueModalOpen(true)}>
                    <PlusOutlined /> 添加线索
                  </Button>
                  <Button size="small" onClick={() => handleStatusChange('resolved')}>
                    标记已解决
                  </Button>
                </Space>
              )
            }
          >
            {selectedEvent ? (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">{selectedEvent.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedEvent.description || '暂无描述'}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    创建时间: {new Date(selectedEvent.createdAt).toLocaleString()}
                  </div>
                </div>

                <Divider />

                <div>
                  <div className="text-sm font-medium mb-3">关联线索</div>
                  {selectedEvent.clues.length === 0 ? (
                    <div className="text-center text-gray-400 py-4">暂无线索</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvent.clues.map((clue) => (
                        <div
                          key={clue.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="text-blue-500">{clueTypeIcons[clue.type]}</div>
                          <div className="flex-1">
                            <div className="font-medium">{clue.name}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(clue.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <Tag>{clueTypeNames[clue.type]}</Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                请从左侧选择一个事件查看详情
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        title="创建诊断事件"
        open={modalOpen}
        onOk={handleCreateEvent}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="事件标题"
            rules={[{ required: true, message: '请输入事件标题' }]}
          >
            <Input placeholder="例如：A区1号组串异常分析" />
          </Form.Item>
          <Form.Item name="description" label="事件描述">
            <TextArea rows={4} placeholder="请输入事件描述..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加线索"
        open={clueModalOpen}
        onCancel={() => setClueModalOpen(false)}
        footer={null}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              icon={<UploadOutlined />}
              onClick={() => handleAddClue('curve')}
            >
              关联IV曲线
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => handleAddClue('temperature')}
            >
              上传温度记录
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => handleAddClue('photo')}
            >
              上传遮挡照片
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => handleAddClue('note')}
            >
              添加备注
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
