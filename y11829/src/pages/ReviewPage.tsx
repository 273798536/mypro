import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { scenarios } from "@/utils/scenarios";
import {
  ArrowLeft,
  Clock,
  Crown,
  AlertTriangle,
  Snowflake,
  Users,
  ArrowUpDown,
  FileText,
} from "lucide-react";

const eventTypeLabels: Record<string, string> = {
  customer_arrive: "客户到达",
  vip_preempt: "VIP挤占",
  service_start: "开始服务",
  service_complete: "服务完成",
  service_interrupted: "服务中断",
  appointment_expired: "预约过号",
  counter_broken: "柜台故障",
  counter_cooldown_start: "冷却开始",
  counter_recovered: "柜台恢复",
  queue_reorder: "队列重排",
};

const eventTypeColors: Record<string, string> = {
  customer_arrive: "bg-slate-700 border-slate-500",
  vip_preempt: "bg-amber-900/40 border-amber-500",
  service_start: "bg-blue-900/40 border-blue-500",
  service_complete: "bg-emerald-900/40 border-emerald-500",
  service_interrupted: "bg-orange-900/40 border-orange-500",
  appointment_expired: "bg-red-900/40 border-red-500",
  counter_broken: "bg-red-900/40 border-red-600",
  counter_cooldown_start: "bg-blue-900/40 border-blue-400",
  counter_recovered: "bg-emerald-900/40 border-emerald-400",
  queue_reorder: "bg-purple-900/40 border-purple-500",
};

