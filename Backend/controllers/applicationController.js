import cloudinary from '../config/cloudinary.js'
import CreatorApplication from '../models/CreatorApplication.js'
import User from '../models/User.js'

// multer 文件存在内存中，这里直接上传到 Cloudinary。
const uploadToCloudinary = (fileBuffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err)
      else resolve(result.secure_url)
    }).end(fileBuffer)
  })

// 用户提交 creator 申请，包含动机、经验和两份证明文件。
export const submitApplication = async (req, res) => {
  try {
    // 被拒绝的用户可以重新申请；pending/approved 不允许重复提交。
    const existing = await CreatorApplication.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'approved'] },
    })
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a pending or approved application' })
    }

    const { motivation, experience, bio = '' } = req.body
    if (!motivation || !experience) {
      return res.status(400).json({ success: false, message: 'Motivation and experience are required' })
    }

    if (!req.files?.idDocument || !req.files?.workProof) {
      return res.status(400).json({ success: false, message: 'Both documents are required' })
    }

    const [idDocumentUrl, workProofUrl] = await Promise.all([
      uploadToCloudinary(req.files.idDocument[0].buffer, 'culinara/applications'),
      uploadToCloudinary(req.files.workProof[0].buffer, 'culinara/applications'),
    ])

    const application = await CreatorApplication.create({
      user: req.user._id,
      motivation, experience, bio,
      idDocumentUrl, workProofUrl,
    })

    res.status(201).json({ success: true, data: application })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 获取当前用户最新一条 creator 申请，用于 Profile 展示申请状态。
export const getMyApplication = async (req, res) => {
  try {
    const application = await CreatorApplication.findOne({ user: req.user._id }).sort({ createdAt: -1 })
    res.json({ success: true, data: application })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Admin 审核页只展示 pending 状态的申请。
export const getAllApplications = async (req, res) => {
  try {
    const applications = await CreatorApplication.find({ status: 'pending' })
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
    res.json({ success: true, data: applications })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 批准申请时，同时把用户角色升级为 creator。
export const approveApplication = async (req, res) => {
  try {
    const application = await CreatorApplication.findById(req.params.id)
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' })
    if (application.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'Application already processed' })
    }

    await User.findByIdAndUpdate(application.user, { role: 'creator', bio: application.bio })

    const updated = await CreatorApplication.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    )
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 拒绝申请时保存原因，用户可以在 Profile 里看到。
export const rejectApplication = async (req, res) => {
  try {
    const { rejectionReason } = req.body
    const application = await CreatorApplication.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: rejectionReason || '' },
      { new: true }
    )
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' })
    res.json({ success: true, data: application })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
