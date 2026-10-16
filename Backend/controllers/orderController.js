import checkoutNodeJssdk from '@paypal/checkout-server-sdk'
import mongoose from 'mongoose'
import { paypalClient } from '../config/paypal.js'
import { ppFetch } from '../config/paypalRest.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'

// 商品订单统一用 EUR，与订阅模块一致（Product 模型本身不带 currency 字段）
const ORDER_CURRENCY = 'EUR'

// POST /api/orders/create-order  (protect)
// 入参 { productId, quantity, shippingAddress }
// 校验库存充足 → 创建 PayPal order + 本地 Order(pending)，写快照/单价/总价/卖家
// 返回 { paypalOrderId, orderId }
export const createOrder = async (req, res) => {
  try {
    const { productId, quantity, shippingAddress } = req.body

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' })
    }

    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' })
    }

    if (!shippingAddress || !String(shippingAddress).trim()) {
      return res.status(400).json({ success: false, message: 'Shipping address is required' })
    }

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    // 下单时先做一次库存充足校验（真正的扣减在 capture 时原子完成）
    if (product.stock < qty) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' })
    }

    // 卖家必须已填 PayPal 收款邮箱（Payouts 收款），否则下单后无法把货款打给卖家
    const seller = await User.findById(product.createdBy).select('paypalPayoutEmail')
    if (!seller?.paypalPayoutEmail)
      return res.status(400).json({ success: false, message: 'Seller is not ready to receive payments' })

    const unitPrice = product.price
    const totalAmount = Math.round(unitPrice * qty * 100) / 100

    // 创建 PayPal 订单（范式同 subscriptionController）。
    // Payouts 模型：买家先把全额付给平台（money-in 不变），capture 成功后再 Payout 给卖家。
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest()
    request.prefer('return=representation')
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: ORDER_CURRENCY, value: totalAmount.toFixed(2) },
      }],
    })

    const paypalOrder = await paypalClient.execute(request)
    const paypalOrderId = paypalOrder.result.id

    const order = await Order.create({
      buyer: req.user._id,
      seller: product.createdBy,
      product: product._id,
      productSnapshot: {
        name: product.name,
        price: unitPrice,
        coverImage: product.coverImage,
      },
      quantity: qty,
      unitPrice,
      totalAmount,
      shippingAddress: String(shippingAddress).trim(),
      status: 'pending',
      paypalOrderId,
    })

    return res.status(201).json({
      success: true,
      paypalOrderId,
      orderId: order._id,
    })
  } catch (err) {
    console.error('[create-order] error:', err)
    return res.status(500).json({ success: false, message: 'Failed to create order' })
  }
}

// POST /api/orders/capture-order  (protect)
// 入参 { paypalOrderId }
// 捕获支付 → status=paid 且原子扣减 stock；支付失败/库存不足 → cancelled
export const captureOrder = async (req, res) => {
  try {
    const { paypalOrderId } = req.body
    if (!paypalOrderId) {
      return res.status(400).json({ success: false, message: 'paypalOrderId is required' })
    }

    const order = await Order.findOne({ paypalOrderId })
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    // 只有本单买家可以捕获自己的订单
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not your order' })
    }

    // 仅 pending 订单可捕获，避免重复捕获/非法状态
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` })
    }

    // 捕获 PayPal 支付
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(paypalOrderId)
    request.requestBody({})
    const capture = await paypalClient.execute(request)

    if (capture.result.status !== 'COMPLETED') {
      order.status = 'cancelled'
      await order.save()
      return res.status(400).json({ success: false, message: 'Payment not completed', order })
    }

    // 原子扣减库存：带 stock >= quantity 条件，防并发超卖
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: order.product, stock: { $gte: order.quantity } },
      { $inc: { stock: -order.quantity } },
      { new: true }
    )

    if (!updatedProduct) {
      // 支付已捕获但库存不足 → 订单作废（作业范围内不做退款分账）
      order.status = 'cancelled'
      await order.save()
      return res.status(409).json({ success: false, message: 'Insufficient stock, order cancelled', order })
    }

    order.status = 'paid'
    await order.save()

    // 商品库存为零，给卖家发通知
    if (updatedProduct.stock === 0) {
      await Notification.create({
        recipient: order.seller,
        sender: order.buyer,
        type: 'product_out_of_stock',
        order: order._id,
        message: 'bought the last item of your product. It is now out of stock',
      })
    }

    // 分账：捕获成功后，把货款 Payout 给卖家，平台抽取 5% 提成（提成部分留在平台账户）。
    // 用 sender_batch_id = 订单号 做幂等键，避免重复打款；capture 已限定 pending→paid，不会重入。
    try {
      const sellerAcct = await User.findById(order.seller).select('paypalPayoutEmail')
      if (sellerAcct?.paypalPayoutEmail) {
        // 卖家实收 = 全额 × (1 - 5%)，平台留 5% 提成。四舍五入到分。
        const sellerPayout = (Math.round(order.totalAmount * 95) / 100).toFixed(2)
        await ppFetch('POST', '/v1/payments/payouts', {
          sender_batch_header: {
            sender_batch_id: `order-${order._id}`,
            email_subject: 'You have a payment from Culinara',
          },
          items: [{
            recipient_type: 'EMAIL',
            amount: { value: sellerPayout, currency: ORDER_CURRENCY },
            receiver: sellerAcct.paypalPayoutEmail,
            note: `Payout for order ${order._id}`,
            sender_item_id: String(order._id),
          }],
        })
        const platformFee = (Math.round(order.totalAmount * 5) / 100).toFixed(2)
        await Notification.create({
          recipient: order.seller,
          sender: order.buyer,
          type: 'order_to_ship',
          order: order._id,
          message: `payment has arrived: ${ORDER_CURRENCY} ${sellerPayout} was paid out to you, and the platform successfully collected a 5% fee (${ORDER_CURRENCY} ${platformFee}). Please ship it`,
        })
      }
    } catch (payoutErr) {
      // Payout 失败不回滚买家付款（钱已在平台）；记录日志，留待人工/后续补偿。
      console.error('[capture-order] payout to seller failed:', payoutErr?.message)
    }

    return res.json({ success: true, order })
  } catch (err) {
    console.error('[capture-order] error:', err)
    return res.status(500).json({ success: false, message: 'Failed to capture order' })
  }
}

// POST /api/orders/cancel-order  (protect)
// 入参 { paypalOrderId }
// 买家在 PayPal 弹窗取消支付时调用：pending → cancelled，避免孤儿订单堆积。
// 幂等：已 cancelled 直接返回成功；非 pending（已支付等）拒绝，防止误作废有效订单。
export const cancelOrder = async (req, res) => {
  try {
    const { paypalOrderId } = req.body
    if (!paypalOrderId) {
      return res.status(400).json({ success: false, message: 'paypalOrderId is required' })
    }

    const order = await Order.findOne({ paypalOrderId })
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    // 只有本单买家可以取消自己的订单
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not your order' })
    }

    // 幂等：重复取消直接返回成功
    if (order.status === 'cancelled') {
      return res.json({ success: true, order })
    }

    // 仅 pending（未支付）订单可取消，已支付/发货等状态不可作废
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` })
    }

    order.status = 'cancelled'
    await order.save()
    return res.json({ success: true, order })
  } catch (err) {
    console.error('[cancel-order] error:', err)
    return res.status(500).json({ success: false, message: 'Failed to cancel order' })
  }
}

