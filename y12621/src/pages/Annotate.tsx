import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SkeletonCanvas } from '@/components/SkeletonCanvas';
import { useAnnotationStore } from '@/store/annotationStore';
import { MOCK_FRAMES_BEFORE, formatSeverity, formatOperationType } from '@/mock/data';
import {
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  Edit3,
  Target,
} from 'lucide-react';
import { Button, Slider, Modal, Form, Input, Select, Tooltip } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

const Annotate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [supplementModalVisible, setSupplementModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedCollision, setSelectedCollision] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [supplementForm] = Form.useForm();

  const {
    currentTask,
    frames,
    currentFrameIndex,
    collisions,
    bones,
    scoreSheet,
    history,
    historyIndex,
    layers,
    activeLayerId,
    layerMode,
    viewState,
    selectedNodeId,
    loadTask,
    setFrameIndex,
    updateNode,
    undo,
    redo,
    supplementScore,
    confirmBoundary,
    reRunAnnotation,
    reopenTask,
    switchLayer,
    setLayerMode,
    setViewState,
    selectNode,
  } = useAnnotationStore();

  useEffect(() => {
    if (id && !currentTask) {
      loadTask(id);
    }
  }, [id, currentTask, loadTask]);

  useEffect(() => {
    setViewState({ offsetX: 100, offsetY: 50 });
  }, []);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setFrameIndex((currentFrameIndex + 1) % frames.length);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentFrameIndex, frames.length, setFrameIndex]);

  const currentFrame = frames[currentFrameIndex];
  const beforeFrame = MOCK_FRAMES_BEFORE[currentFrameIndex];
  const selectedNode = currentFrame?.nodes.find((n) => n.id === selectedNodeId);
  const boundaryCollisions = collisions.filter((c) => c.severity === 'boundary' && !c.confirmed);

  if (!currentTask || !currentFrame) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-neutral-500">加载中...</p>
        </div>
      </div>
    );
  }

  const handleViewChange = (state: { scale?: number; offsetX?: number; offsetY?: number }) => {
    setViewState(state);
  };

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    updateNode(nodeId, x, y);
  };

  const handleConfirmCollision = (collisionId: string) => {
    setSelectedCollision(collisionId);
    setConfirmModalVisible(true);
  };

  const handleConfirmSubmit = (values: { approved: boolean; comment: string }) => {
    if (selectedCollision) {
      confirmBoundary(selectedCollision, values.approved, values.comment);
      setConfirmModalVisible(false);
      setSelectedCollision(null);
      form.resetFields();
    }
  };

  const handleSupplementSubmit = (values: { score: number; unit: string; remark: string }) => {
    const missingItemIndex = scoreSheet?.scores.findIndex((s) => s.score === undefined || s.missingUnit) ?? -1;
    if (missingItemIndex >= 0) {
      supplementScore(missingItemIndex, values.score, values.remark);
      setSupplementModalVisible(false);
      supplementForm.resetFields();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-neutral-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 hover:bg-neutral-100 rounded-sm transition-colors"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={() => setFrameIndex(currentFrameIndex - 1)}
              disabled={currentFrameIndex === 0}
              className="p-2 hover:bg-neutral-100 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-mono min-w-[80px] text-center">
              {currentFrameIndex + 1} / {frames.length}
            </span>
            <button
              onClick={() => setFrameIndex(currentFrameIndex + 1)}
              disabled={currentFrameIndex === frames.length - 1}
              className="p-2 hover:bg-neutral-100 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="w-64">
            <Slider
              min={0}
              max={frames.length - 1}
              value={currentFrameIndex}
              onChange={setFrameIndex}
              tooltip={{ formatter: (value) => `第 ${value! + 1} 帧` }}
            />
          </div>

          <div className={`badge ${currentFrame.status === 'error' ? 'badge-danger' : currentFrame.status === 'warning' ? 'badge-warning' : 'badge-success'}`}>
            {currentFrame.status === 'error' ? '数据异常' : currentFrame.status === 'warning' ? '存在警告' : '正常'}
          </div>

          {currentFrame.hasBadData && (
            <span className="badge badge-danger flex items-center gap-1 animate-pulse">
              <AlertTriangle size={10} />
              含坏数据
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-100 rounded-sm p-0.5">
            {layers.map((layer) => (
              <button
                key={layer.layerId}
                onClick={() => switchLayer(layer.layerId)}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                  activeLayerId === layer.layerId
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                <Layers size={12} className="inline mr-1" />
                {layer.versionName}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-neutral-100 rounded-sm p-0.5">
            <button
              onClick={() => setLayerMode('before')}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                layerMode === 'before' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-800'
              }`}
            >
              原图
            </button>
            <button
              onClick={() => setLayerMode('after')}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                layerMode === 'after' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-800'
              }`}
            >
              调整后
            </button>
            <button
              onClick={() => setLayerMode('split')}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                layerMode === 'split' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-800'
              }`}
            >
              分屏对比
            </button>
          </div>

          <Tooltip title="撤销">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 hover:bg-neutral-100 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 size={18} />
            </button>
          </Tooltip>
          <Tooltip title="重做">
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 hover:bg-neutral-100 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Redo2 size={18} />
            </button>
          </Tooltip>

          <button onClick={() => reopenTask()} className="btn-secondary flex items-center gap-1.5">
            <RotateCcw size={14} />
            重开
          </button>
          <button onClick={() => reRunAnnotation()} className="btn-primary flex items-center gap-1.5">
            <RefreshCw size={14} />
            重复运行
          </button>
          <button onClick={() => navigate(`/review/${id}`)} className="btn-primary flex items-center gap-1.5">
            <Target size={14} />
            进入复核
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-white border-r border-neutral-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="section-title mb-3">评分表</h3>
            {scoreSheet && (
              <div className="space-y-2">
                {scoreSheet.isDelayed && (
                  <div className="p-2 bg-warning-50 border border-warning-200 rounded-sm text-xs text-warning-700 mb-3">
                    <AlertTriangle size={12} className="inline mr-1" />
                    {scoreSheet.delayReason}
                  </div>
                )}
                {scoreSheet.scores.map((item, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-sm border ${
                      item.score === undefined || item.missingUnit
                        ? 'bg-warning-50 border-warning-200'
                        : item.isOldData
                        ? 'bg-neutral-50 border-neutral-200'
                        : 'bg-white border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-700">{item.itemName}</span>
                      <div className="flex items-center gap-1">
                        {item.isOldData && <span className="text-[10px] text-neutral-500 bg-neutral-200 px-1 rounded">旧表</span>}
                        {item.missingUnit && <span className="text-[10px] text-warning-600 bg-warning-100 px-1 rounded">缺单位</span>}
                        {item.score === undefined && <span className="text-[10px] text-danger-600 bg-danger-100 px-1 rounded">漏填</span>}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-neutral-800">
                        {item.score ?? <span className="text-warning-500">-</span>}
                      </span>
                      <span className="text-xs text-neutral-500">/ {item.fullScore}</span>
                      {item.unit && <span className="text-xs text-neutral-500">{item.unit}</span>}
                    </div>
                    {item.remark && (
                      <p className="text-[10px] text-neutral-500 mt-1">{item.remark}</p>
                    )}
                  </div>
                ))}
                {scoreSheet.supplementNote && (
                  <div className="p-2 bg-primary-50 border border-primary-200 rounded-sm text-xs text-primary-700 mt-3">
                    <Edit3 size={12} className="inline mr-1" />
                    {scoreSheet.supplementNote}
                  </div>
                )}
                {(scoreSheet.scores.some((s) => s.score === undefined || s.missingUnit)) && (
                  <button
                    onClick={() => setSupplementModalVisible(true)}
                    className="w-full mt-2 btn-secondary text-sm"
                  >
                    补录评分
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-b border-neutral-200 flex-1 overflow-y-auto scrollbar-thin">
            <h3 className="section-title mb-3">
              碰撞检测
              <span className="float-right text-sm font-normal text-danger-500">
                {collisions.length} 处
              </span>
            </h3>
            <div className="space-y-2">
              {collisions.map((collision) => (
                <div
                  key={collision.id}
                  className={`p-3 rounded-sm border transition-all ${
                    collision.confirmed
                      ? 'bg-neutral-50 border-neutral-200 opacity-70'
                      : collision.severity === 'danger'
                      ? 'bg-danger-50 border-danger-200 hover:border-danger-400'
                      : collision.severity === 'boundary'
                      ? 'bg-warning-50 border-warning-200 hover:border-warning-400'
                      : 'bg-warning-50/50 border-warning-200 hover:border-warning-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`badge ${
                      collision.severity === 'danger' ? 'badge-danger' :
                      collision.severity === 'boundary' ? 'badge-warning' : 'badge-warning'
                    }`}>
                      {formatSeverity(collision.severity)}
                    </span>
                    {collision.isFalsePositive && (
                      <span className="text-[10px] text-primary-600 bg-primary-100 px-1.5 rounded">
                        疑似误报
                      </span>
                    )}
                    {collision.confirmed && (
                      <span className={`text-[10px] px-1.5 rounded ${
                        collision.isFalsePositive ? 'text-success-600 bg-success-100' : 'text-danger-600 bg-danger-100'
                      }`}>
                        {collision.isFalsePositive ? '已确认为误报' : '已确认碰撞'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-neutral-800 mb-1">
                    {collision.nodes.join(' ↔ ')}
                  </p>
                  <p className="text-[11px] text-neutral-600 mb-2">{collision.description}</p>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    距离: {collision.distance}cm / 阈值: {collision.threshold}cm
                  </p>
                  <p className="text-[11px] text-neutral-500 italic">{collision.reason}</p>
                  {!collision.confirmed && collision.severity === 'boundary' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleConfirmCollision(collision.id)}
                        className="flex-1 text-xs py-1 bg-success-500 text-white rounded-sm hover:bg-success-600 transition-colors"
                      >
                        <CheckCircle size={12} className="inline mr-1" />
                        确认真实
                      </button>
                      <button
                        onClick={() => handleConfirmCollision(collision.id)}
                        className="flex-1 text-xs py-1 bg-danger-500 text-white rounded-sm hover:bg-danger-600 transition-colors"
                      >
                        <XCircle size={12} className="inline mr-1" />
                        标记误报
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            <SkeletonCanvas
              nodes={currentFrame.nodes}
              beforeNodes={beforeFrame?.nodes}
              bones={bones}
              collisions={collisions}
              scale={viewState.scale}
              offsetX={viewState.offsetX}
              offsetY={viewState.offsetY}
              layerMode={layerMode}
              selectedNodeId={selectedNodeId}
              onViewChange={handleViewChange}
              onNodeSelect={selectNode}
              onNodeMove={handleNodeMove}
            />
          </div>

          <div className="h-16 bg-white border-t border-neutral-200 flex items-center px-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="text-xs text-neutral-500">
                图层模式: <span className="font-medium text-neutral-700">
                  {layerMode === 'before' ? '原始标注' : layerMode === 'after' ? '人工调整后' : '分屏对比'}
                </span>
              </div>
              <div className="text-xs text-neutral-500">
                当前图层: <span className="font-medium text-neutral-700">
                  {layers.find((l) => l.layerId === activeLayerId)?.versionName}
                </span>
              </div>
              <div className="text-xs text-neutral-500">
                视口: <span className="font-mono text-neutral-700">
                  ({Math.round(viewState.offsetX)}, {Math.round(viewState.offsetY)})
                </span>
              </div>
            </div>

            {selectedNode && (
              <div className="ml-auto flex items-center gap-4 bg-primary-50 px-4 py-2 rounded-sm border border-primary-200">
                <div className="text-xs">
                  <span className="text-neutral-500">选中节点:</span>
                  <span className="font-medium text-primary-700 ml-1">{selectedNode.name}</span>
                </div>
                <div className="text-xs">
                  <span className="text-neutral-500">坐标:</span>
                  <span className="font-mono text-primary-700 ml-1">
                    ({selectedNode.x}, {selectedNode.y})
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-neutral-500">置信度:</span>
                  <span className="font-mono text-primary-700 ml-1">
                    {(selectedNode.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                {selectedNode.isBoundary && (
                  <span className="badge badge-warning">边界点</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-80 bg-white border-l border-neutral-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="section-title mb-3">操作历史</h3>
            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              {history.map((record, index) => (
                <div
                  key={record.id}
                  className={`timeline-item ${index <= historyIndex ? '' : 'opacity-40'}`}
                >
                  <div className={`timeline-dot ${
                    record.type === 'annotate' ? 'bg-primary-500' :
                    record.type === 'undo' ? 'bg-neutral-500' :
                    record.type === 'confirm' ? 'bg-success-500' :
                    record.type === 'supplement' ? 'bg-warning-500' :
                    record.type === 'rerun' ? 'bg-danger-500' : 'bg-primary-500'
                  }`} />
                  <div className="text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`badge ${
                        record.type === 'annotate' ? 'badge-primary' :
                        record.type === 'undo' ? 'badge-warning' :
                        record.type === 'confirm' ? 'badge-success' :
                        record.type === 'supplement' ? 'badge-warning' :
                        record.type === 'rerun' ? 'badge-danger' : 'badge-primary'
                      }`}>
                        {formatOperationType(record.type)}
                      </span>
                      <span className="text-neutral-400 font-mono text-[10px]">
                        {record.timestamp.split(' ')[1]}
                      </span>
                    </div>
                    <p className="text-neutral-600 leading-relaxed">{record.description}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{record.operator}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
            <h3 className="section-title mb-3">节点列表</h3>
            <div className="space-y-1">
              {currentFrame.nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => selectNode(node.id)}
                  className={`p-2 rounded-sm cursor-pointer transition-all flex items-center justify-between ${
                    selectedNodeId === node.id
                      ? 'bg-primary-100 border border-primary-300'
                      : 'hover:bg-neutral-50 border border-transparent'
                  } ${node.isBadData ? 'bg-danger-50 border-danger-200' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: node.isBadData ? '#F53F3F' :
                        node.part === 'head' ? '#FF4D4F' :
                        node.part === 'torso' ? '#165DFF' :
                        node.part === 'arm' ? '#00B42A' : '#722ED1'
                      }}
                    />
                    <span className={`text-xs font-medium ${node.isBadData ? 'text-danger-600' : 'text-neutral-700'}`}>
                      {node.name}
                    </span>
                    {node.isBoundary && (
                      <span className="text-[10px] text-warning-600 bg-warning-100 px-1 rounded">边界</span>
                    )}
                    {node.isBadData && (
                      <span className="text-[10px] text-danger-600 bg-danger-100 px-1 rounded">异常</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {node.isBadData ? '(-,-)' : `(${node.x},${node.y})`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-neutral-200 bg-neutral-50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white rounded-sm border border-neutral-200">
                <p className="text-neutral-500 mb-1">总帧数</p>
                <p className="text-lg font-bold text-neutral-800">{frames.length}</p>
              </div>
              <div className="p-2 bg-white rounded-sm border border-neutral-200">
                <p className="text-neutral-500 mb-1">节点数</p>
                <p className="text-lg font-bold text-neutral-800">{currentFrame.nodes.length}</p>
              </div>
              <div className="p-2 bg-white rounded-sm border border-neutral-200">
                <p className="text-neutral-500 mb-1">碰撞数</p>
                <p className="text-lg font-bold text-danger-600">{collisions.length}</p>
              </div>
              <div className="p-2 bg-white rounded-sm border border-neutral-200">
                <p className="text-neutral-500 mb-1">待确认边界</p>
                <p className="text-lg font-bold text-warning-600">{boundaryCollisions.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="边界案例人工确认"
        open={confirmModalVisible}
        onCancel={() => { setConfirmModalVisible(false); setSelectedCollision(null); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleConfirmSubmit}>
          <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-sm">
            <p className="text-sm text-warning-700">
              <AlertTriangle size={14} className="inline mr-1" />
              请确认此边界案例是否为真实碰撞
            </p>
            {selectedCollision && (
              <p className="text-xs text-neutral-600 mt-1">
                {collisions.find((c) => c.id === selectedCollision)?.description}
              </p>
            )}
          </div>
          <Form.Item
            name="approved"
            label="确认结果"
            rules={[{ required: true, message: '请选择确认结果' }]}
          >
            <Select placeholder="请选择">
              <Option value={true}>确认为真实碰撞</Option>
              <Option value={false}>标记为误报</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="comment"
            label="确认意见"
            rules={[{ required: true, message: '请填写确认意见' }]}
          >
            <TextArea rows={3} placeholder="请填写确认意见，便于后续追溯..." />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setConfirmModalVisible(false); setSelectedCollision(null); }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              提交确认
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="补录评分信息"
        open={supplementModalVisible}
        onCancel={() => { setSupplementModalVisible(false); supplementForm.resetFields(); }}
        footer={null}
      >
        <Form form={supplementForm} layout="vertical" onFinish={handleSupplementSubmit}>
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-sm">
            <p className="text-sm text-primary-700">
              <Edit3 size={14} className="inline mr-1" />
              补录缺失的评分信息
            </p>
            {scoreSheet && (
              <p className="text-xs text-neutral-600 mt-1">
                待补录项: {scoreSheet.scores.find((s) => s.score === undefined || s.missingUnit)?.itemName}
              </p>
            )}
          </div>
          <Form.Item
            name="score"
            label="评分"
            rules={[{ required: true, message: '请输入评分' }]}
          >
            <Input type="number" placeholder="请输入评分" />
          </Form.Item>
          <Form.Item
            name="unit"
            label="单位"
            rules={[{ required: true, message: '请输入单位' }]}
          >
            <Select placeholder="请选择或输入单位">
              <Option value="°">度 (°)</Option>
              <Option value="cm">厘米 (cm)</Option>
              <Option value="mm">毫米 (mm)</Option>
              <Option value="kg">千克 (kg)</Option>
              <Option value="s">秒 (s)</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea rows={2} placeholder="请输入备注信息（可选）" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setSupplementModalVisible(false); supplementForm.resetFields(); }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              提交补录
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Annotate;
