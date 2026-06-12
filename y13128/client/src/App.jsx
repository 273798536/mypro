import React, { useState, useEffect, useCallback } from "react";
import { getSessions, createSession, deleteSession } from "./api";
import SessionDetail from "./components/SessionDetail";
import SessionList from "./components/SessionList";
import CreateSessionForm from "./components/CreateSessionForm";

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async (title) => {
    await createSession(title);
    await refresh();
  };

  const handleDelete = async (id) => {
    await deleteSession(id);
    if (selectedId === id) setSelectedId(null);
    await refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-bayesian-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h1 className="text-xl font-bold tracking-wide">贝叶斯先验图表解释</h1>
          </div>
          <span className="text-bayesian-200 text-sm">改判溯源 · 单位挂起 · 跳变检测</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-4">
            <CreateSessionForm onCreate={handleCreate} />
            <SessionList
              sessions={sessions}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDelete={handleDelete}
              loading={loading}
              onRefresh={refresh}
            />
          </aside>
          <section className="col-span-8">
            {selectedId ? (
              <SessionDetail
                key={selectedId}
                sessionId={selectedId}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg">选择或新建一个会话开始</p>
                <p className="text-sm mt-2">导入计算草稿，追踪每次改判的来源与状态</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
