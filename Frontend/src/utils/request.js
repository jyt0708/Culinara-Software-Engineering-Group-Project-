import axios from 'axios'
import { message } from 'antd'
import { store } from '../store'
import { clearUserInfo } from '../store/modules/userStore'

const request = axios.create({
  baseURL: '/',
  timeout: 10000,
})

// 请求拦截器统一附加 token，页面 API 不需要重复处理鉴权头。
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('culinara_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  // 成功响应统一解包，调用方直接拿后端 JSON 数据。
  (response) => response.data,

  (error) => {
    // 非登录接口的 401 视为 session 过期，统一清空状态并跳回登录页。
    const isLoginRequest = error.config?.url?.includes('/api/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      store.dispatch(clearUserInfo())
      message.warning('Session expired, please log in again')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default request
