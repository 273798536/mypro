import { useState } from 'react';
import { Button, Card, List, Tag, Modal, Form, Input, Upload, Space, Divider, message, Table, Image, Select } from 'antd';
const { Option } = Select;
import { PlusOutlined, UploadOutlined, FileText, Image as ImageIcon, Thermometer, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import { generateId, parseTemperatureRecords, getAverageTemperature } from '../utils/diagnosis';
import type { DiagnosisEvent, Clue, TemperatureRecord } from '../types';
import type { UploadProps } from 'antd';

const { TextArea } = Input;

const clueTypeIcons: Record<string, React.ReactNode> = {
  curve: <FileText size={16} />,
  temperature: <Thermometer size={16} />,
  photo: <ImageIcon size={16} />,
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
  const { events, addEvent, updateEvent, selectedEvent, setSelectedEvent, curves } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [clueType, setClueType] = useState<Clue['type'] | null>(null);
  const [noteForm] = Form.useForm();
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);

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
      message.success('诊断事件创建成功');
    });
  };

  const handleTemperatureUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (!selectedEvent) return;
    try {
      const text = await (file as File).text();
      const records = parseTemperatureRecords(text);
      
      if (!records) {
        message.error('温度记录解析失败，请检查文件格式');
        onError?.(new Error('解析失败'));
        return;
      }

      const avgTemp = getAverageTemperature(records);
      const clue: Clue = {
        id: generateId(),
        type: 'temperature',
        name: (file as File).name,
        temperatureRecords: records,
        timestamp: Date.now(),
      };

      const updatedClues = [...selectedEvent.clues, clue];
      updateEvent(selectedEvent.id, { clues: updatedClues });
      message.success(`已导入温度记录 ${records.length} 条，平均温度: ${avgTemp.toFixed(1)}°C`);
      onSuccess?.(file);
    } catch (error) {
      console.error('温度记录上传失败:', error);
      message.error('温度记录上传失败');
      onError?.(error as Error);
    }
  };

  const handlePhotoUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (!selectedEvent) return;
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoData = e.target?.result as string;
        const clue: Clue = {
          id: generateId(),
          type: 'photo',
          name: (file as File).name,
          photoData,
          timestamp: Date.now(),
        };

        const updatedClues = [...selectedEvent.clues, clue];
        updateEvent(selectedEvent.id, { clues: updatedClues });
        message.success('遮挡照片已上传');
        onSuccess?.(file);
      };
      reader.readAsDataURL(file as File);
    } catch (error) {
      console.error('照片上传失败:', error);
      message.error('照片上传失败');
      onError?.(error as Error);
    }
  };

  const handleAddNote = () => {
    if (!selectedEvent) return;
    noteForm.validateFields().then((values) => {
      const clue: Clue = {
        id: generateId(),
        type: 'note',
        name: values.title || '备注',
        noteContent: values.content,
        timestamp: Date.now(),
      };

      const updatedClues = [...selectedEvent.clues, clue];
      updateEvent(selectedEvent.id, { clues: updatedClues });
      noteForm.resetFields();
      setClueType(null);
      message.success('备注已添加');
    });
  };

  const handleLinkCurve = (curveId: string) => {
    if (!selectedEvent) return;
    const curve = curves.find((c) => c.id === curveId);
    if (!curve) return;

    const clue: Clue = {
      id: generateId(),
      type: 'curve',
      name: curve.serialNumber,
      data: { curveId },
      timestamp: Date.now(),
    };

    const updatedClues = [...selectedEvent.clues, clue];
    updateEvent(selectedEvent.id, { clues: updatedClues, curves: [...selectedEvent.curves, curveId] });
    setClueType(null);
    message.success('IV曲线已关联');
  };

  const handleDeleteClue = (clueId: string) => {
    if (!selectedEvent) return;
    const updatedClues = selectedEvent.clues.filter((c) => c.id !== clueId);
    updateEvent(selectedEvent.id, { clues: updatedClues });
    message.success('线索已删除');
  };

  const handleStatusChange = (status: DiagnosisEvent['status']) => {
    if (!selectedEvent) return;
    updateEvent(selectedEvent.id, { status });
    message.success('状态已更新');
  };

  const renderClueDetail = (clue: Clue) => {
    switch (clue.type) {
      case 'temperature':
        return (
          <div>
            <div className="text-sm text-gray-500 mb-2">
              共 {clue.temperatureRecords?.length || 0} 条记录
            </div>
            <Table
              size="small"
              dataSource={clue.temperatureRecords?.slice(0, 10)}
              rowKey="time"
              pagination={false}
            >
              <Table.Column title="时间" dataIndex="time" key="time" />
              <Table.Column title="温度(°C)" dataIndex="temperature" key="temperature" />
              <Table.Column title="辐照度(W/m²)" dataIndex="irradiance" key="irradiance" />
            </Table>
            {(clue.temperatureRecords?.length || 0) > 10 && (
              <div className="text-xs text-gray-400 mt-2">... 还有 {(clue.temperatureRecords?.length || 0) - 10} 条记录</div>
            )}
          </div>
        );
      case 'photo':
        return (
          <div>
            <Image
              width={200}
              src={clue.photoData}
              alt={clue.name}
              preview={{ src: clue.photoData }}
            />
          </div>
        );
      case 'note':
        return (
          <div className="p-3 bg-gray-50 rounded whitespace-pre-wrap">
            {clue.noteContent}
          </div>
        );
      case 'curve':
        return (
          <div className="text-sm text-gray-500">
            关联IV曲线数据，可在诊断工作台查看详情
          </div>
        );
      default:
        return null;
    }
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
                        <FileText size={14} className="inline mr-1" />
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
                  <Button size="small" onClick={() => setClueType(null)}>
                    <PlusOutlined /> 添加线索
                  </Button>
                  {selectedEvent.status !== 'resolved' && (
                    <Button size="small" type="primary" onClick={() => handleStatusChange('resolved')}>
                      标记已解决
                    </Button>
                  )}
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

                {clueType === null && (
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => setClueType('temperature')}
                    >
                      上传温度记录
                    </Button>
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => setClueType('photo')}
                    >
                      上传遮挡照片
                    </Button>
                    <Button
                      icon={<FileText size={14} />}
                      onClick={() => setClueType('note')}
                    >
                      添加备注
                    </Button>
                    <Button
                      icon={<FileText size={14} />}
                      onClick={() => setClueType('curve')}
                    >
                      关联IV曲线
                    </Button>
                  </div>
                )}

                {clueType === 'temperature' && (
                  <Card size="small" title="上传温度记录" extra={<Button size="small" type="text" onClick={() => setClueType(null)}>取消</Button>}>
                    <Upload
                      accept=".csv"
                      showUploadList={false}
                      customRequest={handleTemperatureUpload}
                    >
                      <Button icon={<UploadOutlined />}>选择CSV文件</Button>
                    </Upload>
                    <div className="text-xs text-gray-400 mt-2">
                      CSV格式: Time,Temperature,Irradiance
                    </div>
                  </Card>
                )}

                {clueType === 'photo' && (
                  <Card size="small" title="上传遮挡照片" extra={<Button size="small" type="text" onClick={() => setClueType(null)}>取消</Button>}>
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      customRequest={handlePhotoUpload}
                    >
                      <Button icon={<UploadOutlined />}>选择图片文件</Button>
                    </Upload>
                    <div className="text-xs text-gray-400 mt-2">
                      支持 JPG, PNG 格式
                    </div>
                  </Card>
                )}

                {clueType === 'note' && (
                  <Card size="small" title="添加备注" extra={<Button size="small" type="text" onClick={() => setClueType(null)}>取消</Button>}>
                    <Form form={noteForm} layout="vertical">
                      <Form.Item name="title" label="标题">
                        <Input placeholder="备注标题" />
                      </Form.Item>
                      <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入备注内容' }]}>
                        <TextArea rows={4} placeholder="请输入备注内容..." />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" onClick={handleAddNote}>
                          添加备注
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                )}

                {clueType === 'curve' && (
                  <Card size="small" title="关联IV曲线" extra={<Button size="small" type="text" onClick={() => setClueType(null)}>取消</Button>}>
                    {curves.length === 0 ? (
                      <div className="text-gray-400 text-sm">暂无IV曲线数据，请先在诊断工作台上传</div>
                    ) : (
                      <Select
                        style={{ width: '100%' }}
                        placeholder="选择要关联的IV曲线"
                        onChange={handleLinkCurve}
                      >
                        {curves.map((curve) => (
                          <Option key={curve.id} value={curve.id}>
                            {curve.serialNumber} - {new Date(curve.timestamp).toLocaleString()}
                          </Option>
                        ))}
                      </Select>
                    )}
                  </Card>
                )}

                <Divider />

                <div>
                  <div className="text-sm font-medium mb-3">关联线索 ({selectedEvent.clues.length})</div>
                  {selectedEvent.clues.length === 0 ? (
                    <div className="text-center text-gray-400 py-4">暂无线索，点击上方按钮添加</div>
                  ) : (
                    <div className="space-y-3">
                      {selectedEvent.clues.map((clue) => (
                        <div
                          key={clue.id}
                          className="p-3 bg-gray-50 rounded-lg border"
                          onClick={() => setSelectedClue(clue)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-blue-500">{clueTypeIcons[clue.type]}</div>
                            <div className="flex-1">
                              <div className="font-medium">{clue.name}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(clue.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <Tag>{clueTypeNames[clue.type]}</Tag>
                            <Space>
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (clue.type === 'photo') {
                                    setPreviewPhoto(clue.photoData || null);
                                  } else {
                                    setSelectedClue(clue);
                                  }
                                }}
                              />
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClue(clue.id);
                                }}
                              />
                            </Space>
                          </div>
                          {selectedClue?.id === clue.id && (
                            <div className="mt-3 pt-3 border-t">
                              {renderClueDetail(clue)}
                            </div>
                          )}
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
        title="照片预览"
        open={!!previewPhoto}
        onCancel={() => setPreviewPhoto(null)}
        footer={null}
        width={600}
      >
        {previewPhoto && (
          <img src={previewPhoto} alt="预览" style={{ width: '100%' }} />
        )}
      </Modal>
    </div>
  );
}
