import { Camera, RotateCcw, Maximize2, HelpCircle, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../store/useToastStore';
import { generateTimestamp, getSafeFilename } from '../../utils/download';

interface ToolbarProps {
  onScreenshot?: () => void;
}

export function Toolbar({ onScreenshot }: ToolbarProps) {
  const navigate = useNavigate();
  const { showToast } = useToastStore();

  const handleScreenshot = async () => {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        showToast('error', '截图失败：未找到3D画布');
        return;
      }

      const canvasEl = canvas as HTMLCanvasElement;
      const dataUrl = canvasEl.toDataURL('image/png');

      if (!dataUrl || dataUrl === 'data:,') {
        showToast('error', '截图失败：画布内容为空，请稍后重试');
        return;
      }

      const timestamp = generateTimestamp();
      const filename = getSafeFilename(`数据中心3D截图-${timestamp}.png`);

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onScreenshot?.();
      showToast('success', `截图已保存：${filename}`);
    } catch (error) {
      console.error('截图失败:', error);
      showToast('error', `截图失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleResetView = () => {
    window.location.reload();
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-2 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700/50"
      >
        <ToolbarButton
          icon={<Camera className="w-4 h-4" />}
          label="截图"
          onClick={handleScreenshot}
        />
        <ToolbarButton
          icon={<RotateCcw className="w-4 h-4" />}
          label="重置视角"
          onClick={handleResetView}
        />
        <div className="w-px h-6 bg-gray-700" />
        <ToolbarButton
          icon={<FileText className="w-4 h-4" />}
          label="巡检报告"
          onClick={() => navigate('/report')}
        />
        <ToolbarButton
          icon={<HelpCircle className="w-4 h-4" />}
          label="帮助"
          onClick={() => showToast('info', '操作说明：拖拽旋转 · 滚轮缩放 · 点击查看详情', 5000)}
        />
      </motion.div>
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all group"
      title={label}
    >
      <span className="text-gray-400 group-hover:text-cyan-400 transition-colors">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}
