import { BookOpen, AlertTriangle, CheckCircle, ArrowRight, BugPlay, Activity } from 'lucide-react';

export const GuidePage = () => {
  return (
    <div className="min-h-screen bg-primary-950 pl-64">
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-white mb-2">使用说明</h1>
          <p className="text-primary-400">
            快速上手：3步完成声学隔音墙评估
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          {[
            {
              step: '01',
              title: '准备道路噪声数据',
              desc: '录入或导入道路的交通流量、车速、重型车比例，以及8个频段的噪声声压级数据。',
              color: 'accent-blue',
            },
            {
              step: '02',
              title: '设置墙体与材料',
              desc: '定义隔音墙的高度、长度、位置，选择对应的声学材料参数。确保材料频段数据完整。',
              color: 'accent-orange',
            },
            {
              step: '03',
              title: '执行计算并导出',
              desc: '选择居民接收点，系统自动对齐数据并计算。通过校验后可导出地图和评估报告。',
              color: 'accent-green',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-primary-900/80 border border-primary-700 rounded-xl p-6 relative overflow-hidden group hover:border-primary-500 transition-all"
            >
              <div className={`text-6xl font-bold font-display text-${item.color}/10 absolute -top-2 -right-2 group-hover:scale-110 transition-transform`}>
                {item.step}
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-primary-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BookOpen size={22} className="text-accent-blue" />
              怎样准备道路噪声数据
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-primary-800/50 rounded-lg">
                <h3 className="text-sm font-medium text-white mb-2">数据来源</h3>
                <ul className="text-sm text-primary-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <ArrowRight size={14} className="text-accent-orange mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-white">现场监测：</strong>
                      使用声级计测量各频段的等效声级，推荐使用1/1倍频程分析仪
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight size={14} className="text-accent-orange mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-white">经验公式：</strong>
                      根据《公路建设项目环境影响评价规范》计算，车速60km/h时参考值70-75dB
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight size={14} className="text-accent-orange mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-white">软件模拟：</strong>
                      使用Cadna/A、SoundPLAN等噪声模拟软件计算得到的频谱数据
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-primary-800/50 rounded-lg">
                <h3 className="text-sm font-medium text-white mb-2">必须包含的8个频段</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { band: '63Hz', range: '60-75 dB', note: '低频段' },
                    { band: '125Hz', range: '65-80 dB', note: '中低频' },
                    { band: '250Hz', range: '70-85 dB', note: '中频段' },
                    { band: '500Hz', range: '73-88 dB', note: '中频段' },
                    { band: '1kHz', range: '70-86 dB', note: '中高频' },
                    { band: '2kHz', range: '67-83 dB', note: '高频段' },
                    { band: '4kHz', range: '64-80 dB', note: '高频段' },
                    { band: '8kHz', range: '60-76 dB', note: '超高频' },
                  ].map((item) => (
                    <div
                      key={item.band}
                      className="p-3 bg-primary-900/50 rounded-lg border border-primary-700"
                    >
                      <div className="font-mono font-bold text-accent-orange">{item.band}</div>
                      <div className="text-xs text-white">{item.range}</div>
                      <div className="text-[10px] text-primary-500">{item.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-accent-green/10 border border-accent-green/30 rounded-lg">
                <h3 className="text-sm font-medium text-accent-green mb-2 flex items-center gap-2">
                  <CheckCircle size={16} />
                  数据质量检查清单
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-primary-300">
                    <CheckCircle size={14} className="text-accent-green flex-shrink-0" />
                    所有8个频段数据完整
                  </div>
                  <div className="flex items-center gap-2 text-primary-300">
                    <CheckCircle size={14} className="text-accent-green flex-shrink-0" />
                    数值范围在40-120dB之间
                  </div>
                  <div className="flex items-center gap-2 text-primary-300">
                    <CheckCircle size={14} className="text-accent-green flex-shrink-0" />
                    记录监测时间和天气条件
                  </div>
                  <div className="flex items-center gap-2 text-primary-300">
                    <CheckCircle size={14} className="text-accent-green flex-shrink-0" />
                    注明数据来源（监测/模拟）
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BugPlay size={22} className="text-accent-orange" />
              怎样复现频段缺失
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-primary-300">
                频段缺失是评估中最常见的问题。使用"复现"功能可以帮助您测试系统的错误处理能力，
                或演示给团队成员看如何定位和修复这类问题。
              </p>

              <div className="p-4 bg-accent-orange/10 border border-accent-orange/30 rounded-lg">
                <h3 className="text-sm font-medium text-accent-orange mb-2">复现步骤</h3>
                <ol className="text-sm text-primary-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-accent-orange/20 text-accent-orange w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>进入"频段分析"页面，点击右上角的 <span className="font-mono bg-primary-800 px-1.5 py-0.5 rounded">"复现频段缺失"</span> 按钮</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-accent-orange/20 text-accent-orange w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>系统会自动添加一条道路噪声源和一份材料，两者都包含随机的频段缺失</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-accent-orange/20 text-accent-orange w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>在热力图中查看红色单元格（数据缺失），或在错误列表中查看详细问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-accent-orange/20 text-accent-orange w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      4
                    </span>
                    <span>点击红色单元格可快速填入默认值，或在"材料管理"中手动编辑修复</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-accent-orange/20 text-accent-orange w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      5
                    </span>
                    <span>修复完成后，回到"声衰减计算"页面，现在按钮应该可以点击了</span>
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-accent-red/10 border border-accent-red/30 rounded-lg">
                <h3 className="text-sm font-medium text-accent-red mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  为什么会出现频段缺失？
                </h3>
                <ul className="text-sm text-primary-300 space-y-1.5">
                  <li>• 原始监测数据不完整，部分频段未测量</li>
                  <li>• Excel表格导入时行列错位</li>
                  <li>• 材料检测报告只提供了部分频段数据</li>
                  <li>• 不同来源的数据频段划分不一致</li>
                  <li>• 手动录入时遗漏或输入错误</li>
                </ul>
              </div>

              <div className="p-4 bg-primary-800/50 rounded-lg">
                <h3 className="text-sm font-medium text-white mb-2">
                  <Activity size={16} className="inline mr-2 text-accent-green" />
                  问题定位示例
                </h3>
                <div className="bg-primary-900/80 rounded-lg p-4 font-mono text-sm">
                  <div className="text-accent-red mb-1">频段缺失错误</div>
                  <div className="text-white mb-2">
                    材料"木屑压缩板"的频段250Hz隔声量数据缺失
                  </div>
                  <div className="text-primary-400 text-xs space-y-0.5">
                    <div>文件: 材料参数表_木屑.xlsx</div>
                    <div>行号: 第7行</div>
                    <div className="text-accent-green">
                      建议: 请补充"材料参数表_木屑.xlsx"第7行的250Hz隔声量数据，参考范围：10-50 dB
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">常见问题</h2>
            <div className="space-y-3">
              {[
                {
                  q: '计算按钮是灰色的，无法点击？',
                  a: '请检查数据校验面板，修复所有红色标记的错误后才能计算。警告不影响计算，但可能影响结果准确性。',
                },
                {
                  q: '居民点重复是什么意思？',
                  a: '两个居民点经纬度偏差小于0.0001度（约10米）会被判定为重复。请删除重复项或修正坐标。',
                },
                {
                  q: '为什么计算结果显示"仅供参考"？',
                  a: '因为存在频段缺失，计算时跳过了缺失频段，结果可能偏低。补充完整数据后可获得准确结果。',
                },
                {
                  q: '适用范围中的A计权是什么意思？',
                  a: 'A计权是模拟人耳对不同频率声音敏感度的加权方式，是环境噪声评价的标准方法。',
                },
                {
                  q: '地图底图是暗色的，可以切换吗？',
                  a: '目前使用暗色风格底图以匹配整体界面。如需浅色底图，可在导出后在其他GIS软件中更换。',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-primary-800/30 rounded-lg border border-primary-700/50 hover:border-primary-600 transition-all"
                >
                  <div className="text-sm font-medium text-white mb-1">Q: {item.q}</div>
                  <div className="text-sm text-primary-400">A: {item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-primary-800/30 border border-primary-700 rounded-xl text-center">
          <p className="text-sm text-primary-400">
            本工具基于 ISO 9613-2:1996 声学标准开发，计算结果仅供参考。
            正式环评报告请使用专业软件并结合现场监测数据。
          </p>
        </div>
      </div>
    </div>
  );
};