// GET /api/orders/my  (protect)  买家订单列表
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('seller', 'username profilePicture')
      .populate('product', '_id name coverImage')
    return res.status(200).json({ success: true, count: orders.length, data: orders })
  } catch (err) {
    console.error('[get-my-orders] error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/orders/sold  (protect + requireCreator)  卖家销售记录
export const getSoldOrders = async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .populate('buyer', 'username profilePicture')
      .populate('product', '_id name coverImage stock') // stock 供前端判断缺货时禁用补发
    return res.status(200).json({ success: true, count: orders.length, data: orders })
  } catch (err) {
    console.error('[get-sold-orders] error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/orders/:id/ship  (protect + requireCreator)
//   paid    → shipped（首次发货，物流单号必填）
//   shipped → shipped（补发丢件，物流单号必填，并清除 issueReportedAt）
export const shipOrder = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    const tracking = req.body?.trackingNumber != null ? String(req.body.trackingNumber).trim() : ''

    // 先读一份做归属 + 状态判定
    const existing = await Order.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }
    if (String(existing.seller) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only ship your own sales' })
    }
    if (!['paid', 'shipped'].includes(existing.status)) {
      return res.status(403).json({ success: false, message: `Cannot ship an order in status "${existing.status}"` })
    }

    const isReship = existing.status === 'shipped'
    // 物流单号必填：首次发货与补发都必须填写（补发时是替换丢失包裹的新单号）
    if (!tracking) {
      return res.status(400).json({
        success: false,
        message: isReship ? 'A new tracking number is required to re-ship' : 'A tracking number is required to ship',
      })
    }

    // 带 status 条件的原子更新：若期间买家已「确认收货」把状态改成 completed，
    // 此 filter 不再匹配 → 返回 null → 拒绝，避免把 completed 覆盖回 shipped 的丢更新竞态。
    const update = { status: 'shipped', issueReportedAt: null } // 发货/补发都清除报告标记（催促已被处理）
    if (tracking) update.trackingNumber = tracking // 仅非空才覆盖，空则保留原单号

    const order = await Order.findOneAndUpdate(
      { _id: id, seller: req.user._id, status: existing.status },
      { $set: update },
      { new: true }
    )
    if (!order) {
      return res.status(409).json({ success: false, message: 'Order status changed, please refresh and retry' })
    }

    // 到货通知：卖家发货/补发后提醒买家订单已在途（高亮未读，复用通知系统）
    await Notification.create({
      recipient: order.buyer,
      sender: order.seller,
      type: 'order_shipped',
      order: order._id,
      message: 'shipped your order. It is on the way',
    })

    return res.json({ success: true, order })
  } catch (err) {
    console.error('[ship-order] error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/orders/:id/report-issue  (protect)  买家报告异常（催发货 / 未收到货）
// paid 或 shipped 均可发起；仅记录时间 + 发通知给卖家，不改订单状态
export const reportOrderIssue = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    const order = await Order.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not your order' })
    }
    if (!['paid', 'shipped'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot report an order in status "${order.status}"` })
    }

    order.issueReportedAt = new Date()
    await order.save()

    const message = order.status === 'paid'
      ? 'is still waiting for you to ship this order'
      : 'reports they have not received this order — please re-ship'
    await Notification.create({
      recipient: order.seller,
      sender: order.buyer,
      type: 'order_issue_reported',
      order: order._id,
      message,
    })

    return res.json({ success: true, order })
  } catch (err) {
    console.error('[report-issue] error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/orders/:id/complete  (protect)  买家确认收货 shipped → completed
export const completeOrder = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    const order = await Order.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only confirm your own orders' })
    }

    if (order.status !== 'shipped') {
      return res.status(403).json({ success: false, message: `Cannot complete an order in status "${order.status}"` })
    }

    order.status = 'completed'
    await order.save()
    return res.json({ success: true, order })
  } catch (err) {
    console.error('[complete-order] error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
