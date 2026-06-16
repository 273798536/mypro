import { X, Upload, RotateCcw, Terminal } from 'lucide-react'

interface GuideModalProps {
  open: boolean
  onClose: () => void
}

export default function GuideModal({ open, onClose }: GuideModalProps) {
  if (!open) return null

  const steps = [
    {
      icon: Upload,
      title: '放样例',
      description: '选择投诉样例数据，一键导入系统进行回放分析',
      color: 'text-fire-orange',
      bgColor: 'bg-fire-orange/10',
      borderColor: 'border-fire-orange/30',
    },
    {
      icon: RotateCcw,
      title: '重跑',
      description: '对异常投诉进行重新核验，获取最新的分析结果',
      color: 'text-success-green',
      bgColor: 'bg-success-green/10',
      borderColor: 'border-success-green/30',
    },
    {
      icon: Terminal,
      title: '查看接口返回',
      description: '查看每次操作的接口请求参数和响应数据详情',
      color: 'text-duplicate-yellow',
      bgColor: 'bg-duplicate-yellow/10',
      borderColor: 'border-duplicate-yellow/30',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-caliber-blue border border-fire-orange/30 rounded-2xl p-8 max-w-lg w-full mx-4 animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-fire-white/60 hover:text-fire-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-fire-white mb-2 font-serif">操作指引</h2>
        <p className="text-fire-white/60 mb-8">快速了解系统核心功能操作流程</p>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex gap-4 p-4 rounded-xl border ${step.borderColor} ${step.bgColor} transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className={`p-3 rounded-lg ${step.bgColor} ${step.color} shrink-0`}>
                <step.icon size={24} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${step.color} mb-1`}>
                  {index + 1}. {step.title}
                </h3>
                <p className="text-fire-white/70 text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-3 bg-fire-orange hover:bg-fire-orange/80 text-white font-medium rounded-xl transition-all duration-300"
        >
          我知道了
        </button>
      </div>
    </div>
  )
}
