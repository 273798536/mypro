import React, { useState } from 'react';
import { BookOpen, Mic, AlertTriangle, Download, ChevronDown, ChevronRight, Volume2, Cpu, Headphones } from 'lucide-react';

type GuideSection = 'prepare' | 'reproduce' | 'read' | 'workflow';

export const GuidePanel: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Set<GuideSection>>(new Set(['prepare']));

  const toggleSection = (section: GuideSection) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const isExpanded = (section: GuideSection) => expandedSections.has(section);

  const sections = [
    {
      id: 'prepare' as GuideSection,
      title: '准备音频片段',
      icon: <Mic className="w-3.5 h-3.5 text-spectrum-cyan" />,
      content: (
        <div className="space-y-3">
          <div className="p-2 bg-surface-lighter/30 rounded">
            <div className="text-xs font-medium text-slate-300 mb-1">格式要求</div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>支持 WAV、MP3、OGG、FLAC、M4A、AAC 格式</li>
              <li>推荐采样率：44100 Hz 或 48000 Hz</li>
              <li>推荐位深度：16 bit 或 24 bit</li>
              <li>单声道或立体声均可</li>
              <li>单文件不超过 50MB</li>
            </ul>
          </div>
          
          <div className="p-2 bg-spectrum-cyan/5 rounded border border-spectrum-cyan/20">
            <div className="text-xs font-medium text-spectrum-cyan mb-1">最佳实践</div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>录音时保持采样率一致，避免后期转换</li>
              <li>保留 1-2 秒的环境噪声作为参考</li>
              <li>用"原始材料"标记待处理音频，"处理结果"标记已处理音频</li>
              <li>在备注中注明录音设备和环境</li>
            </ul>
          </div>

          <div className="p-2 bg-amber-500/5 rounded border border-amber-500/20">
            <div className="text-xs font-medium text-amber-400 mb-1">⚠️ 常见问题</div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>不要对已经压缩过的音频（如低码率MP3）重新压缩</li>
              <li>避免削波（峰值超过 0 dB），会导致失真</li>
              <li>转换格式会损失质量，尽量使用原始录音</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'reproduce' as GuideSection,
      title: '复现采样率错',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
      content: (
        <div className="space-y-3">
          <div className="p-2 bg-surface-lighter/30 rounded">
            <div className="text-xs font-medium text-slate-300 mb-1">什么是采样率错误？</div>
            <p className="text-[11px] text-slate-400">
              采样率不匹配是指录音设备、播放设备或软件设置的采样率不一致，
              导致音频播放速度变快/变慢、音调升高/降低。常见于多设备协作场景。
            </p>
          </div>

          <div className="p-2 bg-amber-500/5 rounded border border-amber-500/20">
            <div className="text-xs font-medium text-amber-400 mb-1">复现步骤</div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-mono text-amber-400">1</span>
                <div>
                  <div className="text-[11px] text-slate-300">准备测试音频</div>
                  <div className="text-[10px] text-slate-500">使用 44100 Hz 采样率的正弦波（1 kHz，持续 3 秒）</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-mono text-amber-400">2</span>
                <div>
                  <div className="text-[11px] text-slate-300">创建分析批次</div>
                  <div className="text-[10px] text-slate-500">上传时不转换采样率，保持原始 44100 Hz</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-mono text-amber-400">3</span>
                <div>
                  <div className="text-[11px] text-slate-300">设置预期采样率</div>
                  <div className="text-[10px] text-slate-500">在参数中设置预期采样率为 48000 Hz（故意设错）</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-mono text-amber-400">4</span>
                <div>
                  <div className="text-[11px] text-slate-300">运行问题检测</div>
                  <div className="text-[10px] text-slate-500">系统将检测到 3900 Hz 的频率偏移（48000/44100 × 3600）</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 bg-surface-lighter/30 rounded">
            <div className="text-xs font-medium text-slate-300 mb-1">检测原理</div>
            <pre className="text-[10px] font-mono text-slate-400 p-2 bg-black/30 rounded overflow-x-auto">
{`// 检测采样率不匹配
ratio = expectedSampleRate / actualSampleRate
expectedFreq = knownReferenceFreq × ratio
detectedFreq = findPeakFrequency(spectrum)
if |detectedFreq - expectedFreq| > threshold:
    // 检测到采样率不匹配
    speedFactor = detectedFreq / knownReferenceFreq`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      id: 'read' as GuideSection,
      title: '看懂导出音频',
      icon: <Headphones className="w-3.5 h-3.5 text-spectrum-pink" />,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-spectrum-cyan/5 rounded border border-spectrum-cyan/20 text-center">
              <div className="w-6 h-6 rounded-full bg-spectrum-cyan/20 flex items-center justify-center mx-auto mb-1">
                <Volume2 className="w-3 h-3 text-spectrum-cyan" />
              </div>
              <div className="text-[10px] font-medium text-spectrum-cyan">原始</div>
              <div className="text-[9px] text-slate-500">滤波前</div>
            </div>
            <div className="p-2 bg-spectrum-pink/5 rounded border border-spectrum-pink/20 text-center">
              <div className="w-6 h-6 rounded-full bg-spectrum-pink/20 flex items-center justify-center mx-auto mb-1">
                <Volume2 className="w-3 h-3 text-spectrum-pink" />
              </div>
              <div className="text-[10px] font-medium text-spectrum-pink">处理后</div>
              <div className="text-[9px] text-slate-500">滤波后</div>
            </div>
            <div className="p-2 bg-spectrum-purple/5 rounded border border-spectrum-purple/20 text-center">
              <div className="w-6 h-6 rounded-full bg-spectrum-purple/20 flex items-center justify-center mx-auto mb-1">
                <Cpu className="w-3 h-3 text-spectrum-purple" />
              </div>
              <div className="text-[10px] font-medium text-spectrum-purple">差异</div>
              <div className="text-[9px] text-slate-500">原始-处理</div>
            </div>
          </div>

          <div className="p-2 bg-surface-lighter/30 rounded">
            <div className="text-xs font-medium text-slate-300 mb-1">波形对比要点</div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li><span className="text-spectrum-cyan">青色波形</span>：原始音频，包含噪声</li>
              <li><span className="text-spectrum-pink">粉色波形</span>：处理后音频，噪声已滤除</li>
              <li>垂直标尺：振幅（-1 到 +1）</li>
              <li>水平标尺：时间（秒）</li>
              <li>波形越"密"表示频率越高</li>
              <li>波形越"高"表示音量越大</li>
            </ul>
          </div>

          <div className="p-2 bg-surface-lighter/30 rounded">
            <div className="text-xs font-medium text-slate-300 mb-1">频谱图要点</div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>水平轴：频率（20 Hz - 20 kHz），对数刻度</li>
              <li>垂直轴：幅值（dB FS），-100 dB 到 0 dB</li>
              <li><span className="text-spectrum-cyan">青色线</span>：滤波前频谱</li>
              <li><span className="text-spectrum-pink">粉色线</span>：滤波后频谱</li>
              <li>峰值越高表示该频率能量越强</li>
              <li>50 Hz/60 Hz 及其谐波通常是电源干扰</li>
              <li>宽带平坦噪声通常是环境/麦克风底噪</li>
            </ul>
          </div>

          <div className="p-2 bg-spectrum-gradient-soft rounded border border-spectrum-cyan/30">
            <div className="text-xs font-medium text-slate-300 mb-1">听感对比方法</div>
            <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside">
              <li>使用 A/B 播放模式快速切换</li>
              <li>先听原始音频，记住噪声特征</li>
              <li>再听处理后音频，对比噪声是否消除</li>
              <li>注意听原始信号是否被"误伤"（如声音变闷）</li>
              <li>差异音频只包含被滤除的部分，用来检查误删</li>
              <li>如果差异音频里有明显的音乐成分，说明滤波过度</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'workflow' as GuideSection,
      title: '完整工作流程',
      icon: <Download className="w-3.5 h-3.5 text-spectrum-purple" />,
      content: (
        <div className="space-y-2">
          {[
            { step: 1, title: '创建批次', desc: '新建分析批次，填写来源和听感备注' },
            { step: 2, title: '上传音频', desc: '上传原始材料，可选择上传处理结果对比' },
            { step: 3, title: 'FFT 分析', desc: '设置 FFT 参数，运行频谱分析' },
            { step: 4, title: '调整滤波', desc: '选择滤波类型和频段，预览效果' },
            { step: 5, title: '应用滤波', desc: '执行滤波处理，生成处理后音频' },
            { step: 6, title: '检测问题', desc: '系统自动检测采样率、混叠等问题' },
            { step: 7, title: '查看结果', desc: '对比频谱图和波形，检查差异' },
            { step: 8, title: '导出报告', desc: '导出 PDF/JSON/WAV，所有数据同一批次' },
          ].map((item) => (
            <div key={item.step} className="flex gap-2 p-2 bg-surface-lighter/20 rounded hover:bg-surface-lighter/40 transition-colors">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-spectrum-gradient flex items-center justify-center text-[10px] font-bold text-surface">
                {item.step}
              </span>
              <div>
                <div className="text-[11px] font-medium text-slate-300">{item.title}</div>
                <div className="text-[10px] text-slate-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="card-surface spectrum-border p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-spectrum-cyan" />
        <span className="font-display font-semibold text-sm text-slate-200">使用说明</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="rounded-lg border border-slate-700/30 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-3 flex items-center gap-2 hover:bg-surface-lighter/20 transition-colors"
            >
              {section.icon}
              <span className="text-xs font-medium text-slate-300 flex-1 text-left">
                {section.title}
              </span>
              {isExpanded(section.id) ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
            
            {isExpanded(section.id) && (
              <div className="px-3 pb-3 border-t border-slate-700/30 pt-3">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700/30">
        <div className="text-[10px] text-slate-500 text-center">
          所有处理在浏览器本地完成，数据不上传服务器
        </div>
      </div>
    </div>
  );
};
