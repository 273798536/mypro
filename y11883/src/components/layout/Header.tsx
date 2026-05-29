import { motion } from 'framer-motion';
import { Calculator, Sigma } from 'lucide-react';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 text-white py-8 px-6 shadow-xl"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Calculator className="w-8 h-8" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-primary-800 font-bold text-sm">
              <Sigma className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-wide">
              整数拆分课堂板
            </h1>
            <p className="text-primary-100 text-sm mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
              递归生成 · 去重解释 · 批量处理
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm backdrop-blur-sm">
            📊 批量录入题目
          </span>
          <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm backdrop-blur-sm">
            🔍 自动去重排序
          </span>
          <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm backdrop-blur-sm">
            ✅ 学生答案对比
          </span>
          <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm backdrop-blur-sm">
            ⚠️ 异常预警检测
          </span>
        </div>
      </div>
    </motion.header>
  );
}
