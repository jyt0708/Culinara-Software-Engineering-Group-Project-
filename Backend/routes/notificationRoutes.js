import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { getNotifications, markRead } from '../controllers/notificationController.js'

const router = Router()

router.get('/',         protect, getNotifications)
router.patch('/:id/read', protect, markRead)

export default router
