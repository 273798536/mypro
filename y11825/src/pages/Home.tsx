import { Link } from 'react-router-dom';
import { Play, BookOpen, ShieldAlert, TrendingUp, Zap, Target, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const features = [
    {
      icon: <ShieldAlert className="w-8 h-8 text-[var(--color-accent-danger)]" />,
      title: '守住客户组合',
      description: '通过放置期权防御塔，抵御波动率冲击，避免组合被穿仓',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-[var(--color-accent-success)]" />,
      title: '理解隐含波动率',
      description: '直观感受波动率变化对期权组合价值和保证金的影响',
    },
    {
      icon: <Target className="w-8 h-8 text-[var(--color-accent-warning)]" />,
      title: '精准错误定位',
      description: '保证金不足和强平错误直接指向具体期权卡或波动事件',
    },
    {
      icon: <Layers className="w-8 h-8 text-[var(--color-accent-info)]" />,
      title: '版本差异对比',
      description: '期权卡和波动事件修改时显示差异，不默默采用',
    },
  ];

  return (
    <div className="space-y-12">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center py-16"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)] text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          <span>全新投教方式</span>
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[var(--color-accent-info)] via-[var(--color-accent-warning)] to-[var(--color-accent-danger)] bg-clip-text text-transparent">
          期权波动塔防
        </h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8">
          课堂上讲隐含波动率没人有感觉？<br />
          让学生用小游戏守住客户组合不被穿仓！
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/lobby"
            className="btn-primary text-lg px-8 py-4 flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            开始游戏
          </Link>
          <Link
            to="/admin/option-cards"
            className="btn-secondary text-lg px-8 py-4 flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            投教后台
          </Link>
        </div>
      </motion.section>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="glass-card p-6 hover:scale-105 transition-transform duration-300"
          >
            <div className="mb-4">{feature.icon}</div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--color-text-primary)]">
              {feature.title}
            </h3>
            <p className="text-[var(--color-text-secondary)] text-sm">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </section>

      <section className="glass-card p-8">
        <h2 className="font-display text-2xl font-bold mb-6 text-center">游戏玩法</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-info)]/20 flex items-center justify-center mx-auto mb-4">
              <span className="font-display text-2xl font-bold text-[var(--color-accent-info)]">1</span>
            </div>
            <h3 className="font-semibold mb-2">放置防御塔</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              拖拽期权卡到地图上放置防御塔，不同期权类型有不同的Vega暴露和保证金占用
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-warning)]/20 flex items-center justify-center mx-auto mb-4">
              <span className="font-display text-2xl font-bold text-[var(--color-accent-warning)]">2</span>
            </div>
            <h3 className="font-semibold mb-2">应对波动冲击</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              波动率事件会触发波动冲击，实时影响期权价值和保证金要求
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-success)]/20 flex items-center justify-center mx-auto mb-4">
              <span className="font-display text-2xl font-bold text-[var(--color-accent-success)]">3</span>
            </div>
            <h3 className="font-semibold mb-2">管理保证金</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              保持充足保证金，避免被强制平仓。结算后查看详细扣分原因
            </p>
          </div>
        </div>
      </section>

      <section className="text-center">
        <h2 className="font-display text-2xl font-bold mb-4">核心特色</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            '精确波动率计算',
            '人文化扣分原因',
            '错误一键定位',
            '版本差异对比',
            '新旧结果并排',
            '完整复盘回放',
            '手动修正入口',
            '导出复盘报告',
          ].map((tag, index) => (
            <span
              key={index}
              className="px-4 py-2 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
