import { Router } from 'express'
import { protect, requireCreator, blockAdmin } from '../middleware/authMiddleware.js'
import {
  createOrder,
  captureOrder,
  cancelOrder,
  getMyOrders,
  getSoldOrders,
  shipOrder,
  completeOrder,
  reportOrderIssue,
} from '../controllers/orderController.js'

const router = Router()

// 下单 / 捕获支付：登录用户（买家），但 admin 不可购买
router.post('/create-order', protect, blockAdmin, createOrder)
router.post('/capture-order', protect, blockAdmin, captureOrder)
router.post('/cancel-order', protect, blockAdmin, cancelOrder)

// 买家订单列表 / 卖家销售记录
router.get('/my', protect, getMyOrders)
router.get('/sold', protect, requireCreator, getSoldOrders)

// 卖家发货 / 买家确认收货
router.patch('/:id/ship', protect, requireCreator, shipOrder)
router.patch('/:id/complete', protect, completeOrder)

// 买家报告异常：催发货（paid）/ 未收到货（shipped）→ 通知卖家
router.patch('/:id/report-issue', protect, reportOrderIssue)

export default router
