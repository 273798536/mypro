import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, User, Lock, LogIn } from 'lucide-react';
import { useStore } from '../store/useStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, users, initialize, isInitialized } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(username);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">航司联程改签差价系统</h1>
          <p className="text-primary-200 mt-2">专业的联程票差价结算与复核管理</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">用户登录</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="input pl-10"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="input pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-accent-red-50 border border-accent-red-200 rounded-lg text-accent-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username}
              className="w-full btn btn-primary gap-2 py-3 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {isLoading ? '登录中...' : '登录系统'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center mb-3">测试账号（任意密码即可登录）：</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded text-center">
                <div className="font-medium text-slate-700">admin</div>
                <div className="text-slate-500">管理员</div>
              </div>
              <div className="p-2 bg-slate-50 rounded text-center">
                <div className="font-medium text-slate-700">settlement01</div>
                <div className="text-slate-500">结算员</div>
              </div>
              <div className="p-2 bg-slate-50 rounded text-center">
                <div className="font-medium text-slate-700">reviewer01</div>
                <div className="text-slate-500">复核员</div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          © 2024 航司收益结算系统 · 本地数据安全存储
        </p>
      </div>
    </div>
  );
};

export default Login;
