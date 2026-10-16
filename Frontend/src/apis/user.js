import request from '../utils/request'

// 登录：POST /api/auth/login，返回 { success, token }
export const loginAPI = (data) => request.post('/api/auth/login', data)

// 注册：POST /api/auth/register，multipart/form-data 格式（含头像文件）
export const registerAPI = (data) => request.post('/api/auth/register', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})

// 获取当前用户信息：GET /api/users/me，返回 { success, data: userObject }
// 每次页面刷新后调用，恢复 Redux store 里的用户信息
export const getUserInfoAPI = () => request.get('/api/users/me')


export const getCreatorProfileAPI = (id) => request.get(`/api/users/${id}`)

// 更新用户信息：PUT /api/users/me，multipart/form-data（含头像上传）
export const updateUserAPI = (data) => request.put('/api/users/me', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})

//@某人时的搜索
export const searchUsersAPI = (q) => request.get('/api/users/search', { params: { q } })
