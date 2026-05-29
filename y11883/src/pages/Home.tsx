import { motion } from 'framer-motion';
import { ListOrdered } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { BatchInput } from '../components/input/BatchInput';
import { ConditionPanel } from '../components/input/ConditionPanel';
import { GenerateButton } from '../components/input/GenerateButton';
import { ResultCard } from '../components/result/ResultCard';
import { PendingArea } from '../components/warning/PendingArea';
import { ErrorArea } from '../components/error/ErrorArea';
import { ExportPanel } from '../components/export/ExportPanel';
import { usePartitionStore } from '../store/usePartitionStore';

export default function Home() {
  const { problems } = usePartitionStore();
  const hasResults = problems.length > 0;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <BatchInput />
            <ConditionPanel />
            <GenerateButton />
            <PendingArea />
            <ErrorArea />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <ExportPanel />

            {hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="card"
              >
                <div className="card-header">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <ListOrdered className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-800">拆分结果</h2>
                      <p className="text-xs text-gray-500">
                        共 {problems.length} 道题目
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {problems.map((result, index) => (
                    <ResultCard key={result.problemId} result={result} index={index} />
                  ))}
                </div>
              </motion.div>
            )}

            {!hasResults && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="card"
              >
                <div className="card-body text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">📐</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    开始使用整数拆分课堂板
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    在左侧输入框中输入题目数据，设置限制条件，
                    然后点击"开始生成拆分方案"按钮
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
                    <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-600">
                      ✨ 递归生成拆分方案
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-600">
                      🔍 自动去重排序
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-600">
                      ✅ 对比学生答案
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-600">
                      📊 导出分析报告
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-16 py-8 border-t border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>整数拆分课堂板 · 帮助奥数教师高效批改作业、讲解去重原理</p>
        </div>
      </footer>
    </div>
  );
}
