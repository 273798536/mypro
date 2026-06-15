import { useOceanStore } from "@/store/useOceanStore"
import { Database, ArrowRight } from "lucide-react"

export default function WelcomeGuide() {
  const { sampleLoaded, loadSampleData } = useOceanStore()

  if (sampleLoaded) return null

  return (
    <div className="fixed inset-0 bg-ocean-ink/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-ocean-deep px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(46,196,182,0.3) 20px, rgba(46,196,182,0.3) 21px)",
              }}
            />
          </div>
          <div className="relative">
            <div className="w-16 h-16 bg-ocean-light/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Database size={32} className="text-ocean-light" />
            </div>
            <h2 className="font-serif text-xl text-white mb-2">
              欢迎使用洋流沙盘
            </h2>
            <p className="text-white/60 text-sm">
              加载示例数据，快速了解工具功能
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600">
            示例数据包含完整潮汐周期、空值记录、重复记录、时区错误等常见场景，
            帮助您无需手动造表即可体验全部功能。
          </p>

          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ocean-light" />
              <span>6条正常潮汐记录 + 2条空值</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ocean-coral" />
              <span>2条重复记录 + 1条时区错误</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ocean-mid" />
              <span>3条水质记录 + 2条风险通报</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={loadSampleData}
            className="w-full bg-ocean-deep hover:bg-ocean-mid text-white rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg"
          >
            加载示例数据
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
