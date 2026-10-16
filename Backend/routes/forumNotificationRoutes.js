import { Router } from 'express'
import { 
    getForumNotifications,
    markForumNotificationRead 
} from '../controllers/forumNotificationController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', protect, getForumNotifications)
router.patch('/:id/read', protect, markForumNotificationRead)

export default router