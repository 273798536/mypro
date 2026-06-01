import { useRef } from 'react';
import type { GameResult } from '../types/matrix';

interface GradeReportProps {
  result: GameResult;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}分${secs}秒`;
}

function getGrade(accuracy: number): { grade: string; color: string; message: string } {
  if (accuracy >= 0.9) return { grade: 'A', color: 'text-green-600', message: '优秀！完全掌握了矩阵变换' };
  if (accuracy >= 0.7) return { grade: 'B', color: 'text-blue-600', message: '良好！继续努力' };
  if (accuracy >= 0.5) return { grade: 'C', color: 'text-yellow-600', message: '及格！还需多加练习' };
  return { grade: 'D', color: 'text-red-600', message: '加油！建议复习基础知识' };
}

function generateReportText(result: GameResult): string {
  const accuracy = 1 - result.errorRate;
  const gradeInfo = getGrade(accuracy);
  
  const report = `
【矩阵变换拼图 - 成绩报告】

关卡：${result.levelName}
完成状态：${result.isComplete ? '✅ 已完成' : '⏳ 进行中'}
最终评级：${gradeInfo.grade}
${gradeInfo.message}

━━━━━━━━━━━━━━━━━━━━━━

📊 数据统计

  • 总步数：${result.totalSteps} 步
  • 用时：${formatDuration(result.duration)}
  • 正确率：${Math.round(accuracy * 100)}%

🎯 矩阵计算口径说明

  拖拽拼合采用"从左到右依次相乘"的计算方式：
  网格中从左到右放置的变换块 A → B → C
  实际计算顺序为：A × B × C
  （即先应用 C，再应用 B，最后应用 A）

  【重要提示】
  矩阵乘法不满足交换律！
  A × B ≠ B × A
  变换顺序直接影响最终结果

📈 成绩分析

  目标矩阵：
  [ ${result.targetMatrix[0][0]}, ${result.targetMatrix[0][1]} ]
  [ ${result.targetMatrix[1][0]}, ${result.targetMatrix[1][1]} ]

  你的结果：
  [ ${result.finalMatrix[0][0]}, ${result.finalMatrix[0][1]} ]
  [ ${result.finalMatrix[1][0]}, ${result.finalMatrix[1][1]} ]

💡 拖拽拼合口径说明

  1. 每个变换块代表一个 2×2 矩阵
  2. 拖入网格的块按从左到右、从上到下的顺序参与计算
  3. 点击已放置的块可以将其移除
  4. 网格坐标从 (0,0) 开始，越界放置会被拒绝
  5. 每一步操作都会被记录，用于学习分析

━━━━━━━━━━━━━━━━━━━━━━

报告生成时间：${new Date().toLocaleString('zh-CN')}
矩阵变换拼图 - 线性代数学习工具
  `.trim();

  return report;
}

export default function GradeReport({ result, onClose }: GradeReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const accuracy = 1 - result.errorRate;
  const gradeInfo = getGrade(accuracy);
  const reportText = generateReportText(result);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      alert('报告已复制到剪贴板！');
    } catch {
      alert('复制失败，请手动选择文本复制');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `矩阵变换拼图 - ${result.levelName} 成绩报告`,
          text: reportText
        });
      } catch {
        // 用户取消分享
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">📄 成绩报告</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={reportRef} className="p-6 overflow-y-auto max-h-96">
          <div className="text-center mb-6">
            <div className={`text-6xl font-bold ${gradeInfo.color} mb-2`}>
              {gradeInfo.grade}
            </div>
            <p className="text-gray-500">{gradeInfo.message}</p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl mb-6">
            <h4 className="font-bold text-purple-800 mb-2">📌 拖拽拼合口径说明</h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• 网格中的变换块按位置顺序参与矩阵乘法</li>
              <li>• 计算顺序：从左到右 = 先作用右边，后作用左边</li>
              <li>• 注意：A × B ≠ B × A，顺序很重要！</li>
              <li>• 坐标从 (0,0) 开始，越界操作会被拒绝</li>
            </ul>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">关卡</span>
              <span className="font-medium text-gray-800">{result.levelName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">完成状态</span>
              <span className={`font-medium ${result.isComplete ? 'text-green-600' : 'text-yellow-600'}`}>
                {result.isComplete ? '已完成' : '未完成'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">总步数</span>
              <span className="font-medium text-gray-800">{result.totalSteps} 步</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">用时</span>
              <span className="font-medium text-gray-800">{formatDuration(result.duration)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">正确率</span>
              <span className="font-medium text-gray-800">{Math.round(accuracy * 100)}%</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            <h4 className="font-bold text-gray-700 mb-2 text-sm">报告文本</h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
              {reportText}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 px-4 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors"
          >
            📋 复制报告
          </button>
          <button
            onClick={handleShare}
            className="flex-1 px-4 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors"
          >
            📤 转发分享
          </button>
        </div>
      </div>
    </div>
  );
}
