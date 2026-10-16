import { Router } from 'express'
import { protect, requireCreator } from '../middleware/authMiddleware.js'
import {
  savePayoutEmail,
  getOnboardingStatus,
} from '../controllers/sellerController.js'

const router = Router()

// 仅 creator 可用：PayPal 收款邮箱（Payouts 模型，保存收款邮箱 / 查状态）
router.post('/payout-account', protect, requireCreator, savePayoutEmail)
router.get('/onboarding-status', protect, requireCreator, getOnboardingStatus)

export default router
