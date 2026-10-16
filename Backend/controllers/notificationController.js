import Notification from '../models/Notification.js'

// GET /api/notifications — 当前用户全部通知，时间倒序，populate sender + recipe
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profilePicture')
      .populate('recipe', 'title')
      .populate('order', 'productSnapshot status')
    res.json({ success: true, data: notifications })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PATCH /api/notifications/:id/read — 标记单条已读（验证归属当前用户）
export const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    )
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }
    res.json({ success: true, data: notification })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
