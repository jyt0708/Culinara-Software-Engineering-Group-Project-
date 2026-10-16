import { Router } from 'express'
import { createOrder, captureOrder } from '../controllers/subscriptionController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/create-order', createOrder)
router.post('/capture-order', protect, captureOrder)

export default router
