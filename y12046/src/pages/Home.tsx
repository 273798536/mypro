import { useNavigate } from 'react-router-dom'
import { Music, ScrollText, Clock, Brain } from 'lucide-react'
import { startGame } from '@/store/gameStore'

export default function Home() {
  const navigate = useNavigate()

  function handleStart() {
    startGame()
    navigate('/game')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber/10 border-2 border-amber/30 mb-6">
            <Music className="h-10 w-10 text-amber" />
          </div>
          <h1 className="font-serif text-4xl text-parchment-100 font-bold tracking-wide mb-3 text-glow-amber">
            音乐版权跑团
          </h1>
          <p className="text-ink-200 text-lg font-serif leading-relaxed max-w-lg mx-auto">
            在歌曲线索、平台通知与时间限制的夹缝中，<br />
            做出正确的版权审核判断。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10 animate-slide-in-up">
          <div className="card-base p-4 text-center">
            <ScrollText className="h-6 w-6 text-amber mx-auto mb-2" />
            <div className="text-parchment-200 text-sm font-serif font-semibold">歌曲线索</div>
            <div className="text-ink-400 text-xs mt-1">每轮歌曲卡牌</div>
          </div>
          <div className="card-base p-4 text-center">
            <Clock className="h-6 w-6 text-parchment-400 mx-auto mb-2" />
            <div className="text-parchment-200 text-sm font-serif font-semibold">时间限制</div>
            <div className="text-ink-400 text-xs mt-1">限时审核决策</div>
          </div>
          <div className="card-base p-4 text-center">
            <Brain className="h-6 w-6 text-danger mx-auto mb-2" />
            <div className="text-parchment-200 text-sm font-serif font-semibold">线索推理</div>
            <div className="text-ink-400 text-xs mt-1">每步影响推理链</div>
          </div>
        </div>

        <div className="space-y-3 animate-slide-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <button
            onClick={handleStart}
            className="btn-primary text-lg px-10 py-3 font-serif w-full max-w-xs mx-auto block"
          >
            开始审核
          </button>
          <p className="text-ink-400 text-xs font-serif">
            共4轮场景 · 每轮限时 · 结束后可复盘
          </p>
        </div>

        <div className="mt-12 card-base p-5 text-left max-w-lg mx-auto animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <h3 className="section-title mb-3">审核守则</h3>
          <ul className="space-y-2 text-sm text-ink-200 font-serif">
            <li className="flex items-start gap-2">
              <span className="text-amber mt-1">●</span>
              <span>每次操作都会影响线索推理链的走向</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-danger mt-1">●</span>
              <span>授权过期、采样比例超限、同名曲混淆——这三个陷阱最容易在对账中漏掉</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-1">●</span>
              <span>游戏结束后可回看每一步推理触发点与错因复盘</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
