import mongoose from 'mongoose'

// 下单时对商品的快照，防止商品后续改价/删除导致订单信息丢失（快照不生成单独id）
const productSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    coverImage: { type: String, default: '' },
  },
  { _id: false }
)

// 定义订单schema，状态流转如下（简化版）：
//   pending →(capture)→ paid →(ship)→ shipped →(complete)→ completed
//   pending →(支付失败/库存不足)→ cancelled
const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productSnapshot: { type: productSnapshotSchema, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // 下单时单价快照
    totalAmount: { type: Number, required: true, min: 0 }, // 总价，不用单价*数量是后续可能折扣算法
    shippingAddress: { type: String, required: true },
    trackingNumber: { type: String, default: '' }, // 卖家发货时填写的物流单号（模拟物流传输）
    issueReportedAt: { type: Date, default: null }, // 买家最近一次报告异常（催发货/未收到货）的时间；补发成功后清空
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'],
      default: 'pending',
    },
    paypalOrderId: { type: String, default: null }, // 创建 PayPal 订单后写入，capture 时据此回查本地订单
    ratedByBuyer: { type: Boolean, default: false }, // 防重复评分
  },
  { timestamps: true }
)

// 卖家销售记录 / 买家订单列表的常用查询
orderSchema.index({ buyer: 1, createdAt: -1 })
orderSchema.index({ seller: 1, createdAt: -1 })

const Order = mongoose.model('Order', orderSchema)
export default Order
