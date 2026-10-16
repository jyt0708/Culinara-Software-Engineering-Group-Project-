import { Router } from 'express'
import multer from 'multer'
import { getMe, updateMe, getCreatorProfile, searchUsers } from '../controllers/userController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// protect 中间件：验证 JWT，把 { _id, role } 挂到 req.user
router.get('/me', protect, getMe)                                    // 获取当前用户信息
router.put('/me', protect, upload.single('profilePicture'), updateMe) // 更新用户信息（含头像上传）
router.get('/search', protect, searchUsers)//@某人的搜索相关
router.get('/:id', protect, getCreatorProfile)

export default router
