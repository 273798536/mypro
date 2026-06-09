export default function SceneExplanation() {
  return (
    <div className="absolute bottom-4 left-4 z-10 w-96 card bg-white/95 backdrop-blur-sm">
      <h3 className="text-base font-semibold text-sand-800 mb-2">三维场景说明</h3>
      <div className="text-sm text-sand-700 space-y-2 leading-relaxed">
        <p>
          上方三维视图展示的是基于体素（Voxel）网格构建的沙丘风蚀过程。
          每个立方体代表一小块沙体，颜色越深表示该位置沙体高度越低，即风蚀越严重。
        </p>
        <p>
          <span className="font-medium text-sand-800">操作提示：</span>
          鼠标左键拖动旋转视角，滚轮缩放，右键平移。可在左上角面板选择预设视角快速切换。
          当风蚀模拟运行时，体素高度会根据风速、含水率等参数动态变化。
        </p>
        <p className="text-xs text-sand-500 border-t border-sand-200 pt-2">
          渲染说明：深色背景模拟沙漠黄昏场景，使用 InstancedMesh 批量渲染约 400 个体素，
          支持实时阴影与后处理。当前视角参数可在左上角面板查看。
        </p>
      </div>
    </div>
  );
}
