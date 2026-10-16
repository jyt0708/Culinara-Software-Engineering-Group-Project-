import { z } from 'zod'

// Zod 是用来验证请求体数据格式的库
// safeParse() 不会抛异常，返回 { success, data } 或 { success, error }

// 注册时的字段规则
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  phoneNum: z.string().optional().nullable(), // 选填，格式由前端校验
  address:  z.string().max(200).optional().nullable(),
})

// 登录时只需要用户名和密码
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
