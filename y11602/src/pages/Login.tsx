import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Building2, LogIn } from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { UserRole } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('manager');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    const success = login(username.trim(), role);
    if (success) {
      navigate('/');
    } else {
      setError('登录失败，请重试');
    }
  };

  const quickLogin = (userType: 'manager' | 'executive') => {
    const user = userType === 'manager' ? 'manager' : 'executive';
    const userRole = userType === 'manager' ? 'manager' : 'executive';
    login(user, userRole);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">小微贷款续授信管理</h1>
          <p className="text-primary-200 mt-2">Micro Loan Renewal Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">用户登录</h2>
            <p className="text-gray-500 text-sm mt-1">请选择角色并输入用户名</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择角色</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    role === 'manager'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <User size={18} />
                  <span className="font-medium">客户经理</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('executive')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    role === 'executive'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Shield size={18} />
                  <span className="font-medium">管理层</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="input-field"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full gap-2 py-3">
              <LogIn size={18} />
              登录系统
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center mb-3">快速体验</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => quickLogin('manager')}
                className="p-3 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                经理体验
              </button>
              <button
                onClick={() => quickLogin('executive')}
                className="p-3 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                管理层体验
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-primary-300 text-sm">
            客户经理：数据导入、状态查询、催办记录、导出报告
          </p>
          <p className="text-primary-300 text-sm mt-1">
            管理层：全局概览、风险统计、本周断档、导出清单
          </p>
        </div>
      </div>
    </div>
  );
}
