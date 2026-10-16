import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { registerSchema, loginSchema } from '../validators/authValidator.js'
import cloudinary from '../config/cloudinary.js'

// JWT 只保存用户 id；角色权限从数据库实时读取，避免旧角色缓存。
const signToken = (user) =>
  jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

const toSafeUser = (user) => {
  const obj = user.toObject()
  delete obj.password
  return obj
}

// multer 文件存在内存中，这里直接上传到 Cloudinary。
const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err)
      else resolve(result.secure_url)
    })
    stream.end(buffer)
  })

// 注册接口：校验用户信息，可选上传头像，成功后直接返回登录 token。
export const register = async (req, res) => {
  const parse = registerSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ success: false, message: parse.error.errors[0].message })
  }

  const { username, email, password, phoneNum, address } = parse.data
  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] })
    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username'
      return res.status(409).json({ success: false, message: `${field} already taken` })
    }

    const hashed = await bcrypt.hash(password, 10)

    let profilePicture = ''
    if (req.file) {
      profilePicture = await uploadToCloudinary(req.file.buffer, 'users')
    }

    const user = await User.create({
      username, email, password: hashed, profilePicture,
      phoneNum: phoneNum || null,
      address: address || null,
    })
    res.status(201).json({ success: true, token: signToken(user), user: toSafeUser(user) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 登录接口：验证用户名和密码，成功后返回用户信息和 token。
export const login = async (req, res) => {
  const parse = loginSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ success: false, message: parse.error.errors[0].message })
  }

  const { username, password } = parse.data
  try {
    // 登录失败统一返回同一错误，避免暴露用户名是否存在。
    const user = await User.findOne({ username })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' })
    }

    res.json({ success: true, token: signToken(user), user: toSafeUser(user) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
