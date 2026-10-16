import { createSlice } from '@reduxjs/toolkit'
import { loginAPI, registerAPI, getUserInfoAPI } from '../../apis/user'

const userStore = createSlice({
  name: 'user',
  initialState: {
    // localStorage 有 token 就认为已登录（布尔值，语义比检查字符串更直观）
    hasToken: !!localStorage.getItem('culinara_token'),
    userInfo: {},          // 完整用户信息（用户名、头像、角色等）
    userInfoLoaded: false, // /me 接口完成后变 true（不管成功失败），用于路由守卫判断"角色信息是否就绪"
  },
  reducers: {
    // 登录/注册成功：token 只存 localStorage，Redux 只记录"已登录"这个状态
    setHasToken(state, action) {
      localStorage.setItem('culinara_token', action.payload) // action.payload 是 token 字符串
      state.hasToken = true
    },
    // 保存完整用户信息（从 /api/users/me 获取）
    setUserInfo(state, action) {
      state.userInfo = action.payload
    },
    // /me 接口完成（成功或失败都会调）后标记，告诉路由守卫"角色信息已就绪，可以判断角色了"
    setUserInfoLoaded(state) {
      state.userInfoLoaded = true
    },
    // 登出/401：清除 localStorage，Redux 标记为未登录（同时重置 userInfoLoaded 供下次登录使用）
    clearUserInfo(state) {
      localStorage.removeItem('culinara_token')
      state.hasToken = false
      state.userInfo = {}
      state.userInfoLoaded = false
    },
  },
})

const { setHasToken, setUserInfo, clearUserInfo } = userStore.actions

// 页面刷新后自动恢复登录状态（在 App.jsx 的 useEffect 里调用）
const fetchUserInfo = () => {
  return async (dispatch) => {
    try {
      const res = await getUserInfoAPI() // GET /api/users/me
      dispatch(setUserInfo(res.data))
    } finally {
      // 无论成功还是失败（如 token 过期），都标记为 userInfoLoaded
      // 失败时 userInfo 还是 {}，路由守卫会把用户跳走
      dispatch(userStore.actions.setUserInfoLoaded())
    }
  }
}

// 登录：后端一次性返回 { token, user }，前端直接用，不用再调 /me
// 三个 dispatch 把 token、userInfo、加载完成标记一次性写入 Redux
const fetchLogin = (loginForm) => {
  return async (dispatch) => {
    const res = await loginAPI(loginForm) // POST /api/auth/login，返回 { token, user }
    dispatch(setHasToken(res.token))
    dispatch(setUserInfo(res.user))
    dispatch(userStore.actions.setUserInfoLoaded()) // 防止 App.jsx useEffect 再发一次 /me
  }
}

// 注册：与登录流程相同，后端也一次返回 { token, user }
const fetchRegister = (registerForm) => {
  return async (dispatch) => {
    const res = await registerAPI(registerForm) // POST /api/auth/register，返回 { token, user }
    dispatch(setHasToken(res.token))
    dispatch(setUserInfo(res.user))
    dispatch(userStore.actions.setUserInfoLoaded()) // 防止 App.jsx useEffect 再发一次 /me
  }
}

export { fetchLogin, fetchRegister, fetchUserInfo, setUserInfo, clearUserInfo }
export default userStore.reducer
