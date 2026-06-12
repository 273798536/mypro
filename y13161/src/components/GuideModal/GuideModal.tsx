import React from 'react';
import { X, Play, RotateCcw, History, FileText, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="使用说明">
      <div className="space-y-6">
        <p className="text-sm text-deep-sea-200">
          海浪浮标阈值预警系统用于分析传感器日志数据，检测单位混写、方向反转和阈值超限等异常。
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-deep-sea-700 rounded-lg border border-deep-sea-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-ocean-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-ocean-400" />
              </div>
              <h4 className="font-medium text-deep-sea-100">1. 放样例</h4>
            </div>
            <div className="text-sm text-deep-sea-200 space-y-2">
              <p>点击左侧「加载样例数据」按钮，快速体验系统功能。</p>
              <p className="text-deep-sea-400">样例数据包含以下异常场景：</p>
              <ul className="text-xs text-deep-sea-300 space-y-1 pl-4">
                <li>• 单位混写：波高数据 m 与 km 混用</li>
                <li>• 速度单位混写：m/s 与 km/h 混用</li>
                <li>• 方向符号写反：N/S 方向反转</li>
                <li>• 阈值超限：波高超过15m阈值</li>
              </ul>
              <div className="flex items-center gap-2 mt-2 text-ocean-400">
                <ArrowRight className="w-4 h-4" />
                <span>导入后自动分析并生成异常报告</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-deep-sea-700 rounded-lg border border-deep-sea-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-alert-green/20 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-alert-green" />
              </div>
              <h4 className="font-medium text-deep-sea-100">2. 重跑</h4>
            </div>
            <div className="text-sm text-deep-sea-200 space-y-2">
              <p>点击左侧「重跑分析」按钮，使用当前参数重新分析数据。</p>
              <p className="text-deep-sea-400">适用场景：</p>
              <ul className="text-xs text-deep-sea-300 space-y-1 pl-4">
                <li>• 修改参数配置后重新检测</li>
                <li>• 确认异常后重新统计</li>
                <li>• 对比不同参数的分析结果</li>
              </ul>
              <div className="flex items-center gap-2 mt-2 text-ocean-400">
                <ArrowRight className="w-4 h-4" />
                <span>每次重跑自动保存为新的历史记录</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-deep-sea-700 rounded-lg border border-deep-sea-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-alert-yellow/20 flex items-center justify-center">
                <History className="w-4 h-4 text-alert-yellow" />
              </div>
              <h4 className="font-medium text-deep-sea-100">3. 查看历史时间线</h4>
            </div>
            <div className="text-sm text-deep-sea-200 space-y-2">
              <p>左侧历史时间线展示所有分析记录，点击即可加载查看。</p>
              <p className="text-deep-sea-400">功能说明：</p>
              <ul className="text-xs text-deep-sea-300 space-y-1 pl-4">
                <li>• 点击不同记录切换查看</li>
                <li>• 再次点击当前记录查看详情</li>
                <li>• 最多保存50条历史记录</li>
                <li>• 数据保存在浏览器本地存储</li>
              </ul>
              <div className="flex items-center gap-2 mt-2 text-ocean-400">
                <ArrowRight className="w-4 h-4" />
                <span>支持追溯任意历史分析结果</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-alert-cyan/10 border border-alert-cyan/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Play className="w-4 h-4 text-alert-cyan mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-alert-cyan mb-1">快速开始</div>
              <div className="text-xs text-deep-sea-200">
                点击左侧「加载样例数据」按钮，即可立即查看完整的异常分析演示。
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-primary">
            知道了
          </button>
        </div>
      </div>
    </Modal>
  );
};
