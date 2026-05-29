import React from 'react';
import { Leaf, DollarSign, Zap, Users, AlertTriangle, Play, BookOpen } from 'lucide-react';
import { ParticleBackground } from '@/components/ParticleBackground';
import { useGameEngine } from '@/hooks/useGameEngine';
import { GAME_CONFIG } from '@/data/gameConfig';
import { formatNumber } from '@/utils/carbonCalculator';
const HomePage: React.FC = () => {
 const { startGame } = useGameEngine();
 const initial = GAME_CONFIG.INITIAL_RESOURCES;
 const cards = [
 {
 icon: DollarSign,
 title: '活动经费',
 value: `¥${formatNumber(initial.budget)}`,
 description: '用于策划和执行各类环保活动',
 color: 'text-mint-300',
 bgColor: 'bg-mint-400/10',
 },
 {
 icon: Zap,
 title: '用电额度',
 value: `${formatNumber(initial.electricity)} kWh`,
 description: '校园分配的年度用电指标',
 color: 'text-yellow-300',
 bgColor: 'bg-yellow-400/10',
 },
 {
 icon: Users,
 title: '交通配额',
 value: `${formatNumber(initial.transport)} 人次`,
 description: '可调用的交通资源限额',
 color: 'text-blue-300',
 bgColor: 'bg-blue-400/10',
 },
 ];
 return (<div className="min-h-screen bg-carbon-pattern relative overflow-hidden">
 <ParticleBackground intensity={1.2} carbonReduction={0}/>
 <div className="relative z-10 container py-12">
 <div className="text-center mb-16 animate-slide-up">
 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
 <Leaf className="w-5 h-5 text-mint-400"/>
 <span className="text-mint-300 font-medium">校园碳中和经营赛</span>
 </div>
 <h1 className="font-display text-5xl md:text-7xl font-bold text-carbon-50 mb-6 leading-tight">
 在<span className="text-mint-400">碳预算</span>内
 <br />
 做出正确的
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-mint-300 to-mint-500">取舍</span>
 </h1>
 <p className="text-xl text-carbon-300 max-w-2xl mx-auto mb-10">
 扮演环保社团负责人，在活动经费、用电和交通之间做权衡。
 你的每一个选择都会真实改变校园碳足迹和最终报告。
 </p>
 <div className="flex flex-col sm:flex-row gap-4 justify-center">
 <button onClick={() => startGame('normal')} className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-mint-500 to-mint-400 text-carbon-900 font-display font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-mint-400/30 transition-all hover:scale-105 animate-pulse-slow">
 <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
 开始游戏
 </button>
 <button onClick={() => startGame('demo')} className="px-8 py-4 rounded-2xl glass border-2 border-burnt-400/50 text-burnt-300 font-display font-semibold text-lg flex items-center justify-center gap-3 hover:bg-burnt-400/10 transition-all group">
 <AlertTriangle className="w-5 h-5 group-hover:animate-pulse"/>
 异常样例验证
 </button>
 </div>
 </div>
 <div className="grid md:grid-cols-3 gap-6 mb-16">
 {cards.map((card, idx) => (<div key={idx} className="glass rounded-3xl p-6 hover:translate-y-[-8px] transition-all duration-300 hover:shadow-2xl animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
 <div className={`w-14 h-14 rounded-2xl ${card.bgColor} flex items-center justify-center mb-4`}>
 <card.icon className={`w-7 h-7 ${card.color}`}/>
 </div>
 <h3 className="font-display text-xl font-bold text-carbon-50 mb-2">{card.title}</h3>
 <div className={`font-mono text-2xl font-bold ${card.color} mb-3`}>
 {card.value}
 </div>
 <p className="text-carbon-400 text-sm">{card.description}</p>
 </div>))}
 </div>
 <div className="glass rounded-3xl p-8 mb-16">
 <div className="flex items-center gap-3 mb-6">
 <BookOpen className="w-6 h-6 text-mint-400"/>
 <h2 className="font-display text-2xl font-bold text-carbon-50">游戏规则</h2>
 </div>
 <div className="grid md:grid-cols-2 gap-8">
 <div className="space-y-4">
 <div className="flex gap-4">
 <div className="w-10 h-10 rounded-full bg-mint-400/20 flex items-center justify-center flex-shrink-0 font-display font-bold text-mint-300">1</div>
 <div>
 <h4 className="font-semibold text-carbon-100 mb-1">共 {GAME_CONFIG.TOTAL_ROUNDS} 个回合</h4>
 <p className="text-sm text-carbon-400">每回合选择活动组合，平衡资源消耗与碳减排效果</p>
 </div>
 </div>
 <div className="flex gap-4">
 <div className="w-10 h-10 rounded-full bg-mint-400/20 flex items-center justify-center flex-shrink-0 font-display font-bold text-mint-300">2</div>
 <div>
 <h4 className="font-semibold text-carbon-100 mb-1">三大核心约束</h4>
 <p className="text-sm text-carbon-400">经费、用电、交通三项资源均不可透支，否则触发异常</p>
 </div>
 </div>
 <div className="flex gap-4">
 <div className="w-10 h-10 rounded-full bg-mint-400/20 flex items-center justify-center flex-shrink-0 font-display font-bold text-mint-300">3</div>
 <div>
 <h4 className="font-semibold text-carbon-100 mb-1">数据合并确认</h4>
 <p className="text-sm text-carbon-400">活动数据与用电数据分别维护，差异需人工确认合并</p>
 </div>
 </div>
 </div>
 <div className="space-y-4">
 <div className="flex gap-4">
 <div className="w-10 h-10 rounded-full bg-burnt-400/20 flex items-center justify-center flex-shrink-0 font-display font-bold text-burnt-300">⚠</div>
 <div>
 <h4 className="font-semibold text-carbon-100 mb-1">预算透支</h4>
 <p className="text-sm text-carbon-400">资源消耗超过限额，触发预算透支异常，影响合规评分</p>
 </div>
 </div>
 <div className="flex gap-4">
 <div className="w-10 h-10 rounded-full bg-burnt-400/20 flex items-center justify-center flex-shrink-0 font-display font-bold text-burnt-300">⚠</div>
 <div>
 <h4 className="font-semibold text-carbon-100 mb-1">重复抵扣</h4>
 <p className="text-sm text-carbon-400">同一碳减排记录被多次抵扣，系统自动检测并撤销</p>
 </div>
 </div>
 <div className="flex gap-4">
 <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0 font-display font-bold text-yellow-300">⚠</div>
 <div>
 <h4 className="font-semibold text-carbon-100 mb-1">方案延迟</h4>
 <p className="text-sm text-carbon-400">低碳方案可能因各种原因延迟生效，影响碳减排进度</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 <div className="text-center text-carbon-500 text-sm">
 <p>© 校园碳中和经营赛 · 环保社团专属训练工具</p>
 </div>
 </div>
 </div>);
};
export default HomePage;
