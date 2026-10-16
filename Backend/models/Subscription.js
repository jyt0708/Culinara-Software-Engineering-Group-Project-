import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema({
  user:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId:            { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true },
  amount:            { type: String, required: true },
  currency:          { type: String, default: 'EUR' },
  status:            { type: String, enum: ['completed', 'failed'], required: true },
  paypalOrderId:     { type: String, required: true },
  subscriptionStart: { type: Date, required: true },
  subscriptionEnd:   { type: Date, required: true },
}, { timestamps: true })

const Subscription = mongoose.model('Subscription', subscriptionSchema)
export default Subscription
