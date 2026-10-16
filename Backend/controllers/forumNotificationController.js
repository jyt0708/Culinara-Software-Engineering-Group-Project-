import ForumNotification from '../models/ForumNotification.js'


// GET 当前用户的论坛通知
export const getForumNotifications = async (req, res) => {
  try {
    const notifications = await ForumNotification.find({
      recipient: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profilePicture')
      .populate('forumPost', 'title')
      .populate('forumComment', 'content')

    res.json({success: true, data: notifications})

  } catch (error) {
    res.status(500).json({success: false,message: error.message})

  }
}

// 标记单条论坛通知为已读
export const markForumNotificationRead = async (req, res) => {
  try {
    const notification = await ForumNotification.findOneAndUpdate(
      {_id: req.params.id,recipient: req.user._id},
      {isRead: true},
      {new: true}
    )

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Forum notification not found' })
    }

    res.json({ success: true, data: notification })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}