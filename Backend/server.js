// 最先执行：读取 config.js 文件，把里面的变量注入到 process.env
// 必须放第一行，否则后面 import 的模块拿不到环境变量（ESM import 会提前执行）
import './config/loadConfig.js'

import express from 'express'
import cors from 'cors'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import applicationRoutes from './routes/applicationRoutes.js'
import recipeRoutes from './routes/recipeRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import subscriptionRoutes from './routes/subscriptionRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import sellerRoutes from './routes/sellerRoutes.js'
import forumNotificationRoutes from './routes/forumNotificationRoutes.js'
import forumPostRoutes from './routes/forumPostRoutes.js'
import forumPostCommentRoutes from './routes/forumPostCommentRoutes.js'

// 连接 MongoDB Atlas
connectDB()

const app = express()

// 允许前端（Vite localhost:5173）跨域请求
app.use(cors())

// 解析请求体中的 JSON 数据，放到 req.body
app.use(express.json())

// 挂载路由：每个路由文件负责一个功能模块
app.use('/api/auth', authRoutes)           // 注册 / 登录
app.use('/api/users', userRoutes)          // 获取/修改个人信息
app.use('/api/applications', applicationRoutes) // 创作者申请
app.use('/api/recipes', recipeRoutes)            // Phase 2：食谱 CRUD + paywall
app.use('/api/notifications', notificationRoutes) // Phase 2：通知系统
app.use('/api/payments/subscription', subscriptionRoutes) // Phase 3：订阅支付
app.use('/api/products', productRoutes)            // Product CRUD
app.use('/api/orders', orderRoutes)                // 市场订单全流程
app.use('/api/sellers', sellerRoutes)              // PayPal 卖家收款绑定
app.use('/api/forumNotifications', forumNotificationRoutes)  //Forum通知
app.use('/api/forumPosts', forumPostRoutes)          //论坛CRUD
app.use('/api/forumPostComments', forumPostCommentRoutes)   //论坛评论CRUD

const PORT = process.env.PORT || 5000
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})