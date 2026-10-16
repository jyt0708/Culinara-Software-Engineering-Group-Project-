import checkoutNodeJssdk from '@paypal/checkout-server-sdk'
import { paypalClient } from '../config/paypal.js'
import User from '../models/User.js'
import Subscription from '../models/Subscription.js'

//套餐表（可信数据）
const PLANS = {
  monthly:   { amount: '9.99',  currency: 'EUR', durationDays: 30  },
  quarterly: { amount: '24.99', currency: 'EUR', durationDays: 90  },
  yearly:    { amount: '79.99', currency: 'EUR', durationDays: 365 },
}

// 1.创建订单：post 中create-order
export const createOrder = async (req, res) => {
  const { planId } = req.body //解构赋值，前端请求来的计划id

  const plan = PLANS[planId]
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Invalid plan' })
  }

  // 向 PayPal 发送“我要创建订单” 请求
  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest()
  request.prefer('return=representation')
  request.requestBody({
    intent: 'CAPTURE',//用户付款后，系统会直接确认收款
    purchase_units: [{
      amount: {
        currency_code: plan.currency,
        value: plan.amount,
      },
    }],
  })
  // 等PayPal订单创建成功返回订单id给前端
  try {
    const order = await paypalClient.execute(request)
    res.json({ orderID: order.result.id })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create PayPal order' })
  }
}

// 2.捕获订单：post 的capture-order，确认支付并开通会员(六件事)
export const captureOrder = async (req, res) => {
  const { orderID, planId } = req.body

  const plan = PLANS[planId]
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Invalid plan' })
  }
  //2.PayPal扣款尝试，空请求体因为已经存了（上面是取数据+校验套餐）
  try {
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID)
    request.requestBody({})
    const capture = await paypalClient.execute(request)

    if (capture.result.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Payment not completed' })
    }
    //4.查表当前登录用户，5开通会员（写表），6保存订阅记录（写表），上面是检查扣款状态是否完成
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const now = new Date()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + plan.durationDays)

    user.isSubscribed = true
    user.subscriptionExpiry = expiry
    await user.save()
    //保存订阅记录
    await Subscription.create({
      user: user._id,
      planId,
      amount: plan.amount,
      currency: plan.currency,
      status: 'completed',
      paypalOrderId: orderID,
      subscriptionStart: now,
      subscriptionEnd: expiry,
    })

    console.log('[capture-order] success → status:', capture.result.status, '| user subscribed until:', expiry.toISOString())
    res.json({ success: true, user })
  } catch (err) {
    console.error('[capture-order] PayPal error:', err)
    res.status(500).json({ success: false, message: 'Failed to capture PayPal order' })
  }
}
