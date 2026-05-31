import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, User, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-[#3b82f6]">
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
      <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
      <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-white/5" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#3b82f6] shadow-lg">
              <Droplets className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">
              水务阶梯账单复核系统
            </h1>
            <p className="mt-1 text-sm text-gray-400">Water Billing Review System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#3b82f6] focus:bg-white focus:ring-2 focus:ring-[#3b82f6]/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#3b82f6] focus:bg-white focus:ring-2 focus:ring-[#3b82f6]/20"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-[#ef4444]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-lg transition-all',
                loading
                  ? 'cursor-not-allowed bg-[#3b82f6]/70'
                  : 'bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6] hover:shadow-xl hover:brightness-110'
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-center text-xs text-blue-600">
            演示账号：admin / admin123
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          © 2026 水务阶梯账单复核系统
        </p>
      </div>
    </div>
  );
}
