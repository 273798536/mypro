import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAppStore } from '@/store';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setOperator, showToast } = useAppStore();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      showToast('请输入用户名和密码', 'error');
      return;
    }
    try {
      setLoading(true);
      const data = await api.auth.login({ username, password }) as any;
      localStorage.setItem('token', data.token);
      localStorage.setItem('operator', data.user.displayName);
      localStorage.setItem('userRole', data.user.role);
      setOperator(data.user.displayName);
      showToast(`欢迎，${data.user.displayName}`);
    } catch (error: any) {
      showToast(error.message || '登录失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-navy-900" size={32} />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">储值卡沉淀余额系统</h1>
          <p className="text-gray-400 mt-2">连锁门店财务对账管理</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="请输入用户名"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <div className="text-xs text-gray-400 text-center space-y-1">
            <p>管理员: admin / admin123</p>
            <p>门店操作员: zongdian / store123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
