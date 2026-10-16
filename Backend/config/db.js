import mongoose from 'mongoose'

// 连接 MongoDB Atlas
// MONGO_URI 在 config.js 文件里，格式：mongodb+srv://用户名:密码@cluster.xxx.mongodb.net/
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection failed:', err.message)
    // 连接失败直接退出进程，不让服务器在没有数据库的情况下继续运行
    process.exit(1)
  }
}

export default connectDB
