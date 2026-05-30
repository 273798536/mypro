import { Search, Music2, Target, FileSearch } from 'lucide-react'
import Header from '@/components/Header'
import CaseCard from '@/components/CaseCard'
import { CASES } from '@/data/mockData'
import { useGameStore } from '@/store/gameStore'

const HomePage = () => {
  const { solvedCases, totalScore } = useGameStore()

  const features = [
    {
      icon: Music2,
      title: '音频线索听辨',
      description: '聆听和弦音频，训练耳朵对音高和音色的敏感度',
    },
    {
      icon: Target,
      title: '线索组合推理',
      description: '将乐理知识与音频线索结合，形成完整推理链',
    },
    {
      icon: FileSearch,
      title: '错因追溯复盘',
      description: '每条判断都可追溯原始来源，让错误成为学习机会',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="relative py-20 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-700/50 to-primary-800" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 bg-accent-gold rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-gold/10 border border-accent-gold/30 rounded-full mb-6">
              <Search className="w-4 h-4 text-accent-gold" />
              <span className="text-sm text-accent-gold">音乐教师训练原型</span>
            </div>

            <h1 className="font-serif text-5xl font-bold text-white mb-6 leading-tight">
              乐理和弦侦探
              <span className="block text-accent-gold">Chord Detective</span>
            </h1>

            <p className="text-xl text-primary-200 mb-8 max-w-2xl mx-auto leading-relaxed">
              像侦探一样破解乐理谜题。通过音频线索、线索本和推理链，
              让每条判断都有根有据，让每个错误都清晰可追溯。
            </p>

            <div className="flex items-center justify-center gap-8 mb-12">
              <div className="text-center">
                <div className="text-4xl font-bold text-accent-gold">{solvedCases.length}</div>
                <div className="text-sm text-primary-300">已破案件</div>
              </div>
              <div className="w-px h-12 bg-primary-600" />
              <div className="text-center">
                <div className="text-4xl font-bold text-accent-gold">{totalScore}</div>
                <div className="text-sm text-primary-300">累计积分</div>
              </div>
              <div className="w-px h-12 bg-primary-600" />
              <div className="text-center">
                <div className="text-4xl font-bold text-accent-gold">{CASES.length}</div>
                <div className="text-sm text-primary-300">可用案件</div>
              </div>
            </div>

            <div className="scroll-smooth">
              <a
                href="#cases"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                开始调查案件
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-primary-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-serif text-3xl font-bold text-white text-center mb-12">
              核心能力训练
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div
                    key={index}
                    className="p-6 rounded-xl bg-primary-700/50 border border-primary-600 hover:border-accent-gold/50 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-accent-gold/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-accent-gold" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-primary-300">{feature.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="cases" className="py-16 px-6 bg-primary-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl font-bold text-white mb-4">
                案件档案
              </h2>
              <p className="text-primary-300">
                选择一个案件开始调查。每个案件包含不同的乐理知识点。
              </p>
              <p className="text-primary-400 text-sm mt-2">
                <span className="text-accent-gold">💡 提示</span>：
                样例包含正常记录、转位误判、同名调混淆、线索重复四个测试场景
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {CASES.map((caseData, index) => (
                <div key={caseData.id} style={{ animationDelay: `${index * 0.1}s` }}>
                  <CaseCard caseData={caseData} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="py-8 px-6 bg-primary-900 border-t border-primary-800">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-primary-500 text-sm">
              乐理和弦侦探 · 音乐教师训练原型 · 让每条判断都有迹可循
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default HomePage
