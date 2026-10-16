import mongoose from 'mongoose'

// 注意：user 字段没有 unique: true
// 允许同一用户多次申请（被拒绝后可以重新提交）
// 重复申请的控制逻辑在 applicationController.js 里用代码判断
const applicationSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 关联到 User 表
  motivation:      { type: String, required: true },  // 申请动机
  experience:      { type: String, required: true },  // 烹饪/餐饮经验
  bio:             { type: String, default: '' },     // 个人简介（选填），批准时会复制到 User.bio
  idDocumentUrl:   { type: String, required: true },  // 身份证明文件 Cloudinary URL
  workProofUrl:    { type: String, required: true },  // 从业证明文件 Cloudinary URL
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, default: '' },     // admin 拒绝时填写的原因
}, { timestamps: true })

const CreatorApplication = mongoose.model('CreatorApplication', applicationSchema)
export default CreatorApplication
