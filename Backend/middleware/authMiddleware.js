import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// 校验 JWT，并把用户 id 放到 req.user，供后续接口使用。
export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized' })
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' })
  }
}

// 角色权限每次查数据库，避免 JWT 里的旧角色继续生效。
export const requireCreator = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('role')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.role !== 'creator') {
      return res.status(403).json({ success: false, message: 'Creator access required' })
    }
    req.user.role = user.role
    next()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const requireUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('role')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.role !== 'user') {
      return res.status(403).json({ success: false, message: 'Only normal users can do this' })
    }
    req.user.role = user.role
    next()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const blockAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('role')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot place orders' })
    }
    req.user.role = user.role
    next()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const requireOnboardedSeller = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('paypalPayoutEmail')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (!user.paypalPayoutEmail)
      return res.status(403).json({ success: false, message: 'Connect your PayPal account before selling' })
    next()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('role')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }
    req.user.role = user.role
    next()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
