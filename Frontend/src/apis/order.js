import request from '../utils/request'

// 创建订单（下单）：POST /api/orders/create-order
// body: { productId, quantity, shippingAddress } → { success, paypalOrderId, orderId }
export const createOrderAPI = (data) => request.post('/api/orders/create-order', data)

// 捕获支付：POST /api/orders/capture-order
// body: { paypalOrderId } → { success, order }
export const captureOrderAPI = (data) => request.post('/api/orders/capture-order', data)

// 取消订单（买家在 PayPal 取消支付）：POST /api/orders/cancel-order
// body: { paypalOrderId } → { success, order }（pending → cancelled）
export const cancelOrderAPI = (data) => request.post('/api/orders/cancel-order', data)

// 买家订单列表：GET /api/orders/my
export const getMyOrdersAPI = () => request.get('/api/orders/my')

// 卖家销售记录：GET /api/orders/sold（仅 creator）
export const getSoldOrdersAPI = () => request.get('/api/orders/sold')

// 卖家发货：PATCH /api/orders/:id/ship（paid → shipped），可附带物流单号
export const shipOrderAPI = (id, trackingNumber = '') =>
  request.patch(`/api/orders/${id}/ship`, { trackingNumber })

// 买家确认收货：PATCH /api/orders/:id/complete（shipped → completed）
export const completeOrderAPI = (id) => request.patch(`/api/orders/${id}/complete`)

// 买家报告异常（催发货 / 未收到货）：PATCH /api/orders/:id/report-issue
export const reportOrderIssueAPI = (id) => request.patch(`/api/orders/${id}/report-issue`)