const eventTypeIcons: Record<string, React.ReactNode> = {
  customer_arrive: <Users className="w-3.5 h-3.5" />,
  vip_preempt: <Crown className="w-3.5 h-3.5" />,
  service_start: <FileText className="w-3.5 h-3.5" />,
  service_complete: <FileText className="w-3.5 h-3.5" />,
  service_interrupted: <AlertTriangle className="w-3.5 h-3.5" />,
  appointment_expired: <Clock className="w-3.5 h-3.5" />,
  counter_broken: <AlertTriangle className="w-3.5 h-3.5" />,
  counter_cooldown_start: <Snowflake className="w-3.5 h-3.5" />,
  counter_recovered: <Snowflake className="w-3.5 h-3.5" />,
  queue_reorder: <ArrowUpDown className="w-3.5 h-3.5" />,
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const store = useGameStore();
  const scenario = scenarios.find((s) => s.id === store.scenarioId);

  const reorderEvents = store.events.filter(
    (e) => e.type === "queue_reorder" || e.type === "vip_preempt"
  );

  const cooldownEvents = store.events.filter(
    (e) =>
      e.type === "counter_broken" ||
      e.type === "counter_cooldown_start" ||
      e.type === "counter_recovered" ||
      e.type === "service_interrupted"
  );

  const failureEvents = store.events.filter(
    (e) =>
      e.type === "appointment_expired" ||
      e.type === "service_interrupted" ||
      e.type === "counter_broken"
  );

  return (
    <div className="min-h-screen bg-[#0F1F33] flex flex-col">
      <header className="bg-[#1B3A5C] border-b border-slate-700 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <h1 className="text-lg font-bold text-white">复盘报告</h1>
          {scenario && (
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              场景{scenario.id}: {scenario.name}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1B3A5C]/80 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">已服务</span>
            </div>
            <span className="font-mono text-3xl font-bold text-emerald-400">
              {store.score.served}
            </span>
          </div>
          <div className="bg-[#1B3A5C]/80 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-white">失败项</span>
            </div>
            <span className="font-mono text-3xl font-bold text-red-400">
              {store.failedCustomerIds.length + store.events.filter(e => e.type === "service_interrupted").length}
            </span>
          </div>
          <div className="bg-[#1B3A5C]/80 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#D4A843]" />
              <span className="text-sm font-bold text-white">总用时</span>
            </div>
            <span className="font-mono text-3xl font-bold text-[#D4A843]">
              {store.tick}s
            </span>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#D4A843]" />
            事件时间线
          </h2>
          <div className="bg-[#1B3A5C]/50 rounded-xl p-4 border border-slate-700 max-h-[400px] overflow-y-auto">
            {store.events.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                暂无事件
              </p>
            ) : (
              <div className="space-y-2">
                {store.events.map((event, idx) => (
                  <div
                    key={event.id}
                    className={`
                      flex items-start gap-3 rounded-lg p-3 border-l-4
                      ${eventTypeColors[event.type] || "bg-slate-700 border-slate-500"}
                    `}
                  >
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <span className="font-mono text-xs text-slate-400">
                        {event.tick}s
                      </span>
                      {eventTypeIcons[event.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">
                          {eventTypeLabels[event.type] || event.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 mt-0.5">
                        {event.data.details}
                      </p>
                      {(event.data.affectedCustomers?.length ||
                        event.data.affectedCounters?.length) && (
                        <div className="flex items-center gap-2 mt-1">
                          {event.data.affectedCustomers?.length && (
                            <span className="text-xs text-slate-400">
                              客户: {event.data.affectedCustomers.map((id) => `#${id.slice(-3)}`).join(", ")}
                            </span>
                          )}
                          {event.data.affectedCounters?.length && (
                            <span className="text-xs text-slate-400">
                              柜台: {event.data.affectedCounters.map((id) => `#${id.slice(-1)}`).join(", ")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-purple-400" />
              队列重排快照
            </h2>
            <div className="bg-[#1B3A5C]/50 rounded-xl p-4 border border-slate-700 max-h-[300px] overflow-y-auto">
              {store.snapshots.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  未触发队列重排
                </p>
              ) : (
                <div className="space-y-3">
                  {store.snapshots.map((snap, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/60 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs text-[#D4A843]">
                          {snap.tick}s
                        </span>
                        <span className="text-xs text-purple-300 font-bold">
                          {snap.trigger}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">重排前</p>
                          <div className="flex flex-wrap gap-1">
                            {snap.beforeIds.map((id) => (
                              <span
                                key={id}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  !snap.afterIds.includes(id)
                                    ? "bg-red-900/40 text-red-300"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                              >
                                #{id.slice(-3)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">重排后</p>
                          <div className="flex flex-wrap gap-1">
                            {snap.afterIds.map((id, i) => (
                              <span
                                key={id}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  !snap.beforeIds.includes(id)
                                    ? "bg-purple-900/40 text-purple-300 font-bold"
                                    : snap.beforeIds.indexOf(id) !== i
                                    ? "bg-amber-900/40 text-amber-300"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                              >
                                #{id.slice(-3)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-blue-400" />
              资源冷却记录
            </h2>
            <div className="bg-[#1B3A5C]/50 rounded-xl p-4 border border-slate-700 max-h-[300px] overflow-y-auto">
              {cooldownEvents.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  未触发资源冷却
                </p>
              ) : (
                <div className="space-y-2">
                  {cooldownEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`
                        flex items-start gap-2 rounded-lg p-2.5 border-l-4
                        ${eventTypeColors[event.type] || "bg-slate-700 border-slate-500"}
                      `}
                    >
                      <span className="font-mono text-xs text-slate-400 shrink-0">
                        {event.tick}s
                      </span>
                      <div>
                        <p className="text-sm text-slate-200">
                          {event.data.details}
                        </p>
                        {event.data.affectedCounters?.length && (
                          <p className="text-xs text-blue-300 mt-0.5">
                            影响柜台: {event.data.affectedCounters.map((id) => `柜台#${parseInt(id.split("-")[1]) + 1}`).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            失败归因详情
          </h2>
          <div className="bg-[#1B3A5C]/50 rounded-xl p-4 border border-slate-700">
            {failureEvents.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                无失败项
              </p>
            ) : (
              <div className="space-y-2">
                {failureEvents.map((event) => {
                  const customer = event.data.customerId
                    ? store.allCustomers.find(
                        (c) => c.id === event.data.customerId
                      )
                    : null;
                  const counter = event.data.counterId
                    ? store.counters.find(
                        (c) => c.id === event.data.counterId
                      )
                    : null;
                  return (
                    <div
                      key={event.id}
                      className="bg-red-900/20 border border-red-800/40 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-400">
                          {event.tick}s
                        </span>
                        <span className="text-xs font-bold text-red-300">
                          {eventTypeLabels[event.type]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200">
                        {event.data.details}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {customer && (
                          <div className="flex items-center gap-1 bg-red-900/40 px-2 py-1 rounded">
                            <span className="text-xs text-red-300">
                              客户卡 #{customer.id.slice(-3)}
                            </span>
                            <span className="text-xs text-white font-bold">
                              {customer.name}
                            </span>
                            {customer.vipLevel > 0 && (
                              <span className="text-xs text-amber-300">
                                VIP{customer.vipLevel}
                              </span>
                            )}
                          </div>
                        )}
                        {counter && (
                          <div className="flex items-center gap-1 bg-blue-900/40 px-2 py-1 rounded">
                            <span className="text-xs text-blue-300">
                              柜台 #{counter.label}
                            </span>
                            <span className="text-xs text-slate-400">
                              冷却{counter.totalCooldownTicks}秒 | 故障{counter.totalBrokenTicks}秒
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            VIP挤占分析
          </h2>
          <div className="bg-[#1B3A5C]/50 rounded-xl p-4 border border-slate-700">
            {reorderEvents.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                未发生VIP挤占
              </p>
            ) : (
              <div className="space-y-2">
                {reorderEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-400">
                        {event.tick}s
                      </span>
                    </div>
                    <p className="text-sm text-amber-200">
                      {event.data.details}
                    </p>
                    {event.data.affectedCustomers?.length && (
                      <p className="text-xs text-slate-400 mt-1">
                        被挤占客户: {event.data.affectedCustomers.map((id) => {
                          const c = store.allCustomers.find((ac) => ac.id === id);
                          return c ? `${c.name}(#${id.slice(-3)})` : `#${id.slice(-3)}`;
                        }).join(", ")}
                      </p>
                    )}
                    {event.data.counterId && (
                      <p className="text-xs text-blue-300 mt-0.5">
                        涉及柜台: #{event.data.counterId.split("-")[1] ? parseInt(event.data.counterId.split("-")[1]) + 1 : event.data.counterId}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
