import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const [operatorId, setOperatorId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId.trim() || !operatorName.trim()) return;
    login(operatorId.trim(), operatorName.trim());
    navigate(from, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-[24px] font-semibold text-gray-900">广告结算系统</h1>
          <p className="mt-2 text-[14px] text-gray-500">请输入操作员信息登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">
              操作员ID
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                placeholder="请输入操作员ID"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-[14px] text-gray-900 placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">
              操作员姓名
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="请输入操作员姓名"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-[14px] text-gray-900 placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!operatorId.trim() || !operatorName.trim()}
            className="w-full rounded-lg bg-primary py-2.5 text-[14px] font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
