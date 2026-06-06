import { useState } from 'react';
import {
  Cpu,
  Battery,
  Wifi,
  WifiOff,
  Wrench,
  Calendar,
  Play,
  FileCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Database,
  RefreshCw,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { Device } from '@/types';

function statusInfo(s: Device['status']) {
  if (s === 'online') return { label: '在线', cls: 'badge-success', dot: 'bg-sage-500' };
  if (s === 'maintenance') return { label: '维护中', cls: 'badge-warning', dot: 'bg-warm-500' };
  return { label: '离线', cls: 'bg-ink-100 text-ink-500 badge', dot: 'bg-ink-400' };
}

function StatusIcon({ status }: { status: Device['status'] }) {
  if (status === 'online') return <Wifi className="w-4 h-4 text-sage-600" />;
  if (status === 'maintenance') return <Wrench className="w-4 h-4 text-warm-600" />;
  return <WifiOff className="w-4 h-4 text-ink-400" />;
}

const scripts = [
  {
    id: 's1',
    name: '批次边界一致性检查',
    desc: '比对所有穴位标注与标准边界，输出碰撞报告',
    est: '约 12 秒',
    tag: '常用',
  },
  {
    id: 's2',
    name: '轨迹准确率批量计算',
    desc: '重新计算本批次所有轨迹点准确率和偏差值',
    est: '约 8 秒',
    tag: '常用',
  },
  {
    id: 's3',
    name: '单位与旧表清洗',
    desc: '检测历史记录中的单位混用和旧表寸法换算问题',
    est: '约 20 秒',
    tag: '数据质量',
  },
  {
    id: 's4',
    name: '异常结论溯源汇总',
    desc: '汇总所有 changedResult=true 的异常并追溯材料来源',
    est: '约 15 秒',
    tag: '评审专用',
  },
];

export default function DevicesPage() {
  const { batch } = useAppStore();
  const [running, setRunning] = useState<string | null>(null);
  const [runLog, setRunLog] = useState<string[]>([
    '[14:32:01] 系统就绪，等待脚本执行...',
  ]);

  function runScript(id: string, name: string) {
    setRunning(id);
    const lines = [
      `[${timeNow()}] 开始执行：${name}`,
      `[${timeNow()}] 加载批次数据 ${batch.id}（${batch.trajectories.length} 条轨迹）`,
      `[${timeNow()}] 关联设备数据源：${batch.devices.map(d => d.id).join(', ')}`,
      `[${timeNow()}] 正在计算边界碰撞矩阵...`,
      `[${timeNow()}] 发现 ${batch.anomalies.filter(a => a.changedResult).length} 项改变结论的异常`,
      `[${timeNow()}] 执行完成，结果已同步至图表、明细和下载队列`,
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(timer);
        setRunning(null);
        return;
      }
      setRunLog((prev) => [...prev, lines[i]]);
      i++;
    }, 350);
  }

  const onlineCount = batch.devices.filter((d) => d.status === 'online').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={Cpu}
          label="接入设备"
          value={batch.devices.length}
          sub={`${onlineCount} 台在线`}
          tone="medical"
        />
        <KpiCard
          icon={Database}
          label="本批次数据"
          value={batch.trajectories.length}
          sub="条训练轨迹"
          tone="sage"
        />
        <KpiCard
          icon={AlertTriangle}
          label="待处理异常"
          value={batch.anomalies.filter((a) => !a.resolved).length}
          sub={`${batch.anomalies.filter(a => a.changedResult).length} 项改变结论`}
          tone="warm"
        />
        <KpiCard
          icon={FileCode}
          label="可用脚本"
          value={scripts.length}
          sub="条分析流程"
          tone="ink"
        />
      </div>

      <div className="grid grid-cols-5 gap-5">
        <section className="col-span-3 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">设备清单</h2>
              <p className="section-subtitle">本批次使用的采集、定位与校准设备</p>
            </div>
            <button className="btn-ghost">
              <RefreshCw className="w-4 h-4" />
              <span>刷新状态</span>
            </button>
          </div>

          <div className="space-y-3">
            {batch.devices.map((d) => {
              const si = statusInfo(d.status);
              return (
                <div
                  key={d.id}
                  className="group p-4 rounded-2xl border border-ink-100 hover:border-medical-200 hover:bg-medical-50/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-center group-hover:bg-medical-50 group-hover:border-medical-200 transition-colors">
                      <Cpu className="w-5 h-5 text-ink-500 group-hover:text-medical-600" strokeWidth={1.6} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-medium text-ink-900">{d.name}</h3>
                        <span className={si.cls}>
                          <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                          {si.label}
                        </span>
                        <span className="text-xs text-ink-400 font-mono">{d.id}</span>
                      </div>
                      <div className="mt-1 text-xs text-ink-500">
                        {d.model} · S/N {d.serialNumber}
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-3">
                        <InfoCell icon={StatusIcon({ status: d.status })} label="连接方式" value={d.dataSource} />
                        <InfoCell icon={<Calendar className="w-4 h-4 text-ink-400" />} label="校准日期" value={d.calibrationDate} />
                        <InfoCell icon={<Clock className="w-4 h-4 text-ink-400" />} label="最近使用" value={d.lastUsed} />
                        {typeof d.battery === 'number' ? (
                          <InfoCell
                            icon={<Battery className="w-4 h-4 text-ink-400" />}
                            label="电量"
                            value={`${d.battery}%`}
                            warn={d.battery < 30}
                          />
                        ) : (
                          <InfoCell icon={<Database className="w-4 h-4 text-ink-400" />} label="供电" value="有线" />
                        )}
                      </div>
                    </div>

                    <button className="btn-ghost">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="col-span-2 card p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">分析脚本</h2>
              <p className="section-subtitle">一键执行，结果同步图表与明细</p>
            </div>
            <button className="btn-ghost">
              <Download className="w-4 h-4" />
              <span>导入</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {scripts.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-xl border border-ink-100 hover:border-medical-200 hover:bg-medical-50/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-ink-900">{s.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-medical-50 text-medical-700 font-medium">
                        {s.tag}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500 leading-relaxed">{s.desc}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-400">
                      <Clock className="w-3 h-3" />
                      {s.est}
                    </div>
                  </div>
                  <button
                    onClick={() => runScript(s.id, s.name)}
                    disabled={running !== null}
                    className={running === s.id ? 'btn-secondary opacity-70' : 'btn-primary'}
                  >
                    {running === s.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>{running === s.id ? '运行中' : '执行'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-ink-950 text-[11px] font-mono leading-relaxed flex-1 min-h-[120px] overflow-y-auto scroll-area">
            {runLog.map((l, i) => (
              <div
                key={i}
                className={
                  l.includes('完成')
                    ? 'text-sage-400'
                    : l.includes('发现') || l.includes('异常')
                    ? 'text-warm-400'
                    : 'text-ink-300'
                }
              >
                {l}
              </div>
            ))}
            {running && (
              <span className="inline-block w-2 h-3 bg-sage-400 ml-0.5 animate-pulse" />
            )}
          </div>

          <p className="mt-3 text-[11px] text-ink-400 leading-relaxed flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-sage-500 shrink-0" />
            脚本执行结果将同步更新复盘分析页的图表、数据明细和下载导出队列，确保三者来自同一批数据。
          </p>
        </section>
      </div>
    </div>
  );
}

function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub: string;
  tone: 'medical' | 'sage' | 'warm' | 'ink';
}) {
  const tones: Record<string, string> = {
    medical: 'from-medical-50 to-white border-medical-100 text-medical-700',
    sage: 'from-sage-50 to-white border-sage-100 text-sage-700',
    warm: 'from-warm-50 to-white border-warm-100 text-warm-700',
    ink: 'from-ink-50 to-white border-ink-100 text-ink-700',
  };
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${tones[tone]} border shadow-soft`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500">{label}</span>
        <Icon className="w-4 h-4 opacity-70" strokeWidth={1.8} />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-ink-900">{value}</div>
      <div className="mt-0.5 text-xs text-ink-500">{sub}</div>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] text-ink-400">
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 text-xs truncate ${warn ? 'text-warm-600 font-medium' : 'text-ink-700'}`}>
        {value}
      </div>
    </div>
  );
}
