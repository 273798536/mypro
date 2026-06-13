import React from 'react';
import { Modal, Descriptions, Tag, Divider, Alert } from 'antd';
import { InfoCircleOutlined, ImportOutlined, BarChartOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';

const GuideModal: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { showGuideModal } = state;

  const handleCancel = () => {
    dispatch({ type: 'TOGGLE_GUIDE_MODAL', payload: false });
  };

  // 使用解构赋值避免dispatch未使用警告
  const _unused = dispatch;

  return (
    <Modal
      title="使用说明（算法值班人交接文档）"
      open={showGuideModal}
      onCancel={handleCancel}
      footer={null}
      width={720}
    >
      <Alert
        type="success"
        showIcon
        message="交接友好设计"
        description="本工具按功能分区，每个区域有明确标题和功能说明，无需询问即可上手。"
        style={{ marginBottom: 16 }}
      />

      <Divider orientation="left">
        <ImportOutlined style={{ marginRight: 4 }} />
        数据导入区（顶部）
      </Divider>
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="位置">
          页面顶部工具栏，<Tag color="blue">加载示例数据</Tag> 或 <Tag color="green">导入JSON</Tag> 按钮
        </Descriptions.Item>
        <Descriptions.Item label="用途">
          加载扭矩数据进行分析。支持示例数据（方便测试）和自定义JSON导入。
        </Descriptions.Item>
        <Descriptions.Item label="数据处理规则">
          导入时自动标记：<Tag color="orange">异常值</Tag>（3σ原则）、
          <Tag color="red">重复设备</Tag>（相同device_id）、
          <Tag color="magenta">脏数据</Tag>（特殊字符/空值），
          <span style={{ color: '#faad14', fontWeight: 'bold' }}>原始数据不做任何修改</span>
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">
        <SearchOutlined style={{ marginRight: 4 }} />
        筛选区（摘要下方）
      </Divider>
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="位置">
          页面摘要下方的筛选面板
        </Descriptions.Item>
        <Descriptions.Item label="筛选条件">
          设备编号、时间范围、扭矩范围、单位、关键词、异常值/重复/脏数据快速筛选
        </Descriptions.Item>
        <Descriptions.Item label="重要特性">
          筛选条件自动同步到「页面摘要」，导出时单独成sheet，确保筛选口径可追溯
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">
        <BarChartOutlined style={{ marginRight: 4 }} />
        数据查看区（中部）
      </Divider>
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="页面摘要">
          固定在顶部，显示总览统计，与导出文件「页面摘要」sheet完全一致
        </Descriptions.Item>
        <Descriptions.Item label="扭矩曲线图">
          <span style={{ color: '#faad14', fontWeight: 'bold' }}>极端值不做平均处理</span>，
          不同标记用不同颜色区分：蓝色=正常、橙色=偏高异常、绿色=偏低异常、
          红色=重复设备、紫色=脏数据。点击数据点查看详情。
        </Descriptions.Item>
        <Descriptions.Item label="数据表格">
          显示完整数据列表，所有标记（异常、重复、脏数据、跳变）均在表格中显示，
          导出时保留这些标记列
        </Descriptions.Item>
        <Descriptions.Item label="跳变诊断">
          自动识别扭矩跳变超过50%的事件，诊断三类原因：
          <Tag color="orange">阈值穿越</Tag>、
          <Tag color="blue">单位变化</Tag>、
          <Tag color="red">名称不一致</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">
        <ExportOutlined style={{ marginRight: 4 }} />
        导出区（顶部工具栏）
      </Divider>
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="入口">
          顶部工具栏 <Tag color="cyan">导出</Tag> 按钮
        </Descriptions.Item>
        <Descriptions.Item label="内容配置">
          可选择导出：页面摘要、筛选口径、跳变诊断、原始数据、标记列
        </Descriptions.Item>
        <Descriptions.Item label="一致性保证">
          导出的「页面摘要」和「筛选口径」与当前页面显示完全一致，
          不会因导出而重新计算或修改数据
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">
        <InfoCircleOutlined style={{ marginRight: 4 }} />
        设计原则（老唐要求）
      </Divider>
      <Alert
        type="warning"
        showIcon
        message="核心原则"
        description={
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li><strong>极端值不平均</strong>：保留原始数据，异常点单独标记不做平滑处理</li>
            <li><strong>导出不与屏幕分家</strong>：导出的摘要和筛选口径与页面完全一致</li>
            <li><strong>脏数据保留原始痕迹</strong>：维修备注不自动修改，清洗后内容仅作参考</li>
            <li><strong>重复设备全程标记</strong>：列表、详情、导出均有is_duplicate标记</li>
            <li><strong>跳变可诊断</strong>：自动区分阈值、单位、名称不一致三类原因</li>
            <li><strong>交接友好</strong>：模块分区清晰，说明文字嵌入每个区域</li>
          </ul>
        }
      />
    </Modal>
  );
};

export default GuideModal;
