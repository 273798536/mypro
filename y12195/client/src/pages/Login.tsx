import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/api'
import { useAppStore } from '../store'

const Login: React.FC = () => {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setToken = useAppStore((state) => state.setToken)
  const setUser = useAppStore((state) => state.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await auth.login(username, password)
      localStorage.setItem('token', result.token)
      setToken(result.token)
      setUser(result.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎵</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">音乐课程管理系统</h1>
          <p className="text-slate-500 mt-2">请登录您的账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
              placeholder="请输入用户名"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
              placeholder="请输入密码"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          默认测试账号: admin / admin123
        </p>
      </div>
    </div>
  )
}

export default Login
