import { motion } from 'framer-motion';
import { FileText, HelpCircle, Trash2 } from 'lucide-react';
import { usePartitionStore } from '../../store/usePartitionStore';

const EXAMPLE_INPUT = `5, 不允许重复, 1+4;2+3;5
6, 拆成3个数;不允许重复, 1+2+3
7, 最小2个数;最大4个数, 1+6;2+5;3+4;1+2+4
8, 包含数字2, 2+6;1+2+5;2+3+3
10, 排除数字1, 2+8;3+7;4+6;5+5`;

export function BatchInput() {
  const { rawInput, setRawInput, clearAll } = usePartitionStore();

  const loadExample = () => {
    setRawInput(EXAMPLE_INPUT);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="card"
    >
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">批量录入</h2>
            <p className="text-xs text-gray-500">每行一道题目</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadExample}
            className="px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1"
          >
            <HelpCircle className="w-4 h-4" />
            示例
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            清空
          </button>
        </div>
      </div>
      
      <div className="card-body">
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 mb-2 font-medium">格式说明：</p>
          <code className="text-xs text-gray-500 block">
            目标数字 [, 限制条件] [, 学生答案用分号分隔]
          </code>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p>• 条件：不允许重复、拆成N个数、最少N个、最多N个</p>
            <p>• 条件：包含数字x,y、排除数字x,y、最大/最小数字x</p>
          </div>
        </div>
        
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="5, 不允许重复, 1+4;2+3;5&#10;6, 拆成3个数, 1+2+3"
          className="w-full h-64 px-4 py-3 font-mono text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none scrollbar-thin"
          spellCheck={false}
        />
        
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{rawInput.split('\n').filter(l => l.trim()).length} 行</span>
          <span>{rawInput.length} 字符</span>
        </div>
      </div>
    </motion.div>
  );
}
