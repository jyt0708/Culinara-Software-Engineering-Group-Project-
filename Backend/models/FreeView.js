import mongoose from 'mongoose'

// 免费阅读次数记录；TTL 到期后自动清除，72 小时窗口自动重置。
const freeViewSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
  recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
  expireAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true })

freeViewSchema.index({ userId: 1, recipeId: 1 })

const FreeView = mongoose.model('FreeView', freeViewSchema)
export default FreeView
