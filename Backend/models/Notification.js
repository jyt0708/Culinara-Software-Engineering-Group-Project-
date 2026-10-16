import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:      { type: String, enum: ['recipe_liked', 'order_to_ship', 'order_shipped', 'product_out_of_stock', 'product_rated', 'order_issue_reported'], required: true },
    recipe:    { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
    order:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    message:   { type: String, required: true },
    isRead:    { type: Boolean, default: false },
  },
  { timestamps: true }
)

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)
