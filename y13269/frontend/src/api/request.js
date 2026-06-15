import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

service.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response) => {
    const res = response.data
    return res
  },
  (error) => {
    console.error('Response error:', error)
    let message = '请求失败'
    if (error.response) {
      const status = error.response.status
      const data = error.response.data
      if (data && data.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
      } else if (data && data.message) {
        message = data.message
      } else {
        switch (status) {
          case 400:
            message = '请求参数错误'
            break
          case 401:
            message = '未授权，请重新登录'
            break
          case 403:
            message = '拒绝访问'
            break
          case 404:
            message = '请求资源不存在'
            break
          case 500:
            message = '服务器内部错误'
            break
          case 502:
            message = '网关错误'
            break
          case 503:
            message = '服务不可用'
            break
          case 504:
            message = '网关超时'
            break
          default:
            message = `连接错误 ${status}`
        }
      }
    } else if (error.message.includes('timeout')) {
      message = '请求超时，请检查网络连接'
    } else if (error.message.includes('Network Error')) {
      message = '网络连接错误，请检查网络'
    }
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export const get = (url, params = {}) => {
  return service({
    method: 'get',
    url,
    params
  })
}

export const post = (url, data = {}, config = {}) => {
  return service({
    method: 'post',
    url,
    data,
    ...config
  })
}

export const patch = (url, data = {}) => {
  return service({
    method: 'patch',
    url,
    data
  })
}

export const del = (url) => {
  return service({
    method: 'delete',
    url
  })
}

export default service
