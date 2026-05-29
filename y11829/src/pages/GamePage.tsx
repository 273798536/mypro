import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { scenarios } from "@/utils/scenarios";
import CustomerCard from "@/components/CustomerCard";
import CounterSlot from "@/components/CounterSlot";
import StatusPanel from "@/components/StatusPanel";
import FeedbackBar from "@/components/FeedbackBar";
import ControlBar from "@/components/ControlBar";
import { Banknote, Trophy } from "lucide-react";

export default function GamePage() {
  const navigate = useNavigate();
  const store = useGameStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [draggingCustomerId, setDraggingCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (store.phase === "playing") {
      timerRef.current = setInterval(() => {
        store.advanceTick();
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [store.phase]);

  const handleSelectScenario = (id: string) => {
    setSelectedScenario(id);
    store.selectScenario(id);
  };

  const handleStart = () => {
    store.startGame();
  };

  const handleDrop = (counterId: string) => {
    if (draggingCustomerId) {
      store.assignCustomer(draggingCustomerId, counterId);
      setDraggingCustomerId(null);
    }
  };

  const vipBacklog = store.queue.filter((c) => c.vipLevel > 0).length;

  if (store.phase === "idle" && !selectedScenario) {
    return (
      <div className="min-h-screen bg-[#0F1F33] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#D4A843] rounded-2xl mb-4 shadow-lg">
              <Banknote className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              银行柜台排队Rush
            </h1>
            <p className="text-slate-400 text-sm">
              选择场景开始培训 — 处理VIP挤占、预约过号、柜台故障
            </p>
          </div>

          <div className="space-y-4">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectScenario(s.id)}
                className="w-full text-left bg-[#1B3A5C]/80 hover:bg-[#1B3A5C] border-2 border-transparent hover:border-[#D4A843] rounded-xl p-5 transition-all duration-200 group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-[#D4A843]">
                    {s.id}
                  </span>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-[#D4A843] transition-colors">
                      {s.name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {s.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">
                        {s.counterCount}个柜台
                      </span>
                      <span className="text-xs text-slate-500">
                        {s.schedule.length}个事件
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (store.phase === "ended") {
    return (
      <div className="min-h-screen bg-[#0F1F33] flex items-center justify-center p-8">
        <div className="max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#D4A843] rounded-2xl mb-6 shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">回合结束</h2>

          <div className="bg-[#1B3A5C]/80 rounded-xl p-6 mt-6 text-left space-y-3">
            <div className="flex justify-between text-white">
              <span>已服务</span>
              <span className="font-mono font-bold text-emerald-400">{store.score.served}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>VIP处理</span>
              <span className="font-mono font-bold text-amber-400">{store.score.vipHandled}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>预约过号</span>
              <span className="font-mono font-bold text-red-400">{store.score.appointmentExpired}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>服务中断</span>
              <span className="font-mono font-bold text-orange-400">{store.score.interruptedCount}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>柜台故障</span>
              <span className="font-mono font-bold text-red-400">{store.score.brokenCount}</span>
            </div>
          </div>

          <div className="mt-4 bg-[#1B3A5C]/60 rounded-xl p-4 text-left">
            <h3 className="text-sm font-bold text-[#D4A843] mb-2">失败归因</h3>
            {store.failedCustomerIds.length === 0 && store.events.filter(e => e.type === "service_interrupted").length === 0 ? (
              <p className="text-sm text-slate-400">无失败项</p>
            ) : (
              <div className="space-y-2">
                {store.failedCustomerIds.map((cid) => {
                  const customer = store.allCustomers.find((c) => c.id === cid);
                  const expiredEvent = store.events.find(
                    (e) => e.type === "appointment_expired" && e.data.customerId === cid
                  );
                  return (
                    <div key={cid} className="text-sm bg-red-900/30 rounded-lg p-2">
                      <span className="text-red-300 font-bold">{customer?.name}</span>
                      <span className="text-red-400"> — 预约过号</span>
                      {expiredEvent && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          归因: {expiredEvent.data.details}
                        </p>
                      )}
                    </div>
                  );
                })}
                {store.events
                  .filter((e) => e.type === "service_interrupted")
                  .map((e) => (
                    <div key={e.id} className="text-sm bg-orange-900/30 rounded-lg p-2">
                      <span className="text-orange-300 font-bold">中断</span>
                      <span className="text-orange-400"> — {e.data.details}</span>
                      {e.data.counterId && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          归因柜台: #{e.data.counterId}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => {
                store.resetGame();
                setSelectedScenario("");
              }}
              className="px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-all active:scale-95"
            >
              重选场景
            </button>
            <button
              onClick={() => navigate("/review")}
              className="px-5 py-2.5 bg-[#D4A843] hover:bg-[#c49a38] text-white font-bold rounded-lg shadow-lg transition-all active:scale-95"
            >
              详细复盘
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1F33] flex flex-col">
      <header className="bg-[#1B3A5C] border-b border-slate-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Banknote className="w-5 h-5 text-[#D4A843]" />
            <h1 className="text-lg font-bold text-white">排队Rush</h1>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              场景{store.scenarioId}
            </span>
            {store.phase === "paused" && (
              <span className="text-xs font-bold text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded animate-pulse">
                已暂停
              </span>
            )}
          </div>
          <ControlBar
            phase={store.phase}
            hasScenario={!!store.scenarioId}
            onStart={handleStart}
            onPause={store.pauseGame}
            onResume={store.resumeGame}
            onReset={() => {
              store.resetGame();
              setSelectedScenario("");
            }}
            onReview={() => navigate("/review")}
          />
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-4">
        <StatusPanel
          queueLength={store.queue.length}
          score={store.score}
          tick={store.tick}
          vipBacklog={vipBacklog}
        />

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <div className="bg-[#1B3A5C]/50 rounded-xl p-4 border border-slate-700">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                客户队列 ({store.queue.length})
              </h2>
              {store.queue.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无等待客户
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {store.queue.map((customer) => (
                    <CustomerCard
                      key={customer.id}
                      customer={customer}
                      currentTick={store.tick}
                      onDragStart={(id) => setDraggingCustomerId(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-8">
            <div className="bg-[#1B3A5C]/50 rounded-xl p-4 border border-slate-700">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#D4A843] rounded-full" />
                柜台操作区
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {store.counters.map((counter) => (
                  <CounterSlot
                    key={counter.id}
                    counter={counter}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FeedbackBar
        messages={store.feedbackMessages}
        onDismiss={store.dismissFeedback}
      />
    </div>
  );
}
